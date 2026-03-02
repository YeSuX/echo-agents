import Link from "next/link"

/**
 * 嘉宾列表页占位，对应旅程阶段二。
 * 后续按 MVP 设计实现嘉宾卡片与选择流程。
 */
export default function GuestsPage() {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-8">
      <h1 className="text-xl font-semibold">选择一位嘉宾</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        嘉宾列表页（占位，待实现）
      </p>
      <Link
        href="/"
        className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        返回首屏
      </Link>
    </div>
  )
}
