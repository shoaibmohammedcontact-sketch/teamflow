# Contributing to TeamFlow

Thanks for your interest in contributing! This project is maintained as a portfolio piece, but bug reports, improvements, and ideas are welcome.

## Setup

```bash
bun install
cp .env.example .env       # then edit values
bun run db:push             # create SQLite schema
bun run db:seed             # seed demo data (avery@teamflow.dev / password123)
bun run dev                 # http://localhost:3000
bun run realtime            # separate terminal — Socket.IO on :3003
```

Requires Node >= 20 and Bun.

## Code Style

- **TypeScript strict** everywhere — no `any`, no `@ts-ignore`.
- **Conventional commits**: `feat(scope):`, `fix(scope):`, `docs:`, `refactor:`, `chore:`, `test:`.
  - Examples: `feat(board): add card quick-actions`, `fix(rbac): allow manager to archive own tasks`, `docs: update RBAC matrix`.
- **ESLint + Prettier** — run `bun run lint` before pushing. Warnings are tolerated; errors are not.
- **shadcn/ui** components preferred over hand-rolled ones. Don't reinvent what's already in `src/components/ui/`.
- **No indigo/blue** as primary brand colour — TeamFlow uses an emerald accent.
- **Server actions are off** — all data mutations go through `src/app/api/*` route handlers.

## Architecture Rules

- **API route = `apiHandler` wrapper** that catches exceptions and returns a consistent `{data|error}` envelope.
- **Every org-scoped route** must call `authorizeInOrg(req, orgId, resource, action)` — no exceptions.
- **Write paths** log an `ActivityLog` entry via `logActivity(...)`.
- **Realtime** events are emitted server-side via `emitToOrg(...)` / `emitToUser(...)` — never call `io` from a route handler directly.
- **Client state** lives in Zustand (`src/stores/app-store.ts`). Server state via TanStack Query.

## Pull Requests

1. Branch from `main`: `feat/<short-slug>` or `fix/<short-slug>`.
2. One logical change per PR — keep them reviewable.
3. Update `README.md` if you change public API, schema, or scripts.
4. Make sure `bun run lint` and `bun run typecheck` both pass.
5. Describe **what** changed, **why**, and **how to test** in the PR description.

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser + OS
- Console / server logs (redact secrets)
- Screenshots if UI-related

## License

By contributing, you agree your contributions are licensed MIT alongside the rest of the project.
