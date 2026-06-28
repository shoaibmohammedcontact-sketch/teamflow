"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { toast } from "sonner"
import { useAppStore } from "@/stores/app-store"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Connects to the Socket.IO mini-service (port 3003 via gateway) when the
 * user is authenticated. Subscribes to org + user rooms and invalidates the
 * relevant React Query caches on real-time events.
 */
export function useRealtime() {
  const { user, activeOrg } = useAppStore()
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) return
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on("connect", () => {
      const rooms = [`user:${user.id}`]
      if (activeOrg) rooms.push(`org:${activeOrg.id}`)
      socket.emit("subscribe", { rooms })
    })

    socket.on("task:created", () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["analytics"] })
    })
    socket.on("task:updated", () => qc.invalidateQueries({ queryKey: ["tasks"] })
    )
    socket.on("task:moved", () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["analytics"] })
    })
    socket.on("task:deleted", () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      qc.invalidateQueries({ queryKey: ["analytics"] })
    })
    socket.on("comment:created", () => qc.invalidateQueries({ queryKey: ["comments"] }))

    // Push a toast for notifications routed to this user
    socket.on("notification", (n: { title: string; message: string }) => {
      toast(n.title, { description: n.message })
      qc.invalidateQueries({ queryKey: ["notifications"] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, activeOrg, qc])
}
