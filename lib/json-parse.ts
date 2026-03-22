export type Json =
  | null
  | string
  | number
  | boolean
  | Json[]
  | { readonly [k: string]: Json }

export function parseJson(text: string): Json | null {
  try {
    return JSON.parse(text) as Json
  } catch {
    return null
  }
}

export function isJsonRecord(
  v: Json,
): v is { readonly [k: string]: Json } {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function parseFetchErrorBody(text: string): string | null {
  const j = parseJson(text)
  if (j === null || !isJsonRecord(j)) return null
  const err = j.error
  return typeof err === "string" ? err : null
}
