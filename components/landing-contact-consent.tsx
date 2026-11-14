"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { DESIGN_ASSETS } from "@/lib/design-assets"
import {
  ArrowRightIcon, ChevronDownIcon, MessageSquareIcon, TriangleAlertIcon,
  HeartHandshakeIcon, LockKeyholeIcon,
  PhoneIcon, ExternalLinkIcon, ShieldCheckIcon,
} from "lucide-react"
import { StoryContributionDialog } from "@/components/story-contribution-dialog"
import { readStoryDraft, createStoryDraft, type StoryDraft } from "@/lib/story-contribution"
import { AuthControls } from "@/components/auth-controls"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SUPPORT_RESOURCES } from "@/data/support-resources"
import { HOME_FAQS, PARTNERS } from "@/data/organization"
import { SiteBrand } from "@/components/site-brand"
import { OrganizationFooter } from "@/components/organization-footer"
import { GUESTS, GUEST_EXPERIENCE_NOTICE } from "@/data/guests"
import styles from "@/components/landing-contact-consent.module.css"


export function LandingContactConsent() {
  const [storyOpen, setStoryOpen] = useState(false)
  const [draft, setDraft] = useState<StoryDraft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  function openStory() {
    setDraftError(null)
    try {
      setDraft(readStoryDraft(sessionStorage))
    } catch {
      setDraft(createStoryDraft())
      setDraftError("暂时无法读取本地草稿，你可以在这里填写想分享的内容。")
    }
    setStoryOpen(true)
  }

  return (
    <div className={styles.page}>
      <a href="#welcome-heading" className={styles.skipLink}>跳至主要内容</a>
      <header className={styles.header}>
        <SiteBrand className={styles.brand} />
        <nav className={styles.navigation} aria-label="主要导航">
          <Link href="/about">关于我们</Link>
          <Link href="/assistance">个案援助</Link>
          <Link href="/guests">嘉宾对话</Link>
          <Link href="/privacy">隐私承诺</Link>
          <a href="#support">支持资源</a>
          <AuthControls compact />
        </nav>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby="welcome-heading">
          <div className={styles.heroArtwork} aria-hidden="true">
            <Image src={DESIGN_ASSETS.hero} alt="" fill priority sizes="100vw" className={styles.heroImage} />
          </div>
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.welcomeMark}><HeartHandshakeIcon size={23} aria-hidden="true" /></span>
              <p className={styles.eyebrow}>每一份感受，都值得被认真听见</p>
              <h1 id="welcome-heading" tabIndex={-1}>你不需要一个人<br />处理这些</h1>
              <p className={styles.heroDescription}>小荧提供 AI 同伴对话、应对工具和可信支持资源。<br className={styles.desktopBreak} />你可以少说一点，也可以随时停下。</p>
              <p className={styles.reassurance}>这不是你的错。</p>
              <div className={styles.heroActions}>
                <Link href="/support" className={styles.primaryLink}>寻求帮助 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
                <Link href="/learn" className={styles.secondaryLink}>先了解应对方法</Link>
              </div>
              <div className={styles.heroFoot}>
                <span><LockKeyholeIcon size={13} aria-hidden="true" />游客对话默认加密保存，可关闭或删除</span>
                <a href="https://www.google.com">暂时离开此页 <ExternalLinkIcon size={12} aria-hidden="true" /></a>
              </div>
            </div>
            <SafetyPanel />
          </div>
        </section>

        <section className={styles.storiesSection} aria-labelledby="guest-stories-heading">
          <div className={styles.storiesContent}>
            <p className={styles.smallLabel}><MessageSquareIcon size={17} aria-hidden="true" />嘉宾对话</p>
            <h2 id="guest-stories-heading">从你在意的话题开始</h2>
            <p className={styles.storiesIntro}>{GUEST_EXPERIENCE_NOTICE}</p>
            <div className={styles.storyPreviews}>
              <Link href="/guests" className={styles.browseStories}>查看对话主题 <ArrowRightIcon size={15} aria-hidden="true" /></Link>
              {GUESTS.slice(0, 3).map((guest) => (
                <article className={styles.guestCard} key={guest.id}>
                  <p>{guest.tagline}</p>
                  <div><Image src={guest.avatar} alt="" width={28} height={28} /><span>{guest.name}<small>化名</small></span></div>
                </article>
              ))}
            </div>
          </div>
          <aside className={styles.shareCard} aria-labelledby="share-heading">
            <Image src={DESIGN_ASSETS.storyEnvelope} alt="" width={640} height={640} sizes="(max-width: 600px) 190px, (max-width: 900px) 265px, 220px" className={styles.shareArtwork} />
            <div className={styles.shareCopy}>
              <h3 id="share-heading">留下你的故事<br />按照自己的节奏</h3>
              <p>你可以选择想分享的部分。<br />提交后进入审核，不会自动公开。</p>
              <button type="button" className={styles.primaryLink} onClick={openStory}>留下我的故事 <ArrowRightIcon size={15} aria-hidden="true" /></button>
              <small>分享完全自愿，提交前可审阅与修改</small>
            </div>
          </aside>
        </section>

        <div className={styles.homeInformation}>
          <section id="understand" className={styles.assistanceEntry} aria-labelledby="assistance-heading">
            <HeartHandshakeIcon size={30} aria-hidden="true" />
            <div>
              <h2 id="assistance-heading">了解处境，找到适合你的帮助</h2>
              <p>什么是影像性暴力？可以怎样求助？在个案援助中了解常见类型、匿名案例与真人支援方式。</p>
              <Link href="/assistance" className={styles.textLink}>查看个案援助 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
            </div>
          </section>
          <section className={styles.faqSection} aria-labelledby="faq-heading">
            <h2 id="faq-heading">常见问题一览</h2>
            <div className={styles.faqList}>
              {HOME_FAQS.map(({ question, answer }) => (
                <details key={question}>
                  <summary>{question}<ChevronDownIcon size={18} aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>
          <section className={styles.partnersSection} aria-labelledby="partners-heading">
            <h2 id="partners-heading">合作机构</h2>
            {PARTNERS.length > 0 ? (
              <ul className={styles.partnerLogos} aria-label="已确认的合作机构">
                {PARTNERS.map((partner) => (
                  <li key={partner.name}>
                    {partner.href ? <a href={partner.href} target="_blank" rel="noopener noreferrer"><Image src={partner.logoSrc} alt={partner.name} width={160} height={64} /></a> : <Image src={partner.logoSrc} alt={partner.name} width={160} height={64} />}
                  </li>
                ))}
              </ul>
            ) : <p>我们正在与关注影像性暴力的机构建立联系。确认合作后，将在这里介绍。</p>}
            <Link href="/about#contact-heading" className={styles.textLink}>与我们联系 <ArrowRightIcon size={16} aria-hidden="true" /></Link>
          </section>
        </div>
      </main>
      <OrganizationFooter />
      <StoryContributionDialog open={storyOpen} onOpenChange={setStoryOpen} initialDraft={draft} initialError={draftError} />
    </div>
  )
}


function SafetyPanel() {
  return (
    <aside id="support" className={styles.safetyPanel} aria-labelledby="safety-heading">
      <div className={styles.safetyHeading}>
        <ShieldCheckIcon size={20} aria-hidden="true" />
        <div>
          <h2 id="safety-heading">先确认你的安全与选择</h2>
          <p>对话由 AI 回应，不能替代律师、医生或紧急服务。你始终可以决定说什么、何时离开。</p>
        </div>
      </div>
      <div className={styles.safetyBody}>
        <div className={styles.contentNotice}>
          <TriangleAlertIcon size={17} aria-hidden="true" />
          <div><h3>内容提醒</h3><p>页面涉及性暴力和创伤主题。可能引发不适，感到不舒服时，请立即停下或使用下方资源。</p></div>
        </div>
        <div className={styles.supportHeading}><h3>需要真人支持</h3><span>可直接拨打</span></div>
        <ul className={styles.supportList} role="list">
          {SUPPORT_RESOURCES.slice(0, 3).map((item) => <SupportContact key={item.label} item={item} />)}
        </ul>
        <Collapsible>
          <CollapsibleTrigger className={styles.resourceTrigger}>查看更多支持资源 <ChevronDownIcon size={15} aria-hidden="true" /></CollapsibleTrigger>
          <CollapsibleContent>
            <ul className={styles.supportList} role="list">
              {SUPPORT_RESOURCES.slice(3).map((item) => <SupportContact key={item.label} item={item} />)}
            </ul>
          </CollapsibleContent>
        </Collapsible>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className={styles.privacyTrigger}><LockKeyholeIcon size={15} aria-hidden="true" />查看数据与隐私承诺 <ArrowRightIcon size={14} aria-hidden="true" /></Button>
          </DialogTrigger>
          <DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>你的信息由你决定</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 text-left text-sm leading-6">
                  <p>未登录时，对话默认加密保存，可通过本浏览器的游客凭证恢复和删除；你可以随时关闭未来保存。</p>
                  <div><p className="font-medium text-foreground">登录后默认开启云端同步</p><p>登录用户的新消息会默认加密保存并用于跨设备恢复。登录前的游客记录只有经你明确确认，才会关联到账号。</p></div>
                  <div><p className="font-medium text-foreground">用途受到限制</p><p>对话记录只用于向你恢复历史和继续聊天，不用于广告画像；匿名故事投稿仍使用独立授权和脱敏流程。</p></div>
                  <div><p className="font-medium text-foreground">你可以撤回</p><p>你可以关闭未来保存，并在对话记录页删除单条或全部历史。游客凭证在最后一次访问后保留 30 天；清除 Cookie 或凭证过期后无法恢复游客记录。</p></div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" asChild><Link href="/privacy">阅读完整隐私说明</Link></Button>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}

function SupportContact({ item }: { item: (typeof SUPPORT_RESOURCES)[number] }) {
  const Icon = item.type === "phone" ? PhoneIcon : ExternalLinkIcon
  return (
    <li>
      <a href={item.href} target={item.type === "link" ? "_blank" : undefined} rel={item.type === "link" ? "noopener noreferrer" : undefined}>
        <Icon size={17} aria-hidden="true" />
        <span><strong>{item.label}</strong><small>{item.description}</small></span>
      </a>
    </li>
  )
}
