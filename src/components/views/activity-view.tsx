"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ScrollText,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Filter,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { apiPaginated } from "@/lib/api-client"
import type { ActivityLog } from "@/lib/types"
import { relativeTime } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import { PageHeader, EmptyState, LoadingBlock } from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

const RESOURCE_OPTIONS = [
  { value: "all", label: "All resources" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "member", label: "Members" },
  { value: "team", label: "Teams" },
  { value: "invitation", label: "Invitations" },
  { value: "comment", label: "Comments" },
  { value: "label", label: "Labels" },
  { value: "organization", label: "Organization" },
]

const RESOURCE_BADGE_CLASS: Record<string, string> = {
  project: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  task: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  member: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  team: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  invitation: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  comment: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  label: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  organization: "bg-primary/10 text-primary",
}

const ACTION_VERBS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  move: "moved",
  assign: "assigned",
  archive: "archived",
  restore: "restored",
  invite: "invited",
  accept: "accepted",
  reject: "rejected",
  comment: "commented on",
  complete: "completed",
  remove: "removed",
}

function describeLog(log: ActivityLog): string {
  const [resource, verb] = log.action.split(".")
  const humanVerb = ACTION_VERBS[verb ?? ""] ?? verb ?? "modified"
  const article = resource === "invitation" ? "an" : "a"
  let sentence = `${humanVerb} ${article} ${resource.replace(/_/g, " ")}`
  try {
    if (log.metadata) {
      const meta = JSON.parse(log.metadata) as Record<string, unknown>
      if (typeof meta.name === "string" && meta.name) {
        sentence = `${humanVerb} ${resource.replace(/_/g, " ")} “${meta.name}”`
      } else if (typeof meta.title === "string" && meta.title) {
        sentence = `${humanVerb} ${resource.replace(/_/g, " ")} “${meta.title}”`
      } else if (typeof meta.email === "string" && meta.email) {
        sentence = `${humanVerb} ${article} ${resource.replace(/_/g, " ")} “${meta.email}”`
      }
      if (verb === "move" && (meta.from || meta.to)) {
        const from = meta.from as string | undefined
        const to = meta.to as string | undefined
        if (from && to) {
          sentence += ` from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}`
        } else if (to) {
          sentence += ` to ${to.replace(/_/g, " ")}`
        }
      }
    }
  } catch {
    /* ignore metadata parse errors */
  }
  return sentence
}

const PAGE_SIZE = 25

export function ActivityView() {
  const { activeOrg, setView } = useAppStore()

  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [resource, setResource] = React.useState("all")
  const [action, setAction] = React.useState("")
  const [page, setPage] = React.useState(1)

  // Debounce search input (300ms)
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1)
  }, [resource, action])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [
      "org",
      activeOrg?.id,
      "activity-logs",
      { page, pageSize: PAGE_SIZE, resource, action, debouncedSearch },
    ],
    queryFn: () =>
      apiPaginated<ActivityLog>(`/api/organizations/${activeOrg!.id}/activity-logs`, {
        page,
        pageSize: PAGE_SIZE,
        resource: resource === "all" ? "" : resource,
        action: action.trim() || "",
        search: debouncedSearch || "",
      }),
    enabled: !!activeOrg,
  })

  if (!activeOrg) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization selected"
        description="Select or create an organization to view its activity log."
        action={<Button onClick={() => setView("organizations")}>Browse organizations</Button>}
      />
    )
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const currentPage = data?.page ?? page

  const startIdx = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(currentPage * PAGE_SIZE, total)

  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Complete audit trail of every action in this organization"
        icon={ScrollText}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by action or resource…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={resource} onValueChange={setResource}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Action (e.g. create, move)"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full sm:w-[200px]"
              />
              {(search || resource !== "all" || action) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setResource("all")
                    setAction("")
                    setPage(1)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <EmptyState
              icon={Inbox}
              title="Failed to load activity"
              description="Something went wrong while fetching the audit log. Please try again."
              className="mx-4 my-4"
              action={<Button size="sm" onClick={() => setPage((p) => p)}>Retry</Button>}
            />
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No activity found"
              description="No audit log entries match your current filters. Try adjusting them."
              className="mx-4 my-4"
            />
          ) : (
            <>
              <ul
                className="tf-scroll max-h-[70vh] divide-y overflow-y-auto"
                aria-label="Activity log entries"
              >
                {items.map((log) => (
                  <li
                    key={log.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                      isFetching && "opacity-70"
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {log.actor?.avatarUrl ? <AvatarImage src={log.actor.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[11px]">
                        {initials(log.actor?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">
                        <span className="font-medium">{log.actor?.name ?? "Unknown user"}</span>{" "}
                        <span className="text-muted-foreground">{describeLog(log)}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-medium capitalize",
                            RESOURCE_BADGE_CLASS[log.resource] ?? ""
                          )}
                        >
                          {log.resource.replace(/_/g, " ")}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {relativeTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  {total === 0
                    ? "No entries"
                    : `Showing ${startIdx}–${endIdx} of ${total} ${total === 1 ? "entry" : "entries"}`}
                  {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={!canNext}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
