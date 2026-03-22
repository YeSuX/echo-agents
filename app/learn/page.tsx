import Link from "next/link"

export default function LearnPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        返回首页
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">科普 · 小影</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        以下为占位稿，便于产品与法务后续替换。
      </p>

      <section className="mt-10 space-y-4" id="definition">
        <h2 className="text-lg font-medium">什么是 AI 影像性暴力</h2>
        <p className="text-sm leading-relaxed text-foreground">
          指利用人工智能生成、篡改或传播带有性意味的影像，并在未经同意的情况下用于羞辱、控制、勒索或牟利等行为。过错在于滥用技术的人，而非被针对的人。
        </p>
      </section>

      <section className="mt-10 space-y-4" id="law">
        <h2 className="text-lg font-medium">法律常识（占位）</h2>
        <p className="text-sm leading-relaxed text-foreground">
          不同法域对「深度伪造」「隐私权」「人格权」等有不同规定。若你考虑报案或诉讼，建议向当地律师或法律援助机构核实适用条款与程序。
        </p>
      </section>

      <section className="mt-10 space-y-4" id="types">
        <h2 className="text-lg font-medium">常见形式（占位）</h2>
        <ul className="list-inside list-disc text-sm leading-relaxed text-foreground">
          <li>社交平台传播或二次传播</li>
          <li>私密渠道勒索或威胁</li>
          <li>恶意拼接、换脸等伪造内容</li>
        </ul>
      </section>

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
