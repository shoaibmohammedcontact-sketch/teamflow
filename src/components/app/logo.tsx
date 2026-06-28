"use client"

import { Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg tf-brand-gradient text-white shadow-sm">
        <Layers className="h-4 w-4" />
      </div>
      {showText && (
        <span className="text-lg font-semibold tracking-tight">
          Team<span className="tf-text-gradient">Flow</span>
        </span>
      )}
    </div>
  )
}
