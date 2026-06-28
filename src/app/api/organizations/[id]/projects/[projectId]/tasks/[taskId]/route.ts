import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notify"
import { emitToOrg } from "@/lib/realtime"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants"
import { apiHandler, ok, notFound, parseBody } from "@/lib/api"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).optional(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id, projectId, taskId } = await ctx.params
  await authorizeInOrg(id, "task", "view")
  const task = await db.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      labels: { include: { label: true } },
      comments: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
    },
  })
  if (!task) return notFound("Task not found")
  return ok(task)
})

export const PATCH = apiHandler(async (req, ctx) => {
  const { id, projectId, taskId } = await ctx.params
  const { user } = await authorizeInOrg(id, "task", "update")
  const parsed = await parseBody(req, patchSchema)
  if (!parsed.ok) return parsed.response
  const d = parsed.data

  const task = await db.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) return notFound("Task not found")

  if (d.assigneeId) {
    const member = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId: d.assigneeId } },
    })
    if (!member) return notFound("Assignee is not a member")
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      ...(d.title ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.priority ? { priority: d.priority } : {}),
      ...(d.status ? { status: d.status } : {}),
      ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {}),
      ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId || null } : {}),
    },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "task.update",
    resource: "task",
    resourceId: taskId,
    metadata: d,
  })

  if (d.assigneeId && d.assigneeId !== task.assigneeId && d.assigneeId !== user.id) {
    await notify({
      userId: d.assigneeId,
      type: "task_assigned",
      title: "Task assigned to you",
      message: `You were assigned to "${updated.title}".`,
      data: { taskId, projectId, organizationId: id },
    })
  }

  await emitToOrg(id, "task:updated", { task: updated, projectId })

  return ok(updated)
})

// Reorder / move between columns (kanban drag & drop)
const moveSchema = z.object({
  toStatus: z.enum(TASK_STATUSES as [string, ...string[]]),
  toPosition: z.number().int().min(0),
})

export const PUT = apiHandler(async (req, ctx) => {
  const { id, projectId, taskId } = await ctx.params
  const { user } = await authorizeInOrg(id, "task", "update")
  const parsed = await parseBody(req, moveSchema)
  if (!parsed.ok) return parsed.response
  const { toStatus, toPosition } = parsed.data

  const task = await db.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) return notFound("Task not found")

  const fromStatus = task.status
  if (fromStatus === toStatus && task.position === toPosition) {
    return ok({ success: true, noop: true })
  }

  // Shift siblings to make room. Simple model: re-number the affected columns.
  await db.$transaction(async (tx) => {
    if (fromStatus !== toStatus) {
      // remove from old column: shift down items after old position
      await tx.task.updateMany({
        where: { projectId, status: fromStatus, position: { gt: task.position } },
        data: { position: { decrement: 1 } },
      })
      // make room in new column
      await tx.task.updateMany({
        where: { projectId, status: toStatus, position: { gte: toPosition } },
        data: { position: { increment: 1 } },
      })
    } else {
      // same column reorder
      if (toPosition > task.position) {
        await tx.task.updateMany({
          where: { projectId, status: fromStatus, position: { gt: task.position, lte: toPosition } },
          data: { position: { decrement: 1 } },
        })
      } else {
        await tx.task.updateMany({
          where: { projectId, status: fromStatus, position: { gte: toPosition, lt: task.position } },
          data: { position: { increment: 1 } },
        })
      }
    }
    await tx.task.update({ where: { id: taskId }, data: { status: toStatus, position: toPosition } })
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "task.move",
    resource: "task",
    resourceId: taskId,
    metadata: { fromStatus, toStatus, toPosition },
  })

  await emitToOrg(id, "task:moved", { taskId, projectId, fromStatus, toStatus, toPosition })

  return ok({ success: true })
})

export const DELETE = apiHandler(async (_req, ctx) => {
  const { id, projectId, taskId } = await ctx.params
  const { user } = await authorizeInOrg(id, "task", "delete")
  const task = await db.task.findFirst({ where: { id: taskId, projectId } })
  if (!task) return notFound("Task not found")
  await db.task.delete({ where: { id: taskId } })
  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "task.delete",
    resource: "task",
    resourceId: taskId,
  })
  await emitToOrg(id, "task:deleted", { taskId, projectId })
  return ok({ success: true })
})
