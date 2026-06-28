"use client"

import { Bell, Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { UserMenu } from "@/components/app/user-menu"
import { NotificationsBell } from "@/components/app/notifications-bell"
import { useAppStore } from "@/stores/app-store"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { OrgSwitcher } from "@/components/app/org-switcher"
import { SidebarNav } from "@/components/app/sidebar-nav"
import { Logo } from "@/components/app/logo"
import { VISUAL_TITLES } from "@/components/app/view-titles"

export function Topbar() {
  const { view, setSidebarOpen, setView } = useAppStore()
  const title = VISUAL_TITLES[view] ?? "TeamFlow"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b px-4">
              <Logo />
            </div>
            <div className="p-3 border-b">
              <OrgSwitcher />
            </div>
            <div className="flex-1 overflow-y-auto tf-scroll">
              <SidebarNav onNavigate={() => { /* sheet auto closes via state? */ }} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0">
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </div>

      <div className="hidden md:flex items-center w-64">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="h-9 pl-8 bg-muted/40 border-transparent focus-visible:border-border"
            onFocus={() => setView("projects")}
          />
        </div>
      </div>

      <NotificationsBell />
      <ThemeToggle />
      <UserMenu />
    </header>
  )
}

export { Bell }
