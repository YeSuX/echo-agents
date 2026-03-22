import Link from "next/link"

import { ANONYMOUS_CASES } from "@/data/cases"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function StoriesPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        返回首页
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        匿名案例 · 你并不孤单
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        以下为示意摘要，不含可识别信息；细节已脱敏。
      </p>

      <ul className="mt-8 space-y-4" role="list">
        {ANONYMOUS_CASES.map((c) => (
          <li key={c.id}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <CardTitle className="text-base">{c.title}</CardTitle>
                <CardDescription>{c.storyBlurb}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">走向</p>
                <p className="mt-1">{c.outcomeNote}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        <Link href="/support" className="underline-offset-4 hover:underline">
          与同伴对话
        </Link>
        <span className="mx-2">·</span>
        <Link href="/learn" className="underline-offset-4 hover:underline">
          阅读科普
        </Link>
      </footer>
    </div>
  )
}
