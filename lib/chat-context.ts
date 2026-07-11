export type ChatContextRole = "user" | "assistant"

export type ChatContextMessage = {
  role: ChatContextRole
  content: string
}

export const MAX_CHAT_INPUT_CHARS = 2_000
export const MAX_CHAT_REQUEST_BYTES = 256_000
export const MAX_CHAT_REQUEST_MESSAGES = 80
export const MAX_CHAT_MESSAGE_CHARS = 6_000
export const MAX_LLM_CONTEXT_MESSAGES = 24
export const MAX_LLM_CONTEXT_CHARS = 18_000

const TRUNCATION_MARK = "\n[中间内容过长，已省略]\n"

function truncateMessageContent(content: string): {
  content: string
  truncated: boolean
} {
  const clean = content.replace(/\u0000/g, "").trim()
  if (clean.length <= MAX_CHAT_MESSAGE_CHARS) {
    return { content: clean, truncated: false }
  }

  const tailLength = Math.floor(MAX_CHAT_MESSAGE_CHARS * 0.3)
  const headLength = MAX_CHAT_MESSAGE_CHARS - tailLength - TRUNCATION_MARK.length
  return {
    content: `${clean.slice(0, headLength)}${TRUNCATION_MARK}${clean.slice(-tailLength)}`,
    truncated: true,
  }
}

export type BuiltChatContext = {
  messages: ChatContextMessage[]
  omittedMessages: number
  truncatedMessages: number
}

/**
 * 保留首个用户背景和最近对话，并将发送给模型的上下文控制在稳定边界内。
 * 不生成推测性摘要，避免在敏感对话中把模型猜测固化成“用户事实”。
 */
export function buildChatContext(
  input: readonly ChatContextMessage[],
): BuiltChatContext {
  let truncatedMessages = 0
  const cleaned = input
    .map((message) => {
      const result = truncateMessageContent(message.content)
      if (result.truncated) truncatedMessages += 1
      return { role: message.role, content: result.content }
    })
    .filter((message) => message.content.length > 0)

  const normalized = cleaned
  const selectedIndexes: number[] = []
  let usedChars = 0

  for (let i = normalized.length - 1; i >= 0; i -= 1) {
    const message = normalized[i]
    if (selectedIndexes.length >= MAX_LLM_CONTEXT_MESSAGES) break
    if (usedChars + message.content.length > MAX_LLM_CONTEXT_CHARS) {
      if (selectedIndexes.length > 0) break
    }
    selectedIndexes.push(i)
    usedChars += message.content.length
  }

  const firstUserIndex = normalized.findIndex((message) => message.role === "user")
  if (firstUserIndex >= 0 && !selectedIndexes.includes(firstUserIndex)) {
    const anchor = normalized[firstUserIndex]
    while (
      selectedIndexes.length > 1 &&
      (selectedIndexes.length >= MAX_LLM_CONTEXT_MESSAGES ||
        usedChars + anchor.content.length > MAX_LLM_CONTEXT_CHARS)
    ) {
      const removedIndex = selectedIndexes.pop()
      if (removedIndex !== undefined) {
        usedChars -= normalized[removedIndex].content.length
      }
    }
    if (
      selectedIndexes.length < MAX_LLM_CONTEXT_MESSAGES &&
      usedChars + anchor.content.length <= MAX_LLM_CONTEXT_CHARS
    ) {
      selectedIndexes.push(firstUserIndex)
    }
  }

  const uniqueIndexes = [...new Set(selectedIndexes)].sort((a, b) => a - b)
  return {
    messages: uniqueIndexes.map((index) => normalized[index]),
    omittedMessages: Math.max(0, normalized.length - uniqueIndexes.length),
    truncatedMessages,
  }
}

/** 最近几轮用户原话用于意图识别和案例匹配，避免短追问丢失前文。 */
export function recentUserContext(
  messages: readonly ChatContextMessage[],
  maxUserTurns = 4,
  maxChars = 6_000,
): string {
  const selected: string[] = []
  let usedChars = 0
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role !== "user") continue
    const content = message.content.trim()
    if (!content) continue
    const remaining = maxChars - usedChars
    if (remaining <= 0 || selected.length >= maxUserTurns) break
    selected.push(content.slice(-remaining))
    usedChars += Math.min(content.length, remaining)
  }
  return selected.reverse().join("\n")
}

export function toChatApiMessages(
  messages: readonly {
    role: "agent" | "user"
    content: string
    isFallback?: boolean
  }[],
): ChatContextMessage[] {
  const normalized = messages
    .filter((message) => !message.isFallback)
    .map((message) => ({
      role: message.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: message.content,
    }))
  return buildChatContext(normalized).messages
}
