const CRISIS_KEYWORDS: readonly string[] = [
  "不想活",
  "不想活了",
  "活不下去",
  "结束生命",
  "结束一切",
  "自杀",
  "自尽",
  "轻生",
  "自伤",
  "自残",
  "割腕",
  "跳楼",
  "跳河",
  "跳桥",
  "上吊",
  "吞药",
  "了结",
  "一了百了",
  "想死",
  "去死",
  "死了算了",
  "活着没意思",
  "没有活下去",
  "撑不下去",
  "撑不住",
  "kill myself",
  "suicide",
  "end my life",
  "want to die",
]

export function isCrisisMessage(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, "")
  if (t.length === 0) return false
  return CRISIS_KEYWORDS.some((kw) => t.includes(kw.toLowerCase().replace(/\s+/g, "")))
}

/** 扫描会话中全部 user 消息是否含危机信号 */
export function conversationHasCrisis(
  messages: readonly { role: string; content: string }[],
): boolean {
  for (const m of messages) {
    if (m.role === "user" && isCrisisMessage(m.content)) return true
  }
  return false
}
