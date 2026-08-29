export const CONVERSATION_CONSENT_VERSION = "conversation-storage-v1"

export type ConversationMode = "companion" | "guest"
export type ConversationStatus = "active" | "archived"
export type TurnStatus = "pending" | "completed" | "stopped" | "failed"

export type ConversationPreferences = {
  historyEnabled: boolean
  consentVersion: string | null
  consentedAt: number | null
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

type TurnRow = {
  id: string
  conversation_id: string
  client_message_id: string
  user_ciphertext: ArrayBuffer
  user_iv: ArrayBuffer
  assistant_ciphertext: ArrayBuffer | null
  assistant_iv: ArrayBuffer | null
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

function toTurn(row: TurnRow): EncryptedTurnRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    clientMessageId: row.client_message_id,
    userCiphertext: row.user_ciphertext,
    userIv: row.user_iv,
    assistantCiphertext: row.assistant_ciphertext,
    assistantIv: row.assistant_iv,
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

  async getPreferences(userId: string): Promise<ConversationPreferences> {
    const row = await this.db
      .prepare(
        `SELECT history_enabled, consent_version, consented_at
         FROM app_users
         WHERE clerk_user_id = ?`,
      )
      .bind(userId)
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
    userId: string,
    historyEnabled: boolean,
    consentVersion: string | null,
    now = Date.now(),
  ): Promise<ConversationPreferences> {
    await this.db
      .prepare(
        `INSERT INTO app_users (
           clerk_user_id, history_enabled, consent_version,
           consented_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(clerk_user_id) DO UPDATE SET
           history_enabled = excluded.history_enabled,
           consent_version = CASE
             WHEN excluded.history_enabled = 1 THEN excluded.consent_version
             ELSE app_users.consent_version
           END,
           consented_at = CASE
             WHEN excluded.history_enabled = 1 THEN excluded.consented_at
             ELSE app_users.consented_at
           END,
           updated_at = excluded.updated_at`,
      )
      .bind(
        userId,
        historyEnabled ? 1 : 0,
        consentVersion,
        historyEnabled ? now : null,
        now,
        now,
      )
      .run()

    return this.getPreferences(userId)
  }

  async createConversation(
    userId: string,
    input: { id: string; mode: ConversationMode; guestId: string | null },
    now = Date.now(),
  ): Promise<ConversationRecord | null> {
    const result = await this.db
      .prepare(
        `INSERT INTO conversations (
           id, owner_id, mode, guest_id, status,
           created_at, updated_at, last_message_at
         )
         SELECT ?, u.clerk_user_id, ?, ?, 'active', ?, ?, NULL
         FROM app_users u
         WHERE u.clerk_user_id = ? AND u.history_enabled = 1`,
      )
      .bind(input.id, input.mode, input.guestId, now, now, userId)
      .run()

    if (result.meta.changes !== 1) return null
    return this.getConversation(userId, input.id)
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${CONVERSATION_COLUMNS}
         FROM conversations
         WHERE id = ? AND owner_id = ?`,
      )
      .bind(conversationId, userId)
      .first<ConversationRow>()
    return row ? toConversation(row) : null
  }

  async listConversations(
    userId: string,
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
      .bind(userId, limit)
      .all<ConversationRow>()
    return result.results.map(toConversation)
  }

  async setConversationStatus(
    userId: string,
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
      .bind(status, now, conversationId, userId)
      .run()
    return result.meta.changes > 0
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(`DELETE FROM conversations WHERE id = ? AND owner_id = ?`)
      .bind(conversationId, userId)
      .run()
    return result.meta.changes > 0
  }

  async deleteAllConversations(userId: string): Promise<number> {
    const result = await this.db
      .prepare(`DELETE FROM conversations WHERE owner_id = ?`)
      .bind(userId)
      .run()
    return result.meta.changes
  }

  async deleteUser(userId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM app_users WHERE clerk_user_id = ?`)
      .bind(userId)
      .run()
  }

  async findTurnByClientMessageId(
    userId: string,
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
      .bind(conversationId, clientMessageId, userId)
      .first<TurnRow>()
    return row ? toTurn(row) : null
  }

  async beginTurn(
    userId: string,
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
           JOIN app_users u ON u.clerk_user_id = c.owner_id
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
          userId,
        ),
      this.db
        .prepare(
          `UPDATE conversations
           SET updated_at = ?, last_message_at = ?
           WHERE id = ? AND owner_id = ? AND status = 'active'
             AND EXISTS (
               SELECT 1 FROM app_users u
               WHERE u.clerk_user_id = conversations.owner_id
                 AND u.history_enabled = 1
             )`,
        )
        .bind(now, now, input.conversationId, userId),
    ])
    return insertResult.meta.changes === 1
  }

  async completeTurn(
    userId: string,
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
        userId,
      )
      .run()
    return result.meta.changes === 1
  }

  async markTurnIncomplete(
    userId: string,
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
        userId,
      )
      .run()
  }

  async listTurns(
    userId: string,
    conversationId: string,
    limit = 100,
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
         LIMIT ?`,
      )
      .bind(conversationId, userId, limit)
      .all<TurnRow>()
    return result.results.map(toTurn)
  }

  async listTurnsForContext(
    userId: string,
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
        .bind(conversationId, userId),
      this.db
        .prepare(
          `SELECT ${TURN_COLUMNS}
           FROM conversation_turns t
           WHERE ${ownershipClause}
           ORDER BY t.created_at DESC, t.id DESC
           LIMIT ?`,
        )
        .bind(conversationId, userId, recentLimit),
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
