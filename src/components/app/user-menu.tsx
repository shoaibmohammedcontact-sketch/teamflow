"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut, User as UserIcon, Settings as SettingsIcon, LayoutDashboard } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api-client"
import { useAppStore } from "@/stores/app-store"
import { initials } from "@/lib/utils"
import { toast } from "sonner"

export function UserMenu() {
  const { user, setAuth, setOrganizations, setActiveOrg, setView } = useAppStore()
  const qc = useQueryClient()

  const logout = useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => {
      setAuth(null)
      setOrganizations([])
      setActiveOrg(null)
      setView("landing")
      qc.clear()
      toast.success("Signed out")
    },
    onError: () => toast.error("Failed to sign out"),
  })

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? "avatar"} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium truncate">{user.name}</span>
          <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setView("profile")}>
          <UserIcon className="h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setView("settings")}>
          <SettingsIcon className="h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setView("dashboard")}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout.mutate()} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
