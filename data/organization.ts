// Source: the organization introduction supplied for the public-test feedback.
export const ORGANIZATION = {
  name: "如荧RAYIN",
  supportEmail: "rayinsupport@proton.me",
  introduction: "如荧是一家专注于影像性暴力公共倡导和受害者支持的非营利团体。我们持续关注中国影像性暴力事件与全球治理进展，特别是生成式 AI 深伪性剥削现象。",
  advocacy: "我们通过独立调查、学术研究与立法倡议，推动互联网平台承担责任，让更多受害者的处境被看见。",
  companion: "我们开发了 AI 同伴支持者「小荧」，提供同伴对话、基础法律信息、情绪支持与公益资源指引。希望减轻羞耻和孤立无援的感受，陪伴你迈出向外求助的第一步。",
  takedown: "我们提供人工下架支援，协助当事人向涉事网络平台提交举报，请求移除未经同意传播的私密影像，减少自行举报可能带来的二次伤害。具体可提供的支持将由团队与你沟通确认。",
} as const

export type SocialChannel = {
  name: string
  href: string
  logoSrc: string
}

export type Partner = {
  name: string
  logoSrc: string
  href?: string
}

// Add only confirmed official account URLs and approved logo assets.
export const SOCIAL_CHANNELS: readonly SocialChannel[] = []
// Prospective organizations in the source document are not confirmed partners.
export const PARTNERS: readonly Partner[] = []

export const HOME_FAQS = [
  {
    question: "小荧是真人吗？",
    answer: "小荧是 AI 同伴支持者，可以与你对话、整理信息和查找支持资源。它不能替代律师、医生或紧急服务；需要真人协助时，可以查看个案援助。",
  },
  {
    question: "需要登录才能使用吗？",
    answer: "不需要。未登录也可以与小荧对话，对话不会保存到云端。登录后默认开启加密云端同步，你可以在聊天页关闭，也可以在对话记录页删除历史。",
  },
  {
    question: "留下的故事会直接公开吗？",
    answer: "不会。分享完全自愿，你可以先修改并查看脱敏预览，再单独确认授权。提交的内容进入待审核队列，不会自动公开，也不会自动成为嘉宾的经历。",
  },
  {
    question: "嘉宾页面现在能看到真实故事吗？",
    answer: "目前是围绕不同主题的 AI 对话体验，尚未接入嘉宾授权的完整故事。页面中的化名和主题不代表已核实的个人经历；真实故事需要另行授权和整理。",
  },
] as const
