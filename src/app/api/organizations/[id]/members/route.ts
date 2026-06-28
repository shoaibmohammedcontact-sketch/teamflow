import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { apiHandler, ok } from "@/lib/api"

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "member", "view")
  const members = await db.organizationMember.findMany({
    where: { organizationId: id, status: { in: ["active", "invited", "suspended"] } },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  })
  return ok(
    members.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        jobTitle: m.user.jobTitle,
      },
    }))
  )
})
