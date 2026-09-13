import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { NextRequest } from "next/server"
import { POST } from "../app/api/chat/route"
import { consumeChatStream, parseSseDataLine, type ChatStreamContent } from "../lib/sse-chat"
import { toChatApiMessages } from "../lib/chat-context"
import { deepseekTimeoutMs, resolveDeepSeekClient } from "../lib/safety/deepseek-server"

const encoder = new TextEncoder()
const event = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`
const noCallbacks = { onUpdate() {}, onSelfHelp() {}, onPersistenceError() {} }

function splitResponse(text: string): Response {
  const bytes = encoder.encode(text)
  return new Response(new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]))
      controller.close()
    },
  }))
}

describe("thinking stream consumption", () => {
  test("keeps fragmented Unicode reasoning separate from the final answer", async () => {
    const updates: ChatStreamContent[] = []
    const result = await consumeChatStream(splitResponse(
      event({ type: "reasoning", content: "\u601d\u8003" }) +
      event({ content: "Hello" }) + event({ content: "!" }) + "data: [DONE]",
    ), { ...noCallbacks, onUpdate: state => updates.push(state) })
    expect(result).toEqual({ reasoning: "\u601d\u8003", content: "Hello!" })
    expect(updates[0]).toEqual({ reasoning: "\u601d\u8003", content: "" })
  })

  test("applies reasoning resets, answer replacement, resources and save errors", async () => {
    const errors: string[] = []
    const resources: string[] = []
    const result = await consumeChatStream(splitResponse(
      event({ type: "reasoning", content: "Draft" }) +
      event({ content: "Partial answer" }) +
      event({ type: "reasoning_replace", content: "" }) +
      event({ type: "content_replace", content: "Safe replacement" }) +
      event({ type: "self_help", items: [{ id: "help", title: "Help", url: "/help" }] }) +
      event({ type: "persistence_error", code: "FINAL_WRITE_FAILED" }) + "data: [DONE]\n\n",
    ), { ...noCallbacks,
      onSelfHelp: items => resources.push(...items.map(item => item.id)),
      onPersistenceError: code => errors.push(code),
    })
    expect(result).toEqual({ reasoning: "", content: "Safe replacement" })
    expect(errors).toEqual(["FINAL_WRITE_FAILED"])
    expect(resources).toEqual(["help"])
  })

  test("rejects an unfinished stream after reasoning instead of reporting success", async () => {
    await expect(consumeChatStream(splitResponse(event({ type: "reasoning", content: "Wait" })), noCallbacks))
      .rejects.toThrow("interrupted")
  })

  test("propagates aborts during thinking and releases the reader", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({ start(value) { controller = value } })
    const operation = consumeChatStream(new Response(body), {
      ...noCallbacks,
      onUpdate() { controller.error(new DOMException("Stopped", "AbortError")) },
    })
    controller!.enqueue(encoder.encode(event({ type: "reasoning", content: "Wait" })))
    await expect(operation).rejects.toMatchObject({ name: "AbortError" })
    expect(body.locked).toBe(false)
  })

  test("ignores malformed reasoning and never sends thinking as conversation context", () => {
    expect(parseSseDataLine('data: {"type":"reasoning","content":42}')).toEqual({ kind: "ignored" })
    const messages = [{ role: "agent" as const, content: "Answer", reasoning: "Private draft" }]
    expect(toChatApiMessages(messages)).toEqual([{ role: "assistant", content: "Answer" }])
  })
})

describe("DeepSeek route integration with a synthetic upstream", () => {
  let server: ReturnType<typeof Bun.serve>
  const keys = ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL", "DEEPSEEK_TIMEOUT_MS", "ALLOW_CLIENT_DEEPSEEK_KEY"]
  const previous = new Map(keys.map(key => [key, process.env[key]]))
  let upstreamBody: Record<string, unknown> = {}
  let scenario = "normal"
  let upstreamCalls = 0
  let upstreamCancelled = false

  beforeAll(() => {
    server = Bun.serve({
      port: 0,
      async fetch(request) {
        upstreamCalls++
        upstreamBody = await request.json() as Record<string, unknown>
        const delta = (value: Record<string, unknown>, finish: string | null = null) => event({
          id: "synthetic", object: "chat.completion.chunk", created: 0, model: "deepseek-flash",
          choices: [{ index: 0, delta: value, finish_reason: finish }],
        })
        if (scenario === "abort") {
          return new Response(new ReadableStream({
            start(controller) { controller.enqueue(encoder.encode(delta({ reasoning_content: "Thinking" }))) },
            cancel() { upstreamCancelled = true },
          }), { headers: { "Content-Type": "text/event-stream" } })
        }
        let body = delta({ reasoning_content: "Consider the greeting. " })
        if (scenario === "reasoning-block") body += delta({ reasoning_content: "\u81ea\u4f5c\u81ea\u53d7" })
        if (scenario === "error") body += event({ error: { message: "Synthetic failure", type: "server_error" } })
        else if (scenario !== "empty") body += delta({ content: scenario === "answer-block" ? "\u81ea\u4f5c\u81ea\u53d7" : "Hello, I am here." })
        if (scenario !== "truncated") body += delta({}, "stop")
        body += "data: [DONE]\n\n"
        return new Response(body, { headers: { "Content-Type": "text/event-stream" } })
      },
    })
    process.env.DEEPSEEK_API_KEY = "synthetic-server-key"
    process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${server.port}`
    process.env.DEEPSEEK_MODEL = "deepseek-flash"
    process.env.DEEPSEEK_TIMEOUT_MS = "120000"
    process.env.ALLOW_CLIENT_DEEPSEEK_KEY = "0"
  })

  afterAll(() => {
    server.stop(true)
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  async function send(mode = "companion", signal?: AbortSignal) {
    return POST(new NextRequest("http://localhost/api/chat", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, guestId: "1", persistence: "ephemeral", messages: [{ role: "user", content: "Hello" }] }),
    }))
  }

  for (const mode of ["companion", "guest"]) {
    test(`streams separate thinking and answer in ${mode} mode`, async () => {
      scenario = "normal"
      const response = await send(mode)
      expect(response.status).toBe(200)
      const result = await consumeChatStream(response, noCallbacks)
      expect(result).toEqual({ reasoning: "Consider the greeting. ", content: "Hello, I am here." })
      expect(upstreamBody.model).toBe("deepseek-flash")
      expect(upstreamBody.thinking).toEqual({ type: "enabled" })
      expect(upstreamBody.reasoning_effort).toBe("high")
    })
  }

  for (const failure of ["empty", "truncated", "error", "answer-block"]) {
    test(`clears reasoning and replaces the answer after ${failure}`, async () => {
      scenario = failure
      const result = await consumeChatStream(await send(), noCallbacks)
      expect(result.reasoning).toBe("")
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.content).not.toBe("Hello, I am here.")
    })
  }

  test("blocks unsafe thinking while allowing a safe final answer", async () => {
    scenario = "reasoning-block"
    const result = await consumeChatStream(await send(), noCallbacks)
    expect(result).toEqual({ reasoning: "", content: "Hello, I am here." })
  })

  test("cancelling the response stops upstream generation", async () => {
    scenario = "abort"
    upstreamCancelled = false
    const response = await send()
    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()
    for (let i = 0; i < 40 && !upstreamCancelled; i++) await Bun.sleep(25)
    expect(upstreamCancelled).toBe(true)
  })

  test("timeout during thinking produces a final fallback and clears the draft", async () => {
    scenario = "abort"
    process.env.DEEPSEEK_TIMEOUT_MS = "5000"
    try {
      const result = await consumeChatStream(await send(), noCallbacks)
      expect(result.reasoning).toBe("")
      expect(result.content.length).toBeGreaterThan(0)
    } finally {
      process.env.DEEPSEEK_TIMEOUT_MS = "120000"
    }
  }, 10000)

  test("crisis response bypasses the model and has no reasoning", async () => {
    const before = upstreamCalls
    const response = await POST(new NextRequest("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "companion", messages: [{ role: "user", content: "I want to kill myself" }] }),
    }))
    const result = await consumeChatStream(response, noCallbacks)
    expect(result.reasoning).toBe("")
    expect(upstreamCalls).toBe(before)
  })

  test("retains server-only credentials and the longer thinking timeout", () => {
    const result = resolveDeepSeekClient({ deepseekApiKey: "client-key" })
    expect(result).toMatchObject({ status: 403, code: "client_key_forbidden" })
    expect(deepseekTimeoutMs()).toBe(120000)
  })
})
