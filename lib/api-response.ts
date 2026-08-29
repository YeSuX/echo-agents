export function apiError(
  code: string,
  message: string,
  status: number,
): Response {
  return Response.json({ code, error: message }, { status })
}

export const PRIVATE_JSON_HEADERS = {
  "Cache-Control": "private, no-store",
} as const
