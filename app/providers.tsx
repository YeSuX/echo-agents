"use client"

import { DeepSeekConfigProvider } from "@/components/deepseek-config-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return <DeepSeekConfigProvider>{children}</DeepSeekConfigProvider>
}
