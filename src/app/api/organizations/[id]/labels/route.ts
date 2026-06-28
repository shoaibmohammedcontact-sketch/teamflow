import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { apiHandler, ok, created, parseBody } from "@/lib/api"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "label", "view")
  const labels = await db.label.findMany({
    where: { organizationId: id },
    orderBy: { name: "asc" },
  })
  return ok(labels)
})

export const POST = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  const { user } = await authorizeInOrg(id, "label", "create")
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const { name, color } = parsed.data
  const label = await db.label.create({ data: { organizationId: id, name, color } })
  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "label.create",
    resource: "label",
    resourceId: label.id,
    metadata: { name, color },
  })
  return created(label)
})
