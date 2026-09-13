function upstreamStatus(error: unknown): number | undefined {
  if (error === null || typeof error !== "object" || !("status" in error)) {
    return undefined
  }
  const status = error.status
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : undefined
}

/** Log diagnostics without request content, headers, or credentials. */
export function logSafeError(
  scope: string,
  error: unknown,
  meta?: Record<string, string | number | boolean>,
): void {
  const name = error instanceof Error ? error.name : "Error"
  const code =
    error instanceof Error && "code" in error
      ? String((error as Error & { code?: unknown }).code)
      : "unknown"
  const payload = {
    scope,
    errorName: name,
    errorCode: code,
    upstreamStatus: upstreamStatus(error),
    errorKind: sanitizeErrorMessage(error),
    ...meta,
  }
  if (process.env.NODE_ENV === "development") {
    console.error("[safe-log]", payload)
  } else {
    console.error(JSON.stringify(payload))
  }
}

export function sanitizeErrorMessage(error: unknown): string {
  const status = upstreamStatus(error)
  if (status === 404) return "upstream_model_unavailable"
  if (status === 401 || status === 403) return "upstream_auth"
  if (status === 429) return "upstream_rate_limited"
  if (status === 408 || status === 504) return "upstream_timeout"
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return "upstream_timeout"
    }
    if (msg.includes("rate") || msg.includes("429")) {
      return "upstream_rate_limited"
    }
    if (msg.includes("api key") || msg.includes("401")) {
      return "upstream_auth"
    }
  }
  return "upstream_error"
}
