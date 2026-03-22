"use client"

import { KimiConfigProvider } from "@/components/kimi-config-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return <KimiConfigProvider>{children}</KimiConfigProvider>
}
