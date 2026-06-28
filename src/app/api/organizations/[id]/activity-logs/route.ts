import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { apiHandler, ok, paginated, parseBody } from "@/lib/api"
import { z } from "zod"

export const GET = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "audit_log", "view")
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "25", 10)))
  const resource = url.searchParams.get("resource")
  const action = url.searchParams.get("action")
  const actorId = url.searchParams.get("actorId")
  const search = url.searchParams.get("search")?.trim()

  const where = {
    organizationId: id,
    ...(resource ? { resource } : {}),
    ...(action ? { action: { contains: action } } : {}),
    ...(actorId ? { actorId } : {}),
    ...(search ? { OR: [{ action: { contains: search } }, { resource: { contains: search } }] } : {}),
  } as const

  const [total, logs] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return paginated(logs, total, page, pageSize)
})
