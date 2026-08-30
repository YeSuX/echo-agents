import { moderateAssistantOutput } from "./safety/output-moderation"

export type GoldenEvalResult = {
  pass: boolean
  failures: string[]
  moderationBlocked: boolean
}

export type GoldenEvalOptions = {
  /** 每一条都须命中（逻辑 AND） */
  mustMatchAll?: readonly string[]
  /** 回复中出现的条款号须落在此清单；空则只拦修订前治安条号 */
  articleAllowlist?: readonly string[]
}

const DEPRECATED_ARTICLE_RE =
  /第四十二条|第二十六条|第六十八条|第\s*42\s*条|第\s*26\s*条|第\s*68\s*条/

const CN_DIGIT: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

export function parseChineseNumeral(raw: string): number | null {
  const s = raw.trim()
  if (/^\d+$/.test(s)) return Number(s)
  let n = 0
  let acc = 0
  for (const ch of s) {
    if (ch === "千") {
      n += (acc || 1) * 1000
      acc = 0
    } else if (ch === "百") {
      n += (acc || 1) * 100
      acc = 0
    } else if (ch === "十") {
      n += (acc || 1) * 10
      acc = 0
    } else if (CN_DIGIT[ch] !== undefined) {
      acc = CN_DIGIT[ch]
    } else {
      return null
    }
  }
  return n + acc
}

function normalizeLawName(name: string): string {
  return name
    .replace(/^中华人民共和国/, "")
    .replace(/（2025修订）|（2025 修订）/g, "")
    .trim()
}

type ArticleCite = { law: string; num: number }

export function extractArticleCites(text: string): ArticleCite[] {
  const out: ArticleCite[] = []
  const named =
    /《([^》]{2,24})》\s*第([零〇一二两三四五六七八九十百千0-9]+)条/g
  let m: RegExpExecArray | null
  while ((m = named.exec(text)) !== null) {
    const num = parseChineseNumeral(m[2])
    if (num === null) continue
    out.push({ law: normalizeLawName(m[1]), num })
  }
  return out
}

function allowlistHas(
  allowlist: readonly string[],
  cite: ArticleCite,
): boolean {
  for (const entry of allowlist) {
    const [law, numStr] = entry.split(":")
    const num = Number(numStr)
    if (!Number.isFinite(num)) continue
    if (cite.law) {
      if (cite.law.includes(law) || law.includes(cite.law)) {
        if (cite.num === num) return true
      }
    } else if (cite.num === num) {
      return true
    }
  }
  return false
}

function testPatterns(
  text: string,
  patterns: readonly string[],
  mode: "any" | "all" | "none",
): string[] {
  const failures: string[] = []
  if (mode === "any" && patterns.length > 0) {
    const hit = patterns.some((p) => new RegExp(p, "i").test(text))
    if (!hit) {
      failures.push(`mustMatchAny: none matched (${patterns.join(" | ")})`)
    }
  }
  if (mode === "all") {
    for (const p of patterns) {
      if (!new RegExp(p, "i").test(text)) {
        failures.push(`mustMatchAll: missing /${p}/`)
      }
    }
  }
  if (mode === "none") {
    for (const p of patterns) {
      if (new RegExp(p, "i").test(text)) {
        failures.push(`mustNotMatch: matched /${p}/`)
      }
    }
  }
  return failures
}

export function evaluateLegalGoldenResponse(
  response: string,
  mustMatchAny: readonly string[],
  mustNotMatch: readonly string[],
  options: GoldenEvalOptions = {},
): GoldenEvalResult {
  const failures: string[] = []

  const moderation = moderateAssistantOutput(response, "companion")
  if (moderation.severity === "block") {
    failures.push(`output moderation blocked: ${moderation.reasons.join(", ")}`)
  }

  failures.push(...testPatterns(response, mustMatchAny, "any"))
  if (options.mustMatchAll && options.mustMatchAll.length > 0) {
    failures.push(...testPatterns(response, options.mustMatchAll, "all"))
  }
  failures.push(...testPatterns(response, mustNotMatch, "none"))

  if (DEPRECATED_ARTICLE_RE.test(response)) {
    failures.push("deprecated public-security article (42/26/68)")
  }

  const allow = options.articleAllowlist ?? []
  if (allow.length > 0) {
    for (const cite of extractArticleCites(response)) {
      if (!allowlistHas(allow, cite)) {
        failures.push(
          `article not in SOP allowlist: ${cite.law || "?"} ${cite.num}`,
        )
      }
    }
  }

  return {
    pass: failures.length === 0,
    failures,
    moderationBlocked: moderation.severity === "block",
  }
}

/** 导出供人工抽检的 Markdown 表格行 */
export function formatGoldenCaseForReviewSheet(caseId: string, title: string): string {
  return `| ${caseId} | ${title} | ☐ | ☐ | ☐ |`
}
