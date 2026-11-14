import { apiError } from "@/lib/api-response"

export function checkConversationOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin")
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin !== null && origin !== new URL(request.url).origin)
  ) {
    return apiError("INVALID_ORIGIN", "Cross-origin mutation is not allowed", 403)
  }
  return null
}
