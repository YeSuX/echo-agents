export const MAX_STORY_CHARS = 100_000
export const MAX_STORY_REQUEST_BYTES = MAX_STORY_CHARS * 6 + 2048
export const STORY_CONSENT_VERSION = "anonymous-story-v1"
export const STORY_DRAFT_KEY = "echo-agents.storyDraft.v1"
const LEGACY_DRAFT_KEY = "companion-story-draft"

export type StoryDraft = { id: string; text: string }
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function conversationToStoryDraft(
  messages: readonly {
    id: string
    role: "agent" | "user"
    content: string
    isFallback?: boolean
  }[],
): string {
  return messages
    .filter(message => message.id !== "opening" && !message.isFallback && message.content.trim())
    .map(message => `${message.role === "user" ? "You" : "Agent"}:\n${message.content}`)
    .join("\n\n")
}

export function createStoryDraft(text = ""): StoryDraft {
  return { id: crypto.randomUUID(), text }
}

export function readStoryDraft(storage: DraftStorage): StoryDraft {
  const raw = storage.getItem(STORY_DRAFT_KEY)
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw)
      if (value && typeof value === "object" && "id" in value && "text" in value &&
        typeof value.id === "string" && typeof value.text === "string") {
        return { id: value.id, text: value.text }
      }
    } catch {
      // Keep malformed storage untouched until the user saves a replacement.
    }
  }
  return createStoryDraft(storage.getItem(LEGACY_DRAFT_KEY) ?? "")
}

export function writeStoryDraft(storage: DraftStorage, draft: StoryDraft): void {
  storage.setItem(STORY_DRAFT_KEY, JSON.stringify(draft))
}

export function clearStoryDraft(storage: DraftStorage, id: string): void {
  if (readStoryDraft(storage).id === id) {
    storage.removeItem(STORY_DRAFT_KEY)
    storage.removeItem(LEGACY_DRAFT_KEY)
  }
}
