import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, MailIcon } from "lucide-react"

import { PublicPageLayout } from "@/components/public-page-layout"
import { ViolenceEducation } from "@/components/violence-education"
import { ORGANIZATION } from "@/data/organization"
import styles from "@/components/landing-contact-consent.module.css"

export const metadata: Metadata = {
  title: "个案援助 | 如荧RAYIN",
  description: "了解影像性暴力、常见类型与匿名案例，寻找同伴支持、个案转介与下架支援。",
}

export default function AssistancePage() {
  return (
    <PublicPageLayout current="assistance">
      <header className={styles.assistanceIntro}>
        <p className={styles.smallLabel}>个案援助</p>
        <h1>从了解，到获得支持</h1>
        <p>不必一次完成所有事。你可以先了解发生了什么，也可以直接查看我们能提供的帮助。</p>
        <nav aria-label="本页目录">
          <a href="#definition-heading">认识影像性暴力</a>
          <a href="#cases-heading">了解匿名案例</a>
          <a href="#available-help">我们能提供的帮助 <ArrowRightIcon size={15} aria-hidden="true" /></a>
        </nav>
      </header>
      <ViolenceEducation />
      <section id="available-help" className={styles.availableHelp} aria-labelledby="help-heading">
        <h2 id="help-heading">我们能提供的帮助</h2>
        <p>你可以根据自己的需要选择支持方式，由你决定何时开始、分享多少。</p>
        <div className={styles.serviceList}>
          <article>
            <h3>同伴支持</h3>
            <p>与 AI 同伴支持者小荧对话，整理感受、了解信息与自助工具。AI 不能替代专业服务。</p>
            <Link href="/support" className={styles.textLink}>和小荧聊聊 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </article>
          <article>
            <h3>个案转介</h3>
            <p>查看已有的法律、心理与反暴力支持资源。如需进一步联系相关机构，可以先向如荧说明需求，具体转介由团队沟通确认。</p>
            <Link href="/#support" className={styles.textLink}>查看真人支持资源 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </article>
          <article>
            <h3>下架支援</h3>
            <p>{ORGANIZATION.takedown}</p>
            <a href={`mailto:${ORGANIZATION.supportEmail}`} className={styles.textLink}>联系下架支援 <MailIcon size={16} aria-hidden="true" /></a>
          </article>
        </div>
        <p className={styles.serviceNote}>联络邮箱：<a href={`mailto:${ORGANIZATION.supportEmail}`}>{ORGANIZATION.supportEmail}</a>。初次联络可先简要描述需求，无需附上私密影像。</p>
      </section>
    </PublicPageLayout>
  )
}
