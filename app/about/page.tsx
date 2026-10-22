import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, MailIcon } from "lucide-react"

import { PublicPageLayout } from "@/components/public-page-layout"
import { ORGANIZATION } from "@/data/organization"
import styles from "@/components/landing-contact-consent.module.css"

export const metadata: Metadata = {
  title: "关于我们 | 如荧RAYIN",
  description: "了解如荧的影像性暴力公共倡导、AI 同伴支持与人工下架支援。",
}

export default function AboutPage() {
  return (
    <PublicPageLayout current="about">
      <div className={styles.editorialPage}>
        <header className={styles.pageIntro}>
          <p className={styles.smallLabel}>关于我们</p>
          <h1>让支持更近一点</h1>
          <p>{ORGANIZATION.introduction}</p>
        </header>
        <div className={styles.aboutSections}>
          <section aria-labelledby="advocacy-heading">
            <h2 id="advocacy-heading">关注伤害，也推动改变</h2>
            <p>{ORGANIZATION.advocacy}</p>
          </section>
          <section aria-labelledby="companion-heading">
            <h2 id="companion-heading">AI 同伴支持者小荧</h2>
            <p>{ORGANIZATION.companion}</p>
            <p>小荧由 AI 回应，不能替代专业法律意见、医疗诊断或紧急服务。你可以少说一点，也可以随时停下。</p>
            <Link href="/support" className={styles.textLink}>和小荧聊聊 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </section>
          <section aria-labelledby="human-support-heading">
            <h2 id="human-support-heading">真人支援与资源连接</h2>
            <p>{ORGANIZATION.takedown}</p>
            <Link href="/assistance" className={styles.textLink}>查看个案援助 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </section>
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading">联系如荧</h2>
            <p>下架支援或合作联络，可以通过邮箱联系我们。</p>
            <a className={styles.textLink} href={`mailto:${ORGANIZATION.supportEmail}`}><MailIcon size={18} aria-hidden="true" />{ORGANIZATION.supportEmail}</a>
          </section>
        </div>
      </div>
    </PublicPageLayout>
  )
}
