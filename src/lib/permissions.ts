import type { OrgRole } from "@/lib/constants"

/**
 * RBAC Permission Matrix
 * ---------------------------------------------------------------------------
 * Fine-grained permissions per role. Roles are hierarchical:
 *   owner > admin > manager > member > guest
 *
 * Permissions cover: organization, teams, members, invitations, projects,
 * tasks, comments, labels, settings, audit_logs.
 */

export type Resource =
  | "organization"
  | "team"
  | "member"
  | "invitation"
  | "project"
  | "task"
  | "comment"
  | "label"
  | "settings"
  | "audit_log"

export type Action = "view" | "create" | "update" | "delete" | "manage" | "archive" | "restore" | "invite"

const HIERARCHY: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  guest: 1,
}

type PermMap = Partial<Record<Resource, Partial<Record<Action, boolean>>>>

// Full grant table. `true` grants; absence denies.
const PERMISSIONS: Record<OrgRole, PermMap> = {
  owner: {
    organization: { view: true, create: true, update: true, delete: true, manage: true },
    team: { view: true, create: true, update: true, delete: true, archive: true, manage: true },
    member: { view: true, create: true, update: true, delete: true, manage: true },
    invitation: { view: true, create: true, update: true, delete: true, invite: true },
    project: { view: true, create: true, update: true, delete: true, archive: true, restore: true, manage: true },
    task: { view: true, create: true, update: true, delete: true, manage: true },
    comment: { view: true, create: true, update: true, delete: true },
    label: { view: true, create: true, update: true, delete: true },
    settings: { view: true, update: true, manage: true },
    audit_log: { view: true, manage: true },
  },
  admin: {
    organization: { view: true, update: true, manage: true },
    team: { view: true, create: true, update: true, delete: true, archive: true, manage: true },
    member: { view: true, create: true, update: true, delete: true, manage: true },
    invitation: { view: true, create: true, update: true, delete: true, invite: true },
    project: { view: true, create: true, update: true, delete: true, archive: true, restore: true, manage: true },
    task: { view: true, create: true, update: true, delete: true, manage: true },
    comment: { view: true, create: true, update: true, delete: true },
    label: { view: true, create: true, update: true, delete: true },
    settings: { view: true, update: true, manage: true },
    audit_log: { view: true },
  },
  manager: {
    organization: { view: true },
    team: { view: true, create: true, update: true, archive: true },
    member: { view: true },
    invitation: { view: true, create: true, invite: true },
    project: { view: true, create: true, update: true, archive: true, restore: true },
    task: { view: true, create: true, update: true, delete: true, manage: true },
    comment: { view: true, create: true, update: true, delete: true },
    label: { view: true, create: true, update: true },
    settings: { view: true },
    audit_log: { view: true },
  },
  member: {
    organization: { view: true },
    team: { view: true },
    member: { view: true },
    invitation: { view: true },
    project: { view: true, create: true, update: true },
    task: { view: true, create: true, update: true },
    comment: { view: true, create: true, update: true, delete: true },
    label: { view: true },
    settings: { view: true },
  },
  guest: {
    organization: { view: true },
    team: { view: true },
    member: { view: true },
    project: { view: true },
    task: { view: true },
    comment: { view: true, create: true },
    label: { view: true },
  },
}

export function can(role: OrgRole | string | null | undefined, resource: Resource, action: Action): boolean {
  if (!role) return false
  return Boolean(PERMISSIONS[role as OrgRole]?.[resource]?.[action])
}

export function roleAtLeast(role: OrgRole | string, min: OrgRole): boolean {
  return HIERARCHY[role as OrgRole] >= HIERARCHY[min]
}

/**
 * Throws a 403 ApiError if the role lacks permission.
 */
export function authorize(
  role: OrgRole | string | null | undefined,
  resource: Resource,
  action: Action
): void {
  if (!can(role, resource, action)) {
    const err = new Error(
      `Forbidden: role "${role ?? "none"}" cannot ${action} on ${resource}`
    ) as Error & { status?: number }
    err.status = 403
    throw err
  }
}
