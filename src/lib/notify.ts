import { db } from "@/lib/db"

/**
 * Notification helper — persists a notification and is picked up by the
 * real-time bus (socket.io) to push to connected clients.
 */
export async function notify(params: {
  userId: string
  type: string // task_assigned | comment_mention | invitation | project_update | system
  title: string
  message: string
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
      },
    })
  } catch (err) {
    console.error("[notify] failed:", err)
  }
}
