import { cookies } from "next/headers"

import { authenticatedUserId } from "@/lib/auth/require-user"
import { ConversationRepository } from "@/lib/db/conversation-repository"
import { getDb } from "@/lib/db/d1"
import { hashVisitorToken, VISITOR_COOKIE_NAME } from "@/lib/auth/visitor-token"

export async function currentVisitor() {
  const token = (await cookies()).get(VISITOR_COOKIE_NAME)?.value
  const hash = token ? await hashVisitorToken(token) : null
  return hash ? new ConversationRepository(getDb()).findVisitor(hash) : null
}

export async function conversationOwnerId(): Promise<string | null> {
  const userId = await authenticatedUserId()
  if (userId) return userId
  return (await currentVisitor())?.id ?? null
}
