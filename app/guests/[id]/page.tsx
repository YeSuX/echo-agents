import Link from "next/link"

type Props = { params: Promise<{ id: string }> }

/** 对话页占位：选择嘉宾并确认「再次触发警告」后进入，后续实现对话 UI */
export default async function GuestChatPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">与嘉宾的对话</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        对话页（占位）— 嘉宾 ID: {id}
      </p>
      <Link
        href="/guests"
        className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        返回嘉宾列表
      </Link>
    </div>
  )
}
