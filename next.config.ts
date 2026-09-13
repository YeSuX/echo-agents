import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
};

export default function config(phase: string): NextConfig {
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  ) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required at build time. " +
        "Set it in the build environment or .env.production.local before building; " +
        "a Worker runtime secret cannot configure the client bundle.",
    );
  }

  if (phase === PHASE_PRODUCTION_BUILD && 
    process.env.ALLOW_CLERK_TEST_KEYS !== "1"
  ) {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")) {
      throw new Error(
        "Production builds require a Clerk production publishable key (pk_live_). " +
          "Use NODE_ENV=production to load .env.production.local with Bun.",
      );
    }
    if (
      process.env.CLERK_SECRET_KEY &&
      !process.env.CLERK_SECRET_KEY.startsWith("sk_live_")
    ) {
      throw new Error(
        "Production builds cannot use a Clerk development secret key. " +
          "Use the secret key from the same production instance as the publishable key.",
      );
    }
  }

  return nextConfig;
}
