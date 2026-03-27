export type SelfHelpCatalogEntry = {
  id: string
  title: string
  description: string
  href: string
  triggers: readonly string[]
}

export const SELF_HELP_CATALOG: readonly SelfHelpCatalogEntry[] = [
  {
    id: "takedown-letter",
    title: "下架函模板",
    description: "面向主流平台的申诉文书框架。",
    href: "/self-help/takedown-template.md",
    triggers: ["下架", "删除", "举报", "投诉", "平台", "申诉"],
  },
  {
    id: "rights-sop",
    title: "维权 SOP 总览",
    description: "从确认事实、收集证据到报警、起诉的完整流程概览。",
    href: "/self-help/rights-sop.md",
    triggers: ["维权", "报案", "律师", "怎么走", "流程", "步骤"],
  },
  {
    id: "legal-directory",
    title: "法律与心理支持资源",
    description:
      "千千律师事务所、橙律师、源众、彩虹暴力终结所、为平、红枫等机构联系方式。",
    href: "/self-help/legal-directory.md",
    triggers: ["法援", "法律援助", "律师", "免费", "热线", "心理", "咨询"],
  },
  {
    id: "evidence-guide",
    title: "证据留存指南",
    description: "微信记录截图、Telegram群组取证、音视频留存、公证等要点。",
    href: "/self-help/evidence-guide.md",
    triggers: ["证据", "截图", "录屏", "公证", "保存", "取证", "telegram"],
  },
  {
    id: "guide-voyeurism",
    title: "偷拍维权指南",
    description: "偷拍场景下的法律责任、取证方式、报警与起诉路径。",
    href: "/self-help/guide-voyeurism.md",
    triggers: ["偷拍", "侧录", "摄像头", "针孔", "厕所", "酒店", "裙底"],
  },
  {
    id: "guide-nonconsensual",
    title: "私密影像传播维权指南",
    description: "未经同意传播私密影像的行政处罚、刑事犯罪标准与维权路径。",
    href: "/self-help/guide-nonconsensual.md",
    triggers: [
      "传播",
      "散布",
      "外流",
      "私密",
      "影像",
      "视频",
      "前任",
      "前男友",
      "报复",
    ],
  },
  {
    id: "guide-deepfake",
    title: "AI深伪色情维权指南",
    description: "AI换脸色情的法律定性、取证技巧与维权步骤。",
    href: "/self-help/guide-deepfake.md",
    triggers: ["AI", "换脸", "深伪", "deepfake", "伪造", "合成"],
  },
  {
    id: "guide-sextortion",
    title: "性勒索应对指南",
    description: "面对性勒索威胁时的紧急应对、证据保全与报警指引。",
    href: "/self-help/guide-sextortion.md",
    triggers: ["勒索", "威胁", "付钱", "要钱", "裸聊", "要求"],
  },
] as const

export function getSelfHelpEntryById(
  id: string,
): SelfHelpCatalogEntry | undefined {
  return SELF_HELP_CATALOG.find((e) => e.id === id)
}
