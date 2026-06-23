import { NextRequest } from "next/server"
import OpenAI from "openai"
import { getCompanionSystemPrompt } from "@/lib/companion-agent"
import { getGuestSystemPrompt } from "@/lib/guest-agent"
import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"
import { matchCases } from "@/lib/match-cases"
import { getSelfHelpEntryById } from "@/data/self-help-catalog"
import { detectIntent, selfHelpIdsForIntents } from "@/lib/intent-detect"
import { conversationHasCrisis } from "@/lib/safety/crisis"
import { checkGuestResponse } from "@/lib/safety/guest-boundary"
import {
  kimiTimeoutMs,
  resolveKimiClient,
} from "@/lib/safety/kimi-server"
import { moderateAssistantOutput } from "@/lib/safety/output-moderation"
import {
  detectPromptInjection,
  sanitizeMessagesForLlm,
} from "@/lib/safety/prompt-injection"
import { checkRateLimit } from "@/lib/safety/rate-limit"
import { getClientIp } from "@/lib/safety/request-ip"
import {
  logSafeError,
  sanitizeErrorMessage,
} from "@/lib/safety/safe-log"
import {
  createCrisisSseStream,
  encodeSseData,
  encodeSseDone,
  jsonErrorResponse,
  rateLimitResponse,
  sseResponseHeaders,
} from "@/lib/safety/sse-response"
import {
  PROMPT_INJECTION_SYSTEM_NOTE,
  UPSTREAM_ERROR_MESSAGE,
  UPSTREAM_TIMEOUT_MESSAGE,
} from "@/lib/safety/constants"
import { recordUsageEvent } from "@/lib/safety/usage-monitor"

const KIMI_MODEL = "kimi-k2.5"

type ChatRole = "user" | "assistant"

type ChatMessage = { role: ChatRole; content: string }

type ChatMode = "companion" | "guest"

function parseMessages(value: Json): ChatMessage[] | null {
  if (!Array.isArray(value)) return null
  const out: ChatMessage[] = []
  for (const m of value) {
    if (!isJsonRecord(m)) return null
    const role = m.role
    const content = m.content
    if (role !== "user" && role !== "assistant") continue
    if (typeof content !== "string") return null
    out.push({ role, content })
  }
  if (out.length === 0) return null
  return out
}

function parseMode(value: Json): ChatMode | null {
  if (value === "companion" || value === "guest") return value
  return null
}

function lastUserContent(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content
  }
  return ""
}

function parseChatRequest(
  root: { readonly [k: string]: Json },
): { mode: ChatMode; guestId: string; messages: ChatMessage[] } | null {
  const messages = parseMessages(root.messages)
  if (!messages) return null
  const guestIdRaw = root.guestId
  const guestId = typeof guestIdRaw === "string" ? guestIdRaw : ""
  const modeRaw = root.mode
  let mode: ChatMode
  if (modeRaw !== undefined && modeRaw !== null) {
    const m = parseMode(modeRaw)
    if (!m) return null
    mode = m
  } else {
    mode = guestId.length > 0 ? "guest" : "companion"
  }
  if (mode === "guest" && guestId.length === 0) return null
  return { mode, guestId, messages }
}

function userMessagesInjectionDetected(
  messages: readonly ChatMessage[],
): boolean {
  for (const m of messages) {
    if (m.role !== "user") continue
    if (detectPromptInjection(m.content).detected) return true
  }
  return false
}

