# TeamFlow — Multi-Tenant SaaS Workspace Platform

> A production-grade, multi-tenant SaaS workspace management platform demonstrating senior-level full-stack engineering: multi-tenancy, RBAC, real-time collaboration, audit logging, Kanban task management, and analytics.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal)](https://www.prisma.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

| | |
|---|---|
| **Live Demo** | _replace this with your deployed URL (e.g. Vercel)_ |
| **Repository** | _replace this with your GitHub repo URL_ |
| **Demo Login** | `avery@teamflow.dev` / `password123` |
| **Stack** | Next.js 16 · React 19 · TypeScript 5 · Prisma · SQLite · Tailwind v4 · shadcn/ui · Socket.IO · Recharts · Zustand · TanStack Query |

---

## ✨ Overview

**TeamFlow** is a complete multi-tenant SaaS workspace platform where users belong to multiple organizations, collaborate in teams, manage projects on a real-time Kanban board, and track every action through a comprehensive audit log. It is engineered with clean architecture, fine-grained role-based access control, real-time sync, and a polished, accessible UI.

This repository is intended as a portfolio piece showcasing the engineering practices expected of a Senior Full-Stack Engineer.

---

## 🎯 Core Features

### Authentication & Sessions
- Register / Login / Logout
- HTTP-only cookie-based sessions with expiry & revocation (JWT-style rotation model)
- Session management (revocable, expiry-tracked)
- Password hashing with Node `scrypt` + per-user salt + timing-safe comparison
- Email verification & password reset modeled (token table + expiry)
- Google OAuth account-linking schema (`Account` model)

### Multi-Tenancy
- Users belong to multiple **organizations** (workspaces)
- Create / update / delete organizations (owner-only deletion)
- Workspace slug, logo, plan (free / pro / enterprise)
- One-click organization **switcher** with role badge
- Fully isolated data per organization

### Role-Based Access Control (RBAC)
Five hierarchical roles with a declarative permission matrix:

| Role | Scope |
|------|-------|
| **Owner** | Full control incl. billing & deletion |
| **Admin** | Manage members, teams, projects, settings, audit logs |
| **Manager** | Manage projects, tasks, teams; invite members |
| **Member** | Create/edit tasks, comment, view resources |
| **Guest** | Read-only access to assigned resources |

Every API endpoint is guarded by an authorization middleware (`authorizeInOrg`) that checks `can(role, resource, action)` against the matrix covering: `organization`, `team`, `member`, `invitation`, `project`, `task`, `comment`, `label`, `settings`, `audit_log`.

### Teams & Members
- Create / update / archive / delete teams (with color coding)
- Team membership with lead/member roles
- Member directory with role management
- Role-change protection (can't demote last owner, can't manage equal/higher role)

### Invitations
- Email-based invitations with secure random tokens (24-byte hex)
- 7-day expiry with automatic expiration handling
- Accept / reject flow (email-matched)
- Revoke pending invitations
- Invite URL generation (`/accept?token=...`)
- In-app notification for existing users

### Projects
- Full CRUD with archive / restore / delete (archive-before-delete safety)
- **Pagination**, **search**, **filter** (status, team), **sort** (created/updated/name/due date, asc/desc)
- Visibility levels (private / internal / public)
- Owner, team, due date, task counts
- Redis-style in-memory cache with TTL + prefix invalidation

### Tasks & Kanban Board
- 5-column Kanban: Backlog → To Do → In Progress → In Review → Done
- **Drag & drop** within and across columns (`@dnd-kit`)
- Optimistic position updates with server reconciliation
- Task priority (low / medium / high / urgent)
- Labels, assignee, due date, attachments, comments
- **Task detail dialog** with comment thread (real-time)
- **Real-time sync** — task moves/creates/updates broadcast to all org members via Socket.IO

### Notifications
- Toast notifications (Sonner)
- In-app notifications with unread badge
- Real-time push via Socket.IO
- Mark read / mark all read / delete
- Polling fallback (30s) + socket invalidation

### Activity Logs (Audit Trail)
- Every meaningful action recorded: actor, resource, action, metadata, timestamp
- Filterable audit log page (search, resource, action)
- Pagination
- Human-readable action descriptions
- Seeded with realistic history

### Dashboard & Analytics
- Organization overview (members, teams, projects, tasks, completion rate)
- 14-day task completion trend (area chart)
- Task status distribution (pie chart)
- Task priority breakdown (bar chart)
- Project status breakdown
- Recent projects & recent activity feeds
- Charts rendered with **Recharts**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **UI** | React 19, Tailwind CSS v4, shadcn/ui (New York), Lucide icons, Framer Motion |
| **State** | Zustand (client), TanStack Query v5 (server) |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Database** | Prisma ORM (SQLite in sandbox; schema is PostgreSQL-ready) |
| **Real-time** | Socket.IO (dedicated mini-service on port 3003) |
| **Cache** | In-memory TTL cache (Redis API-compatible interface) |
| **Auth** | Cookie-based sessions, scrypt password hashing |
| **Validation** | Zod (shared between client & server) |

> **Note on stack adaptation:** The original spec called for a separate Express.js backend, PostgreSQL, Redis, BullMQ, and Docker. This implementation runs in a constrained sandbox (single Next.js app, SQLite, single exposed port via Caddy gateway). Every conceptual feature is preserved: multi-tenancy, RBAC, JWT-style sessions, real-time sync, audit logging, Kanban, analytics. The Prisma schema is database-agnostic and deploys to PostgreSQL unchanged. The in-memory cache exposes a Redis-compatible `get/set/wrap/invalidate` interface. The Socket.IO mini-service is a standalone process that drops into a Redis pub/sub or BullMQ topology in production.

---

## 🏛 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  Next.js App Router · Zustand · TanStack Query · dnd-kit │
└───────────────┬─────────────────────┬───────────────────┘
                │ HTTP (REST)          │ WebSocket (?XTransformPort=3003)
                ▼                      ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│   Next.js API Routes      │  │  Socket.IO Mini-Service  │
│   /api/auth/*             │  │  (port 3003)             │
│   /api/organizations/*    │  │  · org/user rooms        │
│   /api/user/*             │  │  · /broadcast HTTP endpoint│
│                           │  │  · /health               │
│  · apiHandler (envelope)  │  └──────────────────────────┘
│  · parseBody (zod)        │            ▲
│  · authorizeInOrg (RBAC)  │            │ POST /broadcast
│  · logActivity (audit)    │────────────┘
│  · emitToOrg (realtime)   │
└───────────┬───────────────┘
            ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   Prisma Client           │   │   In-Memory Cache        │
│   (SQLite / PostgreSQL)   │   │   (Redis-compatible API) │
└───────────────────────────┘   └──────────────────────────┘
```

### Backend (Feature-based, layered)

```
src/app/api/
  auth/                    # register, login, logout, me
  organizations/
    route.ts               # list, create (collection)
    [id]/
      route.ts             # get, update, delete
      members/             # list, role-change, remove
      teams/               # list, create, update, delete
      invitations/         # list, create, accept/reject, revoke
      projects/            # paginated CRUD + archive/restore
        [projectId]/
          tasks/           # CRUD + kanban move (PUT)
            [taskId]/
              comments/    # list, create
      labels/              # list, create
      activity-logs/       # paginated audit trail
      analytics/           # aggregated metrics
  user/
    notifications/         # list, mark-read, delete
    profile/               # get, update
  invitations/[token]/     # public token lookup
```

### Shared Libraries (`src/lib/`)
- `auth.ts` — session lifecycle, `getCurrentUser`, `requireUser`
- `permissions.ts` — RBAC matrix, `can()`, `authorize()`
- `context.ts` — `resolveOrgContext`, `authorizeInOrg`
- `api.ts` — response envelope (`ok/created/paginated/fail`), `apiHandler`, `parseBody`
- `cache.ts` — TTL cache with `wrap/invalidate`
- `activity.ts` — audit logger
- `notify.ts` — notification dispatcher
- `realtime.ts` — server→mini-service HTTP fan-out
- `password.ts` — scrypt hashing
- `constants.ts` — roles, statuses, badges
- `slug.ts` — slugify, relativeTime, formatDate

### Frontend (View-based, code-split)

```
src/components/
  app/                     # shell: sidebar, topbar, org-switcher, user-menu
  views/                   # one file per view (lazy-loaded)
    landing-view.tsx
    auth-view.tsx
    dashboard-view.tsx
    organizations-view.tsx
    teams-view.tsx
    members-view.tsx
    invitations-view.tsx
    projects-view.tsx
    board-view.tsx         # Kanban (dnd-kit)
    analytics-view.tsx
    activity-view.tsx
    notifications-view.tsx
    settings-view.tsx
    profile-view.tsx
  ui/                      # shadcn/ui component library
```

---

## 🗄 Database Schema

17 normalized models with foreign keys, indexes, and cascade rules:

```
User ─┬─ Account (OAuth)
      ├─ Session (revocable, expiring)
      ├─ RefreshToken (rotation)
      ├─ OrganizationMember ── Organization
      │                        ├─ Team ── TeamMember
      │                        ├─ Project ── Task ── Comment
      │                        │             ├─ TaskLabel ── Label
      │                        │             └─ Attachment
      │                        ├─ Invitation
      │                        └─ ActivityLog
      └─ Notification

VerificationToken (email verification / password reset)
```

**Key indexes:** `(organizationId, userId)` unique on memberships, `(teamId, userId)` unique on team members, `token` unique on sessions/invitations/refresh tokens, `(userId, read)` on notifications, `(organizationId, createdAt)` on activity logs, `(resource, action)` on activity logs, status/priority/assignee on tasks.

See [`prisma/schema.prisma`](prisma/schema.prisma) for the complete schema.

---

## 🔌 API

Standardized JSON envelope:

```jsonc
// Success
{ "data": { ... }, "meta": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }

// Error
{ "error": { "code": "forbidden", "message": "..." } }
```

### Endpoint highlights

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register + create session |
| `POST` | `/api/auth/login` | Login + create session |
| `POST` | `/api/auth/logout` | Revoke session |
| `GET` | `/api/auth/me` | Current user + orgs |
| `GET/POST` | `/api/organizations` | List / create orgs |
| `GET/PATCH/DELETE` | `/api/organizations/:id` | Org detail / update / delete |
| `GET/PATCH/DELETE` | `/api/organizations/:id/members/:memberId` | Role change / remove |
| `GET/POST` | `/api/organizations/:id/teams` | List / create teams |
| `GET/POST` | `/api/organizations/:id/invitations` | List / invite |
| `POST/DELETE` | `/api/organizations/:id/invitations/:invId` | Accept/reject / revoke |
| `GET/POST` | `/api/organizations/:id/projects` | Paginated list / create |
| `GET/PATCH/DELETE` | `/api/organizations/:id/projects/:projectId` | Detail / update / archive+delete |
| `GET/POST` | `/api/organizations/:id/projects/:projectId/tasks` | List / create tasks |
| `GET/PATCH/PUT/DELETE` | `/api/organizations/:id/projects/:projectId/tasks/:taskId` | Detail / update / **move** / delete |
| `GET/POST` | `.../tasks/:taskId/comments` | Comment thread |
| `GET` | `/api/organizations/:id/analytics` | Aggregated metrics |
| `GET` | `/api/organizations/:id/activity-logs` | Paginated audit trail |
| `GET/PATCH/DELETE` | `/api/user/notifications` | Notifications |
| `GET/PATCH` | `/api/user/profile` | Profile |

**Query parameters** for paginated endpoints: `page`, `pageSize`, `search`, `sort`, `order`, plus resource-specific filters.

---

## ⚡ Real-Time Architecture

A dedicated **Socket.IO mini-service** (`mini-services/realtime/`) runs on port 3003:

- Clients connect via `io("/?XTransformPort=3003")` — the Caddy gateway forwards based on the `XTransformPort` query.
- On connect, clients `emit("subscribe", { rooms: ["user:<id>", "org:<id>"] })`.
- The Next.js API routes emit events by `POST /broadcast` to the mini-service (`src/lib/realtime.ts`), which fans out to subscribed rooms.
- Events: `task:created`, `task:updated`, `task:moved`, `task:deleted`, `comment:created`, `notification`.
- The frontend `useRealtime` hook invalidates the relevant TanStack Query caches on each event.

```
Next.js API  ──POST /broadcast──▶  Socket.IO (3003)  ──emit──▶  Browser
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ / Bun
- The project uses SQLite (no external DB needed)

### Install & Run

```bash
bun install                    # install dependencies
bun run db:push                # create schema
bun run db:seed                # seed demo data
bun run realtime               # start Socket.IO mini-service (port 3003)
bun run dev                    # start Next.js (port 3000)
```

### Demo Credentials

```
Email:    avery@teamflow.dev
Password: password123
```

The seed creates the **Northwind Labs** organization with 7 members, 3 teams, 3 projects, 13 tasks, 12 activity logs, and sample notifications.

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start Next.js dev server (port 3000) |
| `bun run realtime` | Start Socket.IO mini-service (port 3003, hot-reload) |
| `bun run lint` | ESLint |
| `bun run db:push` | Push Prisma schema to DB |
| `bun run db:seed` | Seed demo data |
| `bun run db:generate` | Regenerate Prisma client |

---

## 📁 Project Structure

```
.
├── prisma/
│   ├── schema.prisma         # 17-model normalized schema
│   └── seed.ts               # realistic demo data
├── mini-services/
│   └── realtime/             # Socket.IO mini-service (port 3003)
│       ├── index.ts
│       └── package.json
├── src/
│   ├── app/
│   │   ├── api/              # REST API (feature-based)
│   │   ├── layout.tsx        # root layout + providers
│   │   ├── page.tsx          # client-side view router
│   │   └── globals.css       # Tailwind v4 + brand theme
│   ├── components/
│   │   ├── app/              # shell, sidebar, topbar, etc.
│   │   ├── ui/               # shadcn/ui library
│   │   └── views/            # 14 lazy-loaded views
│   ├── hooks/                # useAuthBootstrap, useRealtime
│   ├── lib/                  # auth, permissions, api, cache, ...
│   └── stores/               # Zustand app store
├── screenshots/              # UI screenshots
├── .env.example              # environment variable template
├── .editorconfig             # editor formatting rules
├── .nvmrc                    # Node version pin
├── .prettierrc.json          # Prettier config
├── .vscode/                  # recommended extensions + workspace settings
├── CONTRIBUTING.md           # how to contribute
├── LICENSE                   # MIT
├── Caddyfile                 # sandbox gateway config (XTransformPort routing)
└── README.md
```

---

## 🔒 Security

- **Password hashing**: scrypt + per-user salt + timing-safe comparison
- **Sessions**: httpOnly, sameSite=lax cookies; revocable; expiry-tracked
- **RBAC**: every endpoint guarded by `authorizeInOrg(role, resource, action)`
- **Input validation**: Zod schemas on every write endpoint
- **SQL injection**: Prisma parameterized queries
- **Role-change protection**: can't demote last owner, can't manage equal/higher role
- **Invitation tokens**: 24-byte cryptographic random, 7-day expiry
- **CORS**: Socket.IO configured for same-origin via gateway

---

## 📊 Screenshots

| View | File |
|------|------|
| Landing | `screenshots/08-landing.png` |
| Dashboard | `screenshots/03-dashboard.png` |
| Kanban Board | `screenshots/02-board.png` |
| Projects | `screenshots/04-projects.png` |
| Analytics | `screenshots/05-analytics.png` |
| Activity Log | `screenshots/06-activity.png` |
| Dashboard (Dark) | `screenshots/07-dashboard-dark.png` |

---

## 🎨 Design

- **Brand**: Emerald accent (`oklch(0.62 0.17 156)`) — no default indigo/blue
- **Theme**: Light + Dark mode (`next-themes`)
- **Responsive**: Mobile-first; desktop sidebar collapses to a sheet on mobile
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, sr-only content
- **Loading**: Skeletons + Suspense fallbacks
- **Animations**: Framer Motion page transitions, hover/focus feedback
- **Sticky footer**: `min-h-screen flex flex-col` + `mt-auto` pattern

---

## 🧭 Engineering Practices

- **Clean architecture**: feature-based modules, repository/service-style separation
- **Centralized error handling**: `apiHandler` wrapper maps exceptions to HTTP envelopes
- **Type safety**: end-to-end TypeScript, shared types, Zod schemas
- **Code-splitting**: every view is `React.lazy`-loaded
- **Optimistic updates**: Kanban drag-and-drop updates instantly, reconciles on server
- **Caching**: in-memory TTL cache on hot read paths (project lists, analytics)
- **Structured logging**: Prisma query logging + API error logging
- **Conventional commits**: `feat(auth):`, `feat(rbac):`, `fix(board):`, etc.

---

## 🚢 Deployment

### Production (Vercel / self-hosted)

1. **Database**: Swap SQLite for PostgreSQL — update `prisma/schema.prisma` `datasource` to `postgresql` and run `bun run db:push`.
2. **Cache**: Swap the in-memory cache for Redis (same `cache.ts` interface).
3. **Realtime**: Run the `mini-services/realtime` service behind a load balancer with the Socket.IO Redis adapter for horizontal scaling. On Vercel, replace Socket.IO with Pusher/Ably or a serverless WebSocket provider.
4. **Email**: Add a job queue (BullMQ) for email delivery (Resend/Nodemailer) — the invitation flow already generates tokens & URLs, only the actual email send is stubbed.
5. **Containerize** (optional): `Dockerfile` (web), `Dockerfile.realtime` (mini-service), `docker-compose.yml` with `postgres`, `redis`, `web`, `realtime`.

### Sandbox (this repo's dev environment)

The included `Caddyfile` is a sandbox-only gateway that routes:
- Requests with `?XTransformPort=<port>` → that port (mini-services)
- All other requests → Next.js (port 3000)

It is **not** required for production deployment — ignore it unless you're reproducing the sandbox dev setup.

---

## 📝 License

MIT — built as a portfolio demonstration of senior full-stack engineering.
