import { expect, test } from "bun:test"
import { canonicalPageRedirect } from "@/lib/auth/canonical-origin"

test("redirects only legacy browser routes and strips origin-bound Clerk tickets", () => {
  expect(canonicalPageRedirect({ method: "GET", url: "https://echo-agents.cooper-ai.org/support?conversation=fixture&__clerk_ticket=private&__clerk_synced=true" })?.href)
    .toBe("https://rayincare.org/support?conversation=fixture")
  expect(canonicalPageRedirect({ method: "HEAD", url: "https://echo-agents.cooper-ai.org/sign-in" })?.origin).toBe("https://rayincare.org")
  expect(canonicalPageRedirect({ method: "GET", url: "https://echo-agents.cooper-ai.org//unrelated.example/support" })?.href)
    .toBe("https://rayincare.org//unrelated.example/support")
  for (const url of ["https://rayincare.org/support", "http://localhost:3100/support", "https://unrelated.example/support"]) {
    expect(canonicalPageRedirect({ method: "GET", url })).toBeNull()
  }
  for (const path of ["/api/conversations", "/api/webhooks/clerk", "/_next/static/test.js", "/__clerk/client"]) {
    expect(canonicalPageRedirect({ method: "GET", url: "https://echo-agents.cooper-ai.org" + path })).toBeNull()
  }
  expect(canonicalPageRedirect({ method: "POST", url: "https://echo-agents.cooper-ai.org/api/webhooks/clerk" })).toBeNull()
})
