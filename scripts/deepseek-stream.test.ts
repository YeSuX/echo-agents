import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test"
import { NextRequest } from "next/server"
import { POST } from "../app/api/chat/route"
import { consumeChatStream, parseSseDataLine, type ChatStreamContent } from "../lib/sse-chat"
import { toChatApiMessages } from "../lib/chat-context"
import { deepseekTimeoutMs, resolveDeepSeekClient } from "../lib/safety/deepseek-server"
import { getChatSystemPrompt } from "../lib/companion-chat-prompt"
import { CRISIS_CHECK_IN_RESPONSE, CRISIS_FIXED_RESPONSE, OUTPUT_MODERATION_FALLBACK, GUEST_BOUNDARY_FALLBACK } from "../lib/safety/constants"
import * as userAuth from "../lib/auth/require-user"
import * as database from "../lib/db/d1"
import { ConversationRepository } from "../lib/db/conversation-repository"
import { decryptConversationContent } from "../lib/crypto/conversation-codec"
import { AGENT_PROMPTS } from "../lib/agent-prompt-config"

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
  let releaseUpstream: (() => void) | undefined
  const releaseHeldUpstream = () => releaseUpstream?.()

  async function withSavedChat(run: (state: {
    send: (content: string) => Promise<Response>
    complete: ReturnType<typeof spyOn<ConversationRepository, "completeTurn">>
    fail: ReturnType<typeof spyOn<ConversationRepository, "markTurnIncomplete">>
    encodedKey: string
  }) => Promise<void>) {
    const oldKey = process.env.CONVERSATION_ENCRYPTION_KEY_V1
    const encodedKey = Buffer.alloc(32, 7).toString("base64")
    process.env.CONVERSATION_ENCRYPTION_KEY_V1 = encodedKey
    let pending: Parameters<ConversationRepository["beginTurn"]>[1]
    const complete = spyOn(ConversationRepository.prototype, "completeTurn").mockResolvedValue(true)
    const fail = spyOn(ConversationRepository.prototype, "markTurnIncomplete").mockResolvedValue()
    const spies = [
      complete, fail,
      spyOn(userAuth, "authenticatedUserId").mockResolvedValue("synthetic-user"),
      spyOn(database, "getDb").mockReturnValue({} as D1Database),
      spyOn(ConversationRepository.prototype, "getPreferences").mockResolvedValue({ historyEnabled: true, consentVersion: "test", consentedAt: 0 }),
      spyOn(ConversationRepository.prototype, "getConversation").mockResolvedValue({
        id: "saved-chat", ownerId: "synthetic-user", mode: "companion", guestId: null,
        status: "active", createdAt: 0, updatedAt: 0, lastMessageAt: null,
      }),
      spyOn(ConversationRepository.prototype, "findTurnByClientMessageId").mockResolvedValue(null),
      spyOn(ConversationRepository.prototype, "beginTurn").mockImplementation(async (_user, input) => { pending = input; return true }),
      spyOn(ConversationRepository.prototype, "listTurnsForContext").mockImplementation(async () => [{
        ...pending, userCiphertext: new Uint8Array(pending.userCiphertext).buffer,
        userIv: new Uint8Array(pending.userIv).buffer, status: "pending",
        assistantCiphertext: null, assistantIv: null, errorCode: null, createdAt: 0, completedAt: null,
      }]),
    ]
    try {
      await run({ complete, fail, encodedKey, send: content => POST(new NextRequest("http://localhost/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persistence: "saved", conversationId: "saved-chat", clientMessageId: crypto.randomUUID(), content }),
      })) })
    } finally {
      for (const spy of spies) spy.mockRestore()
      if (oldKey === undefined) Reflect.deleteProperty(process.env, "CONVERSATION_ENCRYPTION_KEY_V1")
      else process.env.CONVERSATION_ENCRYPTION_KEY_V1 = oldKey
    }
  }

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
        if (scenario === "held-safe" || scenario === "held-block") {
          const blocked = scenario === "held-block"
          return new Response(new ReadableStream({
            async start(controller) {
              controller.enqueue(encoder.encode(delta({ reasoning_content: blocked ? "自作" : "Consider " })))
              controller.enqueue(encoder.encode(delta({ content: blocked ? "你本" : "Hello, " })))
              await new Promise<void>(resolve => { releaseUpstream = resolve })
              controller.enqueue(encoder.encode(delta({ reasoning_content: blocked ? "自受" : "the greeting." })))
              controller.enqueue(encoder.encode(delta({ content: blocked ? "可以拒绝拍摄的。" : "I am here." })))
              controller.enqueue(encoder.encode(delta({}, "stop") + "data: [DONE]\n\n"))
              controller.close()
            },
          }), { headers: { "Content-Type": "text/event-stream" } })
        }
        let body = delta({ reasoning_content: "Consider the greeting. " })
        if (scenario === "reasoning-block") body += delta({ reasoning_content: "\u81ea\u4f5c\u81ea\u53d7" })
        if (scenario === "error") body += event({ error: { message: "Synthetic failure", type: "server_error" } })
        else if (scenario !== "empty") body += delta({ content: scenario === "answer-block" ? "\u81ea\u4f5c\u81ea\u53d7" : scenario === "guest-fabrication" ? "我后来慢慢找到了信任的人。" : "Hello, I am here." })
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
    test(`returns reviewed thinking and answer in ${mode} mode`, async () => {
      scenario = "normal"
      const response = await send(mode)
      expect(response.status).toBe(200)
      const result = await consumeChatStream(response, noCallbacks)
      expect(result).toEqual({ reasoning: "Consider the greeting. ", content: "Hello, I am here." })
      expect(upstreamBody.model).toBe("deepseek-flash")
      expect(upstreamBody.thinking).toEqual({ type: "enabled" })
      expect(upstreamBody.reasoning_effort).toBe("high")
      const messages = upstreamBody.messages as { role: string; content: string }[]
      expect(messages[0]).toEqual({ role: "system", content: getChatSystemPrompt({ mode: mode as "companion" | "guest", guestId: "1", routingContext: "Hello", persistence: "ephemeral", injectionDetected: false }) })
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

  for (const blocked of [false, true]) {
    test(`buffers both channels until completion, blocked=${blocked}`, async () => {
      scenario = blocked ? "held-block" : "held-safe"
      releaseUpstream = undefined
      const response = await send()
      const reader = response.body!.getReader()
      let wire = ""
      const decoder = new TextDecoder()
      const pump = (async () => {
        while (true) {
          const next = await reader.read()
          if (next.done) break
          wire += decoder.decode(next.value, { stream: true })
        }
      })()
      try {
        for (let i = 0; i < 100 && !releaseUpstream; i++) await Bun.sleep(5)
        expect(releaseUpstream).toBeDefined()
        await Bun.sleep(20)
        expect(wire).not.toContain("Hello")
        expect(wire).not.toContain("你本")
        expect(wire).not.toContain("Consider")
        expect(wire).not.toContain("自作")
      } finally {
        releaseHeldUpstream()
        await pump
      }
      if (blocked) {
        expect(wire).toContain(OUTPUT_MODERATION_FALLBACK)
        expect(wire).not.toContain("你本")
        expect(wire).not.toContain("自作")
      } else {
        expect(wire).toContain("Hello, I am here.")
        expect(wire).toContain("Consider the greeting.")
      }
    })
  }

  test("never emits a short fabricated guest story", async () => {
    scenario = "guest-fabrication"
    const wire = await (await send("guest")).text()
    expect(wire).not.toContain("我后来")
    expect(wire).not.toContain("Consider the greeting")
    expect(wire).toContain(GUEST_BOUNDARY_FALLBACK)
  })

  test("cancelling the response stops upstream generation", async () => {
    scenario = "abort"
    upstreamCancelled = false
    const before = upstreamCalls
    const response = await send()
    const reader = response.body!.getReader()
    await reader.read()
    for (let i = 0; i < 100 && upstreamCalls === before; i++) await Bun.sleep(5)
    expect(upstreamCalls).toBeGreaterThan(before)
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
    expect(result.content).toBe(CRISIS_FIXED_RESPONSE)
    expect(upstreamCalls).toBe(before)
  })

  test("checks ambiguous safety without calling the model", async () => {
    const before = upstreamCalls
    const response = await POST(new NextRequest("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "guest", guestId: "1", messages: [{ role: "user", content: "我快撑不下去了" }] }),
    }))
    const result = await consumeChatStream(response, noCallbacks)
    expect(result).toEqual({ content: CRISIS_CHECK_IN_RESPONSE, reasoning: "" })
    expect(upstreamCalls).toBe(before)
  })

  test("resumes normal processing after an explicit safety statement", async () => {
    scenario = "normal"
    const before = upstreamCalls
    const response = await POST(new NextRequest("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "companion", messages: [
        { role: "user", content: "我想死" },
        { role: "assistant", content: CRISIS_FIXED_RESPONSE },
        { role: "user", content: "我现在安全了，只想说说话" },
      ] }),
    }))
    const result = await consumeChatStream(response, noCallbacks)
    expect(result.content).toBe("Hello, I am here.")
    expect(upstreamCalls).toBe(before + 1)
  })

  for (const [input, selectedScenario, expected] of [
    ["你好", "normal", "Hello, I am here."],
    ["你好", "answer-block", OUTPUT_MODERATION_FALLBACK],
    ["我想结束生命", "normal", CRISIS_FIXED_RESPONSE],
    ["我快撑不下去了", "normal", CRISIS_CHECK_IN_RESPONSE],
  ] as const) {
    test(`persists only the reviewed or selected safety reply: ${selectedScenario}/${input}`, async () => {
      scenario = selectedScenario
      await withSavedChat(async ({ send, complete, fail, encodedKey }) => {
        const response = await send(input)
        const result = await consumeChatStream(response, noCallbacks)
        expect(result.content).toBe(expected)
        expect(complete).toHaveBeenCalledTimes(1)
        expect(fail).not.toHaveBeenCalled()
        const written = complete.mock.calls[0][1]
        const plaintext = await decryptConversationContent({
          ciphertext: written.assistantCiphertext, iv: written.assistantIv,
        }, { conversationId: "saved-chat", turnId: written.turnId, role: "assistant", keyVersion: 1, keyring: new Map([[1, encodedKey]]) })
        expect(plaintext).toBe(expected)
        if (input === "你好") {
          const messages = upstreamBody.messages as { role: string; content: string }[]
          expect(messages[0].content).toContain(AGENT_PROMPTS.privacy.saved)
        }
      })
    })
  }

  test("does not complete a saved turn when generation is cancelled", async () => {
    scenario = "abort"
    const before = upstreamCalls
    await withSavedChat(async ({ send, complete, fail }) => {
      const reader = (await send("你好")).body!.getReader()
      await reader.read()
      for (let i = 0; i < 100 && upstreamCalls === before; i++) await Bun.sleep(5)
      await reader.cancel()
      for (let i = 0; i < 100 && !fail.mock.calls.length; i++) await Bun.sleep(5)
      expect(complete).not.toHaveBeenCalled()
      expect(fail.mock.calls[0][1].status).toBe("stopped")
    })
  })

  test("retains the reviewed reply and reports a final-save failure", async () => {
    scenario = "normal"
    await withSavedChat(async ({ send, complete, fail }) => {
      complete.mockResolvedValue(false)
      const errors: string[] = []
      const result = await consumeChatStream(await send("你好"), { ...noCallbacks, onPersistenceError: code => errors.push(code) })
      expect(result.content).toBe("Hello, I am here.")
      expect(errors).toEqual(["FINAL_WRITE_FAILED"])
      expect(fail.mock.calls[0][1].status).toBe("failed")
    })
  })

  test("retains server-only credentials and the longer thinking timeout", () => {
    const result = resolveDeepSeekClient({ deepseekApiKey: "client-key" })
    expect(result).toMatchObject({ status: 403, code: "client_key_forbidden" })
    expect(deepseekTimeoutMs()).toBe(120000)
  })

  test("rejects an unknown guest instead of creating a generic persona", async () => {
    const before = upstreamCalls
    const response = await POST(new NextRequest("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "guest", guestId: "unknown", messages: [{ role: "user", content: "你好" }] }),
    }))
    expect(response.status).toBe(400)
    expect(upstreamCalls).toBe(before)
  })
})
