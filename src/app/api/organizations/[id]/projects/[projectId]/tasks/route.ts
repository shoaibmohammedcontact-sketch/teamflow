import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notify"
import { emitToOrg } from "@/lib/realtime"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants"
import { apiHandler, ok, created, parseBody, notFound } from "@/lib/api"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]).default("medium"),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).default("todo"),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
})

export const GET = apiHandler(async (req, ctx) => {
  const { id, projectId } = await ctx.params
  await authorizeInOrg(id, "task", "view")
  const project = await db.project.findFirst({ where: { id: projectId, organizationId: id } })
  if (!project) return notFound("Project not found")

  const url = new URL(req.url)
  const assigneeId = url.searchParams.get("assigneeId")
  const status = url.searchParams.get("status")
  const priority = url.searchParams.get("priority")
  const search = url.searchParams.get("search")?.trim()

  const tasks = await db.task.findMany({
    where: {
      projectId,
      ...(assigneeId ? { assigneeId } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? { title: { contains: search } } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  })

  return ok(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      position: t.position,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      assignee: t.assignee,
      createdBy: t.createdBy,
      labels: t.labels.map((tl) => tl.label),
      counts: t._count,
    }))
  )
})

export const POST = apiHandler(async (req, ctx) => {
  const { id, projectId } = await ctx.params
  const { user } = await authorizeInOrg(id, "task", "create")
  const project = await db.project.findFirst({ where: { id: projectId, organizationId: id } })
  if (!project) return notFound("Project not found")

  const parsed = await parseBody(req, createSchema)
  if (!parsed.ok) return parsed.response
  const { title, description, priority, status, dueDate, assigneeId, labelIds } = parsed.data

  if (assigneeId) {
    const member = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId: assigneeId } },
    })
    if (!member) return notFound("Assignee is not a member of this organization")
  }

  // position = max existing position in target column + 1
  const maxPos = await db.task.aggregate({
    where: { projectId, status },
    _max: { position: true },
  })

  const task = await db.task.create({
    data: {
      projectId,
      title,
      description: description || null,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId ?? null,
      createdById: user.id,
      position: (maxPos._max.position ?? -1) + 1,
      ...(labelIds?.length
        ? { labels: { create: labelIds.map((labelId) => ({ labelId })) } }
        : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      labels: { include: { label: true } },
    },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "task.create",
    resource: "task",
    resourceId: task.id,
    metadata: { title, projectId, status, priority },
  })

  if (assigneeId && assigneeId !== user.id) {
    await notify({
      userId: assigneeId,
      type: "task_assigned",
      title: "New task assigned",
      message: `You were assigned to "${title}" in ${project.name}.`,
      data: { taskId: task.id, projectId, organizationId: id },
    })
  }

  await emitToOrg(id, "task:created", { task, projectId })

  return created(task)
})
