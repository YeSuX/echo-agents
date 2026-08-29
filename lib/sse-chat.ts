import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"

export type SelfHelpSseItem = {
  id: string
  title: string
  url: string
}

export type SseParseResult =
  | { kind: "content"; content: string }
  | { kind: "content_replace"; content: string }
  | { kind: "self_help"; items: SelfHelpSseItem[] }
  | { kind: "persistence_error"; code: string }
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
  if (t === "content_replace") {
    const replaceContent = root.content
    if (typeof replaceContent === "string") {
      return { kind: "content_replace", content: replaceContent }
    }
    return { kind: "ignored" }
  }
  if (t === "persistence_error" && typeof root.code === "string") {
    return { kind: "persistence_error", code: root.code }
  }
  const c = root.content
  if (typeof c === "string") return { kind: "content", content: c }
  return { kind: "ignored" }
}

/** 消费 SSE 行，返回最终正文（含 content_replace 覆盖） */
export function applySseParseResult(
  parsed: SseParseResult,
  fullContent: string,
): string {
  if (parsed.kind === "content") return fullContent + parsed.content
  if (parsed.kind === "content_replace") return parsed.content
  return fullContent
}
