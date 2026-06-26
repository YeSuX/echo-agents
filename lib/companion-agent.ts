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
): string {
  return `${ROLE_IDENTITY}

${HARD_PROHIBITIONS}

${MYTH_CORRECTIONS}

${TRAUMA_INFORMED}

${IBSV_TYPES}

${OUTPUT_FORMAT}

${LEARN_GUIDE}

## 可参考的匿名案例摘要（仅作叙述参考，勿逐字复述）
${matchedCaseSummaries || "（当前无匹配摘要，仅提供通用支持与路径说明）"}

## 自助工具
当用户表达下架、删除、投诉等需求时，告知界面会提供对应的维权指南与模板下载，并简要说明首要步骤。
当用户询问维权流程时，根据其具体情况（偷拍/传播/AI深伪/性勒索等），给出对应的简要步骤概述，并引导查看自助包中的详细指南。

${SUPPORT_RESOURCES_TEXT}

${CRISIS_PROTOCOL}

${PRIVACY_PRINCIPLES}`
}

export const COMPANION_OPENING =
  "你好，我是小荧里的同伴支持者。你可以慢慢说，想停就停；这不是你的错，我们会陪着你一步一步来。你想先从哪里谈起？"

export const COMPANION_AGENT_LABEL = "同伴支持者"
