/**
 * Slug + string helpers.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function uniqueSlug(base: string, existing: string[]): string {
  let slug = slugify(base) || "workspace"
  let n = 1
  while (existing.includes(slug)) {
    n += 1
    slug = `${slugify(base)}-${n}`
  }
  return slug
}

export function initials(name?: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—"
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return "never"
  const d = typeof iso === "string" ? new Date(iso) : iso
  const diff = Date.now() - d.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.round(day / 7)
  if (wk < 4) return `${wk}w ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(day / 365)}y ago`
}

export function isOverdue(iso: string | Date | null | undefined): boolean {
  if (!iso) return false
  const d = typeof iso === "string" ? new Date(iso) : iso
  return d.getTime() < Date.now()
}
