import { CompanionConversationPage } from "@/components/companion-conversation-page"

type Props = { searchParams: Promise<{ conversation?: string }> }

export default async function SupportPage({ searchParams }: Props) {
  const { conversation } = await searchParams
  return <CompanionConversationPage initialConversationId={conversation} />
}
