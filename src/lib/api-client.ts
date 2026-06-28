"use client"

import type { Paginated } from "@/lib/types"

/**
 * Typed fetch wrapper for the frontend. Reads the standard API envelope
 * `{ data, meta }` / `{ error }` and throws on non-2xx.
 */

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(message: string, status: number, code = "error", details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request<T>(
  url: string,
  options?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  const { query, ...init } = options ?? {}
  let finalUrl = url
  if (query) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
    }
    const qs = sp.toString()
    if (qs) finalUrl += (url.includes("?") ? "&" : "?") + qs
  }

  const res = await fetch(finalUrl, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `Request failed (${res.status})`
    throw new ApiError(msg, res.status, json?.error?.code ?? "error", json?.error?.details)
  }

  // Envelope: { data, meta } | raw
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T
  }
  return json as T
}

export const api = {
  get: <T>(url: string, query?: Record<string, string | number | boolean | undefined>) =>
    request<T>(url, { method: "GET", query }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
}

/** GET that returns the full paginated envelope (items + meta) */
export async function apiPaginated<T>(
  url: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<Paginated<T>> {
  const sp = new URLSearchParams()
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
    }
  }
  const qs = sp.toString()
  const finalUrl = qs ? `${url}?${qs}` : url
  const res = await fetch(finalUrl, { credentials: "include", headers: { "content-type": "application/json" } })
  const json = await res.json()
  if (!res.ok) {
    throw new ApiError(json?.error?.message ?? "Request failed", res.status, json?.error?.code)
  }
  return {
    items: json.data,
    total: json.meta?.total ?? 0,
    page: json.meta?.page ?? 1,
    pageSize: json.meta?.pageSize ?? 10,
    totalPages: json.meta?.totalPages ?? 1,
  }
}
