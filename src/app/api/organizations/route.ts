import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { slugify, uniqueSlug } from "@/lib/slug"
import { logActivity } from "@/lib/activity"
import { apiHandler, ok, created, parseBody } from "@/lib/api"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().max(48).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  plan: z.enum(["free", "pro", "enterprise"]).optional(),
})

export const GET = apiHandler(async () => {
  const user = await requireUser()
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id, status: "active" },
    include: {
      organization: {
        include: {
          _count: { select: { members: true, projects: true, teams: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  })
  return ok(
    memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logoUrl: m.organization.logoUrl,
      plan: m.organization.plan,
      role: m.role,
      joinedAt: m.joinedAt,
      counts: m.organization._count,
    }))
  )
})

export const POST = apiHandler(async (req) => {
  const user = await requireUser()
  const parsed = await parseBody(req, createSchema)
  if (!parsed.ok) return parsed.response
  const { name, slug, logoUrl, plan } = parsed.data

  const existingSlugs = (await db.organization.findMany({ select: { slug: true } })).map(
    (o) => o.slug
  )
  const finalSlug = uniqueSlug(slug ? slugify(slug) : slugify(name), existingSlugs)

  const org = await db.organization.create({
    data: {
      name,
      slug: finalSlug,
      logoUrl: logoUrl || null,
      plan: plan ?? "free",
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "owner", status: "active" },
      },
    },
    include: { members: true },
  })

  await logActivity({
    organizationId: org.id,
    actorId: user.id,
    action: "organization.create",
    resource: "organization",
    resourceId: org.id,
    metadata: { name: org.name, slug: org.slug },
  })

  return created({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    plan: org.plan,
    role: "owner",
  })
})
