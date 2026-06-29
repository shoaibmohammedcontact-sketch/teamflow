# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# TeamFlow — Next.js web (production)
#
# Multi-stage build:
#   1. deps    — install node_modules with Bun
#   2. builder — generate Prisma client + build Next.js (standalone output)
#   3. runner  — lean runtime image with only what's needed to run
#
# Build:  docker build -t teamflow-web .
# Run:    docker run --rm -p 3000:3000 \
#           -e DATABASE_URL="file:./db/custom.db" \
#           -e NEXTAUTH_SECRET="..." \
#           -e NEXTAUTH_URL="http://localhost:3000" \
#           -e REALTIME_URL="http://realtime:3003" \
#           teamflow-web
# ---------------------------------------------------------------------------
FROM oven/bun:1.1 AS deps
WORKDIR /app

# Copy lockfile + manifest first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Builder: generate Prisma client + build Next.js standalone
# ---------------------------------------------------------------------------
FROM oven/bun:1.1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env (no secrets — these are only used to satisfy Next.js build)
ENV DATABASE_URL="file:./db/build.db"
ENV NEXTAUTH_SECRET="build-time-placeholder-not-real"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run db:generate
RUN bun run build

# ---------------------------------------------------------------------------
# Runner: minimal runtime image
# ---------------------------------------------------------------------------
FROM oven/bun:1.1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone server + static assets + public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + migrations so `prisma db push` can run at startup if needed
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Persistent volume for SQLite (ignored if using Postgres in prod)
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db
VOLUME ["/app/db"]

USER nextjs

EXPOSE 3000

# Healthcheck: hit the Next.js app
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "server.js"]
