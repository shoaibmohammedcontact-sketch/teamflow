import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { cache } from "@/lib/cache"
import { PROJECT_STATUSES, PROJECT_VISIBILITY } from "@/lib/constants"
import { apiHandler, ok, notFound, fail, parseBody } from "@/lib/api"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum([...PROJECT_STATUSES] as [string, ...string[]]).optional(),
  visibility: z.enum([...PROJECT_VISIBILITY] as [string, ...string[]]).optional(),
  teamId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  ownerId: z.string().optional(),
  archive: z.boolean().optional(),
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id, projectId } = await ctx.params
  await authorizeInOrg(id, "project", "view")
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: id },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
  })
  if (!project) return notFound("Project not found")
  return ok(project)
})

export const PATCH = apiHandler(async (req, ctx) => {
  const { id, projectId } = await ctx.params
  const { user } = await authorizeInOrg(id, "project", "update")
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const d = parsed.data

  const project = await db.project.findFirst({ where: { id: projectId, organizationId: id } })
  if (!project) return notFound("Project not found")

  const updated = await db.project.update({
    where: { id: projectId },
    data: {
      ...(d.name ? { name: d.name } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.status ? { status: d.status } : {}),
      ...(d.visibility ? { visibility: d.visibility } : {}),
      ...(d.teamId !== undefined ? { teamId: d.teamId } : {}),
      ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {}),
      ...(d.ownerId ? { ownerId: d.ownerId } : {}),
      ...(d.archive !== undefined ? { archivedAt: d.archive ? new Date() : null } : {}),
    },
  })

  cache.invalidatePrefix(`org:${id}:projects:`)

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: d.archive ? (d.archive ? "project.archive" : "project.restore") : "project.update",
    resource: "project",
    resourceId: projectId,
    metadata: d,
  })

  return ok(updated)
})

export const DELETE = apiHandler(async (_req, ctx) => {
  const { id, projectId } = await ctx.params
  const { user } = await authorizeInOrg(id, "project", "delete")
  const project = await db.project.findFirst({ where: { id: projectId, organizationId: id } })
  if (!project) return notFound("Project not found")
  if (project.archivedAt) {
    await db.project.delete({ where: { id: projectId } })
    await logActivity({
      organizationId: id,
      actorId: user.id,
      action: "project.delete",
      resource: "project",
      resourceId: projectId,
    })
    cache.invalidatePrefix(`org:${id}:projects:`)
    return ok({ success: true, deleted: true })
  }
  return fail("Project must be archived before deletion", 400, "must_archive_first")
})
