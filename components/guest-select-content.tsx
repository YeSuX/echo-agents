"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { SiteBrand } from "@/components/site-brand"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, HeartHandshakeIcon } from "lucide-react"

import { GUESTS, GUEST_EXPERIENCE_NOTICE, type GuestId } from "@/data/guests"
import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import styles from "./guest-select-content.module.css"

const TOPICS = ["全部主题", "关系与沟通", "面对伤害", "生活与复原"] as const
type Topic = (typeof TOPICS)[number]

// These labels summarize the existing introductions; they do not add story details.
const GUEST_TOPICS: Record<GuestId, { category: Topic; tags: string[] }> = {
  "1": { category: "关系与沟通", tags: ["家人沟通", "家庭关系", "表达感受"] },
  "2": { category: "面对伤害", tags: ["司法程序", "感受与选择", "面对伤害"] },
  "3": { category: "生活与复原", tags: ["康复之路", "支持的力量", "生活与复原"] },
  "4": { category: "面对伤害", tags: ["面对舆论", "二次伤害", "个人感受"] },
  "5": { category: "关系与沟通", tags: ["伴侣关系", "建立信任", "个人边界"] },
  "6": { category: "面对伤害", tags: ["幸存者称呼", "自我认同", "个人视角"] },
  "7": { category: "生活与复原", tags: ["职场生活", "自我照顾", "日常点滴"] },
  "8": { category: "生活与复原", tags: ["写作表达", "表达的力量", "生活与复原"] },
  "9": { category: "关系与沟通", tags: ["被听见", "被理解", "表达自己"] },
}

/** Every guest conversation retains the sensitive-content confirmation. */
function TriggerWarningDialog({
  open,
  onOpenChange,
  guestName,
  guestId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  guestId: string
}) {
  const router = useRouter()

  const handleEnter = () => {
    onOpenChange(false)
    router.push(`/guests/${guestId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>进入对话前</DialogTitle>
          <DialogDescription className="pt-2 leading-7">
            {GUEST_EXPERIENCE_NOTICE} 对话可能涉及敏感话题，感到不适时可随时离开或使用「支持资源」。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            再想想
          </Button>
          <Button onClick={handleEnter}>进入与 {guestName} 的对话</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function GuestSelectContent() {
  const [topic, setTopic] = useState<Topic>("全部主题")
  const [dialogState, setDialogState] = useState<{
    open: boolean
    guestId: string
    guestName: string
  }>({ open: false, guestId: "", guestName: "" })

  const visibleGuests = GUESTS.filter(
    (guest) => topic === "全部主题" || GUEST_TOPICS[guest.id].category === topic
  )

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#guest-stories">跳至嘉宾对话</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <SiteBrand className={styles.brand} />
          <nav aria-label="主导航" className={styles.navigation}>
            <Link href="/">首页</Link>
            <Link href="/support">和小荧聊聊</Link>
            <Link href="/guests" aria-current="page">嘉宾对话</Link>
          </nav>
          <div className={styles.support}><SupportResourcesDropdown /></div>
        </div>
      </header>

      <main id="guest-stories">
        <section className={styles.banner} aria-labelledby="stories-heading">
          <p className={styles.eyebrow}>每一种感受，都值得被听见</p>
          <h1 id="stories-heading">选择 <span>{GUESTS.length} 个主题</span>，体验对话</h1>
          <p className={styles.introduction}>
            {GUEST_EXPERIENCE_NOTICE}
          </p>
        </section>

        <section className={styles.content} aria-label="选择一位嘉宾">
          <div className={styles.filterBar}>
            <div className={styles.filters} role="group" aria-label="按对话主题筛选">
              {TOPICS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={topic === item}
                  aria-controls="guest-list"
                  onClick={() => setTopic(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className={styles.resultCount} role="status" aria-live="polite">
              {visibleGuests.length} 个主题
            </p>
          </div>

          <ul id="guest-list" className={styles.guestGrid}>
            {visibleGuests.map((guest) => (
              <li key={guest.id}>
                <article className={styles.guestCard} aria-labelledby={`guest-${guest.id}`}>
                  <div className={styles.guestIdentity}>
                    <Image
                      src={guest.avatar}
                      alt={`${guest.name}的插画头像`}
                      width={80}
                      height={80}
                      className={styles.avatar}
                    />
                    <div>
                      <h2 id={`guest-${guest.id}`}>{guest.name}</h2>
                      <p>{guest.tagline}</p>
                    </div>
                  </div>
                  <div className={styles.topics}>
                    <p>ta 想和你聊</p>
                    <ul aria-label={`${guest.name}的分享主题`}>
                      {GUEST_TOPICS[guest.id].tags.map((tag) => <li key={tag}>{tag}</li>)}
                    </ul>
                  </div>
                  <Button
                    className={styles.conversationButton}
                    aria-label={`进入与${guest.name}的对话`}
                    onClick={() => setDialogState({ open: true, guestId: guest.id, guestName: guest.name })}
                  >
                    进入对话 <ArrowRightIcon aria-hidden="true" />
                  </Button>
                </article>
              </li>
            ))}
          </ul>

          <div className={styles.reassurance}>
            <HeartHandshakeIcon aria-hidden="true" />
            <p>按照自己的节奏来。如果感到不适，你可以随时暂停或寻求支持。</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>如荧RAYIN · 让每一份微光，都被温柔看见</p>
        <nav aria-label="页脚导航">
          <Link href="/">返回首页</Link>
          <Link href="/#support">支持资源</Link>
          <Link href="/learn">科普</Link>
          <Link href="/stories">案例</Link>
          <Link href="/privacy">隐私</Link>
        </nav>
      </footer>

      <TriggerWarningDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((state) => ({ ...state, open }))}
        guestId={dialogState.guestId}
        guestName={dialogState.guestName}
      />
    </div>
  )
}
