import { NextRequest } from "next/server"
import OpenAI from "openai"
import { authenticatedUserId } from "@/lib/auth/require-user"
import {
  conversationKeyringFromEnv,
  decryptConversationContent,
  encryptConversationContent,
} from "@/lib/crypto/conversation-codec"
import { decryptTurns, turnsToChatContext } from "@/lib/conversation-content"
import {
  ConversationRepository,
  type EncryptedTurnRecord,
} from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"
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
  createTextSseStream,
  encodeSseData,
  encodeSseDone,
  jsonErrorResponse,
  rateLimitResponse,
  sseResponseHeaders,
} from "@/lib/safety/sse-response"
import {
  PROMPT_INJECTION_SYSTEM_NOTE,
  CONVERSATION_CONTINUITY_SYSTEM_NOTE,
  CRISIS_FIXED_RESPONSE,
  UPSTREAM_ERROR_MESSAGE,
  UPSTREAM_TIMEOUT_MESSAGE,
} from "@/lib/safety/constants"
import { recordUsageEvent } from "@/lib/safety/usage-monitor"
import {
  buildChatContext,
  MAX_CHAT_REQUEST_BYTES,
  MAX_CHAT_REQUEST_MESSAGES,
  MAX_CHAT_MESSAGE_CHARS,
  recentUserContext,
} from "@/lib/chat-context"

const KIMI_MODEL = "kimi-k2.5"

type ChatRole = "user" | "assistant"

type ChatMessage = { role: ChatRole; content: string }

type ChatMode = "companion" | "guest"

type SavedTurnPersistence = {
  complete(finalContent: string): Promise<boolean>
  fail(status: "stopped" | "failed", errorCode: string): Promise<void>
}

type ParsedChatRequest = {
  mode: ChatMode
  guestId: string
  messages: ChatMessage[]
  savedTurn?: SavedTurnPersistence
}

function createPersistenceErrorStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encodeSseData({ content: text }))
      controller.enqueue(
        encodeSseData({
          type: "persistence_error",
          code: "FINAL_WRITE_FAILED",
          retryable: true,
        }),
      )
      controller.enqueue(encodeSseDone())
      controller.close()
    },
  })
}

async function existingTurnResponse(
  existing: EncryptedTurnRecord,
  keyring: ReturnType<typeof conversationKeyringFromEnv>,
): Promise<Response> {
  if (
    existing.status === "completed" &&
    existing.assistantCiphertext &&
    existing.assistantIv
  ) {
    const assistantContent = await decryptConversationContent(
      {
        ciphertext: existing.assistantCiphertext,
        iv: existing.assistantIv,
      },
      {
        conversationId: existing.conversationId,
        turnId: existing.id,
        role: "assistant",
        keyVersion: existing.encryptionKeyVersion,
        keyring,
      },
    )
    return new Response(createTextSseStream(assistantContent), {
      headers: sseResponseHeaders(),
    })
  }
  return jsonErrorResponse("Turn already exists", 409, {
    code:
      existing.status === "pending"
        ? "TURN_IN_PROGRESS"
        : "TURN_ALREADY_FINISHED",
  })
}

