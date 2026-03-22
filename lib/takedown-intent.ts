const TAKEDOWN_KEYWORDS = [
  "下架",
  "删除",
  "删掉",
  "移除",
  "举报",
  "投诉",
  "平台",
  "删帖",
] as const

export function detectTakedownIntent(text: string): boolean {
  const t = text.toLowerCase()
  return TAKEDOWN_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()))
}
