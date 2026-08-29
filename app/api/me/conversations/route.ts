import { apiError } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"

export async function DELETE() {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const deleted = await new ConversationRepository(getDb()).deleteAllConversations(
    userId,
  )
  return Response.json({ ok: true, deleted })
}
