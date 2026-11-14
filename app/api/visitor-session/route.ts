import { cookies } from "next/headers"

import { apiError, PRIVATE_JSON_HEADERS } from "@/lib/api-response"
import { authenticatedUserId } from "@/lib/auth/require-user"
import { currentVisitor } from "@/lib/auth/conversation-owner"
import { checkConversationOrigin } from "@/lib/auth/conversation-origin"
import { createVisitorToken, hashVisitorToken, VISITOR_COOKIE_NAME, VISITOR_SESSION_MAX_AGE_SECONDS } from "@/lib/auth/visitor-token"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"
import { checkRateLimit } from "@/lib/safety/rate-limit"
import { rateLimitResponse } from "@/lib/safety/sse-response"

export async function GET() {
  const visitor = await currentVisitor()
  const conversations = visitor
    ? await new ConversationRepository(getDb()).listConversations(visitor.id, 1)
    : []
  return Response.json({ visitorId: visitor?.id ?? null, hasHistory: conversations.length > 0 }, {
    headers: PRIVATE_JSON_HEADERS,
  })
}

export async function POST(request: Request) {
  const originError = checkConversationOrigin(request)
  if (originError) return originError
  if (await authenticatedUserId()) return apiError("ALREADY_SIGNED_IN", "Use account preferences", 409)
  const rate = checkRateLimit(`visitor:${request.headers.get("cf-connecting-ip") ?? "local"}`, "chat")
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec)
  const repository = new ConversationRepository(getDb())
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(VISITOR_COOKIE_NAME)?.value
  const hash = existingToken ? await hashVisitorToken(existingToken) : null
  let visitor = hash ? await repository.findVisitor(hash) : null
  const expiresAt = Date.now() + VISITOR_SESSION_MAX_AGE_SECONDS * 1000
  let token = existingToken
  if (visitor && !await repository.refreshVisitor(visitor.id, expiresAt)) visitor = null
  if (!visitor) {
    token = createVisitorToken()
    const newHash = await hashVisitorToken(token)
    if (!newHash) throw new Error("Generated visitor credential is invalid")
    visitor = await repository.createVisitor(newHash, expiresAt)
  }
  cookieStore.set(VISITOR_COOKIE_NAME, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_SESSION_MAX_AGE_SECONDS,
  })
  await repository.cleanupExpiredVisitors()
  const preferences = await repository.getPreferences(visitor.id)
  return Response.json(preferences, { headers: PRIVATE_JSON_HEADERS })
}
