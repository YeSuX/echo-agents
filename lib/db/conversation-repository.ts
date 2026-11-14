import { CONVERSATION_PREFERENCE_VERSION } from "@/lib/conversation-preferences"

export type ConversationMode = "companion" | "guest"
export type ConversationStatus = "active" | "archived"
export type TurnStatus = "pending" | "completed" | "stopped" | "failed"

export type ConversationPreferences = {
  historyEnabled: boolean
  consentVersion: string | null
  consentedAt: number | null
}

export type VisitorOwner = {
  id: string
  expiresAt: number
}

export type ConversationRecord = {
  id: string
  ownerId: string
  mode: ConversationMode
  guestId: string | null
  status: ConversationStatus
  createdAt: number
  updatedAt: number
  lastMessageAt: number | null
}

export type EncryptedTurnRecord = {
  id: string
  conversationId: string
  clientMessageId: string
  userCiphertext: ArrayBuffer
  userIv: ArrayBuffer
  assistantCiphertext: ArrayBuffer | null
  assistantIv: ArrayBuffer | null
  encryptionKeyVersion: number
  status: TurnStatus
  errorCode: string | null
  createdAt: number
  completedAt: number | null
}

type PreferencesRow = {
  history_enabled: number
  consent_version: string | null
  consented_at: number | null
}

type ConversationRow = {
  id: string
  owner_id: string
  mode: ConversationMode
  guest_id: string | null
  status: ConversationStatus
  created_at: number
  updated_at: number
  last_message_at: number | null
}

type D1Blob = ArrayBuffer | Uint8Array | number[]

type TurnRow = {
  id: string
  conversation_id: string
  client_message_id: string
  user_ciphertext: D1Blob
  user_iv: D1Blob
  assistant_ciphertext: D1Blob | null
  assistant_iv: D1Blob | null
  encryption_key_version: number
  status: TurnStatus
  error_code: string | null
  created_at: number
  completed_at: number | null
}

function toConversation(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    mode: row.mode,
    guestId: row.guest_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  }
}

function d1BlobToArrayBuffer(value: D1Blob): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  if (value instanceof Uint8Array) return exactArrayBuffer(value)
  return Uint8Array.from(value).buffer as ArrayBuffer
}

function toTurn(row: TurnRow): EncryptedTurnRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    clientMessageId: row.client_message_id,
    userCiphertext: d1BlobToArrayBuffer(row.user_ciphertext),
    userIv: d1BlobToArrayBuffer(row.user_iv),
    assistantCiphertext: row.assistant_ciphertext
      ? d1BlobToArrayBuffer(row.assistant_ciphertext)
      : null,
    assistantIv: row.assistant_iv
      ? d1BlobToArrayBuffer(row.assistant_iv)
      : null,
    encryptionKeyVersion: row.encryption_key_version,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function exactArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength,
  ) as ArrayBuffer
}

const CONVERSATION_COLUMNS = `
  id, owner_id, mode, guest_id, status,
  created_at, updated_at, last_message_at
`

const TURN_COLUMNS = `
  id, conversation_id, client_message_id,
  user_ciphertext, user_iv, assistant_ciphertext, assistant_iv,
  encryption_key_version, status, error_code, created_at, completed_at
`

export class ConversationRepository {
  constructor(private readonly db: D1Database) {}

  async findVisitor(tokenHash: string, now = Date.now()): Promise<VisitorOwner | null> {
    const row = await this.db.prepare(
      `SELECT id, visitor_expires_at AS expiresAt FROM conversation_owners
       WHERE kind = 'visitor' AND visitor_token_hash = ? AND visitor_expires_at > ?`,
    ).bind(tokenHash, now).first<VisitorOwner>()
    return row
  }

  async createVisitor(tokenHash: string, expiresAt: number, now = Date.now()): Promise<VisitorOwner> {
    const id = `visitor_${crypto.randomUUID()}`
    await this.db.prepare(
      `INSERT INTO conversation_owners
       (id, kind, visitor_token_hash, visitor_expires_at, history_enabled,
        consent_version, consented_at, created_at, updated_at)
       VALUES (?, 'visitor', ?, ?, 1, ?, ?, ?, ?)`,
    ).bind(id, tokenHash, expiresAt, CONVERSATION_PREFERENCE_VERSION, now, now, now).run()
    return { id, expiresAt }
  }

