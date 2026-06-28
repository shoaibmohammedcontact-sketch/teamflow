import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { generateToken } from "@/lib/password"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notify"
import { ORG_ROLES } from "@/lib/constants"
import { apiHandler, ok, created, fail, parseBody } from "@/lib/api"
import { z } from "zod"

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ORG_ROLES as [string, ...string[]]).default("member"),
  teamId: z.string().optional(),
})

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx.params
  await authorizeInOrg(id, "invitation", "view")
  const invitations = await db.invitation.findMany({
    where: { organizationId: id },
    include: { invitedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
  return ok(
    invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      token: i.token,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      acceptedAt: i.acceptedAt,
      invitedBy: i.invitedBy,
    }))
  )
})

export const POST = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params
  const { user } = await authorizeInOrg(id, "invitation", "invite")
  const parsed = await parseBody(req, inviteSchema)
  if (!parsed.ok) return parsed.response
  const { email, role, teamId } = parsed.data

  // If user already exists and is already a member, reject
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    const membership = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId: existing.id } },
    })
    if (membership && membership.status === "active") {
      return fail("This user is already a member", 409, "already_member")
    }
  }

  // Reuse pending invitation if one exists
  const pending = await db.invitation.findFirst({
    where: { organizationId: id, email: email.toLowerCase(), status: "pending" },
  })
  if (pending) return fail("A pending invitation already exists for this email", 409, "pending_exists")

  const token = generateToken(24)
  const invitation = await db.invitation.create({
    data: {
      organizationId: id,
      email: email.toLowerCase(),
      role,
      token,
      invitedById: user.id,
      teamId: teamId ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "member.invite",
    resource: "invitation",
    resourceId: invitation.id,
    metadata: { email, role },
  })

  // If invitee is an existing user, push an in-app notification too
  if (existing) {
    const org = await db.organization.findUnique({ where: { id }, select: { name: true } })
    await notify({
      userId: existing.id,
      type: "invitation",
      title: "You're invited",
      message: `You've been invited to join ${org?.name ?? "an organization"} as ${role}.`,
      data: { organizationId: id, invitationId: invitation.id, token, role },
    })
  }

  // Simulated email: in production this would call Resend/Nodemailer.
  return created({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    inviteUrl: `/accept?token=${token}`,
  })
})
