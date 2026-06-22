import { isClientKimiKeyAllowed } from "@/lib/safety/kimi-server"

export async function GET() {
  return Response.json({
    allowClientKimiKey: isClientKimiKeyAllowed(),
  })
}
