import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { apiHandler, ok, parseBody, fail } from "@/lib/api"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  jobTitle: z.string().max(80).optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
})

export const GET = apiHandler(async () => {
  const user = await requireUser()
  const u = await db.user.findUnique({ where: { id: user.id } })
  if (!u) return fail("User not found", 404, "not_found")
  return ok({
    id: u.id,
    email: u.email,
    name: u.name,
    jobTitle: u.jobTitle,
    avatarUrl: u.avatarUrl,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  })
})

export const PATCH = apiHandler(async (req) => {
  const user = await requireUser()
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const d = parsed.data
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(d.name ? { name: d.name } : {}),
      ...(d.jobTitle !== undefined ? { jobTitle: d.jobTitle || null } : {}),
      ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
    },
  })
  return ok({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    jobTitle: updated.jobTitle,
    avatarUrl: updated.avatarUrl,
  })
})
