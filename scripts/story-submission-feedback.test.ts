import { describe, expect, test } from "bun:test"
import { storySubmissionError } from "../lib/story-submission-feedback"
import { getGuestSystemPrompt } from "../lib/guest-agent"
import { COMPANION_GREETING, COMPANION_OPENING } from "../lib/companion-agent"

describe("public feedback boundaries", () => {
  test("handles valid, malformed and absent rate-limit delays in Chinese", () => {
    expect(storySubmissionError(429, "61")).toContain("2 分钟")
    for (const value of [null, "", "invalid", "-1", "Infinity"]) {
      expect(storySubmissionError(429, value)).toBe("提交较频繁，请稍后重试。草稿已保留。")
    }
  })

  test("keeps validation, conflict, size and service failures actionable", () => {
    expect(storySubmissionError(400, null)).toContain("重新确认授权")
    expect(storySubmissionError(409, null)).toContain("修改草稿")
    expect(storySubmissionError(413, null)).toContain("缩短")
    for (const status of [401, 500, 503]) {
      expect(storySubmissionError(status, null)).toBe("暂时无法提交，请稍后重试。草稿已保留。")
    }
  })

  test("introduces the companion consistently and distinguishes guest simulation from facts", () => {
    expect(COMPANION_OPENING.startsWith(COMPANION_GREETING)).toBe(true)
    expect(COMPANION_GREETING).toBe("你好，我是你的同伴支持者小荧。")
    const prompt = getGuestSystemPrompt("1")
    expect(prompt).toContain("AI 主题对话体验")
    expect(prompt).toContain("尚未接入这位嘉宾授权的完整故事")
    expect(prompt).toContain("主题只代表愿意讨论的方向，不证明发生过任何具体事件")
    expect(prompt).toContain("不即兴编造")
  })
})
