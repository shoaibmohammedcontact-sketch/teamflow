import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { authorize } from "@/lib/permissions"
import type { Resource, Action } from "@/lib/permissions"
import type { AuthUser } from "@/lib/auth"

/**
 * Resolves the active organization context for the current user, including
 * their membership + role. Throws 403 if the user is not a member.
 */
export async function resolveOrgContext(orgId: string) {
  const user = await requireUser()
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
  })
  if (!membership || membership.status !== "active") {
    const err = new Error("You are not a member of this organization") as Error & {
      status?: number
    }
    err.status = 403
    throw err
  }
  const organization = await db.organization.findUnique({ where: { id: orgId } })
  if (!organization) {
    const err = new Error("Organization not found") as Error & { status?: number }
    err.status = 404
    throw err
  }
  return { user, organization, membership, role: membership.role as string }
}

/**
 * Resolves org context AND enforces an RBAC permission.
 */
export async function authorizeInOrg(
  orgId: string,
  resource: Resource,
  action: Action
) {
  const ctx = await resolveOrgContext(orgId)
  authorize(ctx.role, resource, action)
  return ctx
}

export type OrgContext = {
  user: AuthUser
  organization: Awaited<ReturnType<typeof db.organization.findUnique>>
  membership: Awaited<ReturnType<typeof db.organizationMember.findUnique>>
  role: string
}
