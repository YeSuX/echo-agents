import type { ReactNode } from "react"
import Link from "next/link"

import { OrganizationFooter } from "@/components/organization-footer"
import { SiteBrand } from "@/components/site-brand"
import styles from "@/components/landing-contact-consent.module.css"

export function PublicPageLayout({ current, children }: { current: "about" | "assistance"; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <a href="#page-content" className={styles.skipLink}>跳至主要内容</a>
      <header className={styles.header}>
        <SiteBrand className={styles.brand} />
        <nav className={styles.navigation} aria-label="主要导航">
          <Link href="/about" aria-current={current === "about" ? "page" : undefined}>关于我们</Link>
          <Link href="/assistance" aria-current={current === "assistance" ? "page" : undefined}>个案援助</Link>
          <Link href="/">首页</Link>
          <Link href="/support">和小荧聊聊</Link>
        </nav>
      </header>
      <main id="page-content" tabIndex={-1}>{children}</main>
      <OrganizationFooter />
    </div>
  )
}
