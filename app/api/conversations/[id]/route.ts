import { z } from "zod"

import { apiError, PRIVATE_JSON_HEADERS } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import { conversationKeyringFromEnv } from "@/lib/crypto/conversation-codec"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"
import { decryptTurns } from "@/lib/conversation-content"
import { toPublicConversation } from "@/lib/public-conversation"

type RouteContext = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status: z.enum(["active", "archived"]),
})

export async function GET(_request: Request, context: RouteContext) {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const { id } = await context.params
  const repository = new ConversationRepository(getDb())
  const conversation = await repository.getConversation(userId, id)
  if (!conversation) {
    return apiError("CONVERSATION_NOT_FOUND", "Conversation not found", 404)
  }
  const turns = await decryptTurns(
    await repository.listTurns(userId, id),
    conversationKeyringFromEnv(),
  )
  return Response.json(
    { conversation: toPublicConversation(conversation), turns },
    { headers: PRIVATE_JSON_HEADERS },
  )
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return apiError("INVALID_BODY", "Invalid conversation body", 400)
  }
  const { id } = await context.params
  const updated = await new ConversationRepository(getDb()).setConversationStatus(
    userId,
    id,
    parsed.data.status,
  )
  if (!updated) {
    return apiError("CONVERSATION_NOT_FOUND", "Conversation not found", 404)
  }
  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const { id } = await context.params
  const deleted = await new ConversationRepository(getDb()).deleteConversation(
    userId,
    id,
  )
  if (!deleted) {
    return apiError("CONVERSATION_NOT_FOUND", "Conversation not found", 404)
  }
  return new Response(null, { status: 204 })
}
