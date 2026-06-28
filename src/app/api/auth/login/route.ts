import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { createSession } from "@/lib/auth"
import { apiHandler, ok, fail, unauthorized, parseBody } from "@/lib/api"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const POST = apiHandler(async (req) => {
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const { email, password } = parsed.data

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !user.passwordHash) return unauthorized("Invalid email or password")
  if (!verifyPassword(password, user.passwordHash)) {
    return unauthorized("Invalid email or password")
  }

  await createSession(user.id)

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
  })
})
