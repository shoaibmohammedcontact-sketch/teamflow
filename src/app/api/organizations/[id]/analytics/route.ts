import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { cache } from "@/lib/cache"
import { apiHandler, ok } from "@/lib/api"

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "organization", "view")

  const ck = `org:${id}:analytics`
  const cached = cache.get<unknown>(ck)
  if (cached) return ok(cached)

  const [projects, tasks, members, teams, activityLogs] = await Promise.all([
    db.project.groupBy({
      by: ["status"],
      where: { organizationId: id, archivedAt: null },
      _count: true,
    }),
    db.task.groupBy({
      by: ["status"],
      where: { project: { organizationId: id } },
      _count: true,
    }),
    db.organizationMember.count({ where: { organizationId: id, status: "active" } }),
    db.team.count({ where: { organizationId: id, archivedAt: null } }),
    db.activityLog.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    }),
  ])

  const tasksByPriority = await db.task.groupBy({
    by: ["priority"],
    where: { project: { organizationId: id } },
    _count: true,
  })

  // Last 14 days task completion trend
  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
  const recentDone = await db.task.findMany({
    where: { project: { organizationId: id }, status: "done", updatedAt: { gte: since } },
    select: { updatedAt: true },
  })
  const trend: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const count = recentDone.filter((t) => t.updatedAt.toISOString().slice(0, 10) === key).length
    trend.push({ date: key, count })
  }

  const projectStatusCounts = Object.fromEntries(
    projects.map((p) => [p.status, p._count])
  )
  const taskStatusCounts = Object.fromEntries(tasks.map((t) => [t.status, t._count]))
  const taskPriorityCounts = Object.fromEntries(tasksByPriority.map((t) => [t.priority, t._count]))

  const totalTasks = Object.values(taskStatusCounts).reduce((a, b) => a + b, 0)
  const doneTasks = taskStatusCounts["done"] ?? 0
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const result = {
    overview: {
      members,
      teams,
      projects: Object.values(projectStatusCounts).reduce((a, b) => a + b, 0),
      tasks: totalTasks,
      completionRate,
    },
    projectStatusCounts,
    taskStatusCounts,
    taskPriorityCounts,
    completionTrend: trend,
    recentActivity: activityLogs,
  }

  cache.set(ck, result, 30_000)
  return ok(result)
})
