"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckCircle2,
  ListTodo,
  Building2,
  ArrowRight,
  Activity as ActivityIcon,
  TrendingUp,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { useAppStore } from "@/stores/app-store"
import { api, apiPaginated } from "@/lib/api-client"
import type { Analytics, ActivityLog, Project, Member } from "@/lib/types"
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/constants"
import { relativeTime, formatDate } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import {
  PageHeader,
  EmptyState,
  StatCard,
  LoadingBlock,
} from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

const TASK_STATUS_COLORS: Record<string, string> = {
  backlog: "#64748b",
  todo: "#0ea5e9",
  in_progress: "#8b5cf6",
  in_review: "#f59e0b",
  done: "#10b981",
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
      }
      if (verb === "move" && (meta.from || meta.to)) {
        const from = meta.from as string | undefined
        const to = meta.to as string | undefined
        if (from && to) {
          sentence += ` from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}`
        }
      }
    }
  } catch {
    /* ignore metadata parse errors */
  }
  return sentence
}

export function DashboardView() {
  const { activeOrg, setView } = useAppStore()

  const analyticsQ = useQuery({
    queryKey: ["org", activeOrg?.id, "analytics"],
    queryFn: () => api.get<Analytics>(`/api/organizations/${activeOrg!.id}/analytics`),
    enabled: !!activeOrg,
  })

  const projectsQ = useQuery({
    queryKey: ["org", activeOrg?.id, "projects", "recent5"],
    queryFn: () =>
      apiPaginated<Project>(`/api/organizations/${activeOrg!.id}/projects`, {
        page: 1,
        pageSize: 5,
      }),
    enabled: !!activeOrg,
  })

  const membersQ = useQuery({
    queryKey: ["org", activeOrg?.id, "members", "recent5"],
    queryFn: () => api.get<Member[]>(`/api/organizations/${activeOrg!.id}/members`),
    enabled: !!activeOrg,
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

  const overview = analyticsQ.data?.overview
  const taskStatusCounts = analyticsQ.data?.taskStatusCounts ?? {}
  const trend = analyticsQ.data?.completionTrend ?? []
  const recentActivity = analyticsQ.data?.recentActivity ?? []
  const recentProjects = projectsQ.data?.items ?? []
  const members = (membersQ.data ?? []).slice(0, 5)

  const statusData = Object.entries(taskStatusCounts).map(([key, value]) => ({
    name: STATUS_LABELS[key] ?? key,
    value: value as number,
    color: TASK_STATUS_COLORS[key] ?? "#64748b",
  }))

  const trendData = trend.map((t) => ({
    date: t.date.slice(5),
    count: t.count,
  }))

  const completionRate = overview?.completionRate ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeOrg.name}
        description={`${activeOrg.plan} plan · ${activeOrg.role} role`}
        icon={LayoutDashboard}
        actions={
          <Button variant="outline" size="sm" onClick={() => setView("analytics")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            View analytics
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {analyticsQ.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Members"
              value={overview?.members ?? 0}
              icon={Users}
              hint="Active in organization"
              accent="primary"
            />
            <StatCard
              label="Teams"
              value={overview?.teams ?? 0}
              icon={Building2}
              hint="Across all projects"
              accent="violet"
            />
            <StatCard
              label="Projects"
              value={overview?.projects ?? 0}
              icon={FolderKanban}
              hint="Excludes archived"
              accent="amber"
            />
            <StatCard
              label="Tasks"
              value={overview?.tasks ?? 0}
              icon={ListTodo}
              hint="All statuses"
              accent="emerald"
            />
            <StatCard
              label="Completion"
              value={`${completionRate}%`}
              icon={CheckCircle2}
              hint="Tasks marked done"
              accent="rose"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Task completion trend</CardTitle>
            <p className="text-xs text-muted-foreground">Tasks moved to “done” over the last 14 days</p>
          </CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? (
              <LoadingBlock label="Loading trend…" />
            ) : trendData.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No data yet" description="Completion trend will appear here once tasks are completed." className="py-8" />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Task status breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution across the kanban board</p>
          </CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? (
              <LoadingBlock label="Loading breakdown…" />
            ) : statusData.length === 0 ? (
              <EmptyState icon={ListTodo} title="No tasks yet" description="Create tasks to see status distribution." className="py-8" />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {statusData.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent projects + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent projects</CardTitle>
              <p className="text-xs text-muted-foreground">Latest projects in this organization</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("projects")}>
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {projectsQ.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to get started." className="mx-4 mb-4" action={<Button size="sm" onClick={() => setView("projects")}>Create project</Button>} />
            ) : (
              <ul className="divide-y">
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setView("projects")}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          {p.team && (
                            <span
                              className="hidden h-1.5 w-1.5 rounded-full sm:inline-block"
                              style={{ backgroundColor: p.team.color }}
                              aria-hidden
                            />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.taskCount ?? 0} tasks · Due {formatDate(p.dueDate)}
                        </p>
                      </div>
                      {p.owner && (
                        <Avatar className="hidden h-7 w-7 sm:flex">
                          {p.owner.avatarUrl ? <AvatarImage src={p.owner.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-[10px]">{initials(p.owner.name)}</AvatarFallback>
                        </Avatar>
                      )}
                      <Badge variant="secondary" className={cn("ml-1 whitespace-nowrap", STATUS_BADGE_CLASS[p.status] ?? "")}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
              <p className="text-xs text-muted-foreground">What your team has been doing</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("activity")}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {analyticsQ.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState icon={ActivityIcon} title="No activity yet" description="Actions taken by your team will appear here." className="mx-4 mb-4" />
            ) : (
              <ul className="max-h-[420px] divide-y overflow-y-auto tf-scroll">
                {recentActivity.slice(0, 6).map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar className="h-8 w-8">
                      {log.actor?.avatarUrl ? <AvatarImage src={log.actor.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[10px]">{initials(log.actor?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">
                        <span className="font-medium">{log.actor?.name ?? "Someone"}</span>{" "}
                        <span className="text-muted-foreground">{describeLog(log)}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(log.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members snapshot */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Team members</CardTitle>
            <p className="text-xs text-muted-foreground">People in this organization</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("members")}>
            Manage
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {membersQ.isLoading ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState icon={Users} title="No members yet" description="Invite teammates to join your organization." className="py-8" action={<Button size="sm" onClick={() => setView("invitations")}>Invite members</Button>} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setView("members")}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
                >
                  <Avatar className="h-9 w-9">
                    {m.user.avatarUrl ? <AvatarImage src={m.user.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="text-xs">{initials(m.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.user.name ?? m.user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.user.jobTitle ?? m.user.email}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
