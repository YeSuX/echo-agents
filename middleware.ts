import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server"
import { canonicalPageRedirect } from "@/lib/auth/canonical-origin"

// Next.js 16 proxy.ts is Node-only, while OpenNext Cloudflare 1.17 does not
// support Node middleware yet. Keep the deprecated filename until the adapter
// adds Node middleware support; this file continues to run on the Edge runtime.
const authenticate = clerkMiddleware()

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const target = canonicalPageRedirect(request)
  if (target) return NextResponse.redirect(target, 307)
  return authenticate(request, event)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
