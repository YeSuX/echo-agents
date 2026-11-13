/**
 * 嘉宾列表数据（MVP：9 位）
 * 化名 + 一句话介绍（态度/主题），不包含创伤细节
 */
export const GUESTS = [
  {
    id: "1",
    name: "小安",
    tagline: "更想谈谈如何与家人沟通这件事",
    avatar: "/avatars/guests/guest-01.svg",
  },
  {
    id: "2",
    name: "林深",
    tagline: "关注司法程序中的感受与选择",
    avatar: "/avatars/guests/guest-02.svg",
  },
  {
    id: "3",
    name: "沐风",
    tagline: "康复路上什么在支撑我",
    avatar: "/avatars/guests/guest-03.svg",
  },
  {
    id: "4",
    name: "晓月",
    tagline: "关于舆论与二次伤害的体会",
    avatar: "/avatars/guests/guest-04.svg",
  },
  {
    id: "5",
    name: "静水",
    tagline: "如何与伴侣建立信任与边界",
    avatar: "/avatars/guests/guest-05.svg",
  },
  {
    id: "6",
    name: "远星",
    tagline: "对「幸存者」这个称呼的看法",
    avatar: "/avatars/guests/guest-06.svg",
  },
  {
    id: "7",
    name: "青禾",
    tagline: "职场与日常中的自我照顾",
    avatar: "/avatars/guests/guest-07.svg",
  },
  {
    id: "8",
    name: "听雨",
    tagline: "写作与表达如何帮助了我",
    avatar: "/avatars/guests/guest-08.svg",
  },
  {
    id: "9",
    name: "向阳",
    tagline: "希望被听见、被理解的那一部分",
    avatar: "/avatars/guests/guest-09.svg",
  },
] as const

export type GuestId = (typeof GUESTS)[number]["id"]

export type GuestAuthorization = {
  topics: readonly string[]
  facts: readonly string[]
  boundaries: readonly string[]
}

const GENERAL_BOUNDARIES = ["不补写未授权的个人经历", "不将用户投稿作为嘉宾故事"] as const

// Topics describe discussion scope, never evidence of a personal experience.
export const GUEST_AUTHORIZATIONS: Record<GuestId, GuestAuthorization> = {
  "1": { topics: ["家人", "家庭", "沟通"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "2": { topics: ["司法", "程序", "法院", "律师"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "3": { topics: ["康复", "恢复", "支撑"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "4": { topics: ["舆论", "二次伤害"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "5": { topics: ["伴侣", "信任", "边界"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "6": { topics: ["幸存者", "称呼"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "7": { topics: ["职场", "日常", "自我照顾"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "8": { topics: ["写作", "表达"], facts: [], boundaries: GENERAL_BOUNDARIES },
  "9": { topics: ["听见", "理解"], facts: [], boundaries: GENERAL_BOUNDARIES },
}

export function getGuestProfile(guestId: string) {
  const guest = GUESTS.find(item => item.id === guestId)
  return guest ? { ...guest, authorization: GUEST_AUTHORIZATIONS[guest.id] } : undefined
}

export const GUEST_EXPERIENCE_NOTICE = "当前为 AI 主题对话体验，尚未接入嘉宾授权的完整故事。化名与主题不代表已核实的个人经历；匿名投稿不会自动成为嘉宾故事。"

export const GUEST_OPENING = "你好，这里是 AI 主题对话体验，目前还没有接入嘉宾授权的完整故事。我们可以围绕页面上的主题聊聊，但我不会补写个人经历。"
