import { NextResponse } from "next/server"

/**
 * Standardized API helpers — envelope-based responses + centralized error mapping.
 * Envelope: { data, meta } | { error: { code, message, details? } }
 */

type Meta = Record<string, unknown>

export function ok<T>(data: T, meta?: Meta, status = 200) {
  return NextResponse.json({ data, meta: meta ?? {} }, { status })
}

export function created<T>(data: T, meta?: Meta) {
  return ok(data, meta, 201)
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  return ok(items, {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
}

export function fail(message: string, status = 400, code = "bad_request", details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status }
  )
}

export function notFound(message = "Resource not found") {
  return fail(message, 404, "not_found")
}

export function forbidden(message = "You do not have permission to perform this action") {
  return fail(message, 403, "forbidden")
}

export function unauthorized(message = "Authentication required") {
  return fail(message, 401, "unauthorized")
}

export function conflict(message: string) {
  return fail(message, 409, "conflict")
}

/**
 * Wraps an async route handler with centralized error handling.
 */
export function apiHandler(
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
): (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx)
    } catch (err: unknown) {
      const e = err as Error & { status?: number; code?: string; details?: unknown }
      const status = e.status ?? 500
      if (status >= 500) {
        console.error("[api:500]", e)
      }
      if (status === 401) return unauthorized(e.message)
      if (status === 403) return forbidden(e.message)
      if (status === 404) return notFound(e.message)
      if (status === 409) return conflict(e.message)
      if (status === 400) return fail(e.message, 400, e.code ?? "bad_request", e.details)
      return fail(e.message || "Internal server error", status, e.code ?? "internal_error")
    }
  }
}

/**
 * Parse & validate a JSON request body with zod.
 */
export async function parseBody<T>(req: Request, schema: { safeParse: (d: unknown) => { success: boolean; data?: T; error?: { flatten: () => unknown } } }): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { ok: false, response: fail("Invalid JSON body", 400, "invalid_json") }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, response: fail("Invalid input", 400, "validation_error", parsed.error?.flatten()) }
  }
  return { ok: true, data: parsed.data }
}

