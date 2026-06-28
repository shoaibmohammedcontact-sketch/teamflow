"use client"

import * as React from "react"
import { Sidebar } from "@/components/app/sidebar"
import { Topbar } from "@/components/app/topbar"
import { Github, Heart } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { useRealtime } from "@/hooks/use-realtime"

export function AppShell({ children }: { children: React.ReactNode }) {
  useRealtime()
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto tf-scroll">{children}</main>
        </div>
      </div>
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo showText={false} />
            <span>
              © {new Date().getFullYear()} TeamFlow · Multi-tenant SaaS workspace platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Github className="h-4 w-4" /> senior-fullstack-saas
            </a>
            <span className="flex items-center gap-1">
              Built with <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> using Next.js &amp; Prisma
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
