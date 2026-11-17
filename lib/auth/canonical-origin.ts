const CANONICAL_ORIGIN = "https://rayincare.org"
const LEGACY_HOSTS = new Set(["echo-agents.cooper-ai.org"])

export function canonicalPageRedirect(request: { url: string; method: string }): URL | null {
  const url = new URL(request.url)
  if (!LEGACY_HOSTS.has(url.hostname) || !["GET", "HEAD"].includes(request.method)) return null
  // Old webhook/API and asset URLs remain available during the domain cutover.
  if (["/api", "/_next", "/__clerk"].some(prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return null
  const target = new URL(CANONICAL_ORIGIN)
  target.pathname = url.pathname
  target.search = url.search
  // Clerk tickets/handshake tokens are origin-bound and must not cross domains.
  for (const key of [...target.searchParams.keys()]) {
    if (key.startsWith("__clerk")) target.searchParams.delete(key)
  }
  return target
}
