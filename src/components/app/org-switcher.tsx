"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api } from "@/lib/api-client"
import type { OrgMembership } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, initials } from "@/lib/utils"
import { toast } from "sonner"
import { ROLE_BADGE_CLASS, ROLE_LABELS } from "@/lib/constants"

export function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrg, setView } = useAppStore()
  const [open, setOpen] = useState(false)

  async function switchOrg(org: OrgMembership) {
    setOpen(false)
    setActiveOrg(org)
    if (typeof window !== "undefined") localStorage.setItem("tf_active_org", org.id)
    // refetch orgs to refresh counts
    try {
      const fresh = await api.get<OrgMembership[]>("/api/organizations")
      useAppStore.getState().setOrganizations(fresh)
      const chosen = fresh.find((o) => o.id === org.id) ?? org
      setActiveOrg(chosen)
    } catch {
      /* ignore */
    }
    setView("dashboard")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Switch organization"
          className="w-full justify-between px-2.5 h-11"
        >
          {activeOrg ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
                {initials(activeOrg.name)}
              </span>
              <span className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate max-w-[140px]">{activeOrg.name}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", ROLE_BADGE_CLASS[activeOrg.role])}>
                  {ROLE_LABELS[activeOrg.role] ?? activeOrg.role}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" /> Select org
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>
            <CommandGroup heading="Your organizations">
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => switchOrg(org)}
                  className="gap-2"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-semibold">
                    {initials(org.name)}
                  </span>
                  <span className="flex-1 truncate">{org.name}</span>
                  <Check className={cn("h-4 w-4", activeOrg?.id === org.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => { setOpen(false); setView("organizations") }} className="gap-2 text-primary">
                <Plus className="h-4 w-4" /> Create organization
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { toast }
