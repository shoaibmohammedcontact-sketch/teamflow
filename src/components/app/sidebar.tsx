"use client"

import { Logo } from "@/components/app/logo"
import { OrgSwitcher } from "@/components/app/org-switcher"
import { SidebarNav } from "@/components/app/sidebar-nav"

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <Logo />
      </div>
      <div className="p-3 border-b">
        <OrgSwitcher />
      </div>
      <div className="flex-1 overflow-y-auto tf-scroll">
        <SidebarNav />
      </div>
    </aside>
  )
}
