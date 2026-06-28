import { db } from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { createSession } from "@/lib/auth"
import { apiHandler, created, fail, conflict, parseBody } from "@/lib/api"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  jobTitle: z.string().max(80).optional(),
})

export const POST = apiHandler(async (req) => {
  const parsed = await parseBody(req, schema)
  if (!parsed.ok) return parsed.response
  const { name, email, password, jobTitle } = parsed.data

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return conflict("An account with this email already exists")

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      jobTitle,
      emailVerified: new Date(), // email verification simulated in demo
    },
  })

  await createSession(user.id)

  return created({
    id: user.id,
    email: user.email,
    name: user.name,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
  })
})