  async refreshVisitor(id: string, expiresAt: number, now = Date.now()): Promise<boolean> {
    const result = await this.db.prepare(
      `UPDATE conversation_owners SET visitor_expires_at = ?, updated_at = ?
       WHERE id = ? AND kind = 'visitor' AND visitor_expires_at > ?`,
    ).bind(expiresAt, now, id, now).run()
    return result.meta.changes === 1
  }

  async cleanupExpiredVisitors(now = Date.now()): Promise<void> {
    await this.db.prepare(
      `DELETE FROM conversation_owners WHERE id IN (
         SELECT id FROM conversation_owners
         WHERE kind = 'visitor' AND visitor_expires_at <= ? LIMIT 100
       )`,
    ).bind(now).run()
  }

  async claimVisitor(visitorId: string, accountId: string, now = Date.now()): Promise<boolean> {
    // A pending turn blocks the entire transfer. The batch serializes against
    // beginTurn, so an in-flight response cannot finish under a different owner.
    await this.db.batch([
      this.db.prepare(
        `UPDATE conversations SET owner_id = ?, updated_at = ?
         WHERE owner_id = ?
           AND EXISTS (SELECT 1 FROM conversation_owners
                       WHERE id = ? AND kind = 'visitor' AND visitor_expires_at > ?)
           AND EXISTS (SELECT 1 FROM conversation_owners WHERE id = ? AND kind = 'account')
           AND NOT EXISTS (
             SELECT 1 FROM conversation_turns t JOIN conversations c ON c.id = t.conversation_id
             WHERE c.owner_id = ? AND t.status = 'pending'
           )`,
      ).bind(accountId, now, visitorId, visitorId, now, accountId, visitorId),
      this.db.prepare(
        `DELETE FROM conversation_owners WHERE id = ? AND kind = 'visitor'
         AND visitor_expires_at > ?
         AND EXISTS (SELECT 1 FROM conversation_owners WHERE id = ? AND kind = 'account')
         AND NOT EXISTS (SELECT 1 FROM conversations WHERE owner_id = ?)`,
      ).bind(visitorId, now, accountId, visitorId),
    ])
    const remaining = await this.db.prepare(
      "SELECT id FROM conversation_owners WHERE id = ?",
    ).bind(visitorId).first()
    return remaining === null
  }

