import { appendFile, mkdir } from "fs/promises"
import path from "path"
import { NextRequest } from "next/server"
import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"
import { desensitizeText } from "@/lib/safety/desensitize"
import { checkRateLimit } from "@/lib/safety/rate-limit"
import { getClientIp } from "@/lib/safety/request-ip"
import { logSafeError } from "@/lib/safety/safe-log"
import { jsonErrorResponse, rateLimitResponse } from "@/lib/safety/sse-response"
import { recordUsageEvent } from "@/lib/safety/usage-monitor"

const MAX_STORY_LENGTH = 5000

function readTextField(root: { readonly [k: string]: Json }): string | null {
  const t = root.text
  if (typeof t !== "string") return null
  return t
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)
  const rate = checkRateLimit(clientIp, "story")
  if (!rate.allowed) {
    void recordUsageEvent({ type: "rate_limited", namespace: "story" })
    return rateLimitResponse(rate.retryAfterSec)
  }

  try {
    const raw = await req.text()
    const j = parseJson(raw)
    if (!isJsonRecord(j)) {
      return jsonErrorResponse("Invalid JSON", 400)
    }
    const text = readTextField(j)
    if (text === null) {
      return jsonErrorResponse("text field required", 400)
    }
    if (text.length === 0 || text.length > MAX_STORY_LENGTH) {
      return jsonErrorResponse("Invalid text length", 400)
    }

    const desensitizedText = desensitizeText(text)

    const dir = path.join(process.cwd(), ".local")
    await mkdir(dir, { recursive: true })
    const record = JSON.stringify({
      at: new Date().toISOString(),
      originalLength: text.length,
      length: desensitizedText.length,
      text: desensitizedText,
    })
    await appendFile(
      path.join(dir, "pending-stories.jsonl"),
      `${record}\n`,
      "utf-8",
    )

    void recordUsageEvent({
      type: "story_submit",
      originalLength: text.length,
      desensitizedLength: desensitizedText.length,
    })

    return new Response(
      JSON.stringify({ ok: true, desensitizedText }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (e) {
    logSafeError("stories/contribute", e)
    return jsonErrorResponse("Could not save", 500)
  }
}
