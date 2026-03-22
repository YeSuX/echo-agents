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
    description: "面向主流平台的申诉文书框架（占位稿，使用前请法务审核）。",
    href: "/self-help/takedown-template.md",
    triggers: ["下架", "删除", "举报", "投诉", "平台"],
  },
  {
    id: "rights-sop",
    title: "维权 SOP",
    description: "从存证到投诉的常见步骤概览。",
    href: "/self-help/rights-sop.md",
    triggers: ["维权", "报案", "律师", "怎么走", "流程"],
  },
  {
    id: "legal-directory",
    title: "法律资源表",
    description: "法律援助与咨询入口索引（占位）。",
    href: "/self-help/legal-directory.md",
    triggers: ["法援", "法律援助", "律师", "免费"],
  },
  {
    id: "evidence-guide",
    title: "证据留存指南",
    description: "合法截屏、录屏与时间戳要点（占位）。",
    href: "/self-help/evidence-guide.md",
    triggers: ["证据", "截图", "录屏", "公证", "保存"],
  },
] as const

export function getSelfHelpEntryById(
  id: string,
): SelfHelpCatalogEntry | undefined {
  return SELF_HELP_CATALOG.find((e) => e.id === id)
}
