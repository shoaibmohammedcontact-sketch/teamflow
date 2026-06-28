"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  Users,
  Building2,
  FolderKanban,
  ListTodo,
  CheckCircle2,
  PieChart as PieIcon,
  Layers,
  Inbox,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { useAppStore } from "@/stores/app-store"
import { api, apiPaginated } from "@/lib/api-client"
import type { Analytics, ActivityLog } from "@/lib/types"
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_PRIORITIES,
  PROJECT_STATUSES,
} from "@/lib/constants"
import { PageHeader, StatCard, EmptyState, LoadingBlock } from "@/components/app/view-helpers"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

const TASK_STATUS_COLORS: Record<string, string> = {
  backlog: "#64748b",
  todo: "#0ea5e9",
  in_progress: "#8b5cf6",
  in_review: "#f59e0b",
  done: "#10b981",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "#64748b",
  medium: "#0ea5e9",
  high: "#f59e0b",
  urgent: "#f43f5e",
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  on_hold: "#f59e0b",
  completed: "#64748b",
  cancelled: "#f43f5e",
}

const RESOURCE_LABELS: Record<string, string> = {
  project: "Projects",
  task: "Tasks",
  member: "Members",
  team: "Teams",
  invitation: "Invitations",
  comment: "Comments",
  label: "Labels",
  organization: "Organization",
}

function buildCounts<T extends string>(
  map: Record<string, number>,
  keys: readonly T[],
  labels: Record<string, string>,
  colors: Record<string, string>
) {
  return keys.map((k) => ({
    name: labels[k] ?? k,
    value: map[k] ?? 0,
    color: colors[k] ?? "#64748b",
  }))
}

