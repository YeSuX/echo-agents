import {
  encryptConversationContent,
  decryptConversationContent,
  type ConversationKeyring,
} from "@/lib/crypto/conversation-codec"
import { STORY_CONSENT_VERSION } from "@/lib/story-contribution"

// A separate AAD namespace prevents ciphertext reuse as a private chat turn.
const STORY_NAMESPACE = "anonymous-story-contributions"

export class StoryRepository {
  constructor(private readonly db: D1Database, private readonly keyring: ConversationKeyring) {}

  async submit(input: {
    id: string
    text: string
    originalLength: number
  }): Promise<"created" | "duplicate" | "conflict"> {
    const options = {
      conversationId: STORY_NAMESPACE,
      turnId: input.id,
      role: "user" as const,
      keyring: this.keyring,
    }
    const encrypted = await encryptConversationContent(input.text, options)
    const result = await this.db.prepare(`
      INSERT INTO story_contributions
        (id, content_ciphertext, content_iv, encryption_key_version,
         original_length, content_length, consent_version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
      RETURNING id
    `).bind(
      input.id, encrypted.ciphertext, encrypted.iv, encrypted.keyVersion,
      input.originalLength, input.text.length, STORY_CONSENT_VERSION, Date.now(),
    ).first<{ id: string }>()
    if (result) return "created"

    const existing = await this.db.prepare(`
      SELECT content_ciphertext, content_iv, encryption_key_version, consent_version
      FROM story_contributions WHERE id = ?
    `).bind(input.id).first<{
      content_ciphertext: ArrayBuffer | number[]
      content_iv: ArrayBuffer | number[]
      encryption_key_version: number
      consent_version: string
    }>()
    if (!existing) throw new Error("Story insert was not confirmed")
    const text = await decryptConversationContent({
      ciphertext: Array.isArray(existing.content_ciphertext)
        ? Uint8Array.from(existing.content_ciphertext) : existing.content_ciphertext,
      iv: Array.isArray(existing.content_iv)
        ? Uint8Array.from(existing.content_iv) : existing.content_iv,
    }, { ...options, keyVersion: existing.encryption_key_version })
    return text === input.text && existing.consent_version === STORY_CONSENT_VERSION
      ? "duplicate" : "conflict"
  }
}
