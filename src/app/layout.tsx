import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TeamFlow — Multi-Tenant SaaS Workspace Platform",
  description:
    "TeamFlow is a production-grade multi-tenant SaaS workspace platform: organizations, teams, RBAC, projects, Kanban tasks, audit logs, real-time notifications and analytics.",
  keywords: [
    "SaaS",
    "multi-tenant",
    "workspace",
    "project management",
    "Kanban",
    "RBAC",
    "Next.js",
    "TypeScript",
  ],
  authors: [{ name: "TeamFlow" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "TeamFlow — Multi-Tenant SaaS Workspace Platform",
    description:
      "Organizations, teams, RBAC, projects, Kanban tasks, audit logs, real-time notifications and analytics.",
    siteName: "TeamFlow",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
