import { cookies } from "next/headers"
import { z } from "zod"

import { apiError, PRIVATE_JSON_HEADERS } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import { currentVisitor } from "@/lib/auth/conversation-owner"
import { checkConversationOrigin } from "@/lib/auth/conversation-origin"
import { VISITOR_COOKIE_NAME } from "@/lib/auth/visitor-token"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"

const claimSchema = z.object({ visitorId: z.string().min(1).max(100), confirmed: z.literal(true) })

export async function POST(request: Request) {
  const originError = checkConversationOrigin(request)
  if (originError) return originError
  const accountId = await authenticatedUserId()
  if (!accountId) return apiError("AUTH_REQUIRED", "Sign in required", 401)
  const body = claimSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return apiError("CONFIRMATION_REQUIRED", "Explicit confirmation is required", 400)
  const visitor = await currentVisitor()
  if (!visitor) return apiError("VISITOR_SESSION_MISSING", "Visitor session is unavailable", 409)
  if (visitor.id !== body.data.visitorId) return apiError("VISITOR_SESSION_CHANGED", "Visitor session changed", 409)
  const repository = new ConversationRepository(getDb())
  await repository.initializePreferences(accountId)
  if (!await repository.claimVisitor(visitor.id, accountId)) {
    return apiError("VISITOR_TURN_PENDING", "Stop generation before linking history", 409)
  }
  const cookieStore = await cookies()
  cookieStore.set(VISITOR_COOKIE_NAME, "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 0,
  })
  return Response.json({ ok: true }, { headers: PRIVATE_JSON_HEADERS })
}
