import Link from "next/link"

import { LEARN_SECTIONS } from "@/data/learn-sections"
import { AgentMarkdown } from "@/components/agent-markdown"

export default function LearnPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        返回首页
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        科普 · 小影
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        了解影像性暴力的定义、类型、法律常识与支持资源。
      </p>

      <nav className="mt-6 rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">目录</p>
        <ul className="space-y-1 text-sm">
          {LEARN_SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {LEARN_SECTIONS.map((s) => (
        <section key={s.id} className="mt-10 scroll-mt-8 space-y-4" id={s.id}>
          <h2 className="text-lg font-medium">{s.title}</h2>
          <AgentMarkdown content={s.content} className="text-sm" />
        </section>
      ))}

      <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
        <Link href="/support" className="underline-offset-4 hover:underline">
          需要同伴对话
        </Link>
        <span className="mx-2">·</span>
        <Link href="/stories" className="underline-offset-4 hover:underline">
          看看案例
        </Link>
      </footer>
    </div>
  )
}
