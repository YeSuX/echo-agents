import {
  SELF_HELP_CATALOG,
  type SelfHelpCatalogEntry,
} from "@/data/self-help-catalog"

export type SelfHelpPanelItem = {
  id: string
  title: string
  description: string
  href: string
}

export function deriveSelfHelpFromConversation(
  fullText: string,
): SelfHelpPanelItem[] {
  const lower = fullText.toLowerCase()
  const seen = new Set<string>()
  const out: SelfHelpPanelItem[] = []
  for (const item of SELF_HELP_CATALOG) {
    const hit = item.triggers.some((kw) =>
      lower.includes(kw.toLowerCase()),
    )
    if (hit && !seen.has(item.id)) {
      seen.add(item.id)
      out.push({
        id: item.id,
        title: item.title,
        description: item.description,
        href: item.href,
      })
    }
  }
  return out
}

export function catalogEntryToPanelItem(
  e: SelfHelpCatalogEntry,
): SelfHelpPanelItem {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    href: e.href,
  }
}

export function mergeSelfHelpDeduped(
  a: readonly SelfHelpPanelItem[],
  b: readonly SelfHelpPanelItem[],
): SelfHelpPanelItem[] {
  const seen = new Set<string>()
  const out: SelfHelpPanelItem[] = []
  for (const x of [...a, ...b]) {
    if (seen.has(x.id)) continue
    seen.add(x.id)
    out.push(x)
  }
  return out
}
