/**
 * Real-time bus client (server-side only).
 *
 * Posts events to the Socket.IO mini-service (port 3003) which fans them out
 * to connected browser clients. Falls back silently if the mini-service is down
 * so the REST API never fails because of realtime delivery.
 */

interface RealtimeEvent {
  event: string
  room?: string // org:<id> | user:<id>
  payload: unknown
}

const REALTIME_URL = "http://localhost:3003/broadcast"

export async function emitRealtime(evt: RealtimeEvent): Promise<void> {
  try {
    await fetch(REALTIME_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(evt),
    })
  } catch {
    // mini-service optional / down — non-fatal
  }
}

export function emitToOrg(orgId: string, event: string, payload: unknown) {
  return emitRealtime({ event, room: `org:${orgId}`, payload })
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  return emitRealtime({ event, room: `user:${userId}`, payload })
}
