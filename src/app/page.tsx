"use client"

import * as React from "react"
import { useAppStore } from "@/stores/app-store"
import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap"
import { AppShell } from "@/components/app/app-shell"
import { LandingView } from "@/components/views/landing-view"
import { AuthView } from "@/components/views/auth-view"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { lazy, Suspense } from "react"

// Lazy-load view modules for code-splitting
const DashboardView = lazy(() => import("@/components/views/dashboard-view").then((m) => ({ default: m.DashboardView })))
const OrganizationsView = lazy(() => import("@/components/views/organizations-view").then((m) => ({ default: m.OrganizationsView })))
const TeamsView = lazy(() => import("@/components/views/teams-view").then((m) => ({ default: m.TeamsView })))
const MembersView = lazy(() => import("@/components/views/members-view").then((m) => ({ default: m.MembersView })))
const InvitationsView = lazy(() => import("@/components/views/invitations-view").then((m) => ({ default: m.InvitationsView })))
const ProjectsView = lazy(() => import("@/components/views/projects-view").then((m) => ({ default: m.ProjectsView })))
const BoardView = lazy(() => import("@/components/views/board-view").then((m) => ({ default: m.BoardView })))
const AnalyticsView = lazy(() => import("@/components/views/analytics-view").then((m) => ({ default: m.AnalyticsView })))
const ActivityView = lazy(() => import("@/components/views/activity-view").then((m) => ({ default: m.ActivityView })))
const NotificationsView = lazy(() => import("@/components/views/notifications-view").then((m) => ({ default: m.NotificationsView })))
const SettingsView = lazy(() => import("@/components/views/settings-view").then((m) => ({ default: m.SettingsView })))
const ProfileView = lazy(() => import("@/components/views/profile-view").then((m) => ({ default: m.ProfileView })))

function ViewFallback() {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function Page() {
  useAuthBootstrap()
  const { user, authLoading, view, activeOrg, setView } = useAppStore()

  // All hooks MUST run before any early return.
  // If authenticated but no active org, redirect to the organizations view (never setState during render).
  React.useEffect(() => {
    if (user && !activeOrg && view !== "organizations" && view !== "profile" && view !== "notifications") {
      setView("organizations")
    }
  }, [user, activeOrg, view, setView])

  // Bootstrap splash
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  // Public views
  if (!user) {
    if (view === "login") return <AuthView mode="login" />
    if (view === "register") return <AuthView mode="register" />
    return <LandingView />
  }

  // While the org-redirect effect above is pending, show a fallback instead of an org-gated view
  if (!activeOrg && view !== "organizations" && view !== "profile" && view !== "notifications") {
    return <ViewFallback />
  }

  const renderView = () => {
    switch (view) {
      case "organizations": return <OrganizationsView />
      case "profile": return <ProfileView />
      case "notifications": return <NotificationsView />
      case "dashboard": return <DashboardView />
      case "teams": return <TeamsView />
      case "members": return <MembersView />
      case "invitations": return <InvitationsView />
      case "projects": return <ProjectsView />
      case "board": return <BoardView />
      case "analytics": return <AnalyticsView />
      case "activity": return <ActivityView />
      case "settings": return <SettingsView />
      default: return <DashboardView />
    }
  }

  return (
    <AppShell>
      <Suspense fallback={<ViewFallback />}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {renderView()}
        </div>
      </Suspense>
    </AppShell>
  )
}
