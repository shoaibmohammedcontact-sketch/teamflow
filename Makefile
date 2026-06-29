# ---------------------------------------------------------------------------
# TeamFlow — Makefile for common dev commands
#
# Usage:
#   make help          — list all targets
#   make install       — bun install + generate Prisma client
#   make db            — push schema + seed
#   make dev           — start Next.js dev server (:3000)
#   make realtime      — start Socket.IO mini-service (:3003) [separate terminal]
#   make up            — docker compose up (full stack with Postgres)
#   make down          — docker compose down
#   make lint          — eslint
#   make typecheck     — tsc --noEmit
#   make build         — production build
#
# Requires: bun, docker (only for `up`/`down`)
# ---------------------------------------------------------------------------

.PHONY: help install db dev realtime up down stop logs lint typecheck format build clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\n\033[1mTeamFlow — targets:\033[0m\n\n"} \
 /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } \
 /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

install: ## Install deps + generate Prisma client
	bun install
	bun run db:generate

db: ## Push schema + seed demo data
	bun run db:push
	bun run db:seed

dev: ## Start Next.js dev server (port 3000)
	bun run dev

realtime: ## Start Socket.IO mini-service (port 3003, separate terminal)
	bun run realtime

up: ## Docker compose up — full stack (web + realtime + postgres)
	docker compose up --build

up-detached: ## Docker compose up in background
	docker compose up --build -d

down: ## Docker compose down
	docker compose down

stop: ## Alias for down
	docker compose down

logs: ## Tail docker compose logs
	docker compose logs -f

lint: ## Run ESLint
	bun run lint

typecheck: ## Run TypeScript compiler (no emit)
	bun run typecheck

format: ## Run Prettier
	bun run format

build: ## Production build (standalone)
	bun run build

clean: ## Remove build artefacts + dev DB
	rm -rf .next out build
	rm -f db/*.db db/*.db-journal db/*.db-wal db/*.db-shm
	rm -f dev.log server.log realtime.log

reset-db: ## Drop + recreate the DB (DESTRUCTIVE)
	bun run db:reset
	bun run db:seed
