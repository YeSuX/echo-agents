import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { NextRequest } from "next/server"

import { apiError } from "@/lib/api-response"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"
import { logSafeError } from "@/lib/safety/safe-log"

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    event = await verifyWebhook(request)
  } catch (error) {
    logSafeError("clerk/webhook", error, { phase: "verify" })
    return apiError("INVALID_WEBHOOK", "Webhook verification failed", 400)
  }

  try {
    if (event.type === "user.deleted" && event.data.id) {
      await new ConversationRepository(getDb()).deleteUser(event.data.id)
    }
    return Response.json({ ok: true })
  } catch (error) {
    logSafeError("clerk/webhook", error, { phase: "process" })
    return apiError("WEBHOOK_PROCESSING_FAILED", "Webhook processing failed", 503)
  }
}
