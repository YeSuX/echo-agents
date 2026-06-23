import { moderateAssistantOutput } from "./safety/output-moderation"

export type GoldenEvalResult = {
  pass: boolean
  failures: string[]
  moderationBlocked: boolean
}

function testPatterns(
  text: string,
  patterns: readonly string[],
  mode: "any" | "none",
): string[] {
  const failures: string[] = []
  if (mode === "any" && patterns.length > 0) {
    const hit = patterns.some((p) => new RegExp(p, "i").test(text))
    if (!hit) {
      failures.push(`mustMatchAny: none matched (${patterns.join(" | ")})`)
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
): GoldenEvalResult {
  const failures: string[] = []

  const moderation = moderateAssistantOutput(response, "companion")
  if (moderation.severity === "block") {
    failures.push(`output moderation blocked: ${moderation.reasons.join(", ")}`)
  }

  failures.push(...testPatterns(response, mustMatchAny, "any"))
  failures.push(...testPatterns(response, mustNotMatch, "none"))

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
