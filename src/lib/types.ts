// Shared frontend types mirroring API responses

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  jobTitle: string | null
}

export interface OrgMembership {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  plan: string
  role: string
  joinedAt: string
  counts?: { members: number; projects: number; teams: number }
}

export interface Member {
  id: string
  role: string
  status: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
    jobTitle: string | null
  }
}

export interface Team {
  id: string
  name: string
  description: string | null
  color: string
  createdAt: string
  counts: { members: number; projects: number }
  members?: { id: string; name: string | null; email: string; avatarUrl: string | null; role: string }[]
}

export interface Invitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  invitedBy: { id: string; name: string | null; email: string }
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: string
  visibility: string
  dueDate: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  owner: { id: string; name: string | null; avatarUrl: string | null } | null
  team: { id: string; name: string; color: string } | null
  taskCount?: number
  counts?: { tasks: number }
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: string | null
  position: number
  createdAt: string
  updatedAt: string
  assignee: { id: string; name: string | null; email: string; avatarUrl: string | null } | null
  createdBy: { id: string; name: string | null } | null
  labels: Label[]
  counts?: { comments: number; attachments: number }
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; avatarUrl: string | null }
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  data: string | null
  createdAt: string
}

export interface ActivityLog {
  id: string
  organizationId: string
  actorId: string
  action: string
  resource: string
  resourceId: string | null
  metadata: string | null
  createdAt: string
  actor: { id: string; name: string | null; email: string; avatarUrl: string | null }
}

export interface Analytics {
  overview: {
    members: number
    teams: number
    projects: number
    tasks: number
    completionRate: number
  }
  projectStatusCounts: Record<string, number>
  taskStatusCounts: Record<string, number>
  taskPriorityCounts: Record<string, number>
  completionTrend: { date: string; count: number }[]
  recentActivity: ActivityLog[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
