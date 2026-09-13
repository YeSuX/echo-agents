import { isClientDeepSeekKeyAllowed } from "@/lib/safety/deepseek-server"

export async function GET() {
  return Response.json({
    allowClientDeepSeekKey: isClientDeepSeekKeyAllowed(),
  })
}
