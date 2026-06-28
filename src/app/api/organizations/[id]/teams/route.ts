import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { apiHandler, ok, created, parseBody } from "@/lib/api"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "team", "view")
  const teams = await db.team.findMany({
    where: { organizationId: id, archivedAt: null },
    include: {
      _count: { select: { members: true, projects: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })
  return ok(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      color: t.color,
      createdAt: t.createdAt,
      counts: t._count,
      members: t.members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, avatarUrl: m.user.avatarUrl, role: m.role })),
    }))
  )
})

export const POST = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  const { user } = await authorizeInOrg(id, "team", "create")
  const parsed = await parseBody(req, createSchema)
  if (!parsed.ok) return parsed.response
  const { name, description, color } = parsed.data

  const team = await db.team.create({
    data: {
      organizationId: id,
      name,
      description: description ?? null,
      color: color ?? "#10b981",
      members: { create: { userId: user.id, role: "lead" } },
    },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "team.create",
    resource: "team",
    resourceId: team.id,
    metadata: { name },
  })

  return created({
    id: team.id,
    name: team.name,
    description: team.description,
    color: team.color,
  })
})
