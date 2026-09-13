import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"

export type SelfHelpSseItem = {
  id: string
  title: string
  url: string
}

export type SseParseResult =
  | { kind: "content"; content: string }
  | { kind: "content_replace"; content: string }
  | { kind: "reasoning"; content: string }
  | { kind: "reasoning_replace"; content: string }
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
  if (t === "reasoning" || t === "reasoning_replace") {
    return typeof root.content === "string"
      ? { kind: t, content: root.content }
      : { kind: "ignored" }
  }
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

export type ChatStreamContent = { content: string; reasoning: string }

export async function consumeChatStream(
  response: Response,
  callbacks: {
    onUpdate: (state: ChatStreamContent) => void
    onSelfHelp: (items: SelfHelpSseItem[]) => void
    onPersistenceError: (code: string) => void
  },
): Promise<ChatStreamContent> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")
  const decoder = new TextDecoder()
  let buffer = ""
  let state: ChatStreamContent = { content: "", reasoning: "" }

  function consume(block: string): boolean {
    const event = parseSseDataLine(block)
    if (event.kind === "done") return true
    if (event.kind === "self_help") callbacks.onSelfHelp(event.items)
    else if (event.kind === "persistence_error") callbacks.onPersistenceError(event.code)
    else if (event.kind === "reasoning" || event.kind === "reasoning_replace") {
      state = {
        ...state,
        reasoning: event.kind === "reasoning" ? state.reasoning + event.content : event.content,
      }
      callbacks.onUpdate(state)
    } else if (event.kind === "content" || event.kind === "content_replace") {
      state = { ...state, content: applySseParseResult(event, state.content) }
      callbacks.onUpdate(state)
    }
    return false
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() ?? ""
      for (const block of blocks) {
        if (consume(block)) return state
      }
      if (done) {
        if (buffer.trim() && consume(buffer)) return state
        throw new Error("The reply was interrupted. Please retry.")
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
