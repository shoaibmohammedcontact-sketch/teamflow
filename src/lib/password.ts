import { scryptSync, randomBytes, timingSafeEqual } from "crypto"

// Password hashing using Node's built-in scrypt (no external deps)
// Format: <salt>:<hash>

const KEY_LEN = 64
const SALT_LEN = 16

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex")
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, "hex")
  const testBuf = scryptSync(password, salt, KEY_LEN)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}