function parseMessages(value: Json): ChatMessage[] | null {
  if (!Array.isArray(value)) return null
  if (value.length === 0 || value.length > MAX_CHAT_REQUEST_MESSAGES) return null
  const out: ChatMessage[] = []
  for (const m of value) {
    if (!isJsonRecord(m)) return null
    const role = m.role
    const content = m.content
    if (role !== "user" && role !== "assistant") return null
    if (typeof content !== "string") return null
    const clean = content.trim()
    if (clean.length === 0 || clean.length > MAX_CHAT_MESSAGE_CHARS * 2) return null
    out.push({ role, content: clean })
  }
  if (out.length === 0 || out.at(-1)?.role !== "user") return null
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
): ParsedChatRequest | null {
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

async function parseSavedChatRequest(
  root: { readonly [k: string]: Json },
): Promise<ParsedChatRequest | Response | null> {
  const conversationId = root.conversationId
  const clientMessageId = root.clientMessageId
  const content = root.content
  if (
    typeof conversationId !== "string" ||
    conversationId.length < 1 ||
    conversationId.length > 100 ||
    typeof clientMessageId !== "string" ||
    clientMessageId.length < 1 ||
    clientMessageId.length > 100 ||
    typeof content !== "string"
  ) {
    return null
  }
  const cleanContent = content.trim()
  if (!cleanContent || cleanContent.length > MAX_CHAT_MESSAGE_CHARS) return null

  const userId = await authenticatedUserId()
  if (!userId) {
    return jsonErrorResponse("Sign in required", 401, { code: "AUTH_REQUIRED" })
  }

  const repository = new ConversationRepository(getDb())
  const preferences = await repository.getPreferences(userId)
  if (!preferences.historyEnabled) {
    return jsonErrorResponse("Conversation history is disabled", 409, {
      code: "HISTORY_DISABLED",
    })
  }
  const conversation = await repository.getConversation(userId, conversationId)
  if (!conversation || conversation.status !== "active") {
    return jsonErrorResponse("Conversation not found", 404, {
      code: "CONVERSATION_NOT_FOUND",
    })
  }

  const keyring = conversationKeyringFromEnv()
  const existing = await repository.findTurnByClientMessageId(
    userId,
    conversationId,
    clientMessageId,
  )
  if (existing) {
    return existingTurnResponse(existing, keyring)
  }

  const turnId = crypto.randomUUID()
  const encryptedUser = await encryptConversationContent(cleanContent, {
    conversationId,
    turnId,
    role: "user",
    keyring,
  })
  let began = false
  try {
    began = await repository.beginTurn(userId, {
      id: turnId,
      conversationId,
      clientMessageId,
      userCiphertext: encryptedUser.ciphertext,
      userIv: encryptedUser.iv,
      encryptionKeyVersion: encryptedUser.keyVersion,
    })
  } catch (error) {
    const racedTurn = await repository.findTurnByClientMessageId(
      userId,
      conversationId,
      clientMessageId,
    )
    if (racedTurn) return existingTurnResponse(racedTurn, keyring)
    throw error
  }
  if (!began) {
    return jsonErrorResponse("Conversation cannot accept saved messages", 409, {
      code: "HISTORY_DISABLED",
    })
  }

  const turns = await decryptTurns(
    await repository.listTurnsForContext(userId, conversationId),
    keyring,
  )
  const messages = turnsToChatContext(turns)
  if (messages.at(-1)?.role !== "user") {
    await repository.markTurnIncomplete(userId, {
      turnId,
      conversationId,
      status: "failed",
      errorCode: "invalid_context",
    })
    return jsonErrorResponse("Saved conversation context is invalid", 409, {
      code: "INVALID_CONTEXT",
    })
  }

  return {
    mode: conversation.mode,
    guestId: conversation.guestId ?? "",
    messages,
    savedTurn: {
      async complete(finalContent) {
        const encryptedAssistant = await encryptConversationContent(
          finalContent,
          {
            conversationId,
            turnId,
            role: "assistant",
            keyring,
            keyVersion: encryptedUser.keyVersion,
          },
        )
        return repository.completeTurn(userId, {
          turnId,
          conversationId,
          assistantCiphertext: encryptedAssistant.ciphertext,
          assistantIv: encryptedAssistant.iv,
        })
      },
      async fail(status, errorCode) {
        await repository.markTurnIncomplete(userId, {
          turnId,
          conversationId,
          status,
          errorCode,
        })
      },
    },
  }
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
    savedTurn?: SavedTurnPersistence
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
    savedTurn,
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

  if (!finalContent.trim()) {
    finalContent = "（没有收到回复，请重试。）"
  }

  if (finalContent !== rawAssistant) {
    controller.enqueue(
      encodeSseData({ type: "content_replace", content: finalContent }),
    )
  }

  if (savedTurn) {
    let persisted = false
    try {
      persisted = await savedTurn.complete(finalContent)
    } catch (error) {
      logSafeError("chat/persistence", error, { phase: "complete" })
    }
    if (!persisted) {
      await savedTurn.fail("failed", "final_write_failed").catch((error) => {
        logSafeError("chat/persistence", error, { phase: "mark_failed" })
      })
      controller.enqueue(
        encodeSseData({
          type: "persistence_error",
          code: "FINAL_WRITE_FAILED",
          retryable: true,
        }),
      )
    }
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
    const declaredLength = Number(req.headers.get("content-length") ?? "0")
    if (Number.isFinite(declaredLength) && declaredLength > MAX_CHAT_REQUEST_BYTES) {
      return jsonErrorResponse("对话内容过长，请结束当前对话后重新开始。", 413)
    }
    const text = await req.text()
    if (new TextEncoder().encode(text).byteLength > MAX_CHAT_REQUEST_BYTES) {
      return jsonErrorResponse("对话内容过长，请结束当前对话后重新开始。", 413)
    }
    const j = parseJson(text)
    if (!isJsonRecord(j)) {
      return jsonErrorResponse("Invalid JSON body", 400)
    }
    if (
      j.persistence !== undefined &&
      j.persistence !== "ephemeral" &&
      j.persistence !== "saved"
    ) {
      return jsonErrorResponse("Invalid persistence mode", 400, {
        code: "INVALID_PERSISTENCE_MODE",
      })
    }
    const parsedOrResponse =
      j.persistence === "saved"
        ? await parseSavedChatRequest(j)
        : parseChatRequest(j)
    if (parsedOrResponse instanceof Response) return parsedOrResponse
    const parsed = parsedOrResponse
    if (!parsed) {
      return jsonErrorResponse(
        "Invalid body: need messages[], and for guest mode guestId; or mode: companion",
        400,
      )
    }

    const { mode, guestId, messages, savedTurn } = parsed
    const lastUser = lastUserContent(messages)
    const routingContext = recentUserContext(messages)
    const injectionDetected = userMessagesInjectionDetected(messages)

    if (conversationHasCrisis(messages)) {
      if (savedTurn) {
        let persisted = false
        try {
          persisted = await savedTurn.complete(CRISIS_FIXED_RESPONSE)
        } catch (error) {
          logSafeError("chat/persistence", error, { phase: "crisis_complete" })
        }
        if (!persisted) {
          await savedTurn.fail("failed", "final_write_failed").catch((error) => {
            logSafeError("chat/persistence", error, {
              phase: "crisis_mark_failed",
            })
          })
          return new Response(
            createPersistenceErrorStream(CRISIS_FIXED_RESPONSE),
            { headers: sseResponseHeaders() },
          )
        }
      }
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

    const kimiResolved = resolveKimiClient(j)
    if ("error" in kimiResolved) {
      if (savedTurn) {
        await savedTurn.fail("failed", kimiResolved.code ?? "kimi_unavailable")
      }
      return jsonErrorResponse(kimiResolved.error, kimiResolved.status, {
        ...(kimiResolved.code ? { code: kimiResolved.code } : {}),
      })
    }
    const client = kimiResolved.client

    let systemPrompt: string
    if (mode === "companion") {
      const matched = matchCases(routingContext, 2)
      systemPrompt = getCompanionSystemPrompt(matched)
    } else {
      systemPrompt = getGuestSystemPrompt(guestId)
    }
    systemPrompt = `${systemPrompt}\n\n${CONVERSATION_CONTINUITY_SYSTEM_NOTE}\n\n${PROMPT_INJECTION_SYSTEM_NOTE}`

    const context = buildChatContext(messages)
    const llmMessages = sanitizeMessagesForLlm(context.messages)
    const timeoutMs = kimiTimeoutMs()
    const abort = new AbortController()
    const abortFromRequest = () => abort.abort()
    req.signal.addEventListener("abort", abortFromRequest, { once: true })
    const timer = setTimeout(() => abort.abort(), timeoutMs)
    const intents = detectIntent(routingContext)
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
            savedTurn,
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
          if (savedTurn) {
            await savedTurn
              .fail(req.signal.aborted ? "stopped" : "failed", kind)
              .catch((error) => {
                logSafeError("chat/persistence", error, { phase: "mark_incomplete" })
              })
          }
          controller.enqueue(
            encodeSseData({ type: "content_replace", content: msg }),
          )
          controller.enqueue(encodeSseDone())
        } finally {
          clearTimeout(timer)
          req.signal.removeEventListener("abort", abortFromRequest)
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
