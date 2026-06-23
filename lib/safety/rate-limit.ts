type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number }

/**
 * 进程内滑动窗口限流（单实例有效；多 Worker 需外置 Redis/KV）。
 */
export function checkRateLimit(
  key: string,
  namespace: "chat" | "story",
): RateLimitResult {
  const max =
    namespace === "chat"
      ? envInt("CHAT_RATE_LIMIT_PER_MIN", 30)
      : envInt("STORY_RATE_LIMIT_PER_HOUR", 5)
  const windowMs =
    namespace === "chat" ? 60_000 : 3_600_000

  const now = Date.now()
  const bucketKey = `${namespace}:${key}`
  const existing = buckets.get(bucketKey)

  if (!existing || now >= existing.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (existing.count >= max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    )
    return { allowed: false, retryAfterSec }
  }

  existing.count += 1
  return { allowed: true }
}

/** 测试或长进程时可调用，避免 Map 无限增长 */
export function resetRateLimitsForTests(): void {
  buckets.clear()
}
