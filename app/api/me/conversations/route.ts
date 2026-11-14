import { checkConversationOrigin } from "@/lib/auth/conversation-origin"
import { apiError } from "@/lib/api-response"
import { conversationOwnerId } from "@/lib/auth/conversation-owner"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"

export async function DELETE(request: Request) {
  const originError = checkConversationOrigin(request)
  if (originError) return originError
  const userId = await conversationOwnerId()
  if (!userId) return apiError("SESSION_REQUIRED", "Conversation session is unavailable; reload the page", 401)

  const deleted = await new ConversationRepository(getDb()).deleteAllConversations(
    userId,
  )
  return Response.json({ ok: true, deleted })
}
