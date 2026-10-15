"use client"

import { useState } from "react"
import Link from "next/link"
import Image, { type StaticImageData } from "next/image"
import { DESIGN_ASSETS } from "@/lib/design-assets"
import {
  ArrowRightIcon, ChevronDownIcon, EyeIcon, MessageSquareIcon, TriangleAlertIcon,
  FolderOpenIcon, HeartHandshakeIcon, LayersIcon, LockKeyholeIcon,
  PhoneIcon, ExternalLinkIcon, ShieldCheckIcon, SparklesIcon,
} from "lucide-react"
import { StoryContributionDialog } from "@/components/story-contribution-dialog"
import { readStoryDraft, createStoryDraft, type StoryDraft } from "@/lib/story-contribution"
import { AuthControls } from "@/components/auth-controls"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SUPPORT_RESOURCES } from "@/data/support-resources"
import { ANONYMOUS_CASES } from "@/data/cases"
import { GUESTS } from "@/data/guests"
import styles from "@/components/landing-contact-consent.module.css"

const VIOLENCE_TYPES = [
  { title: "AI 深伪色情", description: "利用 AI 换脸等技术，未经同意将他人的形象合成为色情影像。虚假的影像，也会造成真实的伤害。", image: DESIGN_ASSETS.typeDeepfake },
  { title: "未经同意传播", description: "擅自分享、转发或公开他人的私密影像。同意拍摄，从来不等于同意传播。", image: DESIGN_ASSETS.typeSharing },
  { title: "偷拍", description: "在当事人不知情或未同意的情况下，拍摄、录制其私密部位或私密活动。", image: DESIGN_ASSETS.typeVoyeurism },
]
const CASE_IMAGES: Record<string, StaticImageData> = {
  c4: DESIGN_ASSETS.caseDeepfake,
  c5: DESIGN_ASSETS.caseCompensation,
  c6: DESIGN_ASSETS.caseTakedown,
}

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
        <Link href="/" className={styles.brand} aria-label="如荧首页">
          <SparklesIcon aria-hidden="true" />
          <span>如荧<span className={styles.brandNote}>反对影像性暴力</span></span>
        </Link>
        <nav className={styles.navigation} aria-label="主要导航">
          <Link href="/guests">嘉宾故事</Link>
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
                <span><LockKeyholeIcon size={13} aria-hidden="true" />未登录时对话不保存</span>
                <a href="https://www.google.com">暂时离开此页 <ExternalLinkIcon size={12} aria-hidden="true" /></a>
              </div>
            </div>
            <SafetyPanel />
          </div>
        </section>

        <section className={styles.storiesSection} aria-labelledby="guest-stories-heading">
          <div className={styles.storiesContent}>
            <p className={styles.smallLabel}><MessageSquareIcon size={17} aria-hidden="true" />她们的故事</p>
            <h2 id="guest-stories-heading">听听嘉宾愿意分享的故事</h2>
            <p className={styles.storiesIntro}>不同经历的她们，面对关系、舆论与复原时会有不同的选择。<br className={styles.desktopBreak} />希望她们的声音，能带给你一点力量。</p>
            <div className={styles.storyPreviews}>
              <Link href="/guests" className={styles.browseStories}>查看全部故事 <ArrowRightIcon size={15} aria-hidden="true" /></Link>
              {GUESTS.slice(0, 3).map((guest) => (
                <article className={styles.guestCard} key={guest.id}>
                  <span className={styles.quoteMark} aria-hidden="true">“</span>
                  <p>{guest.tagline}</p>
                  <div><Image src={guest.avatar} alt="" width={28} height={28} /><span>{guest.name}<small>化名</small></span></div>
                </article>
              ))}
            </div>
          </div>
          <aside className={styles.shareCard} aria-labelledby="share-heading">
            <Image src={DESIGN_ASSETS.storyEnvelope} alt="" width={640} height={640} sizes="(max-width: 600px) 190px, (max-width: 900px) 265px, 220px" className={styles.shareArtwork} />
            <div className={styles.shareCopy}>
              <h3 id="share-heading">分享你的故事<br />让改变发生</h3>
              <p>你的经历，可能正在帮助另一个<br />需要一点光的人。</p>
              <button type="button" className={styles.primaryLink} onClick={openStory}>留下我的故事 <ArrowRightIcon size={15} aria-hidden="true" /></button>
              <small>分享完全自愿，提交前可审阅与修改</small>
            </div>
          </aside>
        </section>

        <div id="understand" className={styles.main}>
        <section aria-labelledby="definition-heading">
          <div className={styles.sectionHeading}><EyeIcon aria-hidden="true" /><h2 id="definition-heading">什么是影像性暴力？</h2></div>
          <div className={styles.sectionBody}><p>未经同意，制作、获取、传播或威胁传播他人的私密影像。<br className="hidden sm:block" />核心是「未经同意」，无论影像真实还是合成，伤害都不该由你承担。</p><Link href="/learn" className={styles.textLink}>了解更多应对方法 <ArrowRightIcon size={16} aria-hidden="true" /></Link></div>
        </section>
        <section className={styles.contentSection} aria-labelledby="types-heading">
          <div className={styles.sectionHeading}><LayersIcon aria-hidden="true" /><h2 id="types-heading">影像性暴力的常见类型</h2></div>
          <div className={styles.threeColumns}>{VIOLENCE_TYPES.map(({ title, description, image }, index) => <article className={styles.typeCard} key={title}>
            <div className={styles.illustration}><Image src={image} alt="" width={512} height={512} sizes="(max-width: 600px) 108px, 232px" /></div>
            <h3><span className={styles.number}>0{index + 1}</span>{title}</h3><p>{description}</p>
          </article>)}</div>
          <Link href="/learn#types" className={styles.moreTypes}>还有性勒索、造黄谣等形式，了解完整说明 <ArrowRightIcon size={15} aria-hidden="true" /></Link>
        </section>
        <section className={styles.contentSection} aria-labelledby="cases-heading">
          <div className={styles.sectionHeading}><FolderOpenIcon aria-hidden="true" /><h2 id="cases-heading">相关案例</h2></div><p className={styles.sectionIntro}>在这里，看到更多的力量</p>
          <div className={styles.threeColumns}>{ANONYMOUS_CASES.slice(3, 6).map((item, index) => {
            return <Link key={item.id} href={`/stories#${item.id}`} className={styles.caseCard}>
              <div className={styles.caseIllustration}><Image src={CASE_IMAGES[item.id]} alt="" width={512} height={512} sizes="(max-width: 600px) 108px, 232px" /></div>
              <div className={styles.caseTitle}><span className={styles.number}>0{index + 1}</span><h3>{item.title}</h3><ArrowRightIcon className={styles.roundArrow} aria-hidden="true" /></div><p>{item.outcomeNote}</p>
            </Link>
          })}</div><p className={styles.caseNote}>匿名案例摘要，细节已脱敏。每个人的情况不同，结果仅供了解。</p>
        </section>
        </div>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.footerBrand}><SparklesIcon size={20} aria-hidden="true" />如荧</Link><p>一点微光，也可以照亮彼此。</p><nav aria-label="页脚导航"><Link href="/learn">科普</Link><Link href="/stories">匿名案例</Link><Link href="/privacy">隐私与数据</Link></nav></footer>
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
                  <p>未登录时，对话只在当前页面临时处理，不会写入云端记录。</p>
                  <div><p className="font-medium text-foreground">登录后默认开启云端同步</p><p>登录用户的新消息会默认加密存储并用于跨设备恢复；登录前的临时消息不会自动上传。你可以在聊天页随时关闭同步。</p></div>
                  <div><p className="font-medium text-foreground">用途受到限制</p><p>对话记录只用于向你恢复历史和继续聊天，不用于广告画像；匿名故事投稿仍使用独立授权和脱敏流程。</p></div>
                  <div><p className="font-medium text-foreground">你可以撤回</p><p>你可以关闭未来保存，并在对话记录页删除单条或全部历史。</p></div>
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