  async initializePreferences(
    ownerId: string,
    now = Date.now(),
  ): Promise<ConversationPreferences> {
    await this.db
      .prepare(
        `INSERT INTO conversation_owners (
           id, history_enabled, consent_version,
           consented_at, created_at, updated_at
         ) VALUES (?, 1, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(ownerId, CONVERSATION_PREFERENCE_VERSION, now, now, now)
      .run()

    return this.getPreferences(ownerId)
  }

  async getPreferences(ownerId: string): Promise<ConversationPreferences> {
    const row = await this.db
      .prepare(
        `SELECT history_enabled, consent_version, consented_at
         FROM conversation_owners
         WHERE id = ?`,
      )
      .bind(ownerId)
      .first<PreferencesRow>()

    return row
      ? {
          historyEnabled: row.history_enabled === 1,
          consentVersion: row.consent_version,
          consentedAt: row.consented_at,
        }
      : { historyEnabled: false, consentVersion: null, consentedAt: null }
  }

  async setPreferences(
    ownerId: string,
    historyEnabled: boolean,
    consentVersion: string | null,
    now = Date.now(),
  ): Promise<ConversationPreferences> {
    await this.db
      .prepare(
        `INSERT INTO conversation_owners (
           id, history_enabled, consent_version,
           consented_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           history_enabled = excluded.history_enabled,
           consent_version = CASE
             WHEN excluded.history_enabled = 1 THEN excluded.consent_version
             ELSE conversation_owners.consent_version
           END,
           consented_at = CASE
             WHEN excluded.history_enabled = 1 THEN excluded.consented_at
             ELSE conversation_owners.consented_at
           END,
           updated_at = excluded.updated_at`,
      )
      .bind(
        ownerId,
        historyEnabled ? 1 : 0,
        consentVersion,
        historyEnabled ? now : null,
        now,
        now,
      )
      .run()

    return this.getPreferences(ownerId)
  }

  async createConversation(
    ownerId: string,
    input: { id: string; mode: ConversationMode; guestId: string | null },
    now = Date.now(),
  ): Promise<ConversationRecord | null> {
    const result = await this.db
      .prepare(
        `INSERT INTO conversations (
           id, owner_id, mode, guest_id, status,
           created_at, updated_at, last_message_at
         )
         SELECT ?, u.id, ?, ?, 'active', ?, ?, NULL
         FROM conversation_owners u
         WHERE u.id = ? AND u.history_enabled = 1`,
      )
      .bind(input.id, input.mode, input.guestId, now, now, ownerId)
      .run()

    if (result.meta.changes !== 1) return null
    return this.getConversation(ownerId, input.id)
  }

  async getConversation(
    ownerId: string,
    conversationId: string,
  ): Promise<ConversationRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${CONVERSATION_COLUMNS}
         FROM conversations
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(conversationId, ownerId)
      .first<ConversationRow>()
    return row ? toConversation(row) : null
  }

  async listConversations(
    ownerId: string,
    limit = 50,
  ): Promise<ConversationRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT ${CONVERSATION_COLUMNS}
         FROM conversations
         WHERE owner_id = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT ?`,
      )
      .bind(ownerId, limit)
      .all<ConversationRow>()
    return result.results.map(toConversation)
  }

  async setConversationStatus(
    ownerId: string,
    conversationId: string,
    status: ConversationStatus,
    now = Date.now(),
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE conversations
         SET status = ?, updated_at = ?
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(status, now, conversationId, ownerId)
      .run()
    return result.meta.changes > 0
  }

  async deleteConversation(
    ownerId: string,
    conversationId: string,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(`DELETE FROM conversations WHERE id = ? AND owner_id = ?`)
      .bind(conversationId, ownerId)
      .run()
    return result.meta.changes > 0
  }

  async deleteAllConversations(ownerId: string): Promise<number> {
    const result = await this.db
      .prepare(`DELETE FROM conversations WHERE owner_id = ?`)
      .bind(ownerId)
      .run()
    return result.meta.changes
  }

  async deleteUser(ownerId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM conversation_owners WHERE id = ? AND kind = 'account'`)
      .bind(ownerId)
      .run()
  }

  async findTurnByClientMessageId(
    ownerId: string,
    conversationId: string,
    clientMessageId: string,
  ): Promise<EncryptedTurnRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${TURN_COLUMNS}
         FROM conversation_turns t
         WHERE t.conversation_id = ?
           AND t.client_message_id = ?
           AND EXISTS (
             SELECT 1 FROM conversations c
             WHERE c.id = t.conversation_id AND c.owner_id = ?
           )`,
      )
      .bind(conversationId, clientMessageId, ownerId)
      .first<TurnRow>()
    return row ? toTurn(row) : null
  }

