"use client"

import * as React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon, Briefcase } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { AuthUser, OrgMembership } from "@/lib/types"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/app/theme-toggle"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  jobTitle: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export function AuthView({ mode }: { mode: "login" | "register" }) {
  const { setAuth, setOrganizations, setActiveOrg, setView } = useAppStore()
  const [loading, setLoading] = useState(false)

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: "avery@teamflow.dev", password: "password123" } })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", jobTitle: "" } })

  async function finishAuth(endpoint: string, body: unknown) {
    setLoading(true)
    try {
      const user = await api.post<AuthUser>(endpoint, body)
      setAuth(user)
      // fetch organizations
      try {
        const me = await api.get<{ user: AuthUser; organizations: OrgMembership[] }>("/api/auth/me")
        setOrganizations(me.organizations)
        const chosen = me.organizations[0] ?? null
        setActiveOrg(chosen)
        if (chosen && typeof window !== "undefined") localStorage.setItem("tf_active_org", chosen.id)
      } catch { /* ignore */ }
      toast.success(mode === "login" ? "Welcome back!" : "Account created!")
      setView("dashboard")
    } catch (e) {
      const err = e as ApiError
      toast.error(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-6">
        <button onClick={() => setView("landing")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-2">
          {/* Left brand panel */}
          <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
            <div className="absolute inset-0 tf-grid-bg opacity-20" />
            <div className="relative">
              <Logo className="[&_span]:text-primary-foreground [&_span_.tf-text-gradient]:text-white" />
            </div>
            <div className="relative space-y-4">
              <h2 className="text-2xl font-semibold leading-tight">
                {mode === "login" ? "Welcome back to your workspace" : "Start building your workspace"}
              </h2>
              <p className="text-primary-foreground/80 text-sm">
                Multi-tenant organizations, RBAC, Kanban boards, audit logs and real-time notifications — all in one platform.
              </p>
              <ul className="space-y-2 text-sm text-primary-foreground/90">
                {["Production-grade architecture", "Fine-grained role permissions", "Real-time collaboration"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative text-xs text-primary-foreground/70">© {new Date().getFullYear()} TeamFlow</p>
          </div>

          {/* Right form panel */}
          <div className="p-8 sm:p-10">
            <div className="mb-6 lg:hidden">
              <Logo />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-2xl font-bold tracking-tight">
                  {mode === "login" ? "Sign in to TeamFlow" : "Create your account"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Enter your credentials to access your workspace."
                    : "Start your free workspace in seconds."}
                </p>

                {mode === "login" ? (
                  <form onSubmit={loginForm.handleSubmit((v) => finishAuth("/api/auth/login", v))} className="mt-6 space-y-4">
                    <Field label="Email" icon={Mail} error={loginForm.formState.errors.email?.message}>
                      <Input type="email" autoComplete="email" {...loginForm.register("email")} />
                    </Field>
                    <Field label="Password" icon={Lock} error={loginForm.formState.errors.password?.message}>
                      <Input type="password" autoComplete="current-password" {...loginForm.register("password")} />
                    </Field>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={registerForm.handleSubmit((v) => finishAuth("/api/auth/register", v))} className="mt-6 space-y-4">
                    <Field label="Full name" icon={UserIcon} error={registerForm.formState.errors.name?.message}>
                      <Input autoComplete="name" {...registerForm.register("name")} />
                    </Field>
                    <Field label="Email" icon={Mail} error={registerForm.formState.errors.email?.message}>
                      <Input type="email" autoComplete="email" {...registerForm.register("email")} />
                    </Field>
                    <Field label="Job title (optional)" icon={Briefcase} error={registerForm.formState.errors.jobTitle?.message}>
                      <Input placeholder="e.g. Engineering Manager" {...registerForm.register("jobTitle")} />
                    </Field>
                    <Field label="Password" icon={Lock} error={registerForm.formState.errors.password?.message}>
                      <Input type="password" autoComplete="new-password" {...registerForm.register("password")} />
                    </Field>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                )}

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === "login" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button onClick={() => setView("register")} className="font-medium text-primary hover:underline">
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button onClick={() => setView("login")} className="font-medium text-primary hover:underline">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        TeamFlow · Multi-tenant SaaS workspace platform
      </footer>
    </div>
  )
}

function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="[&_input]:pl-9">{children}</div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
