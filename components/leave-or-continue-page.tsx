"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeftIcon, ExternalLinkIcon, PhoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SUPPORT_RESOURCES } from "@/data/support-resources"

export function LeaveOrContinuePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <Image
          src="/logo.PNG"
          alt="小荧"
          width={128}
          height={128}
          className="mx-auto mb-6 h-32 w-32 rounded-full object-cover"
        />

        <Card>
          <CardHeader className="text-center">
            <CardTitle>感谢你的停留</CardTitle>
            <CardDescription>
              你可以随时返回嘉宾列表换一位听听，或关闭页面离开。若需要倾诉或帮助，下方有支持资源。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full gap-2" size="lg" asChild>
              <Link href="/guests">
                <ArrowLeftIcon className="size-4" />
                返回嘉宾列表
              </Link>
            </Button>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">支持资源</p>
              <p className="text-xs text-muted-foreground">
                若您感到不适，可随时使用以下资源
              </p>
              <ul className="space-y-1.5">
                {SUPPORT_RESOURCES.map((item) => {
                  const Icon =
                    item.type === "phone" ? PhoneIcon : ExternalLinkIcon
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        target={item.type === "link" ? "_blank" : undefined}
                        rel={
                          item.type === "link"
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block">{item.label}</span>
                          {item.description && (
                            <span className="block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-1 border-t pt-6">
            <p className="text-center text-xs text-muted-foreground">
              直接关闭页签即可离开，无需额外操作。
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
