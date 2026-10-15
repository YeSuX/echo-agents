import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import styles from "@/components/companion-refresh.module.css"

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
        styles.layout,
        showSidebar && styles.withSidebar,
        className,
      )}
    >
      <div className={styles.chatPanel}>{children}</div>
      {showSidebar && (
        <aside className={styles.sidebarPanel} aria-label="自助支持资源">
          {sidebar}
        </aside>
      )}
    </div>
  )
}
