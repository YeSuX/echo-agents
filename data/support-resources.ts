export type SupportResource = {
  label: string
  href: string
  type: "phone" | "link"
  description?: string
}

export const SUPPORT_RESOURCES: readonly SupportResource[] = [
  {
    label: "为平妇女权益 24 小时热线",
    href: "tel:15117905157",
    type: "phone",
    description: "15117905157（全年无休）",
  },
  {
    label: "源众反性别暴力专线",
    href: "tel:17701242202",
    type: "phone",
    description: "17701242202",
  },
  {
    label: "北京千千律师事务所",
    href: "tel:010-84833276",
    type: "phone",
    description: "010-84833276（工作日 9-12, 13-17）",
  },
  {
    label: "橙律师（微信咨询）",
    href: "https://weixin.qq.com",
    type: "link",
    description: "微信号 chenglvshi365",
  },
  {
    label: "红枫心理支持热线",
    href: "tel:010-68333388",
    type: "phone",
    description: "010-68333388（周一至五 9-21）",
  },
  {
    label: "彩虹暴力终结所",
    href: "tel:400-1166-308",
    type: "phone",
    description: "400-1166-308（性少数群体支持）",
  },
] as const

export const CRISIS_HOTLINE = "15117905157"
export const CRISIS_HOTLINE_LABEL = "为平妇女权益 24 小时热线"
