import { isCrisisMessage } from "@/lib/safety/crisis"

export type UserIntent =
  | "takedown"
  | "evidence"
  | "report-police"
  | "legal-aid"
  | "legal-paths"
  | "limitation"
  | "nonconsensual"
  | "deepfake"
  | "voyeurism"
  | "sextortion"
  | "doxxing"
  | "rumor"
  | "remote-abuse"
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
    intent: "legal-paths",
    keywords: [
      "法律路径",
      "构成什么",
      "可能构成",
      "哪些法律",
      "什么罪",
      "法律责任",
    ],
  },
  {
    intent: "limitation",
    keywords: [
      "几个月",
      "五个月",
      "过了",
      "时效",
      "还能走",
      "法律途径",
      "追诉",
      "年前",
      "一年前",
      "1年前",
      "六个月",
      "6个月",
      "来得及",
      "过期",
    ],
  },
  {
    intent: "nonconsensual",
    keywords: ["传播", "散布", "外流", "私密影像", "私密视频"],
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
    intent: "doxxing",
    keywords: ["开盒", "人肉搜索", "身份证号", "家庭住址"],
  },
  {
    intent: "rumor",
    keywords: ["造黄谣", "黄谣", "造谣"],
  },
  {
    intent: "remote-abuse",
    keywords: ["隔空猥亵", "未成年人", "不满14", "猥亵儿童"],
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
  if (isCrisisMessage(text)) matched.push("crisis")
  return [...new Set(matched)]
}

const INTENT_TO_SELF_HELP: Partial<Record<UserIntent, string[]>> = {
  takedown: ["takedown-letter"],
  evidence: ["evidence-guide"],
  "report-police": ["rights-sop"],
  "legal-aid": ["legal-directory", "rights-sop"],
  "legal-paths": ["rights-sop"],
  limitation: ["rights-sop"],
  nonconsensual: ["guide-nonconsensual", "rights-sop"],
  deepfake: ["guide-deepfake", "evidence-guide"],
  voyeurism: ["guide-voyeurism", "evidence-guide"],
  sextortion: ["guide-sextortion", "rights-sop"],
  doxxing: ["rights-sop"],
  rumor: ["rights-sop"],
  "remote-abuse": ["rights-sop"],
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
