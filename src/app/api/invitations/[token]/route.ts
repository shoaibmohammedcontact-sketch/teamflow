import { db } from "@/lib/db"
import { apiHandler, ok, notFound } from "@/lib/api"

// Public lookup by token (no auth required) — used by the accept-invite flow
export const GET = apiHandler(async (_req, ctx) => {
  const { token } = await ctx.params
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  })
  if (!invitation) return notFound("Invitation not found")
  let status = invitation.status
  if (status === "pending" && invitation.expiresAt < new Date()) {
    status = "expired"
  }
  return ok({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status,
    expiresAt: invitation.expiresAt,
    organization: invitation.organization,
    invitedBy: invitation.invitedBy,
  })
})
