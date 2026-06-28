"use client"

import Link from "next/link"
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Users,
  UsersRound,
  MailPlus,
  BarChart3,
  ScrollText,
  Bell,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react"
import { useAppStore, type View } from "@/stores/app-store"
import { cn } from "@/lib/utils"

interface NavItem {
  view: View
  label: string
  icon: LucideIcon
  description: string
  requiresOrg?: boolean
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Workspace",
    items: [
      { view: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & metrics", requiresOrg: true },
      { view: "projects", label: "Projects", icon: FolderKanban, description: "Manage projects", requiresOrg: true },
      { view: "board", label: "Task Board", icon: KanbanSquare, description: "Kanban board", requiresOrg: true },
    ],
  },
  {
    section: "Collaboration",
    items: [
      { view: "teams", label: "Teams", icon: Users, description: "Teams & squads", requiresOrg: true },
      { view: "members", label: "Members", icon: UsersRound, description: "Members & roles", requiresOrg: true },
      { view: "invitations", label: "Invitations", icon: MailPlus, description: "Pending invites", requiresOrg: true },
    ],
  },
  {
    section: "Insights",
    items: [
      { view: "analytics", label: "Analytics", icon: BarChart3, description: "Charts & trends", requiresOrg: true },
      { view: "activity", label: "Activity Log", icon: ScrollText, description: "Audit trail", requiresOrg: true },
      { view: "notifications", label: "Notifications", icon: Bell, description: "Your alerts" },
    ],
  },
  {
    section: "Account",
    items: [
      { view: "settings", label: "Settings", icon: Settings, description: "Org settings", requiresOrg: true },
      { view: "profile", label: "Profile", icon: User, description: "Your profile" },
    ],
  },
]

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, activeOrg } = useAppStore()

  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {NAV.map((group) => (
        <div key={group.section} className="flex flex-col gap-1">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.section}
          </p>
          {group.items.map((item) => {
            const disabled = item.requiresOrg && !activeOrg
            const active = view === item.view
            const Icon = item.icon
            return (
              <button
                key={item.view}
                disabled={disabled}
                onClick={() => {
                  setView(item.view)
                  onNavigate?.()
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors text-left",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      ))}
      <div className="mt-auto px-2 pt-4">
        <p className="text-[11px] text-muted-foreground/60">
          TeamFlow v1.0 ·{" "}
          <Link href="#" className="hover:text-foreground">
            Docs
          </Link>
        </p>
      </div>
    </nav>
  )
}
