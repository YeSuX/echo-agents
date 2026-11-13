/** Recognize local negation or an explicitly rejected quotation, never a blanket allowlist. */
export function isDisavowedClaim(text: string, start: number, length: number): boolean {
  const prefix = text.slice(0, start).split(/[，,。！？!?；;\n]/).at(-1) ?? ""
  const negated = /(?:不|不会|并非|不是|没有|无法|不认为|不觉得|不代表|不意味着|不等于|不应被说成|(?:不该|不应该|不应|不要|不能|避免)(?:说|认为|觉得))(?:你|你在|所谓|[“「‘"'\s]){0,5}$/u
  if (negated.test(prefix)) return true
  if (/不能\s*$/u.test(prefix) && /^(?:保证|教你|从)/u.test(text.slice(start, start + length))) return true

  for (const quote of text.matchAll(/[“「‘"']([^”」’"'\n]+)[”」’"']/gu)) {
    const quoteStart = quote.index
    const quoteEnd = quoteStart + quote[0].length
    if (start < quoteStart || start + length > quoteEnd) continue
    const before = text.slice(0, quoteStart).split(/[，,。！？!?；;\n]/).at(-1) ?? ""
    if (negated.test(before)) return true
    const after = text.slice(quoteEnd, quoteEnd + 100)
      .split(/[。！？!?\n]/).slice(0, 2).join("。")
    if (/说得对|有道理|确实如此|就是事实|应该接受/.test(after)) return false
    if (/(?:这种|这样|这类)(?:说法|话|指责|表达).{0,10}(?:不对|错误|不成立|责怪|伤害)|这不是你的错|不该这样说|不要相信|我不认同|不代表事实/.test(after)) {
      return true
    }
  }
  return false
}
