"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  const Icon = icon
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "primary",
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  hint?: string
  accent?: "primary" | "emerald" | "amber" | "violet" | "rose"
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  }
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accents[accent])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      <span className="animate-pulse">{label}</span>
    </div>
  )
}
