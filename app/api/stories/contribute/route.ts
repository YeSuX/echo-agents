import { NextRequest } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db/d1"
import { StoryRepository } from "@/lib/db/story-repository"
import { conversationKeyringFromEnv } from "@/lib/crypto/conversation-codec"
import { desensitizeText } from "@/lib/safety/desensitize"
import { checkRateLimit } from "@/lib/safety/rate-limit"
import { getClientIp } from "@/lib/safety/request-ip"
import { logSafeError } from "@/lib/safety/safe-log"
import { jsonErrorResponse, rateLimitResponse } from "@/lib/safety/sse-response"
import { MAX_STORY_CHARS, MAX_STORY_REQUEST_BYTES, STORY_CONSENT_VERSION } from "@/lib/story-contribution"

const submissionSchema = z.object({
  submissionId: z.uuid(),
  text: z.string().trim().min(1).max(MAX_STORY_CHARS),
  consent: z.literal(true),
  consentVersion: z.literal(STORY_CONSENT_VERSION),
})

async function readSubmission(req: NextRequest): Promise<unknown> {
  const reader = req.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_STORY_REQUEST_BYTES) {
        await reader.cancel()
        throw new RangeError("Request too large")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(getClientIp(req), "story")
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec)

  try {
    if (Number(req.headers.get("content-length")) > MAX_STORY_REQUEST_BYTES) {
      return jsonErrorResponse("The submission is too large. Shorten the draft and retry.", 413)
    }
    let body: unknown
    try {
      body = await readSubmission(req)
    } catch (error) {
      return jsonErrorResponse(error instanceof RangeError
        ? "The submission is too large. Shorten the draft and retry."
        : "Invalid submission body.", error instanceof RangeError ? 413 : 400)
    }
    const parsed = submissionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonErrorResponse(`Review the draft, confirm consent, and provide 1–${MAX_STORY_CHARS} characters.`, 400)
    }
    const { text, submissionId } = parsed.data
    const desensitizedText = desensitizeText(text)
    if (desensitizedText.length > MAX_STORY_CHARS) {
      return jsonErrorResponse("The anonymized draft is too long. Shorten it and retry.", 400)
    }
    const repository = new StoryRepository(getDb(), conversationKeyringFromEnv())
    const result = await repository.submit({ id: submissionId, text: desensitizedText, originalLength: text.length })
    if (result === "conflict") {
      return jsonErrorResponse("This submission ID was already used for different content. Edit the draft and retry.", 409)
    }
    return Response.json({ ok: true, submissionId, status: "pending", desensitizedText }, {
      status: result === "created" ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    logSafeError("stories/contribute", error)
    return jsonErrorResponse("Could not save your submission. Your draft is retained; please retry later.", 503)
  }
}
