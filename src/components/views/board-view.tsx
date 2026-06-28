"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  KanbanSquare,
  Plus,
  Search,
  MessageSquare,
  Paperclip,
  Calendar,
  GripVertical,
  Loader2,
  X,
  Send,
  Building2,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { Project, Task, Comment, Member, Label } from "@/lib/types"
import { PageHeader, EmptyState } from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as UILabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  KANBAN_COLUMNS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
  PRIORITY_LABELS,
  PRIORITY_BADGE_CLASS,
} from "@/lib/constants"
import { cn, initials } from "@/lib/utils"
import { formatDate, isOverdue, relativeTime } from "@/lib/slug"
import { toast } from "sonner"

const COLUMN_ACCENT: Record<string, string> = {
  backlog: "bg-slate-400",
  todo: "bg-sky-500",
  in_progress: "bg-violet-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
}

export function BoardView() {
  const { activeOrg, viewParams, setView } = useAppStore()
  const qc = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string>(viewParams.projectId ?? "")
  const [search, setSearch] = useState("")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("")
  const [priorityFilter, setPriorityFilter] = useState<string>("")
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [createCol, setCreateCol] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const { data: projects } = useQuery({
    queryKey: ["projects", activeOrg?.id, "all"],
    queryFn: async () => {
      const res = await api.get<Project[]>(`/api/organizations/${activeOrg!.id}/projects?pageSize=50`)
      return res
    },
    enabled: !!activeOrg,
  })

  // Derive effective project: explicit selection, else first available (no effect needed)
  const effectiveProjectId = selectedProjectId || projects?.[0]?.id || ""
  const selectedProject = projects?.find((p) => p.id === effectiveProjectId)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", effectiveProjectId, search, assigneeFilter, priorityFilter],
    queryFn: () =>
      api.get<Task[]>(
        `/api/organizations/${activeOrg!.id}/projects/${effectiveProjectId}/tasks`,
        { search, assigneeId: assigneeFilter, priority: priorityFilter }
      ),
    enabled: !!activeOrg && !!effectiveProjectId,
  })

  const { data: members } = useQuery({
    queryKey: ["members", activeOrg?.id],
    queryFn: () => api.get<Member[]>(`/api/organizations/${activeOrg!.id}/members`),
    enabled: !!activeOrg,
  })

  const moveMut = useMutation({
    mutationFn: ({ taskId, toStatus, toPosition }: { taskId: string; toStatus: string; toPosition: number }) =>
      api.put(`/api/organizations/${activeOrg!.id}/projects/${effectiveProjectId}/tasks/${taskId}`, { toStatus, toPosition }),
    onError: (e) => {
      toast.error((e as ApiError).message || "Failed to move task")
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })

  // group tasks by status
  const columns = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const c of KANBAN_COLUMNS) map[c] = []
    for (const t of tasks ?? []) {
      if (map[t.status]) map[t.status].push(t)
    }
    // sort each column by position
    for (const c of KANBAN_COLUMNS) map[c].sort((a, b) => a.position - b.position)
    return map
  }, [tasks])

  function findContainer(id: string): string | null {
    if (KANBAN_COLUMNS.includes(id as never)) return id
    const task = (tasks ?? []).find((t) => t.id === id)
    return task?.status ?? null
  }

  function onDragStart(e: DragStartEvent) {
    const t = (tasks ?? []).find((x) => x.id === e.active.id)
    setActiveTask(t ?? null)
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeCol = findContainer(activeId)
    const overCol = findContainer(overId)
    if (!activeCol || !overCol) return
    if (activeCol === overCol) return // same column handled on drop
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveTask(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const activeCol = findContainer(activeId)
    const overCol = findContainer(overId)
    if (!activeCol || !overCol) return

    const activeTaskObj = (tasks ?? []).find((t) => t.id === activeId)
    if (!activeTaskObj) return

    // Compute target index within overCol
    const colTasks = [...columns[overCol]]
    let toIndex: number
    if (KANBAN_COLUMNS.includes(overId as never)) {
      // dropped onto the column itself → append to end
      toIndex = colTasks.length
    } else {
      const overIdx = colTasks.findIndex((t) => t.id === overId)
      toIndex = overIdx < 0 ? colTasks.length : overIdx
      if (activeId === overId) return
    }

    // Build new ordering for optimistic update
    let reordered: Task[]
    if (activeCol === overCol) {
      const fromIdx = colTasks.findIndex((t) => t.id === activeId)
      reordered = arrayMove(colTasks, fromIdx, toIndex)
    } else {
      reordered = colTasks.filter((t) => t.id !== activeId)
      reordered.splice(toIndex, 0, { ...activeTaskObj, status: overCol })
    }

    // Optimistic: update cache with new positions/status
    qc.setQueryData<Task[]>(["tasks", effectiveProjectId, search, assigneeFilter, priorityFilter], (old) => {
      if (!old) return old
      const next = old.filter((t) => t.id !== activeId)
      const withNew = reordered.map((t, i) => ({ ...t, position: i }))
      // merge: replace existing + add new ordering
      const merged = [...next.filter((t) => !withNew.find((w) => w.id === t.id)), ...withNew]
      return merged
    })

    moveMut.mutate({ taskId: activeId, toStatus: overCol, toPosition: toIndex })
  }

  if (!activeOrg) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization selected"
        description="Select or create an organization to view the task board."
        action={<Button onClick={() => setView("organizations")}>Browse organizations</Button>}
      />
    )
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <PageHeader
        title="Task Board"
        description="Drag and drop tasks across columns. Changes sync in real time."
        icon={KanbanSquare}
        actions={
          <Select value={effectiveProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anyone</SelectItem>
            {(members ?? []).map((m) => (
              <SelectItem key={m.user.id} value={m.user.id}>{m.user.name ?? m.user.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any priority</SelectItem>
            {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || assigneeFilter || priorityFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setAssigneeFilter(""); setPriorityFilter("") }}>
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {!selectedProject ? (
        <EmptyState
          icon={KanbanSquare}
          title="No project selected"
          description="Choose a project above, or create one in the Projects view."
          action={<Button onClick={() => setView("projects")}>Go to projects</Button>}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {KANBAN_COLUMNS.map((c) => (
            <div key={c} className="space-y-2">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {KANBAN_COLUMNS.map((col) => (
              <Column
                key={col}
                col={col}
                tasks={columns[col] ?? []}
                onAdd={() => setCreateCol(col)}
                onOpenTask={setDetailTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Quick create task — keyed by col so it remounts fresh each open (no reset effect needed) */}
      {createCol && (
        <CreateTaskDialog
          key={createCol}
          col={createCol}
          projectId={effectiveProjectId}
          members={members ?? []}
          onClose={() => setCreateCol(null)}
        />
      )}

      {/* Task detail with comments */}
      <TaskDetailDialog
        task={detailTask}
        onOpenChange={(o) => !o && setDetailTask(null)}
        projectId={effectiveProjectId}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------
function Column({
  col,
  tasks,
  onAdd,
  onOpenTask,
}: {
  col: string
  tasks: Task[]
  onAdd: () => void
  onOpenTask: (t: Task) => void
}) {
  const { setNodeRef } = useSortable({ id: col, data: { type: "column" } })

  return (
    <div className="flex flex-col rounded-xl border bg-muted/30">
      <div ref={setNodeRef} className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", COLUMN_ACCENT[col])} />
          <span className="text-sm font-semibold">{STATUS_LABELS[col]}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tasks.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAdd} aria-label="Add task">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto tf-scroll">
          {tasks.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Drop tasks here
            </div>
          ) : (
            tasks.map((t) => (
              <SortableTaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task card (sortable)
// ---------------------------------------------------------------------------
function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <TaskCard task={task} onOpen={onOpen} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

function TaskCard({
  task,
  onOpen,
  dragging,
  dragHandleProps,
}: {
  task: Task
  onOpen?: () => void
  dragging?: boolean
  dragHandleProps?: Record<string, unknown>
}) {
  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        dragging && "shadow-lg ring-2 ring-primary/40 cursor-grabbing"
      )}
      onClick={onOpen}
    >
      {dragHandleProps && (
        <button
          className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag task"
          onClick={(e) => e.stopPropagation()}
          {...(dragHandleProps as object)}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="mb-2 flex items-start gap-2 pr-6">
        <Badge variant="secondary" className={cn("h-1.5 w-1.5 rounded-full p-0", PRIORITY_BADGE_CLASS[task.priority])} />
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      </div>
      {task.labels && task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((l) => (
            <span
              key={l.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${l.color}22`, color: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.dueDate && (
            <span className={cn("flex items-center gap-1", isOverdue(task.dueDate) && task.status !== "done" && "text-destructive")}>
              <Calendar className="h-3 w-3" /> {formatDate(task.dueDate)}
            </span>
          )}
          {!!task.counts?.comments && (
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {task.counts.comments}</span>
          )}
          {!!task.counts?.attachments && (
            <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {task.counts.attachments}</span>
          )}
        </div>
        {task.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(task.assignee.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create task dialog
// ---------------------------------------------------------------------------
function CreateTaskDialog({
  col,
  projectId,
  members,
  onClose,
}: {
  col: string
  projectId: string
  members: Member[]
  onClose: () => void
}) {
  const { activeOrg } = useAppStore()
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<string>("medium")
  const [assigneeId, setAssigneeId] = useState<string>("")

  const mut = useMutation({
    mutationFn: () =>
      api.post(`/api/organizations/${activeOrg!.id}/projects/${projectId}/tasks`, {
        title,
        description: description || undefined,
        priority,
        status: col,
        assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : undefined,
      }),
    onSuccess: () => {
      toast.success("Task created")
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["analytics"] })
      onClose()
    },
    onError: (e) => toast.error((e as ApiError).message || "Failed to create task"),
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task in {STATUS_LABELS[col]}</DialogTitle>
          <DialogDescription>Add a task to this column.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <UILabel htmlFor="title">Title</UILabel>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus />
          </div>
          <div className="space-y-1.5">
            <UILabel htmlFor="desc">Description</UILabel>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <UILabel>Priority</UILabel>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <UILabel>Assignee</UILabel>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user.id} value={m.user.id}>{m.user.name ?? m.user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!title.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Task detail + comments
// ---------------------------------------------------------------------------
function TaskDetailDialog({
  task,
  onOpenChange,
  projectId,
}: {
  task: Task | null
  onOpenChange: (o: boolean) => void
  projectId: string
}) {
  const { activeOrg } = useAppStore()
  const qc = useQueryClient()
  const [comment, setComment] = useState("")

  const { data: fullTask } = useQuery({
    queryKey: ["task", task?.id],
    queryFn: () => api.get<Task & { comments: Comment[] }>(`/api/organizations/${activeOrg!.id}/projects/${projectId}/tasks/${task!.id}`),
    enabled: !!task,
  })

  const comments = fullTask?.comments ?? []

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/organizations/${activeOrg!.id}/projects/${projectId}/tasks/${task!.id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["task", task?.id] })
    },
  })

  const addComment = useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/organizations/${activeOrg!.id}/projects/${projectId}/tasks/${task!.id}/comments`, { content }),
    onSuccess: () => {
      setComment("")
      qc.invalidateQueries({ queryKey: ["task", task?.id] })
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (e) => toast.error((e as ApiError).message || "Failed to post comment"),
  })

  if (!task) return null
  const t = fullTask ?? task

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn(PRIORITY_BADGE_CLASS[t.priority])}>{PRIORITY_LABELS[t.priority]}</Badge>
            <Badge variant="secondary" className={cn(STATUS_BADGE_CLASS[t.status])}>{STATUS_LABELS[t.status]}</Badge>
          </div>
          <DialogTitle className="text-xl">{t.title}</DialogTitle>
          {t.description && <DialogDescription className="text-sm">{t.description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Assignee</p>
            <div className="mt-1 flex items-center gap-2">
              {t.assignee ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={t.assignee.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(t.assignee.name)}</AvatarFallback>
                  </Avatar>
                  <span>{t.assignee.name}</span>
                </>
              ) : <span className="text-muted-foreground">Unassigned</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due date</p>
            <p className={cn("mt-1", t.dueDate && isOverdue(t.dueDate) && t.status !== "done" && "text-destructive font-medium")}>
              {t.dueDate ? formatDate(t.dueDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Move to</p>
            <Select value={t.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="mt-1 text-muted-foreground">{relativeTime(t.createdAt)} by {t.createdBy?.name ?? "—"}</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="mb-2 text-sm font-semibold">Comments ({comments.length})</p>
          <ScrollArea className="max-h-48 pr-3">
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={c.user.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(c.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{c.user.name}</span>
                        <span className="text-[10px] text-muted-foreground">{relativeTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="mt-3 flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && comment.trim()) { e.preventDefault(); addComment.mutate(comment.trim()) } }}
            />
            <Button size="icon" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate(comment.trim())}>
              {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
