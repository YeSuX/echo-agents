"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Phone, Heart } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const SAFE_EXIT_URL = "https://www.google.com";
const SUPPORT_CHAT_PATH = "/support";

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

      <section className="mb-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">隐私承诺（摘要）</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          不默认公开你的对话；自助包与链接仅在页面内提供。
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs">
              查看完整说明（占位）
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>隐私与数据</DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed">
                完整隐私政策与用户协议待定。你可随时关闭页面离开。若提交匿名内容，请避免包含可识别信息。
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" asChild>
              <Link href="/privacy">打开隐私占位页</Link>
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
  );
}
