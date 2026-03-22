import { getSelfHelpEntryById } from "@/data/self-help-catalog"
import { catalogEntryToPanelItem, type SelfHelpPanelItem } from "@/lib/derive-self-help"
import type { SelfHelpSseItem } from "@/lib/sse-chat"

export function sseItemsToPanelItems(items: SelfHelpSseItem[]): SelfHelpPanelItem[] {
  return items.map((i) => {
    const fromCat = getSelfHelpEntryById(i.id)
    if (fromCat) return catalogEntryToPanelItem(fromCat)
    return {
      id: i.id,
      title: i.title,
      description: "推荐资源",
      href: i.url,
    }
  })
}
