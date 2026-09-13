import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { Miniflare } from "miniflare"
import { NextRequest } from "next/server"
import { POST } from "../app/api/stories/contribute/route"
import { ConversationRepository } from "../lib/db/conversation-repository"
import { decryptConversationContent } from "../lib/crypto/conversation-codec"
import { conversationToStoryDraft, createStoryDraft, readStoryDraft, writeStoryDraft, clearStoryDraft, STORY_DRAFT_KEY, STORY_CONSENT_VERSION, MAX_STORY_CHARS, MAX_STORY_REQUEST_BYTES } from "../lib/story-contribution"
import { loadConversationHistory } from "../lib/conversation-history"
import { resetRateLimitsForTests } from "../lib/safety/rate-limit"

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) } }
}

describe("complete story drafts", () => {
  test("includes every completed exchange without context truncation or model thinking", () => {
    const messages = [{ id: "opening", role: "agent" as const, content: "Opening" }]
    for (let i = 0; i < 150; i++) {
      messages.push({ id: `a${i}`, role: "agent", content: `Answer ${i}: ${"a".repeat(60)}` })
    }
    const transcript = conversationToStoryDraft([
      { id: "u0", role: "user", content: "First user message" }, ...messages,
      { id: "failed", role: "agent", content: "Service unavailable", isFallback: true },
      { id: "last", role: "user", content: "Last user message" },
    ])
    expect(transcript.length).toBeGreaterThan(5000)
    expect(transcript).toContain("You:\nFirst user message")
    expect(transcript).toContain("Agent:\nAnswer 149:")
    expect(transcript).toContain("You:\nLast user message")
    expect(transcript).not.toContain("Opening")
    expect(transcript).not.toContain("Service unavailable")
  })

  test("retains drafts across reading, reopening, editing, and retrying", () => {
    const store = storage()
    const draft = createStoryDraft("Full conversation")
    writeStoryDraft(store, draft)
    expect(readStoryDraft(store)).toEqual(draft)
    expect(readStoryDraft(store)).toEqual(draft)
    const edited = createStoryDraft("Edited conversation")
    writeStoryDraft(store, edited)
    clearStoryDraft(store, draft.id)
    expect(readStoryDraft(store)).toEqual(edited)
    clearStoryDraft(store, edited.id)
    expect(store.getItem(STORY_DRAFT_KEY)).toBeNull()
  })

  test("reads legacy drafts without deleting them", () => {
    const store = storage()
    store.setItem("companion-story-draft", "Legacy text")
    expect(readStoryDraft(store).text).toBe("Legacy text")
    expect(store.getItem("companion-story-draft")).toBe("Legacy text")
  })

  test("history loader follows every page", async () => {
    let requests = 0
    const fetcher: typeof fetch = Object.assign(async (input: RequestInfo | URL) => {
      requests++
      const offset = Number(new URL(String(input), "http://localhost").searchParams.get("offset"))
      return Response.json({ conversation: { mode: "companion" },
        turns: Array.from({ length: offset === 200 ? 3 : 100 }, (_, i) => ({ id: `${offset + i}` })),
        nextOffset: offset === 200 ? null : offset + 100 })
    }, { preconnect: fetch.preconnect })
    const result = await loadConversationHistory("id", new AbortController().signal, fetcher)
    expect(result.turns.length).toBe(203)
    expect(result.turns[202].id).toBe("202")
    expect(requests).toBe(3)
  })

  test("history loader rejects repeated offsets instead of silently returning partial history", async () => {
    const fetcher: typeof fetch = Object.assign(async () => Response.json({
      conversation: { mode: "companion" }, turns: [], nextOffset: 0,
    }), { preconnect: fetch.preconnect })
    await expect(loadConversationHistory("id", new AbortController().signal, fetcher))
      .rejects.toThrow("Invalid history pagination")
  })
})

