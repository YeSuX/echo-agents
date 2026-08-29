import { z } from "zod"

import { apiError, PRIVATE_JSON_HEADERS } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import {
  CONVERSATION_CONSENT_VERSION,
  ConversationRepository,
} from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"

const preferenceSchema = z.object({
  historyEnabled: z.boolean(),
  consentVersion: z.string().nullable().optional(),
})

export async function GET() {
  const userId = await authenticatedUserId()
  if (!userId) return apiError("AUTH_REQUIRED", "Sign in required", 401)

  const preferences = await new ConversationRepository(getDb()).getPreferences(
    userId,
  )
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
    parsed.data.consentVersion !== CONVERSATION_CONSENT_VERSION
  ) {
    return apiError("CONSENT_REQUIRED", "Current consent is required", 400)
  }

  const preferences = await new ConversationRepository(getDb()).setPreferences(
    userId,
    parsed.data.historyEnabled,
    parsed.data.historyEnabled ? CONVERSATION_CONSENT_VERSION : null,
  )
  return Response.json(preferences, { headers: PRIVATE_JSON_HEADERS })
}
