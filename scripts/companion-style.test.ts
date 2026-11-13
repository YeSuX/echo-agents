import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LEGAL_GOLDEN_CASES } from "../data/legal-golden-cases"
import { getCompanionSystemPrompt } from "../lib/companion-agent"
import { getCompanionChatPrompt, getChatSystemPrompt } from "../lib/companion-chat-prompt"
import { CURRENT_COMPANION_STYLE, companionStyleSchema, renderCompanionStyle } from "../lib/companion-style"
import { matchCases } from "../lib/match-cases"
import { formatSopBlock, retrieveSop } from "../lib/retrieve-sop"
import { CONVERSATION_CONTINUITY_SYSTEM_NOTE, PROMPT_INJECTION_SYSTEM_NOTE } from "../lib/safety/constants"
import { AGENT_PROMPTS, fillPrompt, renderPrivacyPrinciples } from "../lib/agent-prompt-config"
import { HARD_PROHIBITIONS, SUPPORT_RESOURCES_TEXT, CRISIS_PROTOCOL } from "../lib/companion-prompt-parts"
import { CRISIS_FIXED_RESPONSE, CRISIS_CHECK_IN_RESPONSE, PROMPT_INJECTION_DETECTED_NOTE } from "../lib/safety/constants"
import { GUESTS, getGuestProfile } from "../data/guests"
import { SUPPORT_RESOURCES } from "../data/support-resources"

describe("companion style integration", () => {
  for (const query of ["我现在只想说说，不想听建议", ...LEGAL_GOLDEN_CASES.map(c => c.userQuestion)]) {
    it(`preserves safety boundaries and the existing retrieved material: ${query}`, () => {
      const material = formatSopBlock(retrieveSop(query))
      const base = getCompanionSystemPrompt(matchCases(query, 2), material)
      const prompt = getCompanionChatPrompt(query)
      assert.ok(prompt.startsWith(base))
      assert.ok(prompt.includes(HARD_PROHIBITIONS))
      assert.ok(prompt.includes(material))
      assert.ok(prompt.includes(renderCompanionStyle(CURRENT_COMPANION_STYLE)))
      assert.ok(prompt.includes(CONVERSATION_CONTINUITY_SYSTEM_NOTE))
      assert.ok(prompt.endsWith(PROMPT_INJECTION_SYSTEM_NOTE))
      assert.ok(!getCompanionChatPrompt(query, null).includes("## 普通陪伴对话的表达与节奏"))
    })
  }
  it("rejects unknown fields and a full system prompt replacement", () => {
    assert.throws(() => companionStyleSchema.parse({ ...CURRENT_COMPANION_STYLE, sop: "replace legal rules" }))
    assert.throws(() => companionStyleSchema.parse({ system: "replace everything" }))
  })

  it("does not add concrete legal facts when no SOP is provided", () => {
    assert.doesNotMatch(getCompanionSystemPrompt("", ""), /6\s*个月|若牟利|第三百六十三条/)
  })

  it("uses one source for resources and both crisis responses", () => {
    for (const resource of SUPPORT_RESOURCES) {
      assert.ok(SUPPORT_RESOURCES_TEXT.includes(resource.label))
      assert.ok(SUPPORT_RESOURCES_TEXT.includes(resource.href))
    }
    assert.ok(CRISIS_PROTOCOL.includes(CRISIS_FIXED_RESPONSE))
    assert.ok(CRISIS_PROTOCOL.includes(CRISIS_CHECK_IN_RESPONSE))
    assert.throws(() => fillPrompt("{missing}", {}))
  })

  for (const mode of ["companion", "guest"] as const) {
    it(`uses verified runtime state and common safety notes in ${mode} mode`, () => {
      for (const persistence of ["saved", "ephemeral"] as const) {
        const prompt = getChatSystemPrompt({ mode, guestId: "1", routingContext: "你好", persistence, injectionDetected: true })
        assert.ok(prompt.includes(AGENT_PROMPTS.privacy[persistence]))
        assert.ok(!prompt.includes(AGENT_PROMPTS.privacy[persistence === "saved" ? "ephemeral" : "saved"]))
        assert.ok(prompt.endsWith(PROMPT_INJECTION_DETECTED_NOTE))
      }
    })
  }

  it("never invents a persistence state or promises name detection", () => {
    assert.ok(renderPrivacyPrinciples().includes(AGENT_PROMPTS.privacy.unknown))
    assert.ok(renderPrivacyPrinciples().includes("不自动识别人名"))
    assert.doesNotMatch(renderPrivacyPrinciples(), /AI 会自动脱敏|除非用户主动授权，系统不存储/)
  })

  it("requires an explicit guest profile and leaves personal facts empty", () => {
    for (const guest of GUESTS) {
      const profile = getGuestProfile(guest.id)!
      assert.ok(profile.authorization.topics.length)
      assert.deepEqual(profile.authorization.facts, [])
      assert.ok(profile.authorization.boundaries.length)
    }
    assert.throws(() => getChatSystemPrompt({ mode: "guest", guestId: "unknown", routingContext: "你好" }))
  })
})
