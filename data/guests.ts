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

export const GUEST_EXPERIENCE_NOTICE = "当前为 AI 主题对话体验，尚未接入嘉宾授权的完整故事。化名与主题不代表已核实的个人经历；匿名投稿不会自动成为嘉宾故事。"

export const GUEST_OPENING = "你好，这里是 AI 主题对话体验，目前还没有接入嘉宾授权的完整故事。我们可以围绕页面上的主题聊聊，但我不会补写个人经历。"
