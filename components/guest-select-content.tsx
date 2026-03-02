"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserIcon } from "lucide-react"

import { GUESTS } from "@/data/guests"
import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"

/** 再次触发警告弹窗：点击「进入对话」后展示，确认后跳转该嘉宾对话页 */
function TriggerWarningDialog({
  open,
  onOpenChange,
  guestName,
  guestId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  guestId: string
}) {
  const router = useRouter()

  const handleEnter = () => {
    onOpenChange(false)
    router.push(`/guests/${guestId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>进入对话前</DialogTitle>
          <DialogDescription>
            对话内容基于嘉宾授权分享的经历与观点，可能涉及敏感话题。若您感到不适，可随时离开或使用「支持资源」。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            再想想
          </Button>
          <Button onClick={handleEnter}>
            进入与 {guestName} 的对话
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 剪影占位：无真实头像时使用 */
function GuestAvatarPlaceholder() {
  return (
    <div
      className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-20"
      aria-hidden
    >
      <UserIcon className="size-8 sm:size-10" />
    </div>
  )
}

export function GuestSelectContent() {
  const [dialogState, setDialogState] = useState<{
    open: boolean
    guestId: string
    guestName: string
  }>({ open: false, guestId: "", guestName: "" })

  const openTriggerWarning = (guestId: string, guestName: string) => {
    setDialogState({ open: true, guestId, guestName })
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* 头部：返回 + 标题 + 支持资源 */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              返回首页
            </Link>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              选择一位嘉宾
            </h1>
            <p className="text-sm text-muted-foreground">
              通过对话了解 ta 愿意分享的故事
            </p>
          </div>
          <SupportResourcesDropdown />
        </header>

        {/* 嘉宾卡片网格：3×3 桌面，2 列平板，1 列移动 */}
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
        >
          {GUESTS.map((guest) => (
            <li key={guest.id}>
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  <GuestAvatarPlaceholder />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium leading-none">{guest.name}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {guest.tagline}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1" />
                <CardFooter className="pt-0">
                  <Button
                    className="w-full"
                    onClick={() => openTriggerWarning(guest.id, guest.name)}
                  >
                    进入对话
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>

        {/* 页脚 */}
        <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
          <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
            <Link href="/" className="underline-offset-4 hover:underline">
              返回首页
            </Link>
            <span aria-hidden>·</span>
            <Link href="/#support" className="underline-offset-4 hover:underline">
              支持资源
            </Link>
            <span aria-hidden>·</span>
            <span>隐私说明</span>
          </p>
        </footer>
      </div>

      <TriggerWarningDialog
        open={dialogState.open}
        onOpenChange={(open) =>
          setDialogState((s) => ({ ...s, open }))
        }
        guestId={dialogState.guestId}
        guestName={dialogState.guestName}
      />
    </div>
  )
}
