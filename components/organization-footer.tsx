import Image from "next/image"
import { MailIcon } from "lucide-react"

import { ORGANIZATION, SOCIAL_CHANNELS } from "@/data/organization"
import { SiteBrand } from "@/components/site-brand"
import styles from "@/components/landing-contact-consent.module.css"

export function OrganizationFooter() {
  return (
    <footer className={styles.footer}>
      <SiteBrand className={styles.footerBrand} />
      <p>一点微光，也可以照亮彼此。</p>
      <nav aria-label="联系与社交平台" className={styles.socialLinks}>
        {SOCIAL_CHANNELS.map((channel) => (
          <a key={channel.name} href={channel.href} target="_blank" rel="noopener noreferrer" aria-label={`${ORGANIZATION.name} · ${channel.name}（新窗口打开）`}>
            <Image src={channel.logoSrc} width={22} height={22} alt="" />
          </a>
        ))}
        <a href={`mailto:${ORGANIZATION.supportEmail}`} aria-label="通过邮箱联系如荧">
          <MailIcon size={20} aria-hidden="true" /><span>联系如荧</span>
        </a>
      </nav>
    </footer>
  )
}
