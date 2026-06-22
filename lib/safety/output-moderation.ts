import {
  GUEST_BOUNDARY_FALLBACK,
  OUTPUT_MODERATION_FALLBACK,
} from "./constants"

export type ModerationSeverity = "ok" | "warn" | "block"

export type ModerationResult = {
  content: string
  severity: ModerationSeverity
  reasons: string[]
}

type Rule = { id: string; re: RegExp; severity: ModerationSeverity }

const OUTPUT_RULES: readonly Rule[] = [
  {
    id: "victim_blame",
    re: /你本可以|本可以(?:避免|拒绝|不)|为什么不(?:拒绝|报警|说)|是你自己|自作自受|当初(?:就不该|为什么要)|你也有责任|反应过度/,
    severity: "block",
  },
  {
    id: "win_guarantee",
    re: /(?:一定|肯定|100%|百分百|必然)(?:能|会)(?:赢|胜诉|下架|删掉)|保证(?:胜诉|赢|结果)|胜诉率(?:为|达)?\s*\d+/,
    severity: "block",
  },
  {
    id: "perpetrator_pov",
    re: /从(?:加害者|施害者|对方|他的)角度|加害者(?:认为|觉得|想法)|施害者视角/,
    severity: "block",
  },
  {
    id: "illegal_actionable",
    re: /(?:教你|步骤如下|具体操作)[\s\S]{0,20}(?:入侵|破解|人肉|开盒工具|伪造证据|报复)/,
    severity: "block",
  },
  {
    id: "graphic_violence",
    re: /(?:详细描述|具体过程)[\s\S]{0,12}(?:性侵|强奸|插入|体液)/,
    severity: "block",
  },
]

export function moderateAssistantOutput(
  text: string,
  mode: "companion" | "guest",
): ModerationResult {
  const reasons: string[] = []
  let maxSeverity: ModerationSeverity = "ok"

  for (const rule of OUTPUT_RULES) {
    if (rule.re.test(text)) {
      reasons.push(rule.id)
      if (rule.severity === "block") maxSeverity = "block"
      else if (rule.severity === "warn" && maxSeverity === "ok") {
        maxSeverity = "warn"
      }
    }
  }

  if (maxSeverity === "block") {
    return {
      content:
        mode === "guest" ? GUEST_BOUNDARY_FALLBACK : OUTPUT_MODERATION_FALLBACK,
      severity: "block",
      reasons,
    }
  }

  return { content: text, severity: maxSeverity, reasons }
}
