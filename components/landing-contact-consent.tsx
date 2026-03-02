"use client"

import Link from "next/link"
import { AlertTriangle, ExternalLink, Phone, Heart } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"

/** 安全出口：暂时离开时跳转至中性页面，不做挽留 */
const SAFE_EXIT_URL = "https://www.google.com"

/** 进入后跳转至嘉宾列表（占位路由，后续实现） */
const GUEST_LIST_PATH = "/guests"

export function LandingContactConsent() {
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-8 sm:px-6 sm:py-10">
      {/* 品牌 / 产品名 + 副标题 */}
      <header className="mb-8 text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-24 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          aria-hidden
        >
          {/* Logo 占位符 */}
          <span className="text-xs">Logo</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          幸存者故事
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          用对话了解故事
        </p>
      </header>

      {/* 产品说明 */}
      <section className="mb-6" aria-labelledby="product-heading">
        <h2 id="product-heading" className="sr-only">
          本产品是什么
        </h2>
        <p className="text-sm leading-relaxed text-foreground">
          通过与嘉宾的对话，了解他们愿意分享的经历与观点。内容均来自已授权的采访，由
          AI 在设定边界内代为回答。
        </p>
      </section>

      {/* 触发警告 + 支持资源入口同层 */}
      <section
        className="mb-6"
        aria-label="触发警告与支持资源"
        role="region"
      >
        <Alert
          variant="default"
          className="border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            触发警告（Trigger Warning）
          </AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-200/90">
            <span className="block">
              本产品内容涉及性暴力与创伤相关叙述，可能引发不适或触发反应。
            </span>
            <span className="mt-1 block">
              您可以随时离开页面；若需要支持，请使用下方「支持资源」。
            </span>
          </AlertDescription>
        </Alert>

        {/* 支持资源：首屏可见，链接可键盘聚焦 */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Heart className="size-4 text-muted-foreground" />
            支持资源
          </h3>
          <ul className="space-y-2 text-sm" role="list">
            <li>
              <a
                href="tel:010-12345678"
                className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                <Phone className="size-3.5" />
                全国 24 小时热线：010-12345678
              </a>
            </li>
            <li>
              <a
                href="https://example.org/support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                某机构名称
                <ExternalLink className="size-3" />
              </a>
            </li>
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="inline-flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
                更多资源
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1.5 pl-0 text-sm">
                  <li>
                    <a
                      href="https://example.org/more"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                    >
                      更多资源链接
                      <ExternalLink className="ml-1 inline size-3" />
                    </a>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </ul>
        </div>
      </section>

      <Separator className="my-6" />

      {/* 知情与选择：说明 + 按钮，Tab 顺序 暂时离开 → 进入 */}
      <section
        className="mb-8"
        aria-label="知情与选择"
        role="region"
      >
        <p className="mb-4 text-xs text-muted-foreground">
          点击「进入」即表示您已阅读上述说明，并知悉内容可能带来的影响。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild>
            <a
              href={SAFE_EXIT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              暂时离开
            </a>
          </Button>
          <Button asChild size="lg">
            <Link href={GUEST_LIST_PATH}>进入</Link>
          </Button>
        </div>
      </section>

      {/* 页脚（可选） */}
      <footer className="text-center text-xs text-muted-foreground">
        <p>
          项目说明 · 隐私与数据 · 联系我们
        </p>
      </footer>
    </div>
  )
}
