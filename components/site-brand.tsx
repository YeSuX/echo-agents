import Image from "next/image"
import Link from "next/link"

import { DESIGN_ASSETS } from "@/lib/design-assets"
import { ORGANIZATION } from "@/data/organization"

export function SiteBrand({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label={`${ORGANIZATION.name}，返回首页`}>
      <Image src={DESIGN_ASSETS.companion} alt="" width={36} height={36} sizes="36px" />
      <span>{ORGANIZATION.name}</span>
    </Link>
  )
}
