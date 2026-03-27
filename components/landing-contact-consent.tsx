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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { SUPPORT_RESOURCES } from "@/data/support-resources"

const SAFE_EXIT_URL = "https://www.google.com"
const SUPPORT_CHAT_PATH = "/support"

export function LandingContactConsent() {
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-24 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          aria-hidden
        >
          <span className="text-xs">Logo</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          小影
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 影像性暴力相关困扰的支持与同伴对话
        </p>
      </header>

      <section className="mb-6" aria-labelledby="product-heading">
        <h2 id="product-heading" className="sr-only">
          本产品是什么
        </h2>
        <p className="text-sm leading-relaxed text-foreground">
          小影提供温暖的同伴式对话、自助工具与科普内容。对话由 AI
          在严格安全边界内回应；这不是你的错，每一步都可以按你的节奏来。
        </p>
      </section>

      <section className="mb-6" aria-label="触发警告与支持资源" role="region">
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
              内容涉及性暴力与创伤相关主题，可能引发不适或触发反应。
            </span>
            <span className="mt-1 block">
              您可以随时离开页面；若需要支持，请使用下方「支持资源」。
            </span>
          </AlertDescription>
        </Alert>

        <div
          id="support"
          className="mt-4 scroll-mt-4 rounded-lg border bg-card p-4"
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Heart className="size-4 text-muted-foreground" />
            支持资源
          </h3>
          <ul className="space-y-2 text-sm" role="list">
            {SUPPORT_RESOURCES.slice(0, 3).map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target={item.type === "link" ? "_blank" : undefined}
                  rel={
                    item.type === "link" ? "noopener noreferrer" : undefined
                  }
                  className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {item.type === "phone" ? (
                    <Phone className="size-3.5" />
                  ) : (
                    <ExternalLink className="size-3" />
                  )}
                  {item.label}
                  {item.description && (
                    <span className="text-muted-foreground">
                      （{item.description}）
                    </span>
                  )}
                </a>
              </li>
            ))}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="inline-flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
                更多资源
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1.5 pl-0 text-sm">
                  {SUPPORT_RESOURCES.slice(3).map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target={item.type === "link" ? "_blank" : undefined}
                        rel={
                          item.type === "link"
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                      >
                        {item.label}
                        {item.description && (
                          <span className="text-muted-foreground">
                            （{item.description}）
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </ul>
        </div>
      </section>

      <Separator className="my-6" />

      <section className="mb-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">隐私承诺（摘要）</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
          <li>• 默认「不留痕」：除非你主动授权，系统不存储对话</li>
          <li>• 若选择留下故事，AI 会自动脱敏（替换姓名、手机号等为 [已隐藏]）</li>
          <li>• 留存数据仅用于影像性暴力监测与政策倡导，不用于商业分析</li>
          <li>• 你随时可撤回授权</li>
        </ul>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs">
              查看完整说明
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>隐私承诺：安全、尊重与集体的力量</DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed" asChild>
                <div className="space-y-3">
                  <p>
                    在这里，你的安全是第一位的。这份约定旨在告诉你：我们如何保护你，以及我们如何聚沙成塔，共同反抗影像性暴力。
                  </p>
                  <p className="font-medium text-foreground">
                    1. 默认「不留痕」，除非你决定发声
                  </p>
                  <p>
                    除非你主动授权，否则系统不会存储你的对话信息。一旦关闭网页或结束会话，数据将从临时内存中抹除。如果你愿意将经历留给我们，用于协助监测此类事件的趋势、推动法律改进或进行公益倡导，你可以选择授权存储。
                  </p>
                  <p className="font-medium text-foreground">
                    2. 自动「面纱」：你的真实身份会被隐藏
                  </p>
                  <p>
                    即便你选择留下故事，AI 也会在第一时间为你戴上「面纱」。当检测到姓名、手机号、具体社交账号、URL链接时，会将其替换为 [已隐藏]。
                  </p>
                  <p className="font-medium text-foreground">
                    3. 数据处理与安全边界
                  </p>
                  <p>
                    我们采用标准的工业级传输加密技术（SSL/HTTPS），确保信息在发送过程中不会被截获。留存的数据仅限用于影像性暴力监测与政策倡导，绝不用于商业分析、画像建模或交给任何非法律/公益背景的第三方。
                  </p>
                  <p className="font-medium text-foreground">
                    4. 你随时可以「反悔」
                  </p>
                  <p>
                    如果你之前分享了故事，但现在感到不安，你可以随时联系我们或通过设置撤回授权。你对自己的经历拥有永久的「撤回权」。
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" asChild>
              <Link href="/privacy">查看隐私页面</Link>
            </Button>
          </DialogContent>
        </Dialog>
      </section>

      <section className="mb-8" aria-label="知情与选择" role="region">
        <p className="mb-4 text-xs text-muted-foreground">
          点击「寻求帮助」即表示您已阅读上述说明，并知悉内容可能带来的影响。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild>
            <a href={SAFE_EXIT_URL} target="_blank" rel="noopener noreferrer">
              暂时离开
            </a>
          </Button>
          <Button asChild size="lg">
            <Link href={SUPPORT_CHAT_PATH}>寻求帮助</Link>
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/guests" className="underline-offset-4 hover:underline">
            想听嘉宾故事？进入嘉宾列表
          </Link>
          <span className="mx-1">·</span>
          <Link href="/learn" className="underline-offset-4 hover:underline">
            科普
          </Link>
          <span className="mx-1">·</span>
          <Link href="/stories" className="underline-offset-4 hover:underline">
            案例
          </Link>
        </p>
      </section>

      <footer className="text-center text-xs text-muted-foreground">
        <p className="flex flex-wrap items-center justify-center gap-x-2">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            隐私与数据
          </Link>
          <span aria-hidden>·</span>
          <span>联系我们（占位）</span>
        </p>
      </footer>
    </div>
  )
}
