import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { cache } from "@/lib/cache"
import { PROJECT_STATUSES, PROJECT_VISIBILITY } from "@/lib/constants"
import { apiHandler, ok, created, paginated, parseBody, fail } from "@/lib/api"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum([...PROJECT_STATUSES] as [string, ...string[]]).default("active"),
  visibility: z.enum([...PROJECT_VISIBILITY] as [string, ...string[]]).default("internal"),
  teamId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
})

export const GET = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "project", "view")

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10)))
  const search = url.searchParams.get("search")?.trim() ?? ""
  const status = url.searchParams.get("status") ?? ""
  const teamId = url.searchParams.get("teamId") ?? ""
  const sort = url.searchParams.get("sort") ?? "createdAt"
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc"
  const includeArchived = url.searchParams.get("archived") === "true"

  const ck = `org:${id}:projects:p${page}:s${pageSize}:q${search}:st${status}:t${teamId}:${sort}:${order}:a${includeArchived}`
  const cached = cache.get<{ items: unknown[]; total: number }>(ck)
  if (cached) return paginated(cached.items, cached.total, page, pageSize)

  const where = {
    organizationId: id,
    ...(search ? { name: { contains: search } } : {}),
    ...(status ? { status } : {}),
    ...(teamId ? { teamId } : {}),
    ...(includeArchived ? {} : { archivedAt: null }),
  } as const

  const allowedSorts = ["createdAt", "updatedAt", "name", "dueDate", "status"] as const
  const sortField = (allowedSorts as readonly string[]).includes(sort) ? sort : "createdAt"

  const [total, items] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        team: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { [sortField]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const data = items.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    visibility: p.visibility,
    dueDate: p.dueDate,
    archivedAt: p.archivedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    owner: p.owner,
    team: p.team,
    taskCount: p._count.tasks,
  }))

  cache.set(ck, { items: data, total }, 15_000)
  return paginated(data, total, page, pageSize)
})

export const POST = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  const { user } = await authorizeInOrg(id, "project", "create")
  const parsed = await parseBody(req, createSchema)
  if (!parsed.ok) return parsed.response
  const { name, description, status, visibility, teamId, dueDate } = parsed.data

  if (teamId) {
    const team = await db.team.findFirst({ where: { id: teamId, organizationId: id } })
    if (!team) return fail("Team not found", 404, "not_found")
  }

  const project = await db.project.create({
    data: {
      organizationId: id,
      teamId: teamId ?? null,
      name,
      description: description || null,
      status,
      visibility,
      ownerId: user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })

  cache.invalidatePrefix(`org:${id}:projects:`)

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "project.create",
    resource: "project",
    resourceId: project.id,
    metadata: { name, status, visibility },
  })

  return created(project)
})

