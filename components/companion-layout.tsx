import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type CompanionLayoutProps = {
  children: ReactNode
  sidebar: ReactNode
  showSidebar?: boolean
  className?: string
}

export function CompanionLayout({
  children,
  sidebar,
  showSidebar = true,
  className,
}: CompanionLayoutProps) {
  return (
    <div
      className={cn(
        "grid h-dvh grid-cols-1 bg-background",
        showSidebar && "lg:grid-cols-[minmax(0,1fr)_320px]",
        className,
      )}
    >
      <div className="min-h-0 min-w-0 flex flex-col">{children}</div>
      {showSidebar && (
        <aside className="hidden min-h-0 border-l bg-muted/20 lg:block">
          {sidebar}
        </aside>
      )}
    </div>
  )
}
