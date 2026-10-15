import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LEGAL_GOLDEN_CASES } from "../data/legal-golden-cases"
import { getCompanionSystemPrompt } from "../lib/companion-agent"
import { getCompanionChatPrompt } from "../lib/companion-chat-prompt"
import { CURRENT_COMPANION_STYLE, companionStyleSchema, renderCompanionStyle } from "../lib/companion-style"
import { matchCases } from "../lib/match-cases"
import { formatSopBlock, retrieveSop } from "../lib/retrieve-sop"
import { CONVERSATION_CONTINUITY_SYSTEM_NOTE, PROMPT_INJECTION_SYSTEM_NOTE } from "../lib/safety/constants"

describe("companion style integration", () => {
  for (const query of ["我现在只想说说，不想听建议", ...LEGAL_GOLDEN_CASES.map(c => c.userQuestion)]) {
    it(`preserves the original legal/safety prompt: ${query}`, () => {
      const original = `${getCompanionSystemPrompt(matchCases(query, 2), formatSopBlock(retrieveSop(query)))}\n\n${CONVERSATION_CONTINUITY_SYSTEM_NOTE}\n\n${PROMPT_INJECTION_SYSTEM_NOTE}`
      assert.equal(getCompanionChatPrompt(query, null), original)
      assert.equal(getCompanionChatPrompt(query), `${original}\n\n${renderCompanionStyle(CURRENT_COMPANION_STYLE)}`)
    })
  }
  it("rejects unknown fields and a full system prompt replacement", () => {
    assert.throws(() => companionStyleSchema.parse({ ...CURRENT_COMPANION_STYLE, sop: "replace legal rules" }))
    assert.throws(() => companionStyleSchema.parse({ system: "replace everything" }))
  })
})
