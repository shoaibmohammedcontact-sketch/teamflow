import { db } from "@/lib/db"
import { resolveOrgContext, authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { cache } from "@/lib/cache"
import { apiHandler, ok, notFound, parseBody } from "@/lib/api"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  plan: z.enum(["free", "pro", "enterprise"]).optional(),
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  const { organization, role } = await resolveOrgContext(id)
  if (!organization) return notFound("Organization not found")

  const stats = await db.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, projects: true, teams: true } },
    },
  })

  const taskCount = await db.task.count({
    where: { project: { organizationId: id } },
  })

  return ok({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logoUrl: organization.logoUrl,
    plan: organization.plan,
    role,
    createdAt: organization.createdAt,
    counts: {
      members: stats?._count.members ?? 0,
      projects: stats?._count.projects ?? 0,
      teams: stats?._count.teams ?? 0,
      tasks: taskCount,
    },
  })
})

export const PATCH = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  const { user } = await authorizeInOrg(id, "organization", "update")
  const parsed = await parseBody(req, updateSchema)
  if (!parsed.ok) return parsed.response
  const data = parsed.data

  const updated = await db.organization.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
      ...(data.plan ? { plan: data.plan } : {}),
    },
  })

  cache.invalidatePrefix(`org:${id}:`)

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "organization.update",
    resource: "organization",
    resourceId: id,
    metadata: data,
  })

  return ok({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    logoUrl: updated.logoUrl,
    plan: updated.plan,
  })
})

export const DELETE = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  const { user } = await authorizeInOrg(id, "organization", "delete")
  const org = await db.organization.findUnique({ where: { id } })
  if (!org) return notFound("Organization not found")
  if (org.ownerId !== user.id) {
    return notFound("Only the owner can delete an organization")
  }
  await db.organization.delete({ where: { id } })
  cache.invalidatePrefix(`org:${id}:`)
  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "organization.delete",
    resource: "organization",
    resourceId: id,
  })
  return ok({ success: true })
})
