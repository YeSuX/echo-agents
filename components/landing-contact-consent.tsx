"use client"

import Link from "next/link"
import Image, { type StaticImageData } from "next/image"
import { DESIGN_ASSETS } from "@/lib/design-assets"
import {
  ArrowRightIcon, ChevronDownIcon, EyeIcon,
  FolderOpenIcon, HeartHandshakeIcon, LayersIcon, LockKeyholeIcon,
  PhoneIcon, ExternalLinkIcon, ShieldCheckIcon, SparklesIcon,
} from "lucide-react"
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
  return (
    <div className={styles.page}>
      <a href="#understand" className={styles.skipLink}>跳至主要内容</a>
      <section className={styles.hero} aria-labelledby="welcome-heading">
        <Image src={DESIGN_ASSETS.hero} alt="" fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="如荧首页"><SparklesIcon aria-hidden="true" /><span>如荧<span className={styles.brandNote}>反对影像性暴力</span></span></Link>
          <nav className={styles.navigation} aria-label="主要导航"><Link href="/guests">嘉宾故事</Link><Link href="/privacy">隐私承诺</Link><a href="#support">支持资源</a><AuthControls compact /></nav>
        </header>
        <div className={styles.heroTitle}>
          <p className={styles.eyebrow}>每一份感受，都值得被认真听见</p>
          <h1 id="welcome-heading">如荧，反对影像性暴力</h1>
          <p className={styles.slogan}>别让 AI 的恶，遮住你的光</p>
        </div>
        <div className={styles.invitation}>
          <Image src={DESIGN_ASSETS.companion} alt="同伴支持者小荧" width={112} height={112} className={styles.companionAvatar} />
          <div className={styles.invitationActions}>
            <p className={styles.greeting}>受到伤害从来都不是你的错。<br className="sm:hidden" />我是 AI 同伴小荧，陪你一起。</p>
            <Link href="/support" className={styles.chatLink}>你可以和我先聊聊天 <ArrowRightIcon size={18} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className={styles.heroFoot}><span><LockKeyholeIcon size={13} aria-hidden="true" />未登录时对话不保存</span><a href="https://www.google.com">暂时离开此页 <ExternalLinkIcon size={12} aria-hidden="true" /></a></div>
        <a className={styles.scrollCue} href="#understand" aria-label="向下了解影像性暴力"><ChevronDownIcon aria-hidden="true" /></a>
      </section>
      <main id="understand" className={styles.main}>
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
        <section className={styles.guestSection} aria-labelledby="guest-stories-heading">
          <div><p className={styles.smallLabel}>让故事陪你走一段</p><h2 id="guest-stories-heading">听听嘉宾愿意分享的故事</h2><p>九位嘉宾，九种不同的经验。<br />你可以先听听，也可以慢慢说。</p><Link href="/guests" className={styles.textLink}>认识全部 9 位嘉宾 <ArrowRightIcon size={16} aria-hidden="true" /></Link></div>
          <Link href="/guests" className={styles.guestPreview} aria-label="浏览九位嘉宾的故事"><div className={styles.guestAvatars}>{GUESTS.slice(0, 4).map((guest) => <Image key={guest.id} src={guest.avatar} alt="" width={80} height={80} />)}</div><span>关于关系、复原与重新出发 <ArrowRightIcon size={16} aria-hidden="true" /></span><small>所有姓名均为化名</small></Link>
        </section>
        <section id="support" className={styles.supportSection} aria-labelledby="support-heading">
          <div className={styles.sectionHeading}><HeartHandshakeIcon aria-hidden="true" /><h2 id="support-heading">需要时，也有人在这里</h2></div><p className={styles.sectionIntro}>如果此刻需要真人支持，可以从下面的资源开始。</p>
          <ul className={styles.supportGrid} role="list">{SUPPORT_RESOURCES.slice(0, 3).map((item) => <li key={item.label}><a href={item.href} target={item.type === "link" ? "_blank" : undefined} rel={item.type === "link" ? "noopener noreferrer" : undefined}>{item.type === "phone" ? <PhoneIcon aria-hidden="true" /> : <ExternalLinkIcon aria-hidden="true" />}<span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowRightIcon className="ml-auto" size={16} aria-hidden="true" /></a></li>)}</ul>
          <Collapsible><CollapsibleTrigger className={styles.resourceTrigger}>查看更多支持资源 <ChevronDownIcon size={16} aria-hidden="true" /></CollapsibleTrigger><CollapsibleContent><ul className={styles.extraResources}>{SUPPORT_RESOURCES.slice(3).map((item) => <li key={item.label}><a href={item.href} target={item.type === "link" ? "_blank" : undefined} rel={item.type === "link" ? "noopener noreferrer" : undefined}><strong>{item.label}</strong><span>{item.description}</span><ExternalLinkIcon size={15} aria-hidden="true" /></a></li>)}</ul></CollapsibleContent></Collapsible>
          <div className={styles.safetyNote}><ShieldCheckIcon size={19} aria-hidden="true" /><p>这里由 AI 提供陪伴，不能替代律师、医生或紧急服务。页面涉及性暴力与创伤主题，感到不适时，你可以随时停下。<strong> 说多少、何时离开，都由你决定。</strong></p></div>
          <Dialog><DialogTrigger asChild><Button variant="ghost" className={styles.privacyTrigger}><LockKeyholeIcon size={16} />查看数据与隐私承诺</Button></DialogTrigger>
            <DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>你的信息由你决定</DialogTitle><DialogDescription asChild><div className="space-y-4 text-left text-sm leading-6">
              <p>未登录时，对话只在当前页面临时处理，不会写入云端记录。</p>
              <div><p className="font-medium text-foreground">登录后默认开启云端同步</p><p>登录用户的新消息会默认加密存储并用于跨设备恢复；登录前的临时消息不会自动上传。你可以在聊天页随时关闭同步。</p></div>
              <div><p className="font-medium text-foreground">用途受到限制</p><p>对话记录只用于向你恢复历史和继续聊天，不用于广告画像；匿名故事投稿仍使用独立授权和脱敏流程。</p></div>
              <div><p className="font-medium text-foreground">你可以撤回</p><p>你可以关闭未来保存，并在对话记录页删除单条或全部历史。</p></div>
            </div></DialogDescription></DialogHeader><Button variant="outline" asChild><Link href="/privacy">阅读完整隐私说明</Link></Button></DialogContent>
          </Dialog>
        </section>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.footerBrand}><SparklesIcon size={20} aria-hidden="true" />如荧</Link><p>一点微光，也可以照亮彼此。</p><nav aria-label="页脚导航"><Link href="/learn">科普</Link><Link href="/stories">匿名案例</Link><Link href="/privacy">隐私与数据</Link></nav></footer>
    </div>
  )
}
