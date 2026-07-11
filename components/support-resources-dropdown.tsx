"use client"

import {
  ChevronDownIcon,
  ExternalLinkIcon,
  HeartHandshakeIcon,
  PhoneIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SUPPORT_RESOURCES } from "@/data/support-resources"

export function SupportResourcesDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HeartHandshakeIcon className="size-4 text-primary" />
          紧急支持
          <ChevronDownIcon className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          若您感到不适，可随时使用以下资源
        </DropdownMenuLabel>
        {SUPPORT_RESOURCES.map((item) => {
          const Icon = item.type === "phone" ? PhoneIcon : ExternalLinkIcon
          return (
            <DropdownMenuItem key={item.label} asChild>
              <a
                href={item.href}
                target={item.type === "link" ? "_blank" : undefined}
                rel={item.type === "link" ? "noopener noreferrer" : undefined}
                className="flex cursor-pointer items-center gap-2"
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
              </a>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
