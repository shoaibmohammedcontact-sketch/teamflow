"use client"

import { useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { api } from "@/lib/api-client"
import type { AuthUser, OrgMembership } from "@/lib/types"

/**
 * Bootstraps auth state on mount: calls /api/auth/me. If authenticated,
 * loads the user's organizations and selects the first one (or restores
 * the last-active org from localStorage).
 */
export function useAuthBootstrap() {
  const { setAuth, setAuthLoading, setOrganizations, setActiveOrg, setView, user } = useAppStore()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<{ user: AuthUser; organizations: OrgMembership[] }>(
          "/api/auth/me"
        )
        if (cancelled) return
        setAuth(res.user)
        setOrganizations(res.organizations)
        const lastOrgId =
          typeof window !== "undefined" ? localStorage.getItem("tf_active_org") : null
        const chosen =
          res.organizations.find((o) => o.id === lastOrgId) ?? res.organizations[0] ?? null
        setActiveOrg(chosen)
        if (chosen && typeof window !== "undefined") {
          localStorage.setItem("tf_active_org", chosen.id)
        }
        // On (re)load, land the authenticated user on the dashboard unless they were on a public view
        const cur = useAppStore.getState().view
        if (cur === "landing" || cur === "login" || cur === "register") {
          setView("dashboard")
        }
      } catch {
        if (!cancelled) {
          setAuth(null)
          setOrganizations([])
          setActiveOrg(null)
        }
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { user }
}
