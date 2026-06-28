"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  FolderKanban,
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users as UsersIcon,
  Loader2,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, apiPaginated, ApiError } from "@/lib/api-client"
import type { Project, Team } from "@/lib/types"
import { PageHeader, EmptyState, StatCard } from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { PROJECT_STATUSES, PROJECT_VISIBILITY, STATUS_BADGE_CLASS, STATUS_LABELS } from "@/lib/constants"
import { cn, initials } from "@/lib/utils"
import { formatDate, isOverdue } from "@/lib/slug"
import { toast } from "sonner"

const SORTS = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
  { value: "dueDate", label: "Due date" },
]

const schema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]),
  visibility: z.enum(PROJECT_VISIBILITY as [string, ...string[]]),
  teamId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
})
type FormValues = z.infer<typeof schema>

export function ProjectsView() {
  const { activeOrg, setView } = useAppStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState<string>("")
  const [teamId, setTeamId] = useState<string>("")
  const [sort, setSort] = useState("createdAt")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [archived, setArchived] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const canManage = activeOrg ? ["owner", "admin", "manager"].includes(activeOrg.role) : false

  const { data, isLoading } = useQuery({
    queryKey: ["projects", activeOrg?.id, page, pageSize, debouncedSearch, status, teamId, sort, order, archived],
    queryFn: () =>
      apiPaginated<Project>(`/api/organizations/${activeOrg!.id}/projects`, {
        page,
        pageSize,
        search: debouncedSearch,
        status,
        teamId,
        sort,
        order,
        archived,
      }),
    enabled: !!activeOrg,
  })

  const { data: teams } = useQuery({
    queryKey: ["teams", activeOrg?.id],
    queryFn: () => api.get<Team[]>(`/api/organizations/${activeOrg!.id}/teams`),
    enabled: !!activeOrg,
  })

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      api.post<Project>(`/api/organizations/${activeOrg!.id}/projects`, {
        ...v,
        teamId: v.teamId && v.teamId !== "none" ? v.teamId : undefined,
        dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast.success("Project created")
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: ["analytics"] })
      setDialogOpen(false)
    },
    onError: (e) => toast.error((e as ApiError).message || "Failed to create project"),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, v }: { id: string; v: Partial<FormValues> }) =>
      api.patch<Project>(`/api/organizations/${activeOrg!.id}/projects/${id}`, {
        ...v,
        teamId: v.teamId && v.teamId !== "none" ? v.teamId : null,
        dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success("Project updated")
      qc.invalidateQueries({ queryKey: ["projects"] })
      setDialogOpen(false)
      setEditing(null)
    },
    onError: (e) => toast.error((e as ApiError).message || "Failed to update project"),
  })

  const archiveMut = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.patch(`/api/organizations/${activeOrg!.id}/projects/${id}`, { archive }),
    onSuccess: (_d, vars) => {
      toast.success(vars.archive ? "Project archived" : "Project restored")
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
    onError: (e) => toast.error((e as ApiError).message || "Action failed"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/organizations/${activeOrg!.id}/projects/${id}`),
    onSuccess: () => {
      toast.success("Project deleted")
      qc.invalidateQueries({ queryKey: ["projects"] })
      setDeleteTarget(null)
    },
    onError: (e) => toast.error((e as ApiError).message || "Failed to delete project"),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", status: "active", visibility: "internal", teamId: "", dueDate: "" },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: "", description: "", status: "active", visibility: "internal", teamId: "", dueDate: "" })
    setDialogOpen(true)
  }
  function openEdit(p: Project) {
    setEditing(p)
    form.reset({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      visibility: p.visibility,
      teamId: p.team?.id ?? "",
      dueDate: p.dueDate ? p.dueDate.slice(0, 10) : "",
    })
    setDialogOpen(true)
  }

  const onSubmit = (v: FormValues) => {
    if (editing) updateMut.mutate({ id: editing.id, v })
    else createMut.mutate(v)
  }

  const stats = useMemo(() => {
    const items = data?.items ?? []
    return {
      total: data?.total ?? 0,
      active: items.filter((p) => p.status === "active").length,
      onHold: items.filter((p) => p.status === "on_hold").length,
      completed: items.filter((p) => p.status === "completed").length,
    }
  }, [data])

  if (!activeOrg) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No organization selected"
        description="Select or create an organization to manage projects."
        action={<Button onClick={() => setView("organizations")}>Browse organizations</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Create, organize and track your organization's projects."
        icon={FolderKanban}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New project
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={FolderKanban} accent="primary" />
        <StatCard label="Active" value={stats.active} icon={FolderKanban} accent="emerald" />
        <StatCard label="On hold" value={stats.onHold} icon={Calendar} accent="amber" />
        <StatCard label="Completed" value={stats.completed} icon={FolderKanban} accent="violet" />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamId} onValueChange={(v) => { setTeamId(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {(teams ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setOrder(order === "asc" ? "desc" : "asc")} aria-label="Toggle sort order">
              {order === "asc" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant={archived ? "default" : "outline"}
              onClick={() => { setArchived(!archived); setPage(1) }}
            >
              <Archive className="mr-1.5 h-4 w-4" /> {archived ? "Showing archived" : "Archived"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={archived ? "No archived projects" : "No projects yet"}
            description={archived ? "Archived projects will appear here." : "Create your first project to start tracking work."}
            action={canManage && !archived ? <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> New project</Button> : undefined}
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Team</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Tasks</TableHead>
                <TableHead className="hidden md:table-cell">Due</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setView("board", { projectId: p.id })}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      {p.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">{p.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("font-medium", STATUS_BADGE_CLASS[p.status])}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.team ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.team.color }} />
                        {p.team.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {p.owner && (
                      <span className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={p.owner.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(p.owner.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{p.owner.name}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center text-sm text-muted-foreground">
                    {p.taskCount ?? p.counts?.tasks ?? 0}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.dueDate ? (
                      <span className={cn("text-sm", isOverdue(p.dueDate) && p.status !== "completed" && "text-destructive font-medium")}>
                        {formatDate(p.dueDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Project actions">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => archiveMut.mutate({ id: p.id, archive: !p.archivedAt })}>
                            {p.archivedAt ? (
                              <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</>
                            ) : (
                              <><Archive className="mr-2 h-4 w-4" /> Archive</>
                            )}
                          </DropdownMenuItem>
                          {p.archivedAt && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(p)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the project details below." : "Create a new project in this organization."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g. Q1 Launch" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Short summary" {...form.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select value={form.watch("visibility")} onValueChange={(v) => form.setValue("visibility", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_VISIBILITY.map((v) => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select value={form.watch("teamId")} onValueChange={(v) => form.setValue("teamId", v)}>
                  <SelectTrigger><SelectValue placeholder="No team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {(teams ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" {...form.register("dueDate")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project and all its tasks, comments and attachments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { UsersIcon }
