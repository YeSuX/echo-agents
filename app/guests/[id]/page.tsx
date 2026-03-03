import { notFound } from "next/navigation"

import { ConversationPage } from "@/components/conversation-page"
import { GUESTS } from "@/data/guests"

type Props = { params: Promise<{ id: string }> }

/** 对话了解故事页：选择嘉宾并确认「再次触发警告」后进入 */
export default async function GuestChatPage({ params }: Props) {
  const { id } = await params
  const guest = GUESTS.find((g) => g.id === id)
  if (!guest) notFound()

  return (
    <ConversationPage guestId={guest.id} guestName={guest.name} />
  )
}
