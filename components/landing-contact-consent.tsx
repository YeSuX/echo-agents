"use client"

import Link from "next/link"
import Image from "next/image"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  HeartHandshakeIcon,
  LockKeyholeIcon,
  MessagesSquareIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AuthControls } from "@/components/auth-controls"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SUPPORT_RESOURCES } from "@/data/support-resources"
import { GUESTS } from "@/data/guests"

const SAFE_EXIT_URL = "https://www.google.com"

export function LandingContactConsent() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="小荧首页"
        >
          <Image
            src="/logo.PNG"
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-full object-cover"
          />
          <span className="font-semibold tracking-tight">小荧</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="辅助导航">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/privacy">隐私说明</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="#support">支持资源</a>
          </Button>
          <AuthControls />
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-12">
        <section aria-labelledby="welcome-heading" className="max-w-xl">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HeartHandshakeIcon className="size-6" aria-hidden="true" />
          </div>
          <h1
            id="welcome-heading"
            className="max-w-lg text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl"
          >
            你不需要一个人处理这些
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            小荧提供 AI 同伴对话、应对工具和可信支持资源。你可以少说一点，也可以随时停下。
          </p>
          <p className="mt-4 font-medium text-foreground">这不是你的错。</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-6" asChild>
              <Link href="/support">
                寻求帮助
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6" asChild>
              <Link href="/learn">先了解应对方法</Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyholeIcon className="size-4" aria-hidden="true" />
              未登录时对话不保存
            </span>
            <a
              href={SAFE_EXIT_URL}
              className="rounded font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              暂时离开此页
            </a>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-2xl border bg-card shadow-[0_18px_50px_-32px_oklch(0.32_0.08_315/0.28)]"
          aria-label="安全说明"
        >
          <div className="border-b bg-primary/[0.035] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">先确认你的安全与选择</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  对话由 AI 回应，不能替代律师、医生或紧急服务。你始终可以决定说什么、何时离开。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangleIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold">内容提醒</h3>
                <p className="mt-1 text-sm leading-6 opacity-90">
                  页面涉及性暴力和创伤主题，可能引发不适。感到不舒服时，请立即停下或使用下方资源。
                </p>
              </div>
            </div>

            <div id="support" className="scroll-mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold">需要真人支持</h3>
                <span className="text-xs text-muted-foreground">可直接拨打</span>
              </div>
              <ul className="space-y-2" role="list">
                {SUPPORT_RESOURCES.slice(0, 3).map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target={item.type === "link" ? "_blank" : undefined}
                      rel={item.type === "link" ? "noopener noreferrer" : undefined}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.type === "phone" ? (
                        <PhoneIcon className="size-4 shrink-0 text-primary" />
                      ) : (
                        <ExternalLinkIcon className="size-4 shrink-0 text-primary" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <Collapsible>
                <CollapsibleTrigger className="mt-2 flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  查看更多支持资源
                  <ChevronDownIcon className="size-4" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1" role="list">
                    {SUPPORT_RESOURCES.slice(3).map((item) => (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          target={item.type === "link" ? "_blank" : undefined}
                          rel={item.type === "link" ? "noopener noreferrer" : undefined}
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 w-full justify-start">
                  <LockKeyholeIcon className="size-4 text-primary" />
                  查看数据与隐私承诺
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[82vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>你的信息由你决定</DialogTitle>
                  <DialogDescription asChild>
                    <div className="space-y-4 text-left text-sm leading-6">
                      <p>未登录时，对话只在当前页面临时处理，不会写入云端记录。</p>
                      <div>
                        <p className="font-medium text-foreground">登录后默认开启云端同步</p>
                        <p>登录用户的新消息会默认加密存储并用于跨设备恢复；登录前的临时消息不会自动上传。你可以在聊天页随时关闭同步。</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">用途受到限制</p>
                        <p>对话记录只用于向你恢复历史和继续聊天，不用于广告画像；匿名故事投稿仍使用独立授权和脱敏流程。</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">你可以撤回</p>
                        <p>你可以关闭未来保存，并在对话记录页删除单条或全部历史。</p>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <Button variant="outline" asChild>
                  <Link href="/privacy">阅读完整隐私说明</Link>
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      </main>

      <section
        className="border-y border-border/70 bg-primary/[0.025]"
        aria-labelledby="guest-stories-heading"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-7 sm:px-8 sm:py-9 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <MessagesSquareIcon className="size-4" aria-hidden="true" />
              另一种了解方式
            </div>
            <h2
              id="guest-stories-heading"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              听听嘉宾愿意分享的故事
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              和不同经历的嘉宾对话，了解他们如何面对关系、舆论、司法程序与日常生活。
            </p>
            <Button variant="outline" className="mt-5" asChild>
              <Link href="/guests">
                查看全部嘉宾
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex shrink-0 -space-x-3" aria-hidden="true">
              {GUESTS.slice(0, 4).map((guest) => (
                <Image
                  key={guest.id}
                  src={guest.avatar}
                  alt=""
                  width={64}
                  height={64}
                  className="size-12 rounded-full border-2 border-card object-cover sm:size-14"
                />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">9 位嘉宾，9 种不同的经验</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                所有姓名均为化名，可先浏览主题再决定是否进入对话。
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-muted-foreground sm:px-8">
        <span>公益支持工具，不提供紧急救援服务</span>
        <nav className="flex items-center gap-4" aria-label="页脚导航">
          <Link href="/stories" className="hover:text-foreground">案例</Link>
          <Link href="/privacy" className="hover:text-foreground">隐私与数据</Link>
        </nav>
      </footer>
    </div>
  )
}
