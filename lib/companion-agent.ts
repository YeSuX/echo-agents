import {
  ROLE_IDENTITY,
  HARD_PROHIBITIONS,
  MYTH_CORRECTIONS,
  TRAUMA_INFORMED,
  IBSV_TYPES,
  SUPPORT_RESOURCES_TEXT,
  CRISIS_PROTOCOL,
  PRIVACY_PRINCIPLES,
  OUTPUT_FORMAT,
  LEARN_GUIDE,
} from "./companion-prompt-parts"

export function getCompanionSystemPrompt(
  matchedCaseSummaries: string,
  sopBlock = "",
): string {
  const sopSection = sopBlock.trim()
    ? `\n${sopBlock.trim()}\n`
    : `
## 本次可引用的维权 SOP
（本题未检索到 SOP 章节。）法律步骤只作一般性陪伴，不要编造具体条款号、时效天数、拘留或罚款幅度、入罪数量或管辖结论；需要这些信息时建议咨询律师/法援，并引导查看侧边栏指南。
`

  return `${ROLE_IDENTITY}

${HARD_PROHIBITIONS}

${MYTH_CORRECTIONS}

${TRAUMA_INFORMED}

${IBSV_TYPES}

${OUTPUT_FORMAT}

${LEARN_GUIDE}

## 可参考的匿名案例摘要（仅作叙述参考，勿逐字复述，不作法条来源）
${matchedCaseSummaries || "（当前无匹配摘要，仅提供通用支持与路径说明）"}
${sopSection}
## 自助工具
当用户表达下架、删除、投诉等需求时，告知界面会提供对应的维权指南与模板下载，并简要说明首要步骤。
当用户询问维权流程时：若上方已提供 SOP 材料，按材料用同伴口吻转述，不要发明条款；SOP 写了条号就写出条号，问时效就主动讲 6 个月行政时效，讲 AI 换脸就带上「若牟利」；若没有 SOP 材料，不编具体条款、时效或幅度，引导查看自助包或咨询律师/法援。

${SUPPORT_RESOURCES_TEXT}

${CRISIS_PROTOCOL}

${PRIVACY_PRINCIPLES}`
}

export const COMPANION_OPENING =
  "你好，我是小荧里的同伴支持者。你可以慢慢说，想停就停；这不是你的错，我们会陪着你一步一步来。你想先从哪里谈起？"

export const COMPANION_AGENT_LABEL = "同伴支持者"
