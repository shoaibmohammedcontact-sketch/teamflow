"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Settings as SettingsIcon,
  Building2,
  CreditCard,
  AlertTriangle,
  Save,
  Check,
  Lock,
  Trash2,
  Archive,
  ShieldCheck,
  Crown,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { OrgMembership } from "@/lib/types"
import { PLANS } from "@/lib/constants"
import { formatDate } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface OrgDetail extends OrgMembership {
  createdAt?: string
  counts?: { members: number; projects: number; teams: number; tasks?: number }
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
}

const PLAN_BADGE_CLASS: Record<string, string> = {
  free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pro: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  enterprise:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
}

const PLAN_FEATURES: Record<
  string,
  { members: string; projects: string; storage: string; support: string }
> = {
  free: {
    members: "Up to 5",
    projects: "Up to 3",
    storage: "1 GB",
    support: "Community",
  },
  pro: {
    members: "Up to 50",
    projects: "Unlimited",
    storage: "50 GB",
    support: "Email",
  },
  enterprise: {
    members: "Unlimited",
    projects: "Unlimited",
    storage: "1 TB",
    support: "Priority 24/7",
  },
}

const generalSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  logoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
})

type GeneralForm = z.infer<typeof generalSchema>

export function SettingsView() {
  const { activeOrg, setActiveOrg, setOrganizations, organizations, setView } =
    useAppStore()
  const queryClient = useQueryClient()

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState("")

  const detailQ = useQuery({
    queryKey: ["org", activeOrg?.id, "detail"],
    queryFn: () => api.get<OrgDetail>(`/api/organizations/${activeOrg!.id}`),
    enabled: !!activeOrg,
  })

  const form = useForm<GeneralForm>({
    resolver: zodResolver(generalSchema),
    defaultValues: { name: "", logoUrl: "" },
  })

  // Hydrate form when data arrives
  React.useEffect(() => {
    if (detailQ.data) {
      form.reset({
        name: detailQ.data.name,
        logoUrl: detailQ.data.logoUrl ?? "",
      })
    }
  }, [detailQ.data])

  const updateMutation = useMutation({
    mutationFn: async (data: GeneralForm) =>
      api.patch<OrgMembership>(`/api/organizations/${activeOrg!.id}`, {
        name: data.name,
        logoUrl: data.logoUrl || undefined,
      }),
    onSuccess: (updated) => {
      // Update active org + organizations list
      const merged: OrgMembership = {
        ...(activeOrg as OrgMembership),
        ...updated,
      }
      setActiveOrg(merged)
      const next = organizations.map((o) =>
        o.id === updated.id ? { ...o, ...updated } : o
      )
      setOrganizations(next)
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "detail"],
      })
      toast.success("Organization updated")
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to update organization"
      toast.error(msg)
    },
  })

  const planMutation = useMutation({
    mutationFn: async (plan: string) =>
      api.patch<OrgMembership>(`/api/organizations/${activeOrg!.id}`, { plan }),
    onSuccess: (updated, plan) => {
      const merged: OrgMembership = {
        ...(activeOrg as OrgMembership),
        ...updated,
      }
      setActiveOrg(merged)
      const next = organizations.map((o) =>
        o.id === updated.id ? { ...o, ...updated, plan } : o
      )
      setOrganizations(next)
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "detail"],
      })
      toast.success(`Plan switched to ${PLAN_LABELS[plan] ?? plan}`)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to change plan"
      toast.error(msg)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      // No archive endpoint for org; we mock by patching plan? Actually
      // we just toast since the API doesn't expose org archive.
      return Promise.resolve()
    },
    onSuccess: () => {
      toast.success("Archive request recorded (demo)")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () =>
      api.del(`/api/organizations/${activeOrg!.id}`),
    onSuccess: async () => {
      toast.success("Organization deleted")
      // Refetch /api/auth/me for fresh org list
      try {
        const fresh = await api.get<OrgMembership[]>("/api/organizations")
        setOrganizations(fresh)
        const wasActive = activeOrg
        if (wasActive && fresh.length > 0) {
          const next = fresh[0]
          setActiveOrg(next)
          if (typeof window !== "undefined") {
            localStorage.setItem("tf_active_org", next.id)
          }
          setView("dashboard")
        } else if (fresh.length === 0) {
          setActiveOrg(null)
          if (typeof window !== "undefined") {
            localStorage.removeItem("tf_active_org")
          }
          setView("organizations")
        }
      } catch {
        setView("organizations")
      }
      setDeleteOpen(false)
      setDeleteConfirm("")
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to delete organization"
      toast.error(msg)
    },
  })

  if (!activeOrg) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization selected"
        description="Select or create an organization to continue."
        action={
          <Button onClick={() => setView("organizations")}>
            Browse organizations
          </Button>
        }
      />
    )
  }

  const isOwner = activeOrg.role === "owner"
  const detail = detailQ.data
  const currentPlan = activeOrg.plan

  function onGeneralSubmit(data: GeneralForm) {
    updateMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Configure ${activeOrg.name}`}
        icon={SettingsIcon}
      />

      {detailQ.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xs rounded-md" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="billing">Plan &amp; Billing</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General</CardTitle>
                <CardDescription>
                  Basic information about this organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  onSubmit={form.handleSubmit(onGeneralSubmit)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="set-name">Organization name</Label>
                      <Input
                        id="set-name"
                        placeholder="Acme Inc."
                        {...form.register("name")}
                      />
                      {form.formState.errors.name && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="set-slug">Slug</Label>
                      <Input
                        id="set-slug"
                        value={activeOrg.slug}
                        readOnly
                        disabled
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Slugs are permanent and cannot be changed.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="set-logo">Logo URL (optional)</Label>
                    <Input
                      id="set-logo"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      {...form.register("logoUrl")}
                    />
                    {form.formState.errors.logoUrl && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.logoUrl.message}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? (
                        "Saving…"
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Plan
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold capitalize">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          PLAN_BADGE_CLASS[currentPlan]
                        )}
                      >
                        {PLAN_LABELS[currentPlan] ?? currentPlan}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Created
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatDate(detail?.createdAt ?? activeOrg.joinedAt)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Your role
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold capitalize">
                      {activeOrg.role === "owner" && (
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {activeOrg.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plan & Billing */}
          <TabsContent value="billing" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Current plan
                </CardTitle>
                <CardDescription>
                  Your organization is currently on the{" "}
                  <span className="font-medium text-foreground">
                    {PLAN_LABELS[currentPlan] ?? currentPlan}
                  </span>{" "}
                  plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Feature</th>
                        {PLANS.map((p) => (
                          <th
                            key={p}
                            className={cn(
                              "px-4 py-2 text-center",
                              p === currentPlan && "bg-primary/5 text-primary"
                            )}
                          >
                            {PLAN_LABELS[p]}
                            {p === currentPlan && (
                              <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(
                        Object.keys(PLAN_FEATURES[currentPlan]) as Array<
                          keyof (typeof PLAN_FEATURES)[typeof currentPlan]
                        >
                      ).map((feature) => (
                        <tr key={feature}>
                          <td className="px-4 py-2 capitalize">{feature}</td>
                          {PLANS.map((p) => (
                            <td
                              key={p}
                              className={cn(
                                "px-4 py-2 text-center",
                                p === currentPlan && "bg-primary/5 font-medium"
                              )}
                            >
                              {PLAN_FEATURES[p][feature]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {PLANS.map((p) => {
                    const isCurrent = p === currentPlan
                    return (
                      <div
                        key={p}
                        className={cn(
                          "flex flex-col rounded-lg border p-4",
                          isCurrent && "border-primary ring-1 ring-primary/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">
                            {PLAN_LABELS[p]}
                          </p>
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground">
                              <Check className="mr-1 h-3 w-3" />
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p === "free" && "Starter tier"}
                          {p === "pro" && "For growing teams"}
                          {p === "enterprise" && "For large organizations"}
                        </p>
                        <Button
                          className="mt-3"
                          size="sm"
                          variant={isCurrent ? "outline" : "default"}
                          disabled={
                            isCurrent || planMutation.isPending || !isOwner
                          }
                          onClick={() => planMutation.mutate(p)}
                        >
                          {isCurrent ? "Current plan" : `Switch to ${PLAN_LABELS[p]}`}
                        </Button>
                      </div>
                    )
                  })}
                </div>

                {!isOwner && (
                  <p className="text-xs text-muted-foreground">
                    Only the organization owner can change the billing plan.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Mock billing summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Billing summary</CardTitle>
                <CardDescription>
                  This is a demo workspace — no real charges are made.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                    <span>Next billing date</span>
                    <span className="font-medium">
                      {formatDate(
                        new Date(
                          Date.now() + 30 * 24 * 60 * 60 * 1000
                        ).toISOString()
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                    <span>Amount due</span>
                    <span className="font-medium">
                      {currentPlan === "free"
                        ? "$0.00"
                        : currentPlan === "pro"
                          ? "$49.00 / month"
                          : "$299.00 / month"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                    <span>Payment method</span>
                    <span className="font-medium">— No card on file</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="outline" size="sm" disabled>
                  <CreditCard className="mr-2 h-3.5 w-3.5" />
                  Manage billing
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="mt-4">
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions. Proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Archive */}
                <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Archive organization</p>
                    <p className="text-xs text-muted-foreground">
                      Mark this organization as archived. Members will lose
                      write access. (Demo only)
                    </p>
                  </div>
                  {isOwner ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate()}
                      disabled={archiveMutation.isPending}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="outline" size="sm" disabled>
                            <Lock className="mr-2 h-3.5 w-3.5" />
                            Archive
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Only the owner can archive this organization
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <Separator />

                {/* Delete */}
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-destructive">
                      Delete organization
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this organization, all teams,
                      projects, tasks, and members. This cannot be undone.
                    </p>
                  </div>
                  {isOwner ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="destructive" size="sm" disabled>
                            <Lock className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Only the owner can delete this organization
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {!isOwner && (
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      You are not the owner of this organization. Owner-only
                      actions are disabled.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteConfirm("")
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {activeOrg.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All teams,
              projects, tasks, and member associations will be deleted. To
              confirm, type{" "}
              <span className="font-mono font-medium text-foreground">
                {activeOrg.name}
              </span>{" "}
              below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={activeOrg.name}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={
                deleteMutation.isPending || deleteConfirm !== activeOrg.name
              }
              onClick={(e) => {
                e.preventDefault()
                deleteMutation.mutate()
              }}
            >
              {deleteMutation.isPending
                ? "Deleting…"
                : "Delete organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {detailQ.isFetching && !detailQ.isLoading && (
        <LoadingBlock label="Refreshing…" />
      )}
    </div>
  )
}
