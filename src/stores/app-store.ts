"use client"

import { create } from "zustand"
import type { AuthUser, OrgMembership } from "@/lib/types"

export type View =
  | "landing"
  | "login"
  | "register"
  | "dashboard"
  | "organizations"
  | "teams"
  | "members"
  | "invitations"
  | "projects"
  | "board"
  | "analytics"
  | "activity"
  | "notifications"
  | "settings"
  | "profile"

interface AppState {
  user: AuthUser | null
  authLoading: boolean
  setAuth: (user: AuthUser | null) => void
  setAuthLoading: (v: boolean) => void

  organizations: OrgMembership[]
  activeOrg: OrgMembership | null
  setOrganizations: (orgs: OrgMembership[]) => void
  setActiveOrg: (org: OrgMembership | null) => void

  view: View
  viewParams: Record<string, string>
  setView: (view: View, params?: Record<string, string>) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authLoading: true,
  setAuth: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  organizations: [],
  activeOrg: null,
  setOrganizations: (organizations) => set({ organizations }),
  setActiveOrg: (activeOrg) => set({ activeOrg }),

  view: "landing",
  viewParams: {},
  setView: (view, params = {}) => set({ view, viewParams: params }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
