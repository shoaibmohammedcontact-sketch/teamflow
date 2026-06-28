"use client"

import { useQuery } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api-client"
import type { Notification } from "@/lib/types"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/slug"
import { toast } from "sonner"

export function NotificationsBell() {
  const { setView } = useAppStore()
  const { data, refetch } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => api.get<Notification[]>("/api/user/notifications?pageSize=10"),
    refetchInterval: 30_000,
  })
  const unread = (data ?? []).filter((n) => !n.read).length

  async function markAll() {
    try {
      await api.patch("/api/user/notifications", { markAllRead: true })
      await refetch()
      toast.success("Marked all as read")
    } catch (e) {
      toast.error("Failed to update notifications")
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[1.15rem] w-[1.15rem]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-80">
          <div className="flex flex-col">
            {(data ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              (data ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setView("notifications")}
                  className={cn(
                    "flex flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  <span className="text-[10px] text-muted-foreground/70">{relativeTime(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <button
          onClick={() => setView("notifications")}
          className="w-full border-t px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-accent/50"
        >
          View all notifications
        </button>
      </PopoverContent>
    </Popover>
  )
}
