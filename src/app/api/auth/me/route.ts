import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { apiHandler, ok, unauthorized } from "@/lib/api"

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return unauthorized("Not authenticated")

  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id, status: "active" },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  })

  return ok({
    user,
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logoUrl: m.organization.logoUrl,
      plan: m.organization.plan,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  })
})
