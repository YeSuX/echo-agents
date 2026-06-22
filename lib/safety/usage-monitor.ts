import { appendFile, mkdir } from "fs/promises"
import path from "path"

export type UsageEvent =
  | {
      type: "chat_request"
      mode: "companion" | "guest"
      crisisShortCircuit: boolean
      injectionDetected: boolean
      moderationBlocked: boolean
      guestBoundaryBlocked: boolean
      upstreamError: boolean
      timeout: boolean
      durationMs: number
    }
  | {
      type: "story_submit"
      originalLength: number
      desensitizedLength: number
    }
  | {
      type: "rate_limited"
      namespace: "chat" | "story"
    }

function metricsEnabled(): boolean {
  return process.env.DISABLE_USAGE_METRICS !== "1"
}

export async function recordUsageEvent(
  event: UsageEvent & { at?: string },
): Promise<void> {
  if (!metricsEnabled()) return
  const payload = {
    at: event.at ?? new Date().toISOString(),
    ...event,
  }
  try {
    const dir = path.join(process.cwd(), ".local")
    await mkdir(dir, { recursive: true })
    await appendFile(
      path.join(dir, "usage-metrics.jsonl"),
      `${JSON.stringify(payload)}\n`,
      "utf-8",
    )
  } catch {
    // 监控失败不影响主流程；开发环境可 console
    if (process.env.NODE_ENV === "development") {
      console.info("[usage]", JSON.stringify(payload))
    }
  }
}
