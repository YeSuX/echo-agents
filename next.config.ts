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

  return nextConfig;
}
