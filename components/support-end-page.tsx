"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  HeartHandshakeIcon,
  PhoneIcon,
} from "lucide-react"

import { StoryContributionDialog } from "@/components/story-contribution-dialog"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SUPPORT_RESOURCES } from "@/data/support-resources"

export function SupportEndPage() {
  const pathname = usePathname()
  const returningToGuests = pathname.startsWith("/guests")
  const [draft] = useState(() => {
    if (typeof window === "undefined") return ""
    const d = sessionStorage.getItem("companion-story-draft") ?? ""
    sessionStorage.removeItem("companion-story-draft")
    return d
  })
  const [storyOpen, setStoryOpen] = useState(false)

  return (
    <div className="flex min-h-[100dvh] flex-col bg-muted/20">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        <div className="rounded-2xl border bg-background p-6 shadow-[0_18px_50px_-36px_oklch(0.32_0.08_315/0.3)] sm:p-8">
          <Image
            src="/logo.PNG"
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            现在可以停下来
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            谢谢你在这里停留。你可以继续对话、看看其他内容，也可以直接关闭页面。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button size="lg" asChild>
              <Link href={returningToGuests ? "/guests" : "/support"}>
                <ArrowLeftIcon className="size-4" />
                {returningToGuests ? "返回嘉宾列表" : "返回同伴对话"}
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/">回到首页</Link>
            </Button>
          </div>

          {!returningToGuests && (
            <section className="mt-6 rounded-xl bg-primary/[0.055] p-4">
              <div className="flex items-start gap-3">
                <HeartHandshakeIcon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">分享完全自愿</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    如果你愿意，可以匿名留下经历。提交前会再次说明用途与隐私处理方式。
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-background"
                    type="button"
                    onClick={() => setStoryOpen(true)}
                  >
                    匿名分享经历
                  </Button>
                </div>
              </div>
            </section>
          )}

          <Collapsible className="mt-6 border-t pt-4">
            <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              需要真人支持
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="px-2 pb-2 text-xs text-muted-foreground">
                感到不适或需要帮助时，可以直接联系以下机构。
              </p>
              <ul className="space-y-1" role="list">
                {SUPPORT_RESOURCES.map((item) => {
                  const Icon = item.type === "phone" ? PhoneIcon : ExternalLinkIcon
                  return (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target={item.type === "link" ? "_blank" : undefined}
                        rel={item.type === "link" ? "noopener noreferrer" : undefined}
                        className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block font-medium">{item.label}</span>
                          {item.description && (
                            <span className="block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          直接关闭页签即可离开，无需额外操作。
        </p>
      </main>

      <StoryContributionDialog
        open={storyOpen}
        onOpenChange={setStoryOpen}
        initialDraft={draft}
      />
    </div>
  )
}
