import { db } from "@/lib/db"

/**
 * Audit logging helper — records every meaningful action.
 * Also broadcasts via the real-time bus (socket.io) when available.
 */
export async function logActivity(params: {
  organizationId: string
  actorId: string
  action: string // e.g. "project.create"
  resource: string // project | task | member | ...
  resourceId?: string
  metadata?: Record<string, unknown>
  realtime?: boolean
}): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (err) {
    console.error("[activity] failed to log:", err)
  }
}
