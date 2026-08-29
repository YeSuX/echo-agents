import type { ConversationRecord } from "@/lib/db/conversation-repository"

export type PublicConversation = Omit<ConversationRecord, "ownerId">

export function toPublicConversation(
  conversation: ConversationRecord,
): PublicConversation {
  return {
    id: conversation.id,
    mode: conversation.mode,
    guestId: conversation.guestId,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessageAt: conversation.lastMessageAt,
  }
}