describe("anonymous submissions in D1", () => {
  let miniflare: Miniflare
  let db: D1Database
  const contextSymbol = Symbol.for("__cloudflare-context__")
  const oldContext = Reflect.get(globalThis, contextSymbol)
  const oldKey = process.env.CONVERSATION_ENCRYPTION_KEY_V1
  const encodedKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64")

  beforeAll(async () => {
    miniflare = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok') } }", d1Databases: ["DB"] })
    db = await miniflare.getD1Database("DB") as D1Database
    for (const filename of ["0001_conversation_storage.sql", "0003_story_contributions.sql"]) {
      for (const sql of readFileSync(`migrations/${filename}`, "utf8").split(";")) {
        if (sql.trim()) await db.prepare(sql).run()
      }
    }
    Reflect.set(globalThis, contextSymbol, { env: { DB: db } })
    process.env.CONVERSATION_ENCRYPTION_KEY_V1 = encodedKey
  })
  beforeEach(resetRateLimitsForTests)
  afterAll(async () => {
    if (oldContext === undefined) Reflect.deleteProperty(globalThis, contextSymbol)
    else Reflect.set(globalThis, contextSymbol, oldContext)
    if (oldKey === undefined) Reflect.deleteProperty(process.env, "CONVERSATION_ENCRYPTION_KEY_V1")
    else process.env.CONVERSATION_ENCRYPTION_KEY_V1 = oldKey
    await miniflare.dispose()
  })

  function body(text: string, submissionId = crypto.randomUUID()) {
    return { text, submissionId, consent: true, consentVersion: STORY_CONSENT_VERSION }
  }
  function request(value: unknown) {
    return new NextRequest("http://localhost/api/stories/contribute", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
    })
  }

  test("stores a long redacted transcript encrypted and returns a verifiable receipt", async () => {
    const input = body("You: Contact me at 13812345678 or person@example.com.\nAgent: " + "support ".repeat(2000))
    const response = await POST(request(input))
    expect(response.status).toBe(201)
    const receipt = await response.json() as {
      submissionId: string; status: string; desensitizedText: string
    }
    expect(receipt.submissionId).toBe(input.submissionId)
    expect(receipt.status).toBe("pending")
    expect(receipt.desensitizedText).not.toContain("13812345678")
    expect(receipt.desensitizedText).not.toContain("person@example.com")
    const row = await db.prepare("SELECT * FROM story_contributions WHERE id = ?").bind(input.submissionId).first()
    expect(row).not.toHaveProperty("text")
    expect(row).not.toHaveProperty("owner_id")
    const ciphertext = row!.content_ciphertext as ArrayBuffer | number[]
    const iv = row!.content_iv as ArrayBuffer | number[]
    const decoded = await decryptConversationContent({
      ciphertext: Array.isArray(ciphertext) ? Uint8Array.from(ciphertext) : ciphertext,
      iv: Array.isArray(iv) ? Uint8Array.from(iv) : iv,
    }, { conversationId: "anonymous-story-contributions", turnId: input.submissionId, role: "user",
      keyVersion: 1, keyring: new Map([[1, encodedKey]]) })
    expect(decoded).toBe(receipt.desensitizedText)
  })

  test("concurrent retries create one row and conflicting edits cannot overwrite it", async () => {
    const input = body("Synthetic retry test")
    const responses = await Promise.all([POST(request(input)), POST(request(input))])
    expect(responses.map(r => r.status).sort()).toEqual([200, 201])
    const row = await db.prepare("SELECT count(*) AS n FROM story_contributions WHERE id = ?").bind(input.submissionId).first<{ n: number }>()
    expect(row!.n).toBe(1)
    const conflict = await POST(request({ ...input, text: "Different content" }))
    expect(conflict.status).toBe(409)
  })

  test("requires explicit consent and rejects blank and oversized text", async () => {
    expect((await POST(request({ text: "No consent" }))).status).toBe(400)
    expect((await POST(request({ ...body("No consent"), consent: false }))).status).toBe(400)
    expect((await POST(request(body("  ")))).status).toBe(400)
    expect((await POST(request(body("a".repeat(MAX_STORY_CHARS + 1))))).status).toBe(400)
  })

  test("bounds request bytes even without Content-Length", async () => {
    const oversized = new NextRequest("http://localhost/api/stories/contribute", {
      method: "POST", body: "x".repeat(MAX_STORY_REQUEST_BYTES + 1),
    })
    expect((await POST(oversized)).status).toBe(413)
  })

  test("reports storage failure instead of claiming success", async () => {
    Reflect.set(globalThis, contextSymbol, { env: { DB: null } })
    try { expect((await POST(request(body("Synthetic failure test")))).status).toBe(503) }
    finally { Reflect.set(globalThis, contextSymbol, { env: { DB: db } }) }
  })

  test("history pagination retains ownership and can read beyond 100 turns", async () => {
    await db.prepare("INSERT INTO app_users (clerk_user_id, created_at, updated_at) VALUES ('pagination-owner', 0, 0)").run()
    await db.prepare("INSERT INTO conversations (id, owner_id, mode, created_at, updated_at) VALUES ('pagination-chat', 'pagination-owner', 'companion', 0, 0)").run()
    await db.batch(Array.from({ length: 103 }, (_, i) => db.prepare(`
      INSERT INTO conversation_turns (id, conversation_id, client_message_id, user_ciphertext, user_iv, encryption_key_version, status, created_at)
      VALUES (?, 'pagination-chat', ?, X'00', X'00', 1, 'pending', ?)
    `).bind(`turn-${i}`, `message-${i}`, i)))
    const repository = new ConversationRepository(db)
    expect((await repository.listTurns("pagination-owner", "pagination-chat", 100, 0)).length).toBe(100)
    const lastPage = await repository.listTurns("pagination-owner", "pagination-chat", 100, 100)
    expect(lastPage.map(turn => turn.id)).toEqual(["turn-100", "turn-101", "turn-102"])
    expect(await repository.listTurns("other-owner", "pagination-chat", 100, 100)).toEqual([])
  })
})
