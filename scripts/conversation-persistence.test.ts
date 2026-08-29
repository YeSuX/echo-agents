import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Miniflare } from "miniflare"

import {
  decryptConversationContent,
  encryptConversationContent,
  type ConversationKeyring,
} from "@/lib/crypto/conversation-codec"
import { turnsToChatContext } from "@/lib/conversation-content"
import { ConversationRepository } from "@/lib/db/conversation-repository"

function keyring(): ConversationKeyring {
  const key = crypto.getRandomValues(new Uint8Array(32))
  return new Map([[1, Buffer.from(key).toString("base64")]])
}

describe("conversation content encryption", () => {
  it("round-trips content with bound metadata", async () => {
    const keys = keyring()
    const encrypted = await encryptConversationContent("private message", {
      conversationId: "conversation-1",
      turnId: "turn-1",
      role: "user",
      keyring: keys,
    })

    const plaintext = await decryptConversationContent(encrypted, {
      conversationId: "conversation-1",
      turnId: "turn-1",
      role: "user",
      keyVersion: encrypted.keyVersion,
      keyring: keys,
    })

    expect(plaintext).toBe("private message")
  })

  it("rejects ciphertext moved to another role", async () => {
    const keys = keyring()
    const encrypted = await encryptConversationContent("private message", {
      conversationId: "conversation-1",
      turnId: "turn-1",
      role: "user",
      keyring: keys,
    })

    await expect(
      decryptConversationContent(encrypted, {
        conversationId: "conversation-1",
        turnId: "turn-1",
        role: "assistant",
        keyVersion: encrypted.keyVersion,
        keyring: keys,
      }),
    ).rejects.toThrow()
  })
})

describe("conversation migration", () => {
  it("enforces ownership relationships, idempotency, and cascade deletion", () => {
    const database = new Database(":memory:")
    database.exec("PRAGMA foreign_keys = ON")
    database.exec(
      readFileSync(
        resolve(process.cwd(), "migrations/0001_conversation_storage.sql"),
        "utf8",
      ),
    )
    database
      .query(
        `INSERT INTO app_users (
           clerk_user_id, history_enabled, consent_version,
           consented_at, created_at, updated_at
         ) VALUES (?, 1, ?, ?, ?, ?)`,
      )
      .run("user-a", "conversation-storage-v1", 1, 1, 1)
    database
      .query(
        `INSERT INTO conversations (
           id, owner_id, mode, guest_id, status,
           created_at, updated_at, last_message_at
         ) VALUES (?, ?, 'companion', NULL, 'active', ?, ?, NULL)`,
      )
      .run("conversation-1", "user-a", 1, 1)
    const insertTurn = database.query(
      `INSERT INTO conversation_turns (
         id, conversation_id, client_message_id,
         user_ciphertext, user_iv, encryption_key_version,
         status, created_at
       ) VALUES (?, ?, ?, ?, ?, 1, 'pending', ?)`,
    )
    insertTurn.run(
      "turn-1",
      "conversation-1",
      "client-1",
      new Uint8Array([1]),
      new Uint8Array(12),
      1,
    )

    expect(() =>
      insertTurn.run(
        "turn-2",
        "conversation-1",
        "client-1",
        new Uint8Array([2]),
        new Uint8Array(12),
        2,
      ),
    ).toThrow()

    database
      .query("DELETE FROM app_users WHERE clerk_user_id = ?")
      .run("user-a")
    const remaining = database
      .query("SELECT COUNT(*) AS count FROM conversation_turns")
      .get() as { count: number }
    expect(remaining.count).toBe(0)
    database.close()
  })
})

describe("saved context", () => {
  it("excludes incomplete assistant messages", () => {
    const messages = turnsToChatContext([
      {
        id: "turn-1",
        clientMessageId: "client-1",
        userContent: "first question",
        assistantContent: "first answer",
        status: "completed",
        errorCode: null,
        createdAt: 1,
        completedAt: 2,
      },
      {
        id: "turn-2",
        clientMessageId: "client-2",
        userContent: "second question",
        assistantContent: null,
        status: "pending",
        errorCode: null,
        createdAt: 3,
        completedAt: null,
      },
    ])

    expect(messages).toEqual([
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
      { role: "user", content: "second question" },
    ])
  })
})

describe("conversation repository ownership", () => {
  it("scopes reads, writes, and deletes to the Clerk user", async () => {
    const miniflare = new Miniflare({
      modules: true,
      script: "export default { fetch() { return new Response('ok') } }",
      d1Databases: ["DB"],
    })
    try {
      const database = (await miniflare.getD1Database("DB")) as D1Database
      const migration = readFileSync(
          resolve(process.cwd(), "migrations/0001_conversation_storage.sql"),
          "utf8",
        )
      for (const statement of migration.split(";")) {
        if (statement.trim()) await database.prepare(statement).run()
      }
      const repository = new ConversationRepository(database)
      await repository.setPreferences(
        "user-a",
        true,
        "conversation-storage-v1",
        1,
      )
      await repository.setPreferences(
        "user-b",
        true,
        "conversation-storage-v1",
        1,
      )
      const conversation = await repository.createConversation(
        "user-a",
        { id: "conversation-1", mode: "companion", guestId: null },
        2,
      )
      expect(conversation?.ownerId).toBe("user-a")

      const began = await repository.beginTurn(
        "user-a",
        {
          id: "turn-1",
          conversationId: "conversation-1",
          clientMessageId: "client-1",
          userCiphertext: new Uint8Array([1]),
          userIv: new Uint8Array(12),
          encryptionKeyVersion: 1,
        },
        3,
      )
      expect(began).toBe(true)
      expect(await repository.getConversation("user-b", "conversation-1")).toBeNull()
      expect(await repository.listTurns("user-b", "conversation-1")).toEqual([])
      expect(
        await repository.completeTurn("user-b", {
          turnId: "turn-1",
          conversationId: "conversation-1",
          assistantCiphertext: new Uint8Array([2]),
          assistantIv: new Uint8Array(12),
        }),
      ).toBe(false)
      expect(
        await repository.deleteConversation("user-b", "conversation-1"),
      ).toBe(false)
      expect(
        await repository.deleteConversation("user-a", "conversation-1"),
      ).toBe(true)
    } finally {
      await miniflare.dispose()
    }
  })
})
