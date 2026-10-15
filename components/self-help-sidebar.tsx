import Link from "next/link"
import { ArrowUpRightIcon, DownloadIcon, FileTextIcon } from "lucide-react"

import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import type { SelfHelpPanelItem } from "@/lib/derive-self-help"
import { cn } from "@/lib/utils"
import styles from "@/components/companion-refresh.module.css"

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
    <div className={cn(styles.selfHelp, className)}>
      <nav className={styles.resourceNav} aria-label="支持与隐私">
        <SupportResourcesDropdown />
        <Link href="/privacy">隐私与数据 <ArrowUpRightIcon className="size-3" /></Link>
      </nav>
      <div className={styles.selfHelpContent}>
        <div className={styles.selfHelpHeading}>
          <span className={styles.selfHelpEyebrow}>一步一步，找回自己的力量</span>
          <h2>{title}</h2>
          <p>你需要的指南和工具，都放在这里。<br />随对话更新，你可以按自己的节奏阅读。</p>
        </div>
        <ul className={styles.resourceList} role="list">
        {items.length === 0 ? (
          <li className="text-sm">
            继续对话后，相关工具会出现在这里。
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <div className={styles.resourceCard}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <FileTextIcon strokeWidth={1.1} />
                  <span>{item.href.endsWith(".html") ? "HTML" : "MD"}</span>
                </span>
                <div className={styles.resourceInfo}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={styles.resourceTitle}>
                    {item.title}
                  </a>
                  <p>{item.description}</p>
                  <div className={styles.resourceActions}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`阅读${item.title}`}>
                      阅读指南 <ArrowUpRightIcon className="size-3" />
                    </a>
                    <a href={item.href} download aria-label={`下载${item.title}`}>
                      <DownloadIcon className="size-3" /> 保存
                    </a>
                  </div>
                </div>
              </div>
            </li>
          ))
        )}
        </ul>
        <p className={styles.resourceFootnote}>无需一次完成所有事，先照顾好自己。</p>
      </div>
    </div>
  )
}