export function AnalyticsView() {
  const { activeOrg, setView } = useAppStore()

  const analyticsQ = useQuery({
    queryKey: ["org", activeOrg?.id, "analytics"],
    queryFn: () => api.get<Analytics>(`/api/organizations/${activeOrg!.id}/analytics`),
    enabled: !!activeOrg,
  })

  // Fetch a page of activity logs to compute activity-by-resource-type
  const activityQ = useQuery({
    queryKey: ["org", activeOrg?.id, "activity", "analytics", 1, 100],
    queryFn: () =>
      apiPaginated<ActivityLog>(`/api/organizations/${activeOrg!.id}/activity-logs`, {
        page: 1,
        pageSize: 100,
      }),
    enabled: !!activeOrg,
  })

  if (!activeOrg) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization selected"
        description="Select or create an organization to view analytics."
        action={<Button onClick={() => setView("organizations")}>Browse organizations</Button>}
      />
    )
  }

  const overview = analyticsQ.data?.overview
  const taskStatusCounts = analyticsQ.data?.taskStatusCounts ?? {}
  const taskPriorityCounts = analyticsQ.data?.taskPriorityCounts ?? {}
  const projectStatusCounts = analyticsQ.data?.projectStatusCounts ?? {}
  const trend = analyticsQ.data?.completionTrend ?? []
  const completionRate = overview?.completionRate ?? 0

  const statusData = buildCounts(
    taskStatusCounts as Record<string, number>,
    TASK_STATUSES,
    STATUS_LABELS,
    TASK_STATUS_COLORS
  )
  const priorityData = buildCounts(
    taskPriorityCounts as Record<string, number>,
    TASK_PRIORITIES,
    PRIORITY_LABELS,
    PRIORITY_COLORS
  )
  const projectData = buildCounts(
    projectStatusCounts as Record<string, number>,
    PROJECT_STATUSES,
    STATUS_LABELS,
    PROJECT_STATUS_COLORS
  )

  const trendData = trend.map((t) => ({ date: t.date.slice(5), count: t.count }))

  // Activity by resource type
  const resourceCounts: Record<string, number> = {}
  for (const log of activityQ.data?.items ?? []) {
    resourceCounts[log.resource] = (resourceCounts[log.resource] ?? 0) + 1
  }
  const resourceData = Object.entries(resourceCounts)
    .map(([k, v]) => ({
      name: RESOURCE_LABELS[k] ?? k.replace(/_/g, " "),
      value: v,
      color: TASK_STATUS_COLORS[k] ?? PRIORITY_COLORS[k] ?? "#64748b",
    }))
    .sort((a, b) => b.value - a.value)

  const totalActivity = resourceData.reduce((a, b) => a + b.value, 0)

  const cardCls = "rounded-xl border bg-card p-5"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Insights across your organization"
        icon={BarChart3}
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {analyticsQ.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Members" value={overview?.members ?? 0} icon={Users} accent="primary" />
            <StatCard label="Teams" value={overview?.teams ?? 0} icon={Building2} accent="violet" />
            <StatCard label="Projects" value={overview?.projects ?? 0} icon={FolderKanban} accent="amber" />
            <StatCard label="Tasks" value={overview?.tasks ?? 0} icon={ListTodo} accent="emerald" />
            <StatCard label="Completion" value={`${completionRate}%`} icon={CheckCircle2} accent="rose" hint="Tasks done" />
          </>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Project status breakdown</CardTitle>
                <CardDescription>Counts by project status</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsQ.isLoading ? (
                  <LoadingBlock label="Loading…" />
                ) : projectData.every((d) => d.value === 0) ? (
                  <EmptyState icon={FolderKanban} title="No projects" description="Create projects to populate this chart." className="py-8" />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={80} />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {projectData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">14-day completion trend</CardTitle>
                <CardDescription>Tasks completed per day</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsQ.isLoading ? (
                  <LoadingBlock label="Loading…" />
                ) : trendData.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No trend data" description="Recent task completions will appear here." className="py-8" />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ovTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#ovTrend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cardCls}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Completion rate</p>
                  <p className="text-xl font-bold">{completionRate}%</p>
                </div>
              </div>
            </div>
            <div className={cardCls}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Active projects</p>
                  <p className="text-xl font-bold">{projectStatusCounts.active ?? 0}</p>
                </div>
              </div>
            </div>
            <div className={cardCls}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">In-progress tasks</p>
                  <p className="text-xl font-bold">{taskStatusCounts.in_progress ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tasks tab */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieIcon className="h-4 w-4" /> Task status distribution
                </CardTitle>
                <CardDescription>Distribution across all tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsQ.isLoading ? (
                  <LoadingBlock label="Loading…" />
                ) : statusData.every((d) => d.value === 0) ? (
                  <EmptyState icon={ListTodo} title="No tasks" description="Create tasks to see distribution." className="py-8" />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={95}
                          label={(entry: { name?: string; value?: number }) => `${entry.value ?? 0}`}
                          labelLine={false}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        >
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Task priority distribution</CardTitle>
                <CardDescription>Low, medium, high, urgent counts</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsQ.isLoading ? (
                  <LoadingBlock label="Loading…" />
                ) : priorityData.every((d) => d.value === 0) ? (
                  <EmptyState icon={ListTodo} title="No priorities" description="No tasks with priority set yet." className="py-8" />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {priorityData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity tab */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Activity by resource type
              </CardTitle>
              <CardDescription>
                Distribution of the most recent {totalActivity} audit events by resource
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityQ.isLoading ? (
                <LoadingBlock label="Loading activity…" />
              ) : resourceData.length === 0 ? (
                <EmptyState icon={Inbox} title="No activity" description="Actions taken in your organization will appear here." className="py-8" />
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourceData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {resourceData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource table */}
          {resourceData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Resource breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {resourceData.map((r) => {
                    const pct = totalActivity > 0 ? Math.round((r.value / totalActivity) * 100) : 0
                    return (
                      <li key={r.name} className="flex items-center gap-3 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="flex-1 text-sm font-medium">{r.name}</span>
                        <span className="text-sm text-muted-foreground">{pct}%</span>
                        <span className="w-10 text-right text-sm font-semibold">{r.value}</span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
