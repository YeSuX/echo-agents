"use client"

import Link from "next/link"
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs"
import { HistoryIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AuthControls({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            登录
          </Button>
        </SignInButton>
        {!compact && (
          <SignUpButton mode="modal">
            <Button size="sm">注册</Button>
          </SignUpButton>
        )}
      </Show>
      <Show when="signed-in">
        {!compact && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/conversations">
              <HistoryIcon className="size-4" />
              对话记录
            </Link>
          </Button>
        )}
        <UserButton userProfileMode="modal">
          <UserButton.MenuItems>
            <UserButton.Link
              label="对话记录"
              labelIcon={<HistoryIcon className="size-4" />}
              href="/conversations"
            />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </div>
  )
}
