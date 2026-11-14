export const VISITOR_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
export const VISITOR_COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Host-rayin-visitor"
  : "rayin-visitor"

export function createVisitorToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

export async function hashVisitorToken(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
}
