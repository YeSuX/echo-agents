import { auth } from "@clerk/nextjs/server"

export async function authenticatedUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}
