"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MailPlus,
  Building2,
  Plus,
  MoreHorizontal,
  Send,
  Trash2,
  Copy,
  Check,
  MailCheck,
  XCircle,
  Clock,
  MailOpen,
  Inbox,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { Invitation, Team } from "@/lib/types"
import {
  ORG_ROLES,
  ROLE_LABELS,
  ROLE_BADGE_CLASS,
} from "@/lib/constants"
import { relativeTime, formatDate } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import {
  PageHeader,
  EmptyState,
} from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const INVITATION_STATUS_BADGE: Record<
  string,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: MailCheck,
  },
  rejected: {
    label: "Rejected",
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: MailOpen,
  },
}

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.string(),
  teamId: z.string().optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

function canManageRole(role: string | undefined): boolean {
  return !!role && ["owner", "admin", "manager"].includes(role)
}

export function InvitationsView() {
  const { activeOrg, setView } = useAppStore()
  const queryClient = useQueryClient()

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [resultUrl, setResultUrl] = React.useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = React.useState<Invitation | null>(null)
  const [copied, setCopied] = React.useState(false)

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member", teamId: "" },
  })

  const invitationsQ = useQuery({
    queryKey: ["org", activeOrg?.id, "invitations"],
    queryFn: () =>
      api.get<Invitation[]>(
        `/api/organizations/${activeOrg!.id}/invitations`
      ),
    enabled: !!activeOrg,
  })

  const teamsQ = useQuery({
    queryKey: ["org", activeOrg?.id, "teams"],
    queryFn: () => api.get<Team[]>(`/api/organizations/${activeOrg!.id}/teams`),
    enabled: !!activeOrg && !!inviteOpen,
  })

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) =>
      api.post<{ inviteUrl: string }>(
        `/api/organizations/${activeOrg!.id}/invitations`,
        {
          email: data.email,
          role: data.role,
          teamId: data.teamId && data.teamId !== "none" ? data.teamId : undefined,
        }
      ),
    onSuccess: (res, vars) => {
      toast.success(`Invitation sent to ${vars.email}`)
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "invitations"],
      })
      setInviteOpen(false)
      form.reset({ email: "", role: "member", teamId: "" })
      setResultUrl(res.inviteUrl)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to send invitation"
      toast.error(msg)
    },
  })

  const resendMutation = useMutation({
    mutationFn: async (inv: Invitation) =>
      api.post<{ inviteUrl: string }>(
        `/api/organizations/${activeOrg!.id}/invitations`,
        { email: inv.email, role: inv.role }
      ),
    onSuccess: (res, inv) => {
      toast.success(`Invitation resent to ${inv.email}`)
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "invitations"],
      })
      setResultUrl(res.inviteUrl)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to resend invitation"
      toast.error(msg)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (invId: string) =>
      api.del(`/api/organizations/${activeOrg!.id}/invitations/${invId}`),
    onSuccess: () => {
      toast.success("Invitation revoked")
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "invitations"],
      })
      setRevokeTarget(null)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to revoke invitation"
      toast.error(msg)
    },
  })

  function copyUrl(url: string) {
    if (typeof window === "undefined") return
    const absolute = `${window.location.origin}${url}`
    navigator.clipboard
      .writeText(absolute)
      .then(() => {
        setCopied(true)
        toast.success("Invite link copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => toast.error("Failed to copy link"))
  }

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

  const invitations = invitationsQ.data ?? []
  const canManage = canManageRole(activeOrg.role)
  const teams = teamsQ.data ?? []

  function onSubmit(data: InviteForm) {
    inviteMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description="Invite teammates and manage pending invitations"
        icon={MailPlus}
        actions={
          canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-0">
          {invitationsQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : invitationsQ.isError ? (
            <EmptyState
              icon={MailPlus}
              title="Failed to load invitations"
              description="Something went wrong. Please try again."
              className="mx-4 my-4"
              action={
                <Button size="sm" onClick={() => invitationsQ.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : invitations.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No invitations yet"
              description={
                canManage
                  ? "Invite your first teammate to join this organization."
                  : "There are no invitations for this organization."
              }
              className="mx-4 my-4"
              action={
                canManage && (
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite member
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Invited by</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent</TableHead>
                  <TableHead className="hidden lg:table-cell">Expires</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const st = INVITATION_STATUS_BADGE[inv.status] ?? {
                    label: inv.status,
                    cls: "bg-slate-100 text-slate-700",
                    icon: MailOpen,
                  }
                  const StatusIcon = st.icon
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {initials(inv.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {inv.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(inv.createdAt)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={cn(ROLE_BADGE_CLASS[inv.role] ?? "")}
                        >
                          {ROLE_LABELS[inv.role] ?? inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1", st.cls)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {inv.invitedBy?.name ?? inv.invitedBy?.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {relativeTime(inv.createdAt)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {relativeTime(inv.expiresAt)}
                      </TableCell>
                      <TableCell className="pr-4">
                        {canManage && inv.status === "pending" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Invitation actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  copyUrl(`/accept?token=${inv.token}`)
                                }
                              >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copy invite link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => resendMutation.mutate(inv)}
                              >
                                <Send className="mr-2 h-3.5 w-3.5" />
                                Resend
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRevokeTarget(inv)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Revoke
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="block w-8" />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open)
            form.reset({ email: "", role: "member", teamId: "" })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Send an invitation to join {activeOrg.name}. They'll receive an
              email with a link to accept.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email address</Label>
              <Input
                id="inv-email"
                type="email"
                placeholder="teammate@example.com"
                autoComplete="off"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-role">Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) => form.setValue("role", v)}
              >
                <SelectTrigger id="inv-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-team">Team (optional)</Label>
              <Select
                value={form.watch("teamId") ?? ""}
                onValueChange={(v) => form.setValue("teamId", v)}
              >
                <SelectTrigger id="inv-team">
                  <SelectValue placeholder="No team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If selected, the invitee will be added to this team upon
                acceptance.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite URL result dialog */}
      <Dialog
        open={!!resultUrl}
        onOpenChange={(open) => !open && setResultUrl(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation sent</DialogTitle>
            <DialogDescription>
              Share this link with the invitee. They can also accept via the
              email they receive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
              <code className="flex-1 break-all text-xs">
                {typeof window !== "undefined" && resultUrl
                  ? `${window.location.origin}${resultUrl}`
                  : resultUrl}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => resultUrl && copyUrl(resultUrl)}
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This invitation expires in 7 days.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResultUrl(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the pending invitation to{" "}
              <span className="font-medium text-foreground">
                {revokeTarget?.email}
              </span>
              . The invite link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={revokeMutation.isPending}
              onClick={() =>
                revokeTarget && revokeMutation.mutate(revokeTarget.id)
              }
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
