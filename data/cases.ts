export type AnonymousCase = {
  id: string
  title: string
  summary: string
  keywords: string[]
  tags: string[]
  platformHints: string[]
  storyBlurb: string
  outcomeNote: string
}

export const ANONYMOUS_CASES: readonly AnonymousCase[] = [
  {
    id: "c1",
    title: "社交平台上的二次传播",
    summary:
      "有人在多个社交平台转发相关影像链接后，当事人通过平台举报与律师函下架了大部分链接，并申请了账号保护。",
    keywords: ["微博", "转发", "平台", "举报", "下架", "链接"],
    tags: ["平台投诉"],
    platformHints: ["微博", "小红书"],
    storyBlurb:
      "一位朋友在发现链接被转发后，先做了屏幕取证，再按平台规则分批投诉，逐步减少了可见范围。",
    outcomeNote: "可见内容明显减少，情绪压力有所缓解。",
  },
  {
    id: "c2",
    title: "熟人索要与威胁",
    summary:
      "当事人保存聊天记录与通话记录，在家人陪同下向公安机关说明情况，并同步咨询法援律师关于证据固定与保护令路径。",
    keywords: ["威胁", "报案", "聊天记录", "公安", "律师", "法援"],
    tags: ["报案与法援"],
    platformHints: [],
    storyBlurb:
      "有人选择先固定聊天与通话证据，再与可信任的人一起前往公安机关咨询下一步。",
    outcomeNote: "获得了正式接案指引与后续法律支持渠道。",
  },
] as const
