"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  Users,
  ShieldCheck,
  KanbanSquare,
  Activity,
  Bell,
  BarChart3,
  Check,
  GitBranch,
  Lock,
  Zap,
  Layers,
  Star,
} from "lucide-react"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/stores/app-store"
import { ThemeToggle } from "@/components/app/theme-toggle"

const FEATURES = [
  { icon: Building2, title: "Multi-tenant workspaces", desc: "Each organization is fully isolated with its own members, teams, projects and audit trail." },
  { icon: ShieldCheck, title: "Fine-grained RBAC", desc: "Owner, Admin, Manager, Member & Guest roles with a declarative permission matrix on every resource." },
  { icon: KanbanSquare, title: "Kanban with drag & drop", desc: "Real-time task board powered by Socket.IO — moves sync instantly across every connected client." },
  { icon: Activity, title: "Audit logging", desc: "Every meaningful action is recorded with actor, resource, metadata and timestamp for full traceability." },
  { icon: Bell, title: "Real-time notifications", desc: "Toast, in-app and simulated email notifications keep your team in sync without polling." },
  { icon: BarChart3, title: "Analytics dashboard", desc: "Completion trends, status breakdowns and team statistics rendered with Recharts." },
]

const PRICING = [
  {
    name: "Free",
    price: "$0",
    cadence: "/mo",
    description: "For individuals & small teams getting started.",
    features: ["1 organization", "Up to 5 members", "3 projects", "Community support"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    cadence: "/mo",
    description: "For growing teams that need more power.",
    features: ["Unlimited organizations", "Up to 50 members", "Unlimited projects", "Audit logs & analytics", "Priority support"],
    cta: "Start Pro trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "For organizations with advanced needs.",
    features: ["SSO & SAML", "Unlimited members", "Dedicated support", "Custom SLAs", "On-prem deployment"],
    cta: "Contact sales",
    highlighted: false,
  },
]

const STATS = [
  { label: "Organizations", value: "12k+" },
  { label: "Active members", value: "180k" },
  { label: "Tasks completed", value: "4.2M" },
  { label: "Uptime SLA", value: "99.99%" },
]

export function LandingView() {
  const { setView } = useAppStore()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#stack" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Stack</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => setView("login")}>Sign in</Button>
            <Button size="sm" onClick={() => setView("register")}>
              Get started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 tf-grid-bg opacity-60" />
        <div className="absolute -top-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full tf-brand-gradient opacity-20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3 py-1">
              <Zap className="h-3.5 w-3.5 text-primary" /> Production-grade SaaS · v1.0
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              The multi-tenant workspace platform your <span className="tf-text-gradient">team will love</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
              TeamFlow unifies organizations, teams, RBAC, projects, Kanban tasks, audit logs and real-time
              notifications into one beautifully engineered platform — built for scale.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-6" onClick={() => setView("register")}>
                Start building free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => setView("login")}>
                <Lock className="mr-2 h-4 w-4" /> View demo account
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Demo login: <code className="rounded bg-muted px-1.5 py-0.5">avery@teamflow.dev</code> / <code className="rounded bg-muted px-1.5 py-0.5">password123</code>
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything a modern team needs</h2>
          <p className="mt-4 text-muted-foreground">
            Built with senior-level engineering practices: clean architecture, RBAC, audit logging, real-time sync and a polished UX.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Engineering stack
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Engineered like a production SaaS
              </h2>
              <p className="mt-4 text-muted-foreground">
                Modular feature-based backend, repository + service layers, centralized error handling,
                input validation with Zod, structured audit logging, RBAC middleware on every endpoint,
                and a typed REST API consumed by a TanStack Query-powered frontend.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Next.js 16 App Router",
                  "TypeScript end-to-end",
                  "Prisma ORM + SQLite",
                  "RBAC permission matrix",
                  "Socket.IO real-time",
                  "TanStack Query",
                  "Zod validation",
                  "shadcn/ui + Tailwind v4",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b pb-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">architecture.ts</span>
              </div>
              <pre className="mt-4 overflow-x-auto text-xs leading-relaxed text-muted-foreground">
{`modules/
  auth/        → register, login, sessions, RBAC
  organizations/ → CRUD, members, switching
  teams/       → create, archive, members
  invitations/ → token-based, expiry, accept/reject
  projects/    → CRUD, pagination, search, filter
  tasks/       → kanban, drag&drop, comments
  notifications/ → in-app + real-time fan-out
  audit/       → activity logs on every action

middleware/   → auth, RBAC, error envelope, cache
sockets/      → Socket.IO org/user rooms`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you grow. Cancel anytime.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border bg-card p-6 ${
                p.highlighted ? "border-primary shadow-lg ring-1 ring-primary/20" : ""
              }`}
            >
              {p.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Star className="h-3 w-3" /> Most popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={p.highlighted ? "default" : "outline"}
                onClick={() => setView("register")}
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl tf-brand-gradient px-8 py-16 text-center text-white">
          <div className="absolute inset-0 tf-grid-bg opacity-20" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to ship your workspace?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/90">
              Create your free organization in seconds and invite your team.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 h-12 px-6"
              onClick={() => setView("register")}
            >
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Logo />
              <p className="mt-3 text-sm text-muted-foreground">
                The multi-tenant SaaS workspace platform for modern teams.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Product</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#stack" className="hover:text-foreground">Engineering</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Legal</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} TeamFlow. All rights reserved.</span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-4 w-4" /> senior-fullstack-saas-platform · v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// silence unused import warning for icons imported but used only in arrays above
export { Users }
