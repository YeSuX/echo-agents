/** 安全日志：不记录用户正文或 API Key */
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
    ...meta,
  }
  if (process.env.NODE_ENV === "development") {
    console.error("[safe-log]", payload)
  } else {
    console.error(JSON.stringify(payload))
  }
}

export function sanitizeErrorMessage(error: unknown): string {
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
