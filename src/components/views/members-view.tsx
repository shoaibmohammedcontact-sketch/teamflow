"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  UsersRound,
  Building2,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Shield,
  Crown,
  Users,
  CircleDot,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { Member } from "@/lib/types"
import { ORG_ROLES, ROLE_LABELS, ROLE_BADGE_CLASS } from "@/lib/constants"
import { formatDate } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import {
  PageHeader,
  EmptyState,
  StatCard,
} from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const MEMBER_STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  invited: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suspended: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  guest: 1,
}

function canManageRole(role: string | undefined): boolean {
  return !!role && ["owner", "admin", "manager"].includes(role)
}

export function MembersView() {
  const { activeOrg, setView, user } = useAppStore()
  const queryClient = useQueryClient()
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null)

  const membersQ = useQuery({
    queryKey: ["org", activeOrg?.id, "members"],
    queryFn: () => api.get<Member[]>(`/api/organizations/${activeOrg!.id}/members`),
    enabled: !!activeOrg,
  })

  const roleMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string
      role: string
    }) =>
      api.patch(
        `/api/organizations/${activeOrg!.id}/members/${memberId}`,
        { role }
      ),
    onMutate: async ({ memberId, role }) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: ["org", activeOrg!.id, "members"],
      })
      const prev = queryClient.getQueryData<Member[]>([
        "org",
        activeOrg!.id,
        "members",
      ])
      if (prev) {
        const next = prev.map((m) =>
          m.id === memberId ? { ...m, role } : m
        )
        queryClient.setQueryData<Member[]>(
          ["org", activeOrg!.id, "members"],
          next
        )
      }
      return { prev }
    },
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(
          ["org", activeOrg!.id, "members"],
          ctx.prev
        )
      }
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to update role"
      toast.error(msg)
    },
    onSuccess: (_data, vars) => {
      toast.success(`Role updated to ${ROLE_LABELS[vars.role] ?? vars.role}`)
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "members"],
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) =>
      api.del(`/api/organizations/${activeOrg!.id}/members/${memberId}`),
    onSuccess: () => {
      toast.success("Member removed")
      queryClient.invalidateQueries({
        queryKey: ["org", activeOrg!.id, "members"],
      })
      setRemoveTarget(null)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to remove member"
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

  const members = membersQ.data ?? []
  const myRole = activeOrg.role
  const canManage = canManageRole(myRole)
  const isOwner = myRole === "owner"

  // StatCards computed from list
  const totalMembers = members.length
  const ownerCount = members.filter((m) => m.role === "owner").length
  const adminCount = members.filter((m) => m.role === "admin").length
  const activeCount = members.filter((m) => m.status === "active").length

  // Can the current user modify a given member?
  // Owners can modify everyone except themselves if they're the only owner
  // (the API enforces this; we still show the control but it may 400/403).
  // Non-owner managers/admins cannot modify members with equal-or-higher role.
  function canModifyMember(m: Member): boolean {
    if (!canManage) return false
    if (isOwner) return true
    return ROLE_HIERARCHY[m.role] < ROLE_HIERARCHY[myRole]
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="People in this organization and their roles"
        icon={UsersRound}
        actions={
          <Button onClick={() => setView("invitations")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {membersQ.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total members"
              value={totalMembers}
              icon={Users}
              hint="Across all roles"
              accent="primary"
            />
            <StatCard
              label="Owners"
              value={ownerCount}
              icon={Crown}
              hint="Full control"
              accent="amber"
            />
            <StatCard
              label="Admins"
              value={adminCount}
              icon={Shield}
              hint="Manage resources"
              accent="violet"
            />
            <StatCard
              label="Active"
              value={activeCount}
              icon={CircleDot}
              hint="Currently active"
              accent="emerald"
            />
          </>
        )}
      </div>

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          {membersQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : membersQ.isError ? (
            <EmptyState
              icon={UsersRound}
              title="Failed to load members"
              description="Something went wrong. Please try again."
              className="mx-4 my-4"
              action={
                <Button size="sm" onClick={() => membersQ.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : members.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No members yet"
              description="Invite teammates to join your organization."
              className="mx-4 my-4"
              action={
                <Button size="sm" onClick={() => setView("invitations")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite member
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isSelf = user?.id === m.user.id
                  const canModify = canModifyMember(m)
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {m.user.avatarUrl ? (
                              <AvatarImage src={m.user.avatarUrl} alt="" />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {initials(m.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {m.user.name ?? m.user.email}
                              </p>
                              {isSelf && (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {m.user.jobTitle
                                ? `${m.user.jobTitle} · `
                                : ""}
                              {m.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {canModify ? (
                          <Select
                            value={m.role}
                            onValueChange={(role) =>
                              roleMutation.mutate({ memberId: m.id, role })
                            }
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORG_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={cn(
                              ROLE_BADGE_CLASS[m.role] ?? ""
                            )}
                          >
                            {ROLE_LABELS[m.role] ?? m.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={cn(
                            MEMBER_STATUS_BADGE[m.status] ??
                              "bg-slate-100 text-slate-700"
                          )}
                        >
                          <span className="capitalize">{m.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {formatDate(m.joinedAt)}
                      </TableCell>
                      <TableCell className="pr-4">
                        {canModify && !isSelf ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Member actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                {m.user.name ?? m.user.email}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemoveTarget(m)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Remove member
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

      {/* Remove member confirm */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            This will remove{" "}
            <span className="font-medium text-foreground">
              {removeTarget?.user.name ?? removeTarget?.user.email}
            </span>{" "}
            from the organization. They will lose access to all projects and
            teams. This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={removeMutation.isPending}
              onClick={() =>
                removeTarget && removeMutation.mutate(removeTarget.id)
              }
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
