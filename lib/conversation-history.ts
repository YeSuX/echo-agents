import type { DecryptedTurn } from "@/lib/conversation-content"

type HistoryPage = {
  conversation: { mode: string; guestId?: string | null }
  turns: DecryptedTurn[]
  nextOffset?: number | null
}

export async function loadConversationHistory(
  id: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<HistoryPage> {
  let offset = 0
  const turns: DecryptedTurn[] = []
  while (true) {
    const response = await fetcher(`/api/conversations/${encodeURIComponent(id)}?offset=${offset}`, {
      cache: "no-store", signal,
    })
    if (!response.ok) throw new Error("Could not load the full conversation. Please refresh and retry.")
    const page = await response.json() as HistoryPage
    turns.push(...page.turns)
    if (page.nextOffset === null || page.nextOffset === undefined) {
      return { ...page, turns }
    }
    if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset <= offset) {
      throw new Error("Invalid history pagination")
    }
    offset = page.nextOffset
  }
}
