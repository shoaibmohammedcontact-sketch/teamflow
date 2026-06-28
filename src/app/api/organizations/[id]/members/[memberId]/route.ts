import { db } from "@/lib/db"
import { authorizeInOrg } from "@/lib/context"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notify"
import { apiHandler, ok, fail, parseBody } from "@/lib/api"
import { z } from "zod"

const updateSchema = z.object({
  role: z.enum(["owner", "admin", "manager", "member", "guest"]),
})

const hierarchy: Record<string, number> = { owner: 5, admin: 4, manager: 3, member: 2, guest: 1 }

export const PATCH = apiHandler(async (req, ctx) => {
  const { id, memberId } = await ctx.params
  const { user, role: myRole } = await authorizeInOrg(id, "member", "update")
  const parsed = await parseBody(req, updateSchema)
  if (!parsed.ok) return parsed.response
  const { role } = parsed.data

  const target = await db.organizationMember.findUnique({ where: { id: memberId } })
  if (!target || target.organizationId !== id) return fail("Member not found", 404, "not_found")

  if (target.role === "owner" && role !== "owner") {
    const owners = await db.organizationMember.count({
      where: { organizationId: id, role: "owner" },
    })
    if (owners <= 1) return fail("Cannot demote the last owner", 400, "last_owner")
  }
  if (role === "owner" && myRole !== "owner") {
    return fail("Only owners can transfer ownership", 403, "forbidden")
  }
  if (myRole !== "owner" && hierarchy[target.role] >= hierarchy[myRole]) {
    return fail("Cannot modify a member with equal or higher role", 403, "forbidden")
  }

  const updated = await db.organizationMember.update({
    where: { id: memberId },
    data: { role },
  })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "member.role_update",
    resource: "member",
    resourceId: memberId,
    metadata: { from: target.role, to: role },
  })

  await notify({
    userId: target.userId,
    type: "system",
    title: "Role updated",
    message: `Your role in the organization was changed to ${role}.`,
    data: { organizationId: id, role },
  })

  return ok({ id: updated.id, role: updated.role })
})

export const DELETE = apiHandler(async (_req, ctx) => {
  const { id, memberId } = await ctx.params
  const { user, role: myRole } = await authorizeInOrg(id, "member", "delete")
  const target = await db.organizationMember.findUnique({ where: { id: memberId } })
  if (!target || target.organizationId !== id) return fail("Member not found", 404, "not_found")
  if (target.role === "owner") return fail("Cannot remove an owner", 400, "cannot_remove_owner")
  if (myRole !== "owner" && hierarchy[target.role] >= hierarchy[myRole]) {
    return fail("Cannot remove a member with equal or higher role", 403, "forbidden")
  }

  await db.organizationMember.delete({ where: { id: memberId } })

  await logActivity({
    organizationId: id,
    actorId: user.id,
    action: "member.remove",
    resource: "member",
    resourceId: memberId,
    metadata: { userId: target.userId },
  })

  return ok({ success: true })
})
