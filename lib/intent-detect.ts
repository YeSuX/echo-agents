export type UserIntent =
  | "takedown"
  | "evidence"
  | "report-police"
  | "legal-aid"
  | "deepfake"
  | "voyeurism"
  | "sextortion"
  | "crisis"

const INTENT_RULES: { intent: UserIntent; keywords: string[] }[] = [
  {
    intent: "takedown",
    keywords: ["下架", "删除", "删掉", "移除", "举报", "投诉", "删帖", "申诉"],
  },
  {
    intent: "evidence",
    keywords: ["证据", "截图", "录屏", "公证", "保存", "取证", "录像"],
  },
  {
    intent: "report-police",
    keywords: ["报案", "报警", "公安", "派出所", "立案", "受案"],
  },
  {
    intent: "legal-aid",
    keywords: ["律师", "法援", "法律援助", "起诉", "诉讼", "法院"],
  },
  {
    intent: "deepfake",
    keywords: ["AI换脸", "深伪", "deepfake", "换脸", "合成", "AI生成"],
  },
  {
    intent: "voyeurism",
    keywords: ["偷拍", "侧录", "摄像头", "针孔", "偷窥"],
  },
  {
    intent: "sextortion",
    keywords: ["勒索", "威胁", "付钱", "裸聊", "恐吓", "不删就"],
  },
  {
    intent: "crisis",
    keywords: ["不想活", "自杀", "轻生", "自伤", "活不下去", "结束生命"],
  },
]

export function detectIntent(text: string): UserIntent[] {
  const t = text.toLowerCase()
  const matched: UserIntent[] = []
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((kw) => t.includes(kw.toLowerCase()))) {
      matched.push(rule.intent)
    }
  }
  return matched
}

const INTENT_TO_SELF_HELP: Partial<Record<UserIntent, string[]>> = {
  takedown: ["takedown-letter"],
  evidence: ["evidence-guide"],
  "report-police": ["rights-sop"],
  "legal-aid": ["legal-directory"],
  deepfake: ["guide-deepfake", "evidence-guide"],
  voyeurism: ["guide-voyeurism", "evidence-guide"],
  sextortion: ["guide-sextortion", "rights-sop"],
}

export function selfHelpIdsForIntents(intents: UserIntent[]): string[] {
  const ids = new Set<string>()
  for (const intent of intents) {
    const mapped = INTENT_TO_SELF_HELP[intent]
    if (mapped) {
      for (const id of mapped) ids.add(id)
    }
  }
  return [...ids]
}
