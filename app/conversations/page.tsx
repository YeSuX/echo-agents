import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { ConversationsPage } from "@/components/conversations-page"

export const dynamic = "force-dynamic"

export default async function ConversationHistoryPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in?redirect_url=/conversations")
  return <ConversationsPage />
}
