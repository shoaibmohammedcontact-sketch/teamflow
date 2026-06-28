/**
 * TeamFlow SaaS — Seed Script
 * Creates a realistic demo organization with members, teams, projects, tasks,
 * labels, comments, notifications and activity logs.
 *
 * Run with: bun run db:seed
 */
import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/password"

async function main() {
  console.log("🌱 Seeding TeamFlow SaaS…")

  // --- Users ---
  const users = await Promise.all(
    [
      { name: "Avery Chen", email: "avery@teamflow.dev", jobTitle: "Founder & CEO" },
      { name: "Marcus Bell", email: "marcus@teamflow.dev", jobTitle: "Head of Engineering" },
      { name: "Priya Nair", email: "priya@teamflow.dev", jobTitle: "Product Manager" },
      { name: "Diego Santos", email: "diego@teamflow.dev", jobTitle: "Senior Engineer" },
      { name: "Lina Park", email: "lina@teamflow.dev", jobTitle: "Designer" },
      { name: "Omar Haddad", email: "omar@teamflow.dev", jobTitle: "QA Engineer" },
      { name: "Sofia Reyes", email: "sofia@teamflow.dev", jobTitle: "Marketing Lead" },
    ].map((u) =>
      db.user.create({
        data: {
          ...u,
          email: u.email.toLowerCase(),
          passwordHash: hashPassword("password123"),
          emailVerified: new Date(),
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}&backgroundColor=10b981,6366f1,f59e0b,ec4899&backgroundType=gradientLinear`,
        },
      })
    )
  )
  const [avery, marcus, priya, diego, lina, omar, sofia] = users

  // --- Organization ---
  const org = await db.organization.create({
    data: {
      name: "Northwind Labs",
      slug: "northwind-labs",
      plan: "pro",
      ownerId: avery.id,
      logoUrl: null,
      members: {
        createMany: {
          data: [
            { userId: avery.id, role: "owner", status: "active" },
            { userId: marcus.id, role: "admin", status: "active" },
            { userId: priya.id, role: "manager", status: "active" },
            { userId: diego.id, role: "member", status: "active" },
            { userId: lina.id, role: "member", status: "active" },
            { userId: omar.id, role: "member", status: "active" },
            { userId: sofia.id, role: "guest", status: "active" },
          ],
        },
      },
    },
  })

  // --- Teams ---
  const [engTeam, designTeam, growthTeam] = await Promise.all([
    db.team.create({
      data: {
        organizationId: org.id,
        name: "Engineering",
        description: "Platform & product engineering",
        color: "#10b981",
        members: {
          create: [
            { userId: marcus.id, role: "lead" },
            { userId: diego.id, role: "member" },
            { userId: omar.id, role: "member" },
          ],
        },
      },
    }),
    db.team.create({
      data: {
        organizationId: org.id,
        name: "Design",
        description: "Product & brand design",
        color: "#ec4899",
        members: { create: [{ userId: lina.id, role: "lead" }] },
      },
    }),
    db.team.create({
      data: {
        organizationId: org.id,
        name: "Growth",
        description: "Marketing, content & analytics",
        color: "#f59e0b",
        members: { create: [{ userId: sofia.id, role: "lead" }, { userId: priya.id, role: "member" }] },
      },
    }),
  ])

  // --- Labels ---
  const labels = await Promise.all(
    [
      { name: "bug", color: "#ef4444" },
      { name: "feature", color: "#10b981" },
      { name: "refactor", color: "#8b5cf6" },
      { name: "docs", color: "#0ea5e9" },
      { name: "design", color: "#ec4899" },
      { name: "performance", color: "#f59e0b" },
    ].map((l) => db.label.create({ data: { ...l, organizationId: org.id } }))
  )
  const labelByName = Object.fromEntries(labels.map((l) => [l.name, l]))

  // --- Projects ---
  const [projPlatform, projMobile, projMarketing] = await Promise.all([
    db.project.create({
      data: {
        organizationId: org.id,
        teamId: engTeam.id,
        name: "Platform v2 Migration",
        description: "Migrate core services to the new platform architecture with improved observability.",
        status: "active",
        visibility: "internal",
        ownerId: marcus.id,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
    }),
    db.project.create({
      data: {
        organizationId: org.id,
        teamId: engTeam.id,
        name: "Mobile App Rewrite",
        description: "React Native rewrite of the consumer mobile app with offline-first sync.",
        status: "active",
        visibility: "private",
        ownerId: priya.id,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    }),
    db.project.create({
      data: {
        organizationId: org.id,
        teamId: growthTeam.id,
        name: "Q4 Growth Campaign",
        description: "Launch the Q4 acquisition campaign across content, ads and partnerships.",
        status: "on_hold",
        visibility: "internal",
        ownerId: sofia.id,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    }),
  ])

  // --- Tasks ---
  type TaskSeed = {
    title: string
    description?: string
    status: "backlog" | "todo" | "in_progress" | "in_review" | "done"
    priority: "low" | "medium" | "high" | "urgent"
    assigneeId: string
    labels?: string[]
    dueInDays?: number
    project: typeof projPlatform
  }

  const tasks: TaskSeed[] = [
    { title: "Define service boundaries for billing module", status: "in_progress", priority: "high", assigneeId: diego.id, labels: ["refactor"], dueInDays: 5, project: projPlatform, description: "Split monolithic billing service into invoice, subscription and usage services." },
    { title: "Set up distributed tracing (OpenTelemetry)", status: "todo", priority: "medium", assigneeId: marcus.id, labels: ["performance", "feature"], dueInDays: 9, project: projPlatform },
    { title: "Migrate auth to JWT refresh rotation", status: "in_review", priority: "urgent", assigneeId: diego.id, labels: ["feature"], dueInDays: 2, project: projPlatform },
    { title: "Write runbook for Postgres failover", status: "todo", priority: "low", assigneeId: omar.id, labels: ["docs"], dueInDays: 14, project: projPlatform },
    { title: "Audit RBAC middleware coverage", status: "done", priority: "high", assigneeId: marcus.id, labels: ["refactor"], dueInDays: -3, project: projPlatform },
    { title: "Offline-first sync engine", status: "in_progress", priority: "urgent", assigneeId: diego.id, labels: ["feature"], dueInDays: 12, project: projMobile, description: "Implement conflict-free replicated data types for offline task edits." },
    { title: "Push notification preferences UI", status: "todo", priority: "medium", assigneeId: lina.id, labels: ["design"], dueInDays: 7, project: projMobile },
    { title: "Biometric login (FaceID / fingerprint)", status: "backlog", priority: "medium", assigneeId: diego.id, labels: ["feature"], dueInDays: 20, project: projMobile },
    { title: "App store assets & screenshots", status: "todo", priority: "low", assigneeId: lina.id, labels: ["design"], dueInDays: 15, project: projMobile },
    { title: "QA: regression suite for sync", status: "in_review", priority: "high", assigneeId: omar.id, labels: ["bug"], dueInDays: 4, project: projMobile },
    { title: "Campaign landing page copy", status: "done", priority: "medium", assigneeId: sofia.id, labels: ["docs"], dueInDays: -1, project: projMarketing },
    { title: "Partner outreach tracker", status: "todo", priority: "medium", assigneeId: priya.id, labels: ["feature"], dueInDays: 8, project: projMarketing },
    { title: "Analytics dashboard for CAC", status: "backlog", priority: "low", assigneeId: priya.id, labels: ["feature"], project: projMarketing },
  ]

  let pos = 0
  for (const t of tasks) {
    const task = await db.task.create({
      data: {
        projectId: t.project.id,
        title: t.title,
        description: t.description ?? null,
        priority: t.priority,
        status: t.status,
        assigneeId: t.assigneeId,
        createdById: avery.id,
        dueDate: t.dueInDays !== undefined ? new Date(Date.now() + t.dueInDays * 24 * 60 * 60 * 1000) : null,
        position: pos++,
        ...(t.labels?.length
          ? { labels: { create: t.labels.map((n) => ({ labelId: labelByName[n].id })) } }
          : {}),
      },
    })

    // sprinkle comments on in_progress / in_review tasks
    if (t.status === "in_progress" || t.status === "in_review") {
      await db.comment.create({
        data: {
          taskId: task.id,
          userId: priya.id,
          content: "Could we get a status update before end of day?",
        },
      })
      await db.comment.create({
        data: {
          taskId: task.id,
          userId: t.assigneeId,
          content: "On track — pushing a PR this afternoon. Just need to wire up tests.",
        },
      })
    }
  }

  // --- Activity logs ---
  const actions = [
    { actorId: avery.id, action: "organization.create", resource: "organization", resourceId: org.id, metadata: { name: org.name } },
    { actorId: marcus.id, action: "team.create", resource: "team", resourceId: engTeam.id, metadata: { name: engTeam.name } },
    { actorId: lina.id, action: "team.create", resource: "team", resourceId: designTeam.id, metadata: { name: designTeam.name } },
    { actorId: marcus.id, action: "project.create", resource: "project", resourceId: projPlatform.id, metadata: { name: projPlatform.name } },
    { actorId: priya.id, action: "project.create", resource: "project", resourceId: projMobile.id, metadata: { name: projMobile.name } },
    { actorId: avery.id, action: "member.invite", resource: "invitation", metadata: { email: sofia.email, role: "guest" } },
    { actorId: diego.id, action: "task.create", resource: "task", metadata: { title: "Offline-first sync engine" } },
    { actorId: priya.id, action: "comment.create", resource: "comment", metadata: {} },
    { actorId: marcus.id, action: "member.role_update", resource: "member", metadata: { from: "member", to: "admin" } },
    { actorId: diego.id, action: "task.move", resource: "task", metadata: { fromStatus: "todo", toStatus: "in_progress" } },
    { actorId: avery.id, action: "label.create", resource: "label", metadata: { name: "feature" } },
    { actorId: marcus.id, action: "project.archive", resource: "project", metadata: {} },
  ]
  for (const a of actions) {
    await db.activityLog.create({
      data: {
        organizationId: org.id,
        actorId: a.actorId,
        action: a.action,
        resource: a.resource,
        resourceId: a.resourceId ?? null,
        metadata: JSON.stringify(a.metadata ?? {}),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 6 * 24 * 60 * 60 * 1000)),
      },
    })
  }

  // --- Notifications ---
  await db.notification.createMany({
    data: [
      { userId: diego.id, type: "task_assigned", title: "New task assigned", message: "Priya assigned you \"Offline-first sync engine\".", data: JSON.stringify({ taskId: "seed" }) },
      { userId: marcus.id, type: "system", title: "Audit complete", message: "RBAC middleware coverage audit was completed.", data: JSON.stringify({}) },
      { userId: avery.id, type: "system", title: "Welcome to TeamFlow", message: "Your Northwind Labs workspace is ready.", data: JSON.stringify({}) },
      { userId: lina.id, type: "task_assigned", title: "Design task assigned", message: "You were assigned \"Push notification preferences UI\".", data: JSON.stringify({}) },
    ],
  })

  console.log(`✅ Seeded org "${org.name}" with ${users.length} users, 3 teams, 3 projects, ${tasks.length} tasks.`)
  console.log("   Demo login: avery@teamflow.dev / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
