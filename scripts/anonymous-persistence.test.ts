import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test"
import { readFileSync } from "node:fs"
import { Miniflare } from "miniflare"
import * as nextHeaders from "next/headers"
import * as auth from "@/lib/auth/require-user"
import * as databaseModule from "@/lib/db/d1"
import { POST as bootstrap } from "@/app/api/visitor-session/route"
import { POST as claim } from "@/app/api/visitor-session/claim/route"
import { GET as list, POST as create } from "@/app/api/conversations/route"
import { GET as detail, DELETE as remove } from "@/app/api/conversations/[id]/route"
import { PUT as preferences } from "@/app/api/me/conversation-preferences/route"
import { conversationOwnerId } from "@/lib/auth/conversation-owner"
import { checkConversationOrigin } from "@/lib/auth/conversation-origin"
import { createVisitorToken, hashVisitorToken, VISITOR_COOKIE_NAME } from "@/lib/auth/visitor-token"
import { CONVERSATION_PREFERENCE_VERSION } from "@/lib/conversation-preferences"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { encryptConversationContent } from "@/lib/crypto/conversation-codec"

async function readJson<T>(response: Response): Promise<T> {
  return await response.json() as T
}

const request = (path: string, body: unknown = {}, origin = "http://localhost") => new Request(`http://localhost${path}`, {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
})

describe("visitor credentials and request boundaries", () => {
  test("uses random secrets, fixed hash format and strict validation", async () => {
    const token = createVisitorToken()
    expect(token).toHaveLength(64)
    expect(createVisitorToken()).not.toBe(token)
    expect(await hashVisitorToken(token)).not.toBe(token)
    expect(await hashVisitorToken(token)).toHaveLength(64)
    for (const invalid of ["", "x".repeat(64), "../visitor", "a".repeat(63)]) {
      expect(await hashVisitorToken(invalid)).toBeNull()
    }
  })
  test("rejects foreign and opaque origins and cross-site fetch metadata", () => {
    expect(checkConversationOrigin(request("/api/conversations"))).toBeNull()
    expect(checkConversationOrigin(request("/api/conversations", {}, "https://other.example"))?.status).toBe(403)
    expect(checkConversationOrigin(request("/api/conversations", {}, "null"))?.status).toBe(403)
    expect(checkConversationOrigin(new Request("http://localhost/api/conversations", {
      method: "POST", headers: { "sec-fetch-site": "cross-site" },
    }))?.status).toBe(403)
  })
})

