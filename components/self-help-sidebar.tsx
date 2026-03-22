import { FileTextIcon } from "lucide-react"

import type { SelfHelpPanelItem } from "@/lib/derive-self-help"
import { cn } from "@/lib/utils"

type SelfHelpSidebarProps = {
  items: readonly SelfHelpPanelItem[]
  className?: string
  title?: string
}

export function SelfHelpSidebar({
  items,
  className,
  title = "智能自助包",
}: SelfHelpSidebarProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          随对话更新，可按需下载或阅读
        </p>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-4" role="list">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            继续对话后，相关工具会出现在这里。
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-2 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent/50"
              >
                <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </a>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
