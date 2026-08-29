import { z } from "zod"

import { GUESTS } from "@/data/guests"
import { apiError, PRIVATE_JSON_HEADERS } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"
import { toPublicConversation } from "@/lib/public-conversation"

const createSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("companion"), guestId: z.null().optional() }),
  z.object({ mode: z.literal("guest"), guestId: z.string().min(1).max(100) }),
])

export async function GET() {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const conversations = await new ConversationRepository(getDb()).listConversations(
    userId,
  )
  return Response.json(
    { conversations: conversations.map(toPublicConversation) },
    { headers: PRIVATE_JSON_HEADERS },
  )
}

export async function POST(request: Request) {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return apiError("INVALID_BODY", "Invalid conversation body", 400)
  }
  if (
    parsed.data.mode === "guest" &&
    !GUESTS.some((guest) => guest.id === parsed.data.guestId)
  ) {
    return apiError("GUEST_NOT_FOUND", "Guest not found", 404)
  }

  const conversation = await new ConversationRepository(getDb()).createConversation(
    userId,
    {
      id: crypto.randomUUID(),
      mode: parsed.data.mode,
      guestId: parsed.data.mode === "guest" ? parsed.data.guestId : null,
    },
  )
  if (!conversation) {
    return apiError("HISTORY_DISABLED", "Conversation history is disabled", 409)
  }
  return Response.json(
    { conversation: toPublicConversation(conversation) },
    { status: 201 },
  )
}
