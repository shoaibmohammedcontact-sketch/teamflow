import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { emitToOrg } from "@/lib/realtime"
import { apiHandler, ok, created, notFound, parseBody } from "@/lib/api"
import { z } from "zod"

const schema = z.object({ content: z.string().min(1).max(5000) })

export const GET = apiHandler(async (_req, ctx) => {
  const { id, projectId, taskId } = await ctx.params
  await authorizeInOrg(id, "comment", "view")
  const task = await db.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) return notFound("Task not found")
  const comments = await db.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  })
  return ok(comments)
})

export const POST = apiHandler(async (req, ctx) => {
  const { id, projectId, taskId } = await ctx.params
  const { user } = await authorizeInOrg(id, "comment", "create")
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const { content } = parsed.data

  const task = await db.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) return notFound("Task not found")

  const comment = await db.comment.create({
    data: { taskId, userId: user.id, content },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "comment.create",
    resource: "comment",
    resourceId: comment.id,
    metadata: { taskId, length: content.length },
  })

  await emitToOrg(id, "comment:created", { comment, taskId, projectId })

  return created(comment)
})
