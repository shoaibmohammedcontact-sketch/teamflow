import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { apiHandler, ok, parseBody } from "@/lib/api"
import { z } from "zod"

export const GET = apiHandler(async (req) => {
  const user = await requireUser()
  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get("unread") === "true"
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)))

  const where = { userId: user.id, ...(unreadOnly ? { read: false } : {}) }
  const [total, items, unreadCount] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ])

  return ok(items, { total, page, pageSize, unreadCount })
})

const markSchema = z.object({
  id: z.string().optional(),
  read: z.boolean().optional(),
  markAllRead: z.boolean().optional(),
})

export const PATCH = apiHandler(async (req) => {
  const user = await requireUser()
  const parsed = await parseBody(req, markSchema)
  if (!parsed.ok) return parsed.response
  const { id, read, markAllRead } = parsed.data

  if (markAllRead) {
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    return ok({ success: true, markedAll: true })
  }

  if (id) {
    await db.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: read ?? true },
    })
    return ok({ success: true, id, read: read ?? true })
  }
  return ok({ success: false })
})

export const DELETE = apiHandler(async (req) => {
  const user = await requireUser()
  const url = new URL(req.url)
  const notifId = url.searchParams.get("id")
  if (notifId) {
    await db.notification.deleteMany({ where: { id: notifId, userId: user.id } })
  } else {
    await db.notification.deleteMany({ where: { userId: user.id, read: true } })
  }
  return ok({ success: true })
})