describe("visitor routes with isolated D1", () => {
  let miniflare: Miniflare
  let db: D1Database
  let repository: ConversationRepository
  let signedInUser: string | null = null
  let jar = new Map<string, string>()
  let cookieOptions: { httpOnly?: boolean; sameSite?: string; maxAge?: number; path?: string } = {}
  const cookieStore = {
    get: (name: string) => jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    set: (name: string, value: string, options: typeof cookieOptions) => { if (options.maxAge === 0) jar.delete(name); else jar.set(name, value); cookieOptions = options },
    delete: (name: string) => { jar.delete(name) },
  }
  const spies: { mockRestore(): void }[] = []
  const previousKey = process.env.CONVERSATION_ENCRYPTION_KEY_V1
  const encodedKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64")

  beforeAll(async () => {
    miniflare = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok') } }", d1Databases: ["DB"] })
    db = await miniflare.getD1Database("DB") as D1Database
    for (const file of ["0001_conversation_storage.sql", "0002_enable_sync_by_default.sql", "0004_visitor_conversation_owners.sql"]) {
      if (file === "0004_visitor_conversation_owners.sql") {
        await db.prepare(`INSERT INTO app_users
          (clerk_user_id, history_enabled, consent_version, consented_at, created_at, updated_at)
          VALUES ('legacy-account', 0, 'legacy-opt-out', 1, 1, 1)`).run()
        await db.prepare(`INSERT INTO conversations
          (id, owner_id, mode, created_at, updated_at)
          VALUES ('legacy-conversation', 'legacy-account', 'companion', 1, 1)`).run()
        const encrypted = await encryptConversationContent("Legacy encrypted question", {
          conversationId: "legacy-conversation", turnId: "legacy-turn", role: "user",
          keyring: new Map([[1, encodedKey]]),
        })
        await db.prepare(`INSERT INTO conversation_turns
          (id, conversation_id, client_message_id, user_ciphertext, user_iv, encryption_key_version, status, created_at)
          VALUES ('legacy-turn', 'legacy-conversation', 'legacy-message', ?, ?, 1, 'stopped', 1)`)
          .bind(encrypted.ciphertext.buffer, encrypted.iv.buffer).run()
      }
      for (const statement of readFileSync(`migrations/${file}`, "utf8").split(";")) {
        if (statement.trim()) await db.prepare(statement).run()
      }
    }
    repository = new ConversationRepository(db)
    spies.push(spyOn(auth, "authenticatedUserId").mockImplementation(async () => signedInUser))
    spies.push(spyOn(databaseModule, "getDb").mockReturnValue(db))
    spies.push(spyOn(nextHeaders, "cookies").mockImplementation(async () => cookieStore as unknown as Awaited<ReturnType<typeof nextHeaders.cookies>>))
    process.env.CONVERSATION_ENCRYPTION_KEY_V1 = encodedKey
  })
  afterAll(async () => {
    spies.forEach(spy => spy.mockRestore())
    if (previousKey === undefined) Reflect.deleteProperty(process.env, "CONVERSATION_ENCRYPTION_KEY_V1")
    else process.env.CONVERSATION_ENCRYPTION_KEY_V1 = previousKey
    await miniflare.dispose()
  })

  async function visitor() {
    signedInUser = null
    jar = new Map()
    const response = await bootstrap(request("/api/visitor-session"))
    expect(response.status).toBe(200)
    expect((await readJson<{ historyEnabled: boolean }>(response)).historyEnabled).toBe(true)
    const ownerId = await conversationOwnerId()
    if (!ownerId) throw new Error("Visitor was not created")
    return { ownerId, jar }
  }
  async function conversation() {
    const response = await create(request("/api/conversations", { mode: "companion" }))
    expect(response.status).toBe(201)
    return (await readJson<{ conversation: { id: string } }>(response)).conversation.id
  }
  async function begin(ownerId: string, conversationId: string) {
    const turnId = crypto.randomUUID()
    const encrypted = await encryptConversationContent("Synthetic private question", {
      conversationId, turnId, role: "user", keyring: new Map([[1, encodedKey]]),
    })
    expect(await repository.beginTurn(ownerId, { id: turnId, conversationId,
      clientMessageId: crypto.randomUUID(), userCiphertext: encrypted.ciphertext,
      userIv: encrypted.iv, encryptionKeyVersion: 1 })).toBe(true)
    return turnId
  }

  test("migrates existing owners without losing ciphertext, opt-outs or cascade constraints", async () => {
    signedInUser = "legacy-account"
    expect(await repository.getPreferences(signedInUser)).toEqual({
      historyEnabled: false, consentVersion: "legacy-opt-out", consentedAt: 1,
    })
    const response = await detail(new Request("http://localhost/api/conversations/legacy-conversation"), {
      params: Promise.resolve({ id: "legacy-conversation" }),
    })
    expect(response.status).toBe(200)
    expect((await readJson<{ turns: { userContent: string }[] }>(response)).turns[0].userContent).toBe("Legacy encrypted question")
    expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toEqual([])
    await repository.deleteUser(signedInUser)
    expect(await repository.listTurns(signedInUser, "legacy-conversation")).toEqual([])
  })

  test("boots a private cookie, stores only its hash, resumes and deletes encrypted history", async () => {
    const identity = await visitor()
    expect(cookieOptions).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 2592000 })
    const row = await db.prepare("SELECT visitor_token_hash FROM conversation_owners WHERE id = ?").bind(identity.ownerId).first<{ visitor_token_hash: string }>()
    const tokenHash = await hashVisitorToken(jar.get(VISITOR_COOKIE_NAME)!)
    if (!tokenHash) throw new Error("Visitor token is invalid")
    expect(row!.visitor_token_hash).toEqual(tokenHash)
    expect(row!.visitor_token_hash).not.toBe(jar.get(VISITOR_COOKIE_NAME))
    const id = await conversation()
    await begin(identity.ownerId, id)
    const response = await detail(new Request(`http://localhost/api/conversations/${id}`), { params: Promise.resolve({ id }) })
    expect(response.status).toBe(200)
    expect((await readJson<{ turns: { userContent: string }[] }>(response)).turns[0].userContent).toBe("Synthetic private question")
    expect((await readJson<{ conversations: { id: string }[] }>(await list())).conversations.map((item: { id: string }) => item.id)).toEqual([id])
    expect((await remove(new Request(`http://localhost/api/conversations/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) })).status).toBe(204)
    expect(await repository.listTurns(identity.ownerId, id)).toEqual([])
  })

  test("isolates two visitors and denies missing, forged and expired credentials", async () => {
    const first = await visitor()
    const id = await conversation()
    await visitor()
    expect((await detail(new Request(`http://localhost/api/conversations/${id}`), { params: Promise.resolve({ id }) })).status).toBe(404)
    jar = new Map()
    expect(await conversationOwnerId()).toBeNull()
    jar.set(VISITOR_COOKIE_NAME, first.ownerId)
    expect(await conversationOwnerId()).toBeNull()
    jar = first.jar
    await db.prepare("UPDATE conversation_owners SET visitor_expires_at = 1 WHERE id = ?").bind(first.ownerId).run()
    expect(await conversationOwnerId()).toBeNull()
    await repository.cleanupExpiredVisitors()
    expect(await repository.getConversation(first.ownerId, id)).toBeNull()
  })

  test("preserves explicit opt-out across bootstrap and refuses saved writes", async () => {
    const identity = await visitor()
    const response = await preferences(new Request("http://localhost/api/me/conversation-preferences", {
      method: "PUT", headers: { origin: "http://localhost", "Content-Type": "application/json" },
      body: JSON.stringify({ historyEnabled: false, consentVersion: CONVERSATION_PREFERENCE_VERSION }),
    }))
    expect(response.status).toBe(200)
    expect((await readJson<{ historyEnabled: boolean }>(await bootstrap(request("/api/visitor-session")))).historyEnabled).toBe(false)
    expect(await conversationOwnerId()).toBe(identity.ownerId)
    expect((await create(request("/api/conversations", { mode: "companion" }))).status).toBe(409)
  })

  test("sign-in does not auto-import; explicit claim preserves ciphertext and revokes the cookie", async () => {
    const identity = await visitor()
    const id = await conversation()
    const turnId = await begin(identity.ownerId, id)
    await repository.markTurnIncomplete(identity.ownerId, { turnId, conversationId: id, status: "stopped", errorCode: "test" })
    const before = (await repository.listTurns(identity.ownerId, id))[0].userCiphertext
    const originalToken = jar.get(VISITOR_COOKIE_NAME)!
    signedInUser = "account-claim"
    expect(await conversationOwnerId()).toBe("account-claim")
    expect((await readJson<{ conversations: { id: string }[] }>(await list())).conversations).toEqual([])
    expect((await claim(request("/api/visitor-session/claim", { visitorId: identity.ownerId }))).status).toBe(400)
    expect((await claim(request("/api/visitor-session/claim", { visitorId: "visitor_other", confirmed: true }))).status).toBe(409)
    const response = await claim(request("/api/visitor-session/claim", { visitorId: identity.ownerId, confirmed: true }))
    expect(response.status).toBe(200)
    expect(jar.has(VISITOR_COOKIE_NAME)).toBe(false)
    expect((await repository.listTurns("account-claim", id))[0].userCiphertext).toEqual(before)
    expect(await repository.getConversation(identity.ownerId, id)).toBeNull()
    jar = new Map([[VISITOR_COOKIE_NAME, originalToken]])
    signedInUser = null
    expect(await conversationOwnerId()).toBeNull()
    expect(await repository.beginTurn(identity.ownerId, { id: "revoked-turn", conversationId: id, clientMessageId: "revoked", userCiphertext: new Uint8Array([1]), userIv: new Uint8Array(12), encryptionKeyVersion: 1 })).toBe(false)
    await repository.deleteUser("account-claim")
    expect(await repository.listTurns("account-claim", id)).toEqual([])
  })

  test("blocks a pending visitor turn without moving any conversations", async () => {
    const identity = await visitor()
    const first = await conversation()
    const second = await conversation()
    await begin(identity.ownerId, first)
    signedInUser = "account-pending"
    expect((await claim(request("/api/visitor-session/claim", { visitorId: identity.ownerId, confirmed: true }))).status).toBe(409)
    expect(await repository.getConversation(identity.ownerId, first)).not.toBeNull()
    expect(await repository.getConversation(identity.ownerId, second)).not.toBeNull()
    expect(await repository.listConversations("account-pending")).toEqual([])
  })

  test("serializes a concurrent claim against the start of a new turn", async () => {
    const identity = await visitor()
    const id = await conversation()
    await repository.initializePreferences("account-race")
    const [began, claimed] = await Promise.all([
      repository.beginTurn(identity.ownerId, { id: "race-turn", conversationId: id,
        clientMessageId: "race-message", userCiphertext: new Uint8Array([1]),
        userIv: new Uint8Array(12), encryptionKeyVersion: 1 }),
      repository.claimVisitor(identity.ownerId, "account-race"),
    ])
    expect(began && claimed).toBe(false)
    expect(began || claimed).toBe(true)
    expect(await repository.getConversation(claimed ? "account-race" : identity.ownerId, id)).not.toBeNull()
  })

  test("rejects cross-origin visitor bootstrap before issuing a cookie", async () => {
    signedInUser = null
    jar = new Map()
    expect((await bootstrap(request("/api/visitor-session", {}, "https://other.example"))).status).toBe(403)
    expect(jar.size).toBe(0)
  })
})
