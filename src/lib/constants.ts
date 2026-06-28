// Centralized constants & types for TeamFlow SaaS

export const ORG_ROLES = ["owner", "admin", "manager", "member", "guest"] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "cancelled"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_VISIBILITY = ["private", "internal", "public"] as const
export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[number]

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const INVITATION_STATUSES = ["pending", "accepted", "rejected", "expired"] as const

export const PLANS = ["free", "pro", "enterprise"] as const

export const SESSION_COOKIE = "tf_session"
export const SESSION_TTL_DAYS = 30

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  guest: "Guest",
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full control including billing & deletion",
  admin: "Manage members, teams, projects & settings",
  manager: "Manage projects, tasks & teams; invite members",
  member: "Create & edit tasks, comment, view resources",
  guest: "Read-only access to assigned resources",
}

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

// Tailwind-friendly badge color classes (avoiding indigo/blue per design rules)
export const ROLE_BADGE_CLASS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  admin: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  manager: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  member: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  guest: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

export const STATUS_BADGE_CLASS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completed: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  backlog: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  todo: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  in_progress: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

export const PRIORITY_BADGE_CLASS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

// Kanban column order
export const KANBAN_COLUMNS: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"]
