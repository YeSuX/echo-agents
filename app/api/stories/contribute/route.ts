import { appendFile, mkdir } from "fs/promises"
import path from "path"
import { NextRequest } from "next/server"
import { isJsonRecord, parseJson, type Json } from "@/lib/json-parse"

const MAX_STORY_LENGTH = 8000

function readTextField(root: { readonly [k: string]: Json }): string | null {
  const t = root.text
  if (typeof t !== "string") return null
  return t
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const j = parseJson(raw)
    if (!isJsonRecord(j)) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    const text = readTextField(j)
    if (text === null) {
      return new Response(JSON.stringify({ error: "text field required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (text.length === 0 || text.length > MAX_STORY_LENGTH) {
      return new Response(JSON.stringify({ error: "Invalid text length" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const dir = path.join(process.cwd(), ".local")
    await mkdir(dir, { recursive: true })
    const record = JSON.stringify({
      at: new Date().toISOString(),
      length: text.length,
      text,
    })
    await appendFile(
      path.join(dir, "pending-stories.jsonl"),
      `${record}\n`,
      "utf-8",
    )

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Could not save" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
