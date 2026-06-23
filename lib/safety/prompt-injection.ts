const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(the\s+)?(system|above)/i,
  /你现在是(?!「)/,
  /忽略(以上|先前|之前|上面)(的)?(指令|规则|提示|设定)/,
  /无视(系统|规则|指令|设定)/,
  /(?:^|\n)\s*system\s*:/i,
  /(?:^|\n)\s*assistant\s*:/i,
  /(?:^|\n)\s*<\/?system>/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /扮演(?!「)/,
  /切换(?:成|为|到).{0,8}(?:模式|角色|人格)/,
  /输出(?:你的)?(?:system|系统)\s*prompt/i,
  /repeat\s+(the\s+)?(system|hidden)\s+(prompt|instructions)/i,
]

export type PromptInjectionResult = {
  detected: boolean
  patterns: string[]
}

export function detectPromptInjection(text: string): PromptInjectionResult {
  const patterns: string[] = []
  for (const re of INJECTION_PATTERNS) {
    if (re.test(text)) patterns.push(re.source)
  }
  return { detected: patterns.length > 0, patterns }
}

function wrapUserContent(content: string): string {
  const sanitized = content
    .replace(/\u0000/g, "")
    .replace(/<\/?user_message>/gi, "")
    .trim()
  return `<user_message>\n${sanitized}\n</user_message>`
}

export type LlmMessage = { role: "user" | "assistant"; content: string }

/** 为 LLM 包装 user 消息，降低 prompt 注入影响 */
export function sanitizeMessagesForLlm(
  messages: readonly LlmMessage[],
): LlmMessage[] {
  return messages.map((m) =>
    m.role === "user"
      ? { role: m.role, content: wrapUserContent(m.content) }
      : m,
  )
}
