"use client";

import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon, PhoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/** 阶段四「离开或继续」：离开路径清晰、支持资源明显、收尾温和无 stigma */
const SUPPORT_RESOURCES = [
  {
    label: "全国 24 小时热线：010-12345678",
    href: "tel:010-12345678",
    icon: PhoneIcon,
    external: false,
  },
  {
    label: "某机构名称",
    href: "https://example.org/support",
    external: true,
    icon: ExternalLinkIcon,
  },
  {
    label: "更多资源",
    href: "https://example.org/more",
    external: true,
    icon: ExternalLinkIcon,
  },
] as const;

export function LeaveOrContinuePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        {/* 插画占位：可替换为平静离开/反思主题插画 */}
        <div
          className="mx-auto mb-6 flex aspect-square w-40 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
          aria-hidden
        >
          <span className="text-sm">插画占位</span>
        </div>

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
                  const Icon = item.icon;
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.external && (
                          <ExternalLinkIcon className="size-3.5 shrink-0 opacity-60" />
                        )}
                      </Link>
                    </li>
                  );
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
  );
}
