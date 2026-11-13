import { getGuestProfile, GUEST_OPENING } from "@/data/guests"
import { AGENT_PROMPTS, fillPrompt, renderPrivacyPrinciples, type ChatPersistence } from "@/lib/agent-prompt-config"
import { CRISIS_PROTOCOL } from "@/lib/safety/constants"

export function getGuestSystemPrompt(guestId: string, persistence?: ChatPersistence): string {
  const guest = getGuestProfile(guestId)
  if (!guest) throw new Error("Unknown guest")
  const { topics, facts, boundaries } = guest.authorization
  return [
    fillPrompt(AGENT_PROMPTS.guest.identity, { name: guest.name, tagline: guest.tagline }),
    fillPrompt(AGENT_PROMPTS.guest.authorization, {
      topics: topics.join("、"),
      facts: facts.length ? facts.map(fact => `- ${fact}`).join("\n") : "无；仅有化名和讨论主题，没有可叙述的个人经历。",
    }),
    fillPrompt(AGENT_PROMPTS.guest.boundaries, { boundaries: boundaries.join("；") }),
    CRISIS_PROTOCOL,
    renderPrivacyPrinciples(persistence),
  ].join("\n\n")
}

export const DEFAULT_OPENING = GUEST_OPENING
