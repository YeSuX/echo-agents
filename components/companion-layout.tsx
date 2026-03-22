import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type CompanionLayoutProps = {
  children: ReactNode
  sidebar: ReactNode
  className?: string
}

export function CompanionLayout({
  children,
  sidebar,
  className,
}: CompanionLayoutProps) {
  return (
    <div
      className={cn(
        "grid h-dvh grid-cols-1 bg-background lg:grid-cols-[1fr_300px]",
        className,
      )}
    >
      <div className="min-h-0 min-w-0 flex flex-col">{children}</div>
      <aside className="hidden min-h-0 border-l bg-muted/20 lg:block">
        {sidebar}
      </aside>
    </div>
  )
}
