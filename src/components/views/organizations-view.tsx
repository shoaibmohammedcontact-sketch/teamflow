"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import {
  Building2,
  Plus,
  Users,
  FolderKanban,
  UsersRound,
  Check,
  CalendarDays,
  Sparkles,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { OrgMembership } from "@/lib/types"
import { PLANS, ROLE_BADGE_CLASS, ROLE_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

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

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only")
    .optional()
    .or(z.literal("")),
  plan: z.enum(["free", "pro", "enterprise"]),
})

type CreateForm = z.infer<typeof createSchema>

async function switchOrg(org: OrgMembership) {
  const { setActiveOrg, setView, setOrganizations } = useAppStore.getState()
  setActiveOrg(org)
  if (typeof window !== "undefined") {
    localStorage.setItem("tf_active_org", org.id)
  }
  // refetch orgs to refresh counts
  try {
    const fresh = await api.get<OrgMembership[]>("/api/organizations")
    setOrganizations(fresh)
    const chosen = fresh.find((o) => o.id === org.id) ?? org
    setActiveOrg(chosen)
  } catch {
    /* ignore */
  }
  setView("dashboard")
}

export function OrganizationsView() {
  const { organizations, setOrganizations, activeOrg, user } = useAppStore()
  const [createOpen, setCreateOpen] = React.useState(false)

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", slug: "", plan: "free" },
  })

  const nameValue = form.watch("name")
  React.useEffect(() => {
    // Auto-suggest slug from name unless the user has typed their own slug
    const slugField = form.getValues("slug")
    if (!slugField && nameValue) {
      const suggested = nameValue
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)
      form.setValue("slug", suggested, { shouldValidate: false })
    }
  }, [nameValue])

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      return api.post<OrgMembership>("/api/organizations", {
        name: data.name,
        slug: data.slug || undefined,
        plan: data.plan,
      })
    },
    onSuccess: (created) => {
      // Prepend to organizations state and switch to it
      const next = [created, ...organizations]
      setOrganizations(next)
      setCreateOpen(false)
      form.reset({ name: "", slug: "", plan: "free" })
      toast.success(`Organization “${created.name}” created`)
      // switch to it
      void switchOrg(created)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to create organization"
      toast.error(msg)
    },
  })

  function onSubmit(data: CreateForm) {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage workspaces you belong to"
        icon={Building2}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new organization</DialogTitle>
                <DialogDescription>
                  Organizations are isolated workspaces. You can belong to
                  multiple organizations and switch between them anytime.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Acme Inc."
                    autoComplete="off"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug (optional)</Label>
                  <Input
                    id="org-slug"
                    placeholder="acme-inc"
                    autoComplete="off"
                    {...form.register("slug")}
                  />
                  {form.formState.errors.slug && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.slug.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Used in URLs. Auto-suggested from the name.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-plan">Plan</Label>
                  <Select
                    value={form.watch("plan")}
                    onValueChange={(v) =>
                      form.setValue("plan", v as CreateForm["plan"])
                    }
                  >
                    <SelectTrigger id="org-plan">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PLAN_LABELS[p] ?? p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Note card */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <p className="font-medium">Multiple workspaces, one account</p>
            <p className="text-muted-foreground">
              You can belong to multiple organizations and switch between them
              anytime from the sidebar or here.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organizations grid */}
      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create your first organization to get started."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create organization
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => {
            const isActive = activeOrg?.id === org.id
            const members = org.counts?.members ?? 0
            const projects = org.counts?.projects ?? 0
            const teams = org.counts?.teams ?? 0
            return (
              <Card
                key={org.id}
                className={cn(
                  "flex flex-col overflow-hidden transition-shadow hover:shadow-md",
                  isActive && "ring-2 ring-primary/40"
                )}
              >
                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold",
                        "bg-primary/10 text-primary"
                      )}
                    >
                      {initials(org.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">
                          {org.name}
                        </h3>
                        {isActive && (
                          <Badge className="bg-primary text-primary-foreground">
                            <Check className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {org.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={PLAN_BADGE_CLASS[org.plan] ?? ""}
                    >
                      {PLAN_LABELS[org.plan] ?? org.plan}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={ROLE_BADGE_CLASS[org.role] ?? ""}
                    >
                      {ROLE_LABELS[org.role] ?? org.role}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">{members}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Members
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground">
                        <FolderKanban className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">{projects}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Projects
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground">
                        <UsersRound className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">{teams}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Teams
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Joined {formatDate(org.joinedAt)}
                    </div>
                    {isActive ? (
                      <Button variant="outline" size="sm" disabled>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Current
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => void switchOrg(org)}>
                        Switch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Skeletons for placeholder while creating */}
          {createMutation.isPending && (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          )}
        </div>
      )}

      {user && organizations.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Signed in as {user.email} · {organizations.length} organization
          {organizations.length === 1 ? "" : "s"}
        </p>
      )}

      {/* LoadingBlock placeholder while no orgs and store still bootstrapping */}
      {organizations.length === 0 && !user && <LoadingBlock label="Loading…" />}
    </div>
  )
}
