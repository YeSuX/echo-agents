"use client"

import { ChevronDownIcon, ExternalLinkIcon, PhoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** 支持资源下拉：与首屏内容一致，用于嘉宾列表页等常驻入口 */
export function SupportResourcesDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          支持资源
          <ChevronDownIcon className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          若您感到不适，可随时使用以下资源
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a
            href="tel:010-12345678"
            className="flex cursor-pointer items-center gap-2"
          >
            <PhoneIcon className="size-4" />
            全国 24 小时热线：010-12345678
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://example.org/support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex cursor-pointer items-center gap-2"
          >
            某机构名称
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://example.org/more"
            target="_blank"
            rel="noopener noreferrer"
            className="flex cursor-pointer items-center gap-2"
          >
            更多资源
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
