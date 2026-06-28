"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Users,
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  UsersRound,
  FolderKanban,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { Team } from "@/lib/types"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const TEAM_COLORS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Slate", value: "#64748b" },
]

const teamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

type TeamForm = z.infer<typeof teamSchema>

const DEFAULT_FORM: TeamForm = {
  name: "",
  description: "",
  color: TEAM_COLORS[0].value,
}

function canManageRole(role: string | undefined): boolean {
  return !!role && ["owner", "admin", "manager"].includes(role)
}

export function TeamsView() {
  const { activeOrg, setView } = useAppStore()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null)
  const [deleteTeam, setDeleteTeam] = React.useState<Team | null>(null)

  const form = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: DEFAULT_FORM,
  })

  const teamsQ = useQuery({
    queryKey: ["org", activeOrg?.id, "teams"],
    queryFn: () => api.get<Team[]>(`/api/organizations/${activeOrg!.id}/teams`),
    enabled: !!activeOrg,
  })

  const createMutation = useMutation({
    mutationFn: async (data: TeamForm) =>
      api.post<Team>(`/api/organizations/${activeOrg!.id}/teams`, {
        name: data.name,
        description: data.description || undefined,
        color: data.color,
      }),
    onSuccess: () => {
      toast.success("Team created")
      queryClient.invalidateQueries({ queryKey: ["org", activeOrg!.id, "teams"] })
      setDialogOpen(false)
      form.reset(DEFAULT_FORM)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to create team"
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      teamId,
      data,
    }: {
      teamId: string
      data: Partial<TeamForm>
    }) =>
      api.patch(`/api/organizations/${activeOrg!.id}/teams/${teamId}`, {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description || "" }
          : {}),
        ...(data.color ? { color: data.color } : {}),
      }),
    onSuccess: () => {
      toast.success("Team updated")
      queryClient.invalidateQueries({ queryKey: ["org", activeOrg!.id, "teams"] })
      setDialogOpen(false)
      setEditingTeam(null)
      form.reset(DEFAULT_FORM)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to update team"
      toast.error(msg)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async ({ teamId, archive }: { teamId: string; archive: boolean }) =>
      api.patch(`/api/organizations/${activeOrg!.id}/teams/${teamId}`, { archive }),
    onSuccess: (_data, vars) => {
      toast.success(vars.archive ? "Team archived" : "Team restored")
      queryClient.invalidateQueries({ queryKey: ["org", activeOrg!.id, "teams"] })
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to update team"
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (teamId: string) =>
      api.del(`/api/organizations/${activeOrg!.id}/teams/${teamId}`),
    onSuccess: () => {
      toast.success("Team deleted")
      queryClient.invalidateQueries({ queryKey: ["org", activeOrg!.id, "teams"] })
      setDeleteTeam(null)
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to delete team"
      toast.error(msg)
    },
  })

  function openCreate() {
    setEditingTeam(null)
    form.reset(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(team: Team) {
    setEditingTeam(team)
    form.reset({
      name: team.name,
      description: team.description ?? "",
      color: team.color,
    })
    setDialogOpen(true)
  }

  function onSubmit(data: TeamForm) {
    if (editingTeam) {
      updateMutation.mutate({ teamId: editingTeam.id, data })
    } else {
      createMutation.mutate(data)
    }
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

  const teams = teamsQ.data ?? []
  const canManage = canManageRole(activeOrg.role)
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Organize members into teams and squads"
        icon={Users}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New team
            </Button>
          )
        }
      />

      {teamsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : teamsQ.isError ? (
        <EmptyState
          icon={Users}
          title="Failed to load teams"
          description="Something went wrong. Please try again."
          action={
            <Button size="sm" onClick={() => teamsQ.refetch()}>
              Retry
            </Button>
          }
        />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description={
            canManage
              ? "Create your first team to group members and projects."
              : "Your organization doesn't have any teams yet."
          }
          action={
            canManage && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create team
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => {
            const teamMembers = (team.members ?? []).slice(0, 4)
            const extraMembers = Math.max(
              (team.members?.length ?? 0) - 4,
              0
            )
            return (
              <Card
                key={team.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* colored left border via wrapper */}
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: team.color }}
                  aria-hidden
                />
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">
                          {team.name}
                        </h3>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: team.color }}
                          aria-hidden
                        />
                      </div>
                      {team.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {team.description}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          No description
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            aria-label="Team actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(team)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              archiveMutation.mutate({
                                teamId: team.id,
                                archive: true,
                              })
                            }
                          >
                            <Archive className="mr-2 h-3.5 w-3.5" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              archiveMutation.mutate({
                                teamId: team.id,
                                archive: false,
                              })
                            }
                          >
                            <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                            Unarchive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTeam(team)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <UsersRound className="h-3 w-3" />
                      {team.counts.members}{" "}
                      {team.counts.members === 1 ? "member" : "members"}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <FolderKanban className="h-3 w-3" />
                      {team.counts.projects}{" "}
                      {team.counts.projects === 1 ? "project" : "projects"}
                    </Badge>
                  </div>

                  {/* Stacked avatars */}
                  {teamMembers.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {teamMembers.map((m) => (
                          <Avatar
                            key={m.id}
                            className="h-7 w-7 border-2 border-card"
                          >
                            {m.avatarUrl ? (
                              <AvatarImage src={m.avatarUrl} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {initials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {extraMembers > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{extraMembers} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No members</p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(team.createdAt)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingTeam(null)
            form.reset(DEFAULT_FORM)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Edit team" : "Create a new team"}
            </DialogTitle>
            <DialogDescription>
              {editingTeam
                ? "Update your team's details."
                : "Group members and projects together under a team."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                placeholder="e.g. Engineering"
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
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                placeholder="What does this team do?"
                rows={3}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {TEAM_COLORS.map((c) => {
                  const selected = form.watch("color") === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => form.setValue("color", c.value)}
                      title={c.name}
                      aria-label={c.name}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                        selected
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </button>
                  )
                })}
              </div>
              {form.formState.errors.color && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.color.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setEditingTeam(null)
                  form.reset(DEFAULT_FORM)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : editingTeam
                    ? "Save changes"
                    : "Create team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTeam}
        onOpenChange={(open) => !open && setDeleteTeam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the team{" "}
              <span className="font-medium text-foreground">
                {deleteTeam?.name}
              </span>
              . Members will remain in the organization but unassigned to this
              team. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTeam && deleteMutation.mutate(deleteTeam.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading overlay fallback when refreshing */}
      {teamsQ.isFetching && !teamsQ.isLoading && (
        <LoadingBlock label="Refreshing teams…" />
      )}
    </div>
  )
}