async function streamKimiWithModeration(
  controller: ReadableStreamDefaultController<Uint8Array>,
  options: {
    client: OpenAI
    systemPrompt: string
    llmMessages: ReturnType<typeof sanitizeMessagesForLlm>
    mode: ChatMode
    guestId: string
    lastUser: string
    selfHelpIds: string[]
    abort: AbortSignal
    started: number
    injectionDetected: boolean
  },
): Promise<void> {
  const {
    client,
    systemPrompt,
    llmMessages,
    mode,
    guestId,
    lastUser,
    selfHelpIds,
    abort,
    started,
    injectionDetected,
  } = options

  for (const id of selfHelpIds) {
    const entry = getSelfHelpEntryById(id)
    if (entry) {
      controller.enqueue(
        encodeSseData({
          type: "self_help",
          items: [
            { id: entry.id, title: entry.title, url: entry.href },
          ],
        }),
      )
    }
  }

  const stream = await client.chat.completions.create(
    {
      model: KIMI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...llmMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
    },
    { signal: abort },
  )

  let rawAssistant = ""
  for await (const chunk of stream) {
    if (abort.aborted) throw new Error("timeout")
    const delta = chunk.choices[0]?.delta?.content
    if (typeof delta === "string" && delta) {
      rawAssistant += delta
      controller.enqueue(encodeSseData({ content: delta }))
    }
  }

  let finalContent = rawAssistant
  let moderationBlocked = false
  let guestBoundaryBlocked = false

  if (mode === "guest") {
    const guestCheck = checkGuestResponse(guestId, lastUser, rawAssistant)
    if (guestCheck.flagged) {
      guestBoundaryBlocked = true
      finalContent = guestCheck.content
    }
  } else {
    const mod = moderateAssistantOutput(rawAssistant, "companion")
    if (mod.severity === "block") {
      moderationBlocked = true
      finalContent = mod.content
    }
  }

  if (finalContent !== rawAssistant) {
    controller.enqueue(
      encodeSseData({ type: "content_replace", content: finalContent }),
    )
  }

  void recordUsageEvent({
    type: "chat_request",
    mode,
    crisisShortCircuit: false,
    injectionDetected,
    moderationBlocked,
    guestBoundaryBlocked,
    upstreamError: false,
    timeout: false,
    durationMs: Date.now() - started,
  })

  controller.enqueue(encodeSseDone())
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  const clientIp = getClientIp(req)

  const rate = checkRateLimit(clientIp, "chat")
  if (!rate.allowed) {
    void recordUsageEvent({ type: "rate_limited", namespace: "chat" })
    return rateLimitResponse(rate.retryAfterSec)
  }

  try {
    const text = await req.text()
    const j = parseJson(text)
    if (!isJsonRecord(j)) {
      return jsonErrorResponse("Invalid JSON body", 400)
    }
    const parsed = parseChatRequest(j)
    if (!parsed) {
      return jsonErrorResponse(
        "Invalid body: need messages[], and for guest mode guestId; or mode: companion",
        400,
      )
    }

    const kimiResolved = resolveKimiClient(j)
    if ("error" in kimiResolved) {
      return jsonErrorResponse(kimiResolved.error, kimiResolved.status, {
        ...(kimiResolved.code ? { code: kimiResolved.code } : {}),
      })
    }
    const client = kimiResolved.client

    const { mode, guestId, messages } = parsed
    const lastUser = lastUserContent(messages)
    const injectionDetected = userMessagesInjectionDetected(messages)

    if (conversationHasCrisis(messages)) {
      void recordUsageEvent({
        type: "chat_request",
        mode,
        crisisShortCircuit: true,
        injectionDetected,
        moderationBlocked: false,
        guestBoundaryBlocked: false,
        upstreamError: false,
        timeout: false,
        durationMs: Date.now() - started,
      })
      return new Response(createCrisisSseStream(), {
        headers: sseResponseHeaders(),
      })
    }

    let systemPrompt: string
    if (mode === "companion") {
      const matched = matchCases(lastUser, 2)
      systemPrompt = getCompanionSystemPrompt(matched)
    } else {
      systemPrompt = getGuestSystemPrompt(guestId)
    }
    systemPrompt = `${systemPrompt}\n\n${PROMPT_INJECTION_SYSTEM_NOTE}`

    const llmMessages = sanitizeMessagesForLlm(messages)
    const timeoutMs = kimiTimeoutMs()
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), timeoutMs)
    const intents = detectIntent(lastUser)
    const selfHelpIds = selfHelpIdsForIntents(intents)

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await streamKimiWithModeration(controller, {
            client,
            systemPrompt,
            llmMessages,
            mode,
            guestId,
            lastUser,
            selfHelpIds,
            abort: abort.signal,
            started,
            injectionDetected,
          })
        } catch (e) {
          logSafeError("chat/kimi", e, { mode, timeout: abort.signal.aborted })
          const kind = sanitizeErrorMessage(e)
          const timeout = kind === "upstream_timeout" || abort.signal.aborted
          void recordUsageEvent({
            type: "chat_request",
            mode,
            crisisShortCircuit: false,
            injectionDetected,
            moderationBlocked: false,
            guestBoundaryBlocked: false,
            upstreamError: true,
            timeout,
            durationMs: Date.now() - started,
          })
          const msg = timeout ? UPSTREAM_TIMEOUT_MESSAGE : UPSTREAM_ERROR_MESSAGE
          controller.enqueue(
            encodeSseData({ type: "content_replace", content: msg }),
          )
          controller.enqueue(encodeSseDone())
        } finally {
          clearTimeout(timer)
          controller.close()
        }
      },
    })

    return new Response(readable, { headers: sseResponseHeaders() })
  } catch (e) {
    logSafeError("chat/unhandled", e)
    return jsonErrorResponse("Service temporarily unavailable", 500)
  }
}
