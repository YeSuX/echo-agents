import { NextRequest } from "next/server"
import OpenAI from "openai"
import { getCompanionSystemPrompt } from "@/lib/companion-agent"
import { getGuestSystemPrompt } from "@/lib/guest-agent"
import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"
import { matchCases } from "@/lib/match-cases"
import { getSelfHelpEntryById } from "@/data/self-help-catalog"
import { detectTakedownIntent } from "@/lib/takedown-intent"
import { normalizeKimiBaseUrl } from "@/lib/kimi-client-config"

const KIMI_MODEL = "kimi-k2.5"

function tryCreateKimiClient(
  root: { readonly [k: string]: Json },
): { client: OpenAI } | { status: number; error: string } {
  const keyRaw = root.kimiApiKey
  const keyFromBody = typeof keyRaw === "string" ? keyRaw.trim() : ""
  const apiKey =
    keyFromBody.length > 0 ? keyFromBody : (process.env.KIMI_API_KEY ?? "")
  if (apiKey.length === 0) {
    return {
      status: 400,
      error:
        "缺少 API Key：请在界面「Kimi 接口配置」中填写，或配置环境变量 KIMI_API_KEY",
    }
  }

  const urlRaw = root.kimiBaseUrl
  const urlFromBody = typeof urlRaw === "string" ? urlRaw.trim() : ""
  let baseURL: string
  if (urlFromBody.length > 0) {
    const n = normalizeKimiBaseUrl(urlFromBody)
    if (n === null) {
      return {
        status: 400,
        error: "kimiBaseUrl 须为 https URL（例如 https://api.moonshot.cn/v1）",
      }
    }
    baseURL = n
  } else {
    const env = (process.env.KIMI_BASE_URL ?? "").trim()
    baseURL =
      env.length > 0 ? env.replace(/\/$/, "") : "https://api.moonshot.cn/v1"
  }

  return { client: new OpenAI({ apiKey, baseURL }) }
}

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

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    const j = parseJson(text)
    if (!isJsonRecord(j)) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }
    const parsed = parseChatRequest(j)
    if (!parsed) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid body: need messages[], and for guest mode guestId; or mode: companion",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const kimiResolved = tryCreateKimiClient(j)
    if ("error" in kimiResolved) {
      return new Response(JSON.stringify({ error: kimiResolved.error }), {
        status: kimiResolved.status,
        headers: { "Content-Type": "application/json" },
      })
    }
    const client = kimiResolved.client

    const { mode, guestId, messages } = parsed
    const lastUser = lastUserContent(messages)

    let systemPrompt: string
    if (mode === "companion") {
      const matched = matchCases(lastUser, 2)
      systemPrompt = getCompanionSystemPrompt(matched)
    } else {
      systemPrompt = getGuestSystemPrompt(guestId)
    }

    const stream = await client.chat.completions.create({
      model: KIMI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    })

    const encoder = new TextEncoder()
    const takedown = detectTakedownIntent(lastUser)
    const takedownEntry = getSelfHelpEntryById("takedown-letter")

    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (takedown && takedownEntry) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "self_help",
                  items: [
                    {
                      id: takedownEntry.id,
                      title: takedownEntry.title,
                      url: takedownEntry.href,
                    },
                  ],
                })}\n\n`,
              ),
            )
          }
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (typeof delta === "string" && delta) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: delta })}\n\n`,
                ),
              )
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Service temporarily unavailable"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
