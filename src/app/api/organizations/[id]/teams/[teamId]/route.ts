import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { apiHandler, ok, notFound, parseBody } from "@/lib/api"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  archive: z.boolean().optional(),
})

export const PATCH = apiHandler(async (req, ctx) => {
  const { id, teamId } = await ctx.params
  const { user } = await authorizeInOrg(id, "team", "update")
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const { name, description, color, archive } = parsed.data

  const team = await db.team.findFirst({ where: { id: teamId, organizationId: id } })
  if (!team) return notFound("Team not found")

  const updated = await db.team.update({
    where: { id: teamId },
    data: {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(color ? { color } : {}),
      ...(archive !== undefined ? { archivedAt: archive ? new Date() : null } : {}),
    },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: archive ? "team.archive" : "team.update",
    resource: "team",
    resourceId: teamId,
    metadata: { name, archived: archive },
  })

  return ok({ id: updated.id, name: updated.name, archivedAt: updated.archivedAt })
})

export const DELETE = apiHandler(async (_req, ctx) => {
  const { id, teamId } = await ctx.params
  const { user } = await authorizeInOrg(id, "team", "delete")
  const team = await db.team.findFirst({ where: { id: teamId, organizationId: id } })
  if (!team) return notFound("Team not found")
  await db.team.delete({ where: { id: teamId } })
  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "team.delete",
    resource: "team",
    resourceId: teamId,
  })
  return ok({ success: true })
})
