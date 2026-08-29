import {
  decryptConversationContent,
  type ConversationKeyring,
} from "@/lib/crypto/conversation-codec"
import type { EncryptedTurnRecord } from "@/lib/db/conversation-repository"
import type { ChatContextMessage } from "@/lib/chat-context"

export type DecryptedTurn = {
  id: string
  clientMessageId: string
  userContent: string
  assistantContent: string | null
  status: EncryptedTurnRecord["status"]
  errorCode: string | null
  createdAt: number
  completedAt: number | null
}

export async function decryptTurn(
  turn: EncryptedTurnRecord,
  keyring: ConversationKeyring,
): Promise<DecryptedTurn> {
  const common = {
    conversationId: turn.conversationId,
    turnId: turn.id,
    keyVersion: turn.encryptionKeyVersion,
    keyring,
  }
  const userContent = await decryptConversationContent(
    { ciphertext: turn.userCiphertext, iv: turn.userIv },
    { ...common, role: "user" },
  )
  const assistantContent =
    turn.assistantCiphertext && turn.assistantIv
      ? await decryptConversationContent(
          {
            ciphertext: turn.assistantCiphertext,
            iv: turn.assistantIv,
          },
          { ...common, role: "assistant" },
        )
      : null

  return {
    id: turn.id,
    clientMessageId: turn.clientMessageId,
    userContent,
    assistantContent,
    status: turn.status,
    errorCode: turn.errorCode,
    createdAt: turn.createdAt,
    completedAt: turn.completedAt,
  }
}

export async function decryptTurns(
  turns: readonly EncryptedTurnRecord[],
  keyring: ConversationKeyring,
): Promise<DecryptedTurn[]> {
  return Promise.all(turns.map((turn) => decryptTurn(turn, keyring)))
}

export function turnsToChatContext(
  turns: readonly DecryptedTurn[],
): ChatContextMessage[] {
  const messages: ChatContextMessage[] = []
  for (const turn of turns) {
    messages.push({ role: "user", content: turn.userContent })
    if (turn.status === "completed" && turn.assistantContent) {
      messages.push({ role: "assistant", content: turn.assistantContent })
    }
  }
  return messages
}
