"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import {
  User,
  Mail,
  Save,
  ShieldCheck,
  KeyRound,
  BadgeCheck,
  Monitor,
  Smartphone,
  Globe,
  Bell,
  Palette,
  Lock,
  Sun,
  Moon,
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { api, ApiError } from "@/lib/api-client"
import type { AuthUser } from "@/lib/types"
import { formatDate } from "@/lib/slug"
import { initials, cn } from "@/lib/utils"
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/app/view-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface UserProfile extends AuthUser {
  emailVerified?: string | null
  createdAt?: string
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  jobTitle: z.string().max(80).optional().or(z.literal("")),
  avatarUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
})

type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

type PasswordForm = z.infer<typeof passwordSchema>

interface SessionRow {
  device: string
  location: string
  lastActive: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
}

const MOCK_SESSIONS: SessionRow[] = [
  {
    device: "Chrome on macOS",
    location: "San Francisco, CA",
    lastActive: "Active now",
    icon: Monitor,
    current: true,
  },
  {
    device: "Safari on iPhone",
    location: "San Francisco, CA",
    lastActive: "2 hours ago",
    icon: Smartphone,
  },
  {
    device: "Firefox on Linux",
    location: "Berlin, DE",
    lastActive: "3 days ago",
    icon: Globe,
  },
]

export function ProfileView() {
  const { user, setAuth } = useAppStore()
  const { theme, setTheme } = useTheme()

  const [passwordOpen, setPasswordOpen] = React.useState(false)
  const [prefs, setPrefs] = React.useState({
    email: true,
    push: false,
    mentions: true,
  })

  const profileQ = useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
    enabled: !!user,
  })

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", jobTitle: "", avatarUrl: "" },
  })

  React.useEffect(() => {
    if (profileQ.data) {
      form.reset({
        name: profileQ.data.name ?? "",
        jobTitle: profileQ.data.jobTitle ?? "",
        avatarUrl: profileQ.data.avatarUrl ?? "",
      })
    }
  }, [profileQ.data])

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileForm) =>
      api.patch<AuthUser>("/api/user/profile", {
        name: data.name,
        jobTitle: data.jobTitle || undefined,
        avatarUrl: data.avatarUrl || undefined,
      }),
    onSuccess: (updated) => {
      // Update store user
      useAppStore.getState().setAuth({
        ...user,
        ...updated,
      } as AuthUser)
      setAuth({
        ...user,
        ...updated,
      } as AuthUser)
      profileQ.refetch()
      toast.success("Profile updated")
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to update profile"
      toast.error(msg)
    },
  })

  function onSubmit(data: ProfileForm) {
    updateMutation.mutate(data)
  }

  function onPasswordSubmit(_data: PasswordForm) {
    // Demo: no real endpoint
    toast.success("Password updated (demo)")
    passwordForm.reset({ current: "", next: "", confirm: "" })
    setPasswordOpen(false)
  }

  function togglePref(key: keyof typeof prefs, label: string) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      toast.success(`${label} ${next[key] ? "enabled" : "disabled"}`)
      return next
    })
  }

  if (!user) {
    return (
      <EmptyState
        icon={User}
        title="Not signed in"
        description="Sign in to manage your profile."
      />
    )
  }

  const profile = profileQ.data
  const isEmailVerified = !!profile?.emailVerified
  const memberSince = profile?.createdAt ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal information"
        icon={User}
      />

      {profileQ.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      ) : profileQ.isError ? (
        <EmptyState
          icon={User}
          title="Failed to load profile"
          description="Something went wrong. Please try again."
          action={
            <Button size="sm" onClick={() => profileQ.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Avatar card */}
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Avatar className="h-24 w-24">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">
                  {user.name ?? "Anonymous"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {user.jobTitle ?? "Member"}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1",
                    isEmailVerified
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  )}
                >
                  {isEmailVerified ? (
                    <>
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3" />
                      Unverified
                    </>
                  )}
                </Badge>
              </div>
              <Separator className="my-2" />
              <div className="w-full space-y-1.5 text-left text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate font-medium" title={user.email}>
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">
                    {formatDate(memberSince)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Personal information</CardTitle>
              <CardDescription>
                Update your account details. These apply across all your
                organizations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="p-name">Full name</Label>
                    <Input id="p-name" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-job">Job title</Label>
                    <Input
                      id="p-job"
                      placeholder="e.g. Product Designer"
                      {...form.register("jobTitle")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-avatar">Avatar URL</Label>
                  <Input
                    id="p-avatar"
                    type="url"
                    placeholder="https://example.com/avatar.png"
                    {...form.register("avatarUrl")}
                  />
                  {form.formState.errors.avatarUrl && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.avatarUrl.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      "Saving…"
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and active sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">
                Last changed recently. Use a strong, unique password.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
              <KeyRound className="mr-2 h-3.5 w-3.5" />
              Change password
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                Email address
                {isEmailVerified ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  >
                    Unverified
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Mail className="mr-2 h-3.5 w-3.5" />
              Change email
            </Button>
          </div>

          <Separator />

          {/* Active sessions */}
          <div>
            <p className="mb-2 text-sm font-medium">Active sessions</p>
            <div className="space-y-2">
              {MOCK_SESSIONS.map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={`${s.device}-${s.location}`}
                    className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {s.device}
                        {s.current && (
                          <Badge className="bg-emerald-500 text-white">
                            Current
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.location} · {s.lastActive}
                      </p>
                    </div>
                    {!s.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          toast.success("Session signed out (demo)")
                        }
                      >
                        Sign out
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Preferences
          </CardTitle>
          <CardDescription>
            Customize your experience. Preferences are stored locally for this
            demo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Switch between light and dark mode.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="mr-2 h-3.5 w-3.5" />
                  Light mode
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-3.5 w-3.5" />
                  Dark mode
                </>
              )}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive task and mention updates by email.
                  </p>
                </div>
                <Switch
                  checked={prefs.email}
                  onCheckedChange={() =>
                    togglePref("email", "Email notifications")
                  }
                  aria-label="Toggle email notifications"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium">Push notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get desktop push alerts (requires browser permission).
                  </p>
                </div>
                <Switch
                  checked={prefs.push}
                  onCheckedChange={() =>
                    togglePref("push", "Push notifications")
                  }
                  aria-label="Toggle push notifications"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium">Mention alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me whenever I'm @mentioned in a comment.
                  </p>
                </div>
                <Switch
                  checked={prefs.mentions}
                  onCheckedChange={() =>
                    togglePref("mentions", "Mention alerts")
                  }
                  aria-label="Toggle mention alerts"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change password dialog (demo) */}
      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          setPasswordOpen(open)
          if (!open)
            passwordForm.reset({ current: "", next: "", confirm: "" })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change password
            </DialogTitle>
            <DialogDescription>
              This is a demo. The form below does not call a real endpoint —
              no actual password change will occur.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="pw-current">Current password</Label>
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("current")}
              />
              {passwordForm.formState.errors.current && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.current.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-next">New password</Label>
              <Input
                id="pw-next"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("next")}
              />
              {passwordForm.formState.errors.next && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.next.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm new password</Label>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("confirm")}
              />
              {passwordForm.formState.errors.confirm && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {profileQ.isFetching && !profileQ.isLoading && (
        <LoadingBlock label="Refreshing…" />
      )}
    </div>
  )
}
