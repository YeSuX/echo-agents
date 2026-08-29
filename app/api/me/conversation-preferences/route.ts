import { z } from "zod"

import { apiError, PRIVATE_JSON_HEADERS } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import { CONVERSATION_PREFERENCE_VERSION } from "@/lib/conversation-preferences"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"

const preferenceSchema = z.object({
  historyEnabled: z.boolean(),
  consentVersion: z.string().nullable().optional(),
})

export async function GET() {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const preferences = await new ConversationRepository(
    getDb(),
  ).initializePreferences(userId)
  return Response.json(preferences, { headers: PRIVATE_JSON_HEADERS })
}

export async function PUT(request: Request) {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const parsed = preferenceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return apiError("INVALID_BODY", "Invalid preference body", 400)
  }
  if (
    parsed.data.historyEnabled &&
    parsed.data.consentVersion !== CONVERSATION_PREFERENCE_VERSION
  ) {
    return apiError("CONSENT_REQUIRED", "Current consent is required", 400)
  }

  const preferences = await new ConversationRepository(getDb()).setPreferences(
    userId,
    parsed.data.historyEnabled,
    CONVERSATION_PREFERENCE_VERSION,
  )
  return Response.json(preferences, { headers: PRIVATE_JSON_HEADERS })
}
