import { db } from "@/lib/db"
import { getCurrentUser, createSession } from "@/lib/auth"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notify"
import { apiHandler, ok, notFound, fail, parseBody } from "@/lib/api"
import { z } from "zod"

const actSchema = z.object({
  action: z.enum(["accept", "reject"]),
})

export const POST = apiHandler(async (req, ctx) => {
  const { id, invId } = await ctx.params
  const user = await getCurrentUser()
  if (!user) return fail("You must sign in to accept an invitation", 401, "unauthorized")

  const parsed = await parseBody(req, actSchema)
  if (!parsed.ok) return parsed.response
  const { action } = parsed.data

  const invitation = await db.invitation.findFirst({ where: { id: invId, organizationId: id } })
  if (!invitation) return notFound("Invitation not found")
  if (invitation.status !== "pending") return fail("Invitation is no longer pending", 400, "not_pending")
  if (invitation.expiresAt < new Date()) {
    await db.invitation.update({ where: { id: invId }, data: { status: "expired" } })
    return fail("Invitation has expired", 410, "expired")
  }
  if (invitation.email !== user.email) {
    return fail("This invitation was sent to a different email address", 403, "email_mismatch")
  }

  if (action === "reject") {
    await db.invitation.update({ where: { id: invId }, data: { status: "rejected" } })
    await logActivity({
      organizationId: id,
      actorId: user.id,
      action: "invitation.reject",
      resource: "invitation",
      resourceId: invId,
    })
    return ok({ success: true, action: "rejected" })
  }

  // accept
  await db.$transaction([
    db.invitation.update({ where: { id: invId }, data: { status: "accepted", acceptedAt: new Date() } }),
    db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: id, userId: user.id } },
      update: { role: invitation.role, status: "active" },
      create: { organizationId: id, userId: user.id, role: invitation.role, status: "active" },
    }),
  ])

  if (invitation.teamId) {
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: invitation.teamId, userId: user.id } },
      update: {},
      create: { teamId: invitation.teamId, userId: user.id, role: "member" },
    })
  }

  await createSession(user.id) // refresh session so new org appears

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "invitation.accept",
    resource: "invitation",
    resourceId: invId,
    metadata: { role: invitation.role },
  })

  return ok({ success: true, action: "accepted", organizationId: id, role: invitation.role })
})

export const DELETE = apiHandler(async (_req, ctx) => {
  const { id, invId } = await ctx.params
  const { user } = await authorizeInOrg(id, "invitation", "delete")
  await db.invitation.deleteMany({ where: { id: invId, organizationId: id } })
  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "invitation.revoke",
    resource: "invitation",
    resourceId: invId,
  })
  return ok({ success: true })
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id, invId } = await ctx.params
  await authorizeInOrg(id, "invitation", "view")
  const invitation = await db.invitation.findFirst({ where: { id: invId, organizationId: id } })
  if (!invitation) return notFound("Invitation not found")
  return ok(invitation)
})
