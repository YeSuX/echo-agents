import { REDACT_PLACEHOLDER } from "./constants"

/** 中国大陆手机号（含 +86 / 空格 / 连字符） */
const PHONE_RE =
  /(?:\+?86[\s-]?)?1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}|\b0\d{2,3}[\s-]?\d{7,8}\b/g

/** 邮箱 */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

/** HTTP(S) / www 链接 */
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi

/** 常见社交平台账号 @handle */
const SOCIAL_HANDLE_RE = /@[a-zA-Z0-9_]{3,32}/g

/** 18 位身份证 */
const ID_CARD_RE =
  /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g

/** 微信/QQ 等常见自述模式 */
const IM_ACCOUNT_RE =
  /(?:微信|wx|weixin|qq|QQ号?|账号)[:：\s]*[a-zA-Z0-9_-]{4,32}/gi

function replaceAll(text: string, re: RegExp): string {
  return text.replace(re, REDACT_PLACEHOLDER)
}

/**
 * 规则脱敏：手机号、邮箱、URL、社交账号、身份证、即时通讯账号自述。
 * 不尝试 NLP 姓名识别，避免误伤；故事提交 UI 仍提示用户自行删改。
 */
export function desensitizeText(text: string): string {
  let out = text
  out = replaceAll(out, URL_RE)
  out = replaceAll(out, EMAIL_RE)
  out = replaceAll(out, ID_CARD_RE)
  out = replaceAll(out, PHONE_RE)
  out = replaceAll(out, IM_ACCOUNT_RE)
  out = replaceAll(out, SOCIAL_HANDLE_RE)
  return out
}
