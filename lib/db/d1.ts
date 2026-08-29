import { getCloudflareContext } from "@opennextjs/cloudflare"

export function getDb(): D1Database {
  return getCloudflareContext().env.DB
}
