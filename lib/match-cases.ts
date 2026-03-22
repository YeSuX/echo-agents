import { ANONYMOUS_CASES, type AnonymousCase } from "@/data/cases"

export function matchCases(userText: string, k: number): string {
  const t = userText.toLowerCase()
  const scored: { c: AnonymousCase; score: number }[] = []
  for (const c of ANONYMOUS_CASES) {
    let score = 0
    for (const kw of c.keywords) {
      if (t.includes(kw.toLowerCase())) score += 1
    }
    if (score > 0) scored.push({ c, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, k)
  return top.map((x) => `- ${x.c.title}：${x.c.summary}`).join("\n")
}
