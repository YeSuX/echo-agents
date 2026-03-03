/**
 * 嘉宾 Agent 对话 API：Kimi 多轮对话 + 流式输出。
 * 参考：多轮对话用 messages，流式设置 stream: true。
 */

import { NextRequest } from "next/server"
import OpenAI from "openai"
import { getGuestSystemPrompt } from "@/lib/guest-agent"

const KIMI_MODEL = "kimi-k2.5"

function getKimiClient() {
  const apiKey = process.env.KIMI_API_KEY
  const baseURL = process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1"
  if (!apiKey) throw new Error("KIMI_API_KEY is not set")
  return new OpenAI({ apiKey, baseURL })
}

/** 请求体：guestId + 多轮 messages（OpenAI 格式） */
type ChatRequestBody = {
  guestId: string
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
}

function parseBody(req: NextRequest): Promise<ChatRequestBody> {
  return req.json()
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req)
    const { guestId, messages } = body
    if (!guestId || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "guestId and non-empty messages required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const systemPrompt = getGuestSystemPrompt(guestId)
    const client = getKimiClient()

    const stream = await client.chat.completions.create({
      model: KIMI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (typeof delta === "string" && delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
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
    const message = e instanceof Error ? e.message : "Unknown error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
