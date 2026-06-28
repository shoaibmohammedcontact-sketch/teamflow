import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { generateToken } from "@/lib/password"
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/constants"

const DAY = 24 * 60 * 60 * 1000

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  jobTitle: string | null
}

/**
 * Reads the session cookie (httpOnly) and returns the authenticated user.
 * Returns null when unauthenticated or session expired/revoked.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.revokedAt) return null
    if (session.expiresAt < new Date()) return null

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
      jobTitle: session.user.jobTitle,
    }
  } catch {
    return null
  }
}

/**
 * Requires authentication; throws an ApiError(401) if not authenticated.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    const err = new Error("Unauthorized") as Error & { status?: number }
    err.status = 401
    throw err
  }
  return user
}

/**
 * Creates a new session and sets the httpOnly cookie.
 * Implements refresh-token-style rotation: old sessions can be revoked on new login.
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * DAY)

  await db.session.create({
    data: { userId, token, expiresAt },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
      await db.session.updateMany({
        where: { token },
        data: { revokedAt: new Date() },
      })
    }
    store.delete(SESSION_COOKIE)
  } catch {
    // ignore
  }
}

/**
 * Returns the active org membership for the current user given an org context.
 * Used by RBAC checks.
 */
export async function getOrgMembership(userId: string, organizationId: string) {
  return db.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  })
}