  async beginTurn(
    ownerId: string,
    input: {
      id: string
      conversationId: string
      clientMessageId: string
      userCiphertext: Uint8Array
      userIv: Uint8Array
      encryptionKeyVersion: number
    },
    now = Date.now(),
  ): Promise<boolean> {
    const [insertResult] = await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO conversation_turns (
             id, conversation_id, client_message_id,
             user_ciphertext, user_iv, encryption_key_version,
             status, error_code, created_at, completed_at
           )
           SELECT ?, c.id, ?, ?, ?, ?, 'pending', NULL, ?, NULL
           FROM conversations c
           JOIN conversation_owners u ON u.id = c.owner_id
           WHERE c.id = ? AND c.owner_id = ?
             AND c.status = 'active' AND u.history_enabled = 1`,
        )
        .bind(
          input.id,
          input.clientMessageId,
          exactArrayBuffer(input.userCiphertext),
          exactArrayBuffer(input.userIv),
          input.encryptionKeyVersion,
          now,
          input.conversationId,
          ownerId,
        ),
      this.db
        .prepare(
          `UPDATE conversations
           SET updated_at = ?, last_message_at = ?
           WHERE id = ? AND owner_id = ? AND status = 'active'
             AND EXISTS (
               SELECT 1 FROM conversation_owners u
               WHERE u.id = conversations.owner_id
                 AND u.history_enabled = 1
             )`,
        )
        .bind(now, now, input.conversationId, ownerId),
    ])
    return insertResult.meta.changes === 1
  }

  async completeTurn(
    ownerId: string,
    input: {
      turnId: string
      conversationId: string
      assistantCiphertext: Uint8Array
      assistantIv: Uint8Array
    },
    now = Date.now(),
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE conversation_turns
         SET assistant_ciphertext = ?, assistant_iv = ?,
             status = 'completed', error_code = NULL, completed_at = ?
         WHERE id = ? AND conversation_id = ? AND status = 'pending'
           AND EXISTS (
             SELECT 1 FROM conversations c
             WHERE c.id = conversation_turns.conversation_id
               AND c.owner_id = ?
           )`,
      )
      .bind(
        exactArrayBuffer(input.assistantCiphertext),
        exactArrayBuffer(input.assistantIv),
        now,
        input.turnId,
        input.conversationId,
        ownerId,
      )
      .run()
    return result.meta.changes === 1
  }

  async markTurnIncomplete(
    ownerId: string,
    input: {
      turnId: string
      conversationId: string
      status: "stopped" | "failed"
      errorCode: string | null
    },
    now = Date.now(),
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE conversation_turns
         SET status = ?, error_code = ?, completed_at = ?
         WHERE id = ? AND conversation_id = ? AND status = 'pending'
           AND EXISTS (
             SELECT 1 FROM conversations c
             WHERE c.id = conversation_turns.conversation_id
               AND c.owner_id = ?
           )`,
      )
      .bind(
        input.status,
        input.errorCode,
        now,
        input.turnId,
        input.conversationId,
        ownerId,
      )
      .run()
  }

  async listTurns(
    ownerId: string,
    conversationId: string,
    limit = 100,
    offset = 0,
  ): Promise<EncryptedTurnRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT ${TURN_COLUMNS}
         FROM conversation_turns t
         WHERE t.conversation_id = ?
           AND EXISTS (
             SELECT 1 FROM conversations c
             WHERE c.id = t.conversation_id AND c.owner_id = ?
           )
         ORDER BY t.created_at ASC, t.id ASC
         LIMIT ? OFFSET ?`,
      )
      .bind(conversationId, ownerId, limit, offset)
      .all<TurnRow>()
    return result.results.map(toTurn)
  }

  async listTurnsForContext(
    ownerId: string,
    conversationId: string,
    recentLimit = 24,
  ): Promise<EncryptedTurnRecord[]> {
    const ownershipClause = `
      t.conversation_id = ?
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = t.conversation_id AND c.owner_id = ?
      )
    `
    const [firstResult, recentResult] = await this.db.batch<TurnRow>([
      this.db
        .prepare(
          `SELECT ${TURN_COLUMNS}
           FROM conversation_turns t
           WHERE ${ownershipClause}
           ORDER BY t.created_at ASC, t.id ASC
           LIMIT 1`,
        )
        .bind(conversationId, ownerId),
      this.db
        .prepare(
          `SELECT ${TURN_COLUMNS}
           FROM conversation_turns t
           WHERE ${ownershipClause}
           ORDER BY t.created_at DESC, t.id DESC
           LIMIT ?`,
        )
        .bind(conversationId, ownerId, recentLimit),
    ])
    const turns = [
      ...firstResult.results,
      ...recentResult.results.reverse(),
    ]
    return [...new Map(turns.map((turn) => [turn.id, turn])).values()]
      .sort((left, right) => left.created_at - right.created_at || left.id.localeCompare(right.id))
      .map(toTurn)
  }
}
