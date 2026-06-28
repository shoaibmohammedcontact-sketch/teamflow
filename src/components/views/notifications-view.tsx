"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  Building2,
  CheckCircle2,
  MessageSquare,
  Mail,
  FolderSync,
  Info,
  MoreHorizontal,
  Trash2,
  Check,
  Inbox,
  CircleDot,
  BellOff,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { ApiError } from "@/lib/api-client"
import type { Notification } from "@/lib/types"
import { relativeTime } from "@/lib/slug"
import { cn } from "@/lib/utils"
import { PageHeader, EmptyState } from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

type NotificationType =
  | "task_assigned"
  | "comment_mention"
  | "invitation"
  | "project_update"
  | "system"
  | string

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  task_assigned: CheckCircle2,
  comment_mention: MessageSquare,
  invitation: Mail,
  project_update: FolderSync,
  system: Info,
}

const TYPE_COLOR: Record<string, string> = {
  task_assigned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  comment_mention: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  invitation: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  project_update: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  system: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

function getTypeIcon(type: NotificationType) {
  return TYPE_ICON[type] ?? Bell
}

function getTypeColor(type: NotificationType) {
  return TYPE_COLOR[type] ?? "bg-primary/10 text-primary"
}

interface NotificationResult {
  items: Notification[]
  unreadCount: number
}

async function fetchNotifications(unreadOnly: boolean): Promise<NotificationResult> {
  const url = `/api/user/notifications?pageSize=50${unreadOnly ? "&unread=true" : ""}`
  const res = await fetch(url, {
    credentials: "include",
    headers: { "content-type": "application/json" },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new ApiError(
      json?.error?.message ?? "Failed to fetch notifications",
      res.status,
      json?.error?.code ?? "error"
    )
  }
  return {
    items: (json.data ?? []) as Notification[],
    unreadCount: typeof json.meta?.unreadCount === "number" ? json.meta.unreadCount : 0,
  }
}

export function NotificationsView() {
  const { activeOrg, setView } = useAppStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = React.useState<"all" | "unread">("all")

  const query = useQuery({
    queryKey: ["notifications", "list", tab],
    queryFn: () => fetchNotifications(tab === "unread"),
    refetchInterval: 30_000,
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new ApiError(json?.error?.message ?? "Failed", res.status)
      }
      return json
    },
    onSuccess: () => {
      toast.success("All notifications marked as read")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to update notifications"
      toast.error(msg)
    },
  })

  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const res = await fetch("/api/user/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, read }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new ApiError(json?.error?.message ?? "Failed", res.status)
      }
      return json
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.read ? "Marked as read" : "Marked as unread")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to update notification"
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new ApiError(json?.error?.message ?? "Failed", res.status)
      }
      return json
    },
    onSuccess: () => {
      toast.success("Notification deleted")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to delete notification"
      toast.error(msg)
    },
  })

  if (!activeOrg) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization selected"
        description="Select or create an organization to continue."
        action={<Button onClick={() => setView("organizations")}>Browse organizations</Button>}
      />
    )
  }

  const items = query.data?.items ?? []
  const unreadCount = query.data?.unreadCount ?? 0
  const hasUnread = items.some((n) => !n.read)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay on top of what matters"
        icon={Bell}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || !hasUnread}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "all" | "unread")}
        className="w-full"
      >
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              All
              {query.data && query.data.items.length > 0 && (
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                  {query.data.items.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5">
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : query.isError ? (
            <EmptyState
              icon={BellOff}
              title="Failed to load notifications"
              description="Something went wrong. Please try again."
              className="mx-4 my-4"
              action={
                <Button size="sm" onClick={() => query.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={tab === "unread" ? "No unread notifications" : "You're all caught up"}
              description={
                tab === "unread"
                  ? "You have no unread notifications. Nice work!"
                  : "Notifications about tasks, mentions, and project updates will appear here."
              }
              className="mx-4 my-4"
            />
          ) : (
            <ul className="tf-scroll max-h-[70vh] divide-y overflow-y-auto">
              {items.map((n) => {
                const Icon = getTypeIcon(n.type)
                const colorCls = getTypeColor(n.type)
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                      !n.read && "bg-primary/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        colorCls
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm", n.read ? "font-medium" : "font-semibold")}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label="Notification actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {n.read ? (
                          <DropdownMenuItem
                            onClick={() =>
                              toggleReadMutation.mutate({ id: n.id, read: false })
                            }
                          >
                            <CircleDot className="mr-2 h-3.5 w-3.5" />
                            Mark as unread
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => toggleReadMutation.mutate({ id: n.id, read: true })}
                          >
                            <Check className="mr-2 h-3.5 w-3.5" />
                            Mark as read
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteMutation.mutate(n.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
