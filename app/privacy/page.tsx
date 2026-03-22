import Link from "next/link"

export default function PrivacyPlaceholderPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">隐私与数据（占位）</h1>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
        正式隐私政策、用户协议与数据处理说明待定。当前版本不默认持久化你的对话内容；若你主动提交匿名故事，仅写入待审核队列文件。
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        返回首页
      </Link>
    </div>
  )
}
