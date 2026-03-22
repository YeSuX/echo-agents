import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"

export type SelfHelpSseItem = {
  id: string
  title: string
  url: string
}

export type SseParseResult =
  | { kind: "content"; content: string }
  | { kind: "self_help"; items: SelfHelpSseItem[] }
  | { kind: "done" }
  | { kind: "ignored" }

function parseSelfHelpItems(items: Json): SelfHelpSseItem[] | null {
  if (!Array.isArray(items)) return null
  const out: SelfHelpSseItem[] = []
  for (const el of items) {
    if (!isJsonRecord(el)) return null
    const id = el.id
    const title = el.title
    const url = el.url
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof url !== "string"
    ) {
      return null
    }
    out.push({ id, title, url })
  }
  return out
}

export function parseSseDataLine(line: string): SseParseResult {
  const trimmed = line.trim()
  if (trimmed === "data: [DONE]") return { kind: "done" }
  if (!trimmed.startsWith("data: ")) return { kind: "ignored" }
  const root = parseJson(trimmed.slice(6))
  if (!isJsonRecord(root)) return { kind: "ignored" }
  const t = root.type
  if (t === "self_help") {
    const items = parseSelfHelpItems(root.items)
    if (items) return { kind: "self_help", items }
    return { kind: "ignored" }
  }
  const c = root.content
  if (typeof c === "string") return { kind: "content", content: c }
  return { kind: "ignored" }
}
