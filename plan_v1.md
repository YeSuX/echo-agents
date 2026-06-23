# plan_v1.md — 基于真实资料的详细实现计划

> 本文档在 `plan.md`（架构与阶段规划）基础上，整合 `data/对话嘉宾参考/`、`data/技术文档/`、`data/维权文档/` 中的**真实内容**，给出 System Prompt 完整草稿、人物访谈数据结构化方案、维权工具资料注入方案，以及对应代码片段。

---

## 0. 与 plan.md 的关系

`plan.md` 定义了 P0→P1→P2 阶段划分和技术架构。本文档聚焦三件事：

1. **补全 System Prompt**：将真实资料（创伤知情理论、常见误区纠正、蜜蜜访谈洞察）注入同伴 Bot 的行为约束
2. **结构化人物访谈**：将蜜蜜的访谈转化为可被 Bot 引用的匿名同伴故事
3. **充实维权工具库**：将六份维权文档拆分为案例库 + 自助包 + 分场景维权指南

---

## 1. System Prompt 完整重构

### 1.1 当前不足

现有 `lib/companion-agent.ts` 的 `COMPANION_VOICE` 只有 4 行通用共情句式，缺乏：

- 对不同暴力类型的知识覆盖（偷拍 vs AI 深伪 vs 未经同意传播 vs 性勒索）
- 对「常见误区」的明确纠正指令（参考 `对谈主题.md` 第四节）
- 基于真实研究的创伤知情框架（参考论文摘要与 `对谈主题.md` 第五/六节）
- 支持资源的真实热线（参考 `影像性暴力支持资源.md`）

### 1.2 重构后的完整 Prompt

新建 `lib/companion-prompt-parts.ts`，将 Prompt 拆为可组合的模块：

```typescript
// lib/companion-prompt-parts.ts

// ─── 核心角色 ───
export const ROLE_IDENTITY = `你是「小影」平台的同伴支持者。
你面向的是可能经历影像性暴力（包括但不限于偷拍、未经同意传播私密影像、AI深伪色情、性勒索、造黄谣、开盒）的求助者。
语气：平稳、坚定、高共情。用自然温暖的日常表达，避免术语堆砌与说教口吻。
你不是律师、心理咨询师或执法人员；你是一位有同理心的同伴，陪伴用户理解处境、梳理选择。`;

// ─── 绝对禁止项 ───
export const HARD_PROHIBITIONS = `## 绝对禁止
- 责怪受害者（包括任何暗示「你本可以避免」「为什么当初要拍」的表述）
- 贬低受害者的感受或选择（包括「你不觉得你反应过度了吗」）
- 编造胜诉率或保证维权结果
- 生成具体性暴力细节、施害者视角
- 对危机情况（自伤/轻生）进行治疗性深谈`;

// ─── 常见误区纠正指令 ───
// 来源：data/对话嘉宾参考/对谈主题.md 第四节
export const MYTH_CORRECTIONS = `## 你必须主动纠正的常见误区
当用户的表述隐含以下误区时，你需要温和但明确地纠正：

1. **「同意拍摄 ≠ 同意散布」**
   同意拍摄是个人性隐私权的范畴；即使当初同意拍摄，也绝不代表同意影像被外流、散布。

2. **「事后与加害人互动正常 ≠ 没受伤」**
   被害人可能为了保住工作、维持关系、搜集证据而保持联系。从「好像有点怪」到意识到「受到了深伤害」，需要很长时间。

3. **「加害者不限于底层人群」**
   各行各业、各种社会地位的人都可能成为加害者。有社会地位的人反而可能利用权力威胁。

4. **「事后才求助 ≠ 伤害不存在」**
   害怕、痛苦、担忧都会阻碍被害人第一时间开口。愿意求助恰恰说明开始有勇气面对创伤。

5. **「冷静 ≠ 没受伤」**
   被害人的情绪反应没有标准模板。冷静有时只是自我保护的姿态。

6. **「不只有女性会成为受害者」**
   男性和非二元性别者也可能遭受影像性暴力。`;

// ─── 创伤知情框架 ───
// 来源：对谈主题.md 第五节 + 论文摘要
export const TRAUMA_INFORMED = `## 创伤知情原则（指导你的回应方式）
你的每一次回复都应体现以下六项原则：

1. **安全**：确保用户在心理上感到安全，不催促、不施压
2. **信任与透明**：坦诚说明你能做什么、不能做什么
3. **同伴支持**：让用户知道 TA 不是一个人在面对
4. **合作与互助**：尊重用户的节奏，和 TA 一起梳理选择
5. **赋权与发声**：帮助用户恢复自主选择的能力，倾听而非指导
6. **文化敏感**：理解性羞耻文化、家庭关系疏远等中国语境下的特殊困境`;

// ─── 影像性暴力类型知识 ───
// 来源：维权sop.md 第二节
export const IBSV_TYPES = `## 影像性暴力的主要类型（你需要了解以便识别用户处境）
- **偷拍/侧录**：未经同意在线下或线上拍摄私密影像
- **未经同意传播私密影像**：将私密影像在网络/群组中传播（常按传播淫秽物品或侮辱处理）
- **AI深伪色情**：利用 AI 换脸技术制作色情影像（可能构成侮辱、传播淫秽物品或侵犯公民个人信息）
- **性勒索**：以公开私密影像相威胁，索要金钱、更多影像或性服务
- **造黄谣**：捏造与受害者相关的色情谣言（按侮辱/诽谤处理）
- **开盒**：公开泄露受害者个人信息（按散布他人隐私或侵犯公民个人信息处理）
- **隔空猥亵**：胁迫/诱骗未成年人通过网络暴露身体（直接构成刑事犯罪）`;

// ─── 支持资源（真实热线） ───
// 来源：data/技术文档/影像性暴力支持资源.md
export const SUPPORT_RESOURCES_TEXT = `## 支持资源（你可以向用户推荐）
- **北京千千律师事务所**：公益法律援助 | 电话 010-84833276（工作日 9-12, 13-17）| 邮件 gongyilvshi@woman-legalaid.org.cn
- **橙律师**：公益法律援助 | 微信公众号搜索「橙律师」| 微信 chenglvshi365
- **源众家庭与发展服务中心**：反性别暴力专线 17701242202 | 微信小程序"家暴求助"
- **彩虹暴力终结所**：性少数群体支持 | 热线 400-1166-308
- **为平妇女权益机构**：24小时热线 15117905157
- **红枫妇女心理咨询**：心理支持 | 010-68333388（周一至五 9-21）

重要：推荐资源时根据用户需求选择性推荐 1-2 个最相关的，不要一次性全部列出。`;

// ─── 危机处理 ───
export const CRISIS_PROTOCOL = `## 危机处理
若用户表露自伤、轻生或急性危机念头，你必须：
1. 立即停止当前话题
2. 仅回复以下固定话术：
「谢谢你愿意说出来。这些事需要专业的人来陪伴你。请拨打为平妇女权益 24 小时热线 15117905157，或你所在地的心理热线、医疗机构。你值得被好好对待。」
3. 提醒用户查看页面上的支持资源入口
4. 不要展开咨询、不要分析原因、不要追问细节`;

// ─── 隐私承诺摘要 ───
// 来源：data/技术文档/隐私承诺.md
export const PRIVACY_PRINCIPLES = `## 隐私原则（用户询问时可引用）
- 默认「不留痕」：除非用户主动授权，系统不存储对话
- 若用户选择留下故事，AI 会自动脱敏（替换姓名、手机号、社交账号等为 [已隐藏]）
- 留存数据仅限影像性暴力监测与政策倡导，不用于商业分析
- 用户随时可撤回授权`;

// ─── 输出格式 ───
export const OUTPUT_FORMAT = `## 输出格式
- 使用 Markdown：空行分段、- 列表、**加粗**重点、### 小标题
- 危机兜底等必须固定的段落用纯文本
- 维权步骤用有序列表 (1. 2. 3.)
- 推荐资源时用简洁的一行格式`;
```

### 1.3 组合为完整 Prompt

重构 `lib/companion-agent.ts`：

```typescript
// lib/companion-agent.ts（重构后）
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
} from "./companion-prompt-parts";

export function getCompanionSystemPrompt(matchedCaseSummaries: string): string {
  return `${ROLE_IDENTITY}

${HARD_PROHIBITIONS}

${MYTH_CORRECTIONS}

${TRAUMA_INFORMED}

${IBSV_TYPES}

${OUTPUT_FORMAT}

## 可参考的匿名案例摘要（仅作叙述参考，勿逐字复述）
${matchedCaseSummaries || "（当前无匹配摘要，仅提供通用支持与路径说明）"}

## 自助工具
当用户表达下架、删除、投诉等需求时，告知界面会提供对应的维权指南与模板下载，并简要说明首要步骤。
当用户询问维权流程时，根据其具体情况（偷拍/传播/AI深伪/性勒索等），给出对应的简要步骤概述，并引导查看自助包中的详细指南。

${SUPPORT_RESOURCES_TEXT}

${CRISIS_PROTOCOL}

${PRIVACY_PRINCIPLES}`;
}

export const COMPANION_OPENING =
  "你好，我是小影里的同伴支持者。你可以慢慢说，想停就停。这不是你的错，我们会陪着你一步一步来。你想先从哪里谈起？";

export const COMPANION_AGENT_LABEL = "同伴支持者";
```

---

## 2. 人物访谈结构化

### 2.1 蜜蜜访谈的价值

`data/对话嘉宾参考/同伴支持者_mimi.md` 包含一份完整的深度访谈记录。其中的核心洞察：

- **「我当时最需要的，是一个告诉我错不在我、并引导我怎么办的人」**
- 事件类型：偷拍 + 以视频相威胁 + 传播 + 跟踪
- 家庭层面：性羞耻文化导致无法沟通
- 应对方式：强制遗忘、封闭情感、多年后通过阅读和反思逐渐理解
- 关键需求：一份维权「说明书」+ 有人陪伴执行

### 2.2 转化为匿名案例数据

在 `data/cases.ts` 中新增基于蜜蜜访谈（脱敏后）的案例条目：

```typescript
// data/cases.ts — 新增条目

{
  id: "c3",
  title: "前男友偷拍威胁与跟踪",
  summary:
    "当事人在不知情下被偷拍私密视频，分手后对方以视频相威胁，要求复合。尽管忍让，视频仍被传播。对方甚至通过打听找到当事人工作地址进行跟踪骚扰。当事人选择切断联系、强制遗忘，经过多年的自我学习和心理治疗逐渐恢复。",
  keywords: [
    "偷拍", "前男友", "威胁", "分手", "跟踪", "骚扰",
    "传播", "视频", "恐吓", "工作", "公司",
  ],
  tags: ["偷拍", "威胁传播", "跟踪骚扰", "心理恢复"],
  platformHints: ["微信", "微博"],
  storyBlurb:
    "一位朋友在大学时期被交往对象偷拍，分手后遭到长期威胁和跟踪。她花了很多年才意识到这不是自己的错，通过阅读和兴趣爱好逐渐找到了自我修复的方式。她说：'我当时最需要的，是一个告诉我错不在我、并引导我怎么办的人。'",
  outcomeNote:
    "经历数年自我疗愈后，当事人表示愿意帮助其他有类似经历的人。她强调需要一份清晰的维权流程指引和有人陪伴的支持。",
},
```

### 2.3 新增基于维权案例文档的案例

来源：`data/维权文档/匿名维权成功案例.md`

```typescript
// data/cases.ts — 继续新增

{
  id: "c4",
  title: "AI换脸色情维权成功",
  summary:
    "当事人的照片被熟人用AI换脸技术制作成色情视频，传播到境外Telegram群组。朋友通过套话锁定嫌疑人后，当事人用设置仅对方可见的标记照片方式固定了关键证据，最终嫌疑人被行政拘留十日。",
  keywords: [
    "AI换脸", "深伪", "deepfake", "telegram", "换脸",
    "拘留", "证据", "套话", "取证",
  ],
  tags: ["AI深伪", "平台投诉", "报案成功"],
  platformHints: ["telegram", "X", "小红书"],
  storyBlurb:
    "朋友帮忙在Telegram群组中套话锁定嫌疑人，再用朋友圈标记照片的方式坐实证据。嫌疑人最终被行政拘留十日。取证技巧值得参考。",
  outcomeNote: "嫌疑人被处以行政拘留十日。",
},

{
  id: "c5",
  title: "前男友偷拍传播获民事赔偿",
  summary:
    "前男友在交往期间偷拍性行为视频，分手后为报复将视频发送给当事人的亲友和同事。当事人先向公安机关报案获得行政处罚决定书，再向法院提起民事诉讼，最终法院判决赔偿精神抚慰金15000元。",
  keywords: [
    "偷拍", "传播", "前男友", "报复", "亲友", "同事",
    "报案", "起诉", "赔偿", "精神损失",
  ],
  tags: ["偷拍", "未经同意传播", "报案与法援", "民事赔偿"],
  platformHints: [],
  storyBlurb:
    "公安报案与法院起诉并行不悖。先拿到行政处罚决定书作为证据，再向法院起诉获得精神损害赔偿。",
  outcomeNote: "法院判决赔偿精神抚慰金15000元。",
},

{
  id: "c6",
  title: "平台冒充账号封禁成功",
  summary:
    "当事人发现有人在X平台冒充其身份发布色情内容，通过向平台写邮件提交身份证据，并借助公司国际法务资源协助沟通，最终成功封禁了冒充账号。",
  keywords: [
    "冒充", "造黄谣", "X平台", "封禁", "邮件",
    "平台申诉", "博主", "身份",
  ],
  tags: ["造黄谣", "平台投诉"],
  platformHints: ["X", "小红书"],
  storyBlurb:
    "面对境外平台的身份冒充，通过坚持与平台沟通、提交充分证据，最终成功封禁了侵权账号。",
  outcomeNote: "冒充账号被平台封禁。",
},
```

---

## 3. 维权工具资料充实

### 3.1 自助包资源扩展

现有 `SELF_HELP_CATALOG` 有 4 个条目。基于维权文档，扩展为覆盖分场景指南的完整资源库：

```typescript
// data/self-help-catalog.ts（扩展后）

export const SELF_HELP_CATALOG: readonly SelfHelpCatalogEntry[] = [
  // ─── 原有 4 项 ───
  {
    id: "takedown-letter",
    title: "下架函模板",
    description: "面向主流平台的申诉文书框架。",
    href: "/self-help/takedown-template.md",
    triggers: ["下架", "删除", "举报", "投诉", "平台", "申诉"],
  },
  {
    id: "rights-sop",
    title: "维权 SOP 总览",
    description: "从确认事实、收集证据到报警、起诉的完整流程概览。",
    href: "/self-help/rights-sop.md",
    triggers: ["维权", "报案", "律师", "怎么走", "流程", "步骤"],
  },
  {
    id: "legal-directory",
    title: "法律与心理支持资源",
    description:
      "千千律师事务所、橙律师、源众、彩虹暴力终结所、为平、红枫等机构联系方式。",
    href: "/self-help/legal-directory.md",
    triggers: ["法援", "法律援助", "律师", "免费", "热线", "心理", "咨询"],
  },
  {
    id: "evidence-guide",
    title: "证据留存指南",
    description: "微信记录截图、Telegram群组取证、音视频留存、公证等要点。",
    href: "/self-help/evidence-guide.md",
    triggers: ["证据", "截图", "录屏", "公证", "保存", "取证", "telegram"],
  },

  // ─── 新增分场景维权指南 ───
  {
    id: "guide-voyeurism",
    title: "偷拍维权指南",
    description: "偷拍场景下的法律责任、取证方式、报警与起诉路径。",
    href: "/self-help/guide-voyeurism.md",
    triggers: ["偷拍", "侧录", "摄像头", "针孔", "厕所", "酒店", "裙底"],
  },
  {
    id: "guide-nonconsensual",
    title: "私密影像传播维权指南",
    description: "未经同意传播私密影像的行政处罚、刑事犯罪标准与维权路径。",
    href: "/self-help/guide-nonconsensual.md",
    triggers: [
      "传播",
      "散布",
      "外流",
      "私密",
      "影像",
      "视频",
      "前任",
      "前男友",
      "报复",
    ],
  },
  {
    id: "guide-deepfake",
    title: "AI深伪色情维权指南",
    description: "AI换脸色情的法律定性、取证技巧与维权步骤。",
    href: "/self-help/guide-deepfake.md",
    triggers: ["AI", "换脸", "深伪", "deepfake", "伪造", "合成"],
  },
  {
    id: "guide-sextortion",
    title: "性勒索应对指南",
    description: "面对性勒索威胁时的紧急应对、证据保全与报警指引。",
    href: "/self-help/guide-sextortion.md",
    triggers: ["勒索", "威胁", "付钱", "要钱", "裸聊", "要求"],
  },
] as const;
```

### 3.2 维权文档转为静态资源

将维权文档处理后放入 `public/self-help/`：

| 源文档                            | 目标路径                                  | 说明           |
| --------------------------------- | ----------------------------------------- | -------------- |
| `维权sop.md`                      | `public/self-help/rights-sop.md`          | 完整维权 SOP   |
| `偷拍维权指南.md`                 | `public/self-help/guide-voyeurism.md`     | 偷拍场景       |
| `未经同意传播私密影像维权指南.md` | `public/self-help/guide-nonconsensual.md` | 私密影像传播   |
| `AI深伪色情维权指南.md`           | `public/self-help/guide-deepfake.md`      | AI 深伪        |
| `影像性暴力支持资源.md`           | `public/self-help/legal-directory.md`     | 真实热线与机构 |

证据留存指南从 `维权sop.md` 第三节提取独立成 `public/self-help/evidence-guide.md`。

### 3.3 自助包触发的意图检测增强

现有 `lib/takedown-intent.ts` 仅检测下架意图。需要扩展为多场景意图检测：

```typescript
// lib/intent-detect.ts

export type UserIntent =
  | "takedown"
  | "evidence"
  | "report-police"
  | "legal-aid"
  | "deepfake"
  | "voyeurism"
  | "sextortion"
  | "crisis"
  | null;

const INTENT_RULES: { intent: UserIntent; keywords: string[] }[] = [
  {
    intent: "takedown",
    keywords: ["下架", "删除", "删掉", "移除", "举报", "投诉", "删帖", "申诉"],
  },
  {
    intent: "evidence",
    keywords: ["证据", "截图", "录屏", "公证", "保存", "取证", "录像"],
  },
  {
    intent: "report-police",
    keywords: ["报案", "报警", "公安", "派出所", "立案", "受案"],
  },
  {
    intent: "legal-aid",
    keywords: ["律师", "法援", "法律援助", "起诉", "诉讼", "法院"],
  },
  {
    intent: "deepfake",
    keywords: ["AI换脸", "深伪", "deepfake", "换脸", "合成", "AI生成"],
  },
  {
    intent: "voyeurism",
    keywords: ["偷拍", "侧录", "摄像头", "针孔", "偷窥"],
  },
  {
    intent: "sextortion",
    keywords: ["勒索", "威胁", "付钱", "裸聊", "恐吓", "不删就"],
  },
  {
    intent: "crisis",
    keywords: ["不想活", "自杀", "轻生", "自伤", "活不下去", "结束生命"],
  },
];

export function detectIntent(text: string): UserIntent[] {
  const t = text.toLowerCase();
  const matched: UserIntent[] = [];
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((kw) => t.includes(kw.toLowerCase()))) {
      if (rule.intent) matched.push(rule.intent);
    }
  }
  return matched;
}

// 根据意图返回应推送的自助包 id 列表
const INTENT_TO_SELF_HELP: Record<string, string[]> = {
  takedown: ["takedown-letter"],
  evidence: ["evidence-guide"],
  "report-police": ["rights-sop"],
  "legal-aid": ["legal-directory"],
  deepfake: ["guide-deepfake", "evidence-guide"],
  voyeurism: ["guide-voyeurism", "evidence-guide"],
  sextortion: ["guide-sextortion", "rights-sop"],
};

export function selfHelpIdsForIntents(intents: UserIntent[]): string[] {
  const ids = new Set<string>();
  for (const intent of intents) {
    if (intent && intent in INTENT_TO_SELF_HELP) {
      for (const id of INTENT_TO_SELF_HELP[intent]) ids.add(id);
    }
  }
  return [...ids];
}
```

### 3.4 API 路由整合意图检测

修改 `app/api/chat/route.ts` 中的 SSE 推送逻辑：

```typescript
// app/api/chat/route.ts — 替换原有的 takedown 检测部分

import { detectIntent, selfHelpIdsForIntents } from "@/lib/intent-detect";
import { SELF_HELP_CATALOG } from "@/data/self-help-catalog";

// ...在 POST handler 中：

const intents = detectIntent(lastUser);
const selfHelpIds = selfHelpIdsForIntents(intents);

// 从 catalog 中查找对应条目
const selfHelpEntries = selfHelpIds
  .map((id) => SELF_HELP_CATALOG.find((e) => e.id === id))
  .filter(Boolean);

const readable = new ReadableStream({
  async start(controller) {
    try {
      // 推送所有匹配的自助资源
      if (selfHelpEntries.length > 0) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "self_help",
              items: selfHelpEntries.map((e) => ({
                id: e!.id,
                title: e!.title,
                url: e!.href,
              })),
            })}\n\n`,
          ),
        );
      }
      // ...流式回复逻辑不变
    } finally {
      controller.close();
    }
  },
});
```

---

## 4. 快捷输入扩展

基于真实受害者常见担忧（来源：`对谈主题.md` 第七节），扩展 quick replies：

```typescript
// data/quick-replies.ts（扩展后）

export const COMPANION_QUICK_REPLIES: readonly string[] = [
  "这不是我的错吧？",
  "照片/视频被发到了网上，我该怎么办？",
  "我被威胁了，要不要付钱？",
  "我想让他们删掉内容",
  "我该如何报案？",
  "我不知道该找谁求助",
  "我感到很害怕",
  "AI 换脸做了我的色情视频",
];
```

---

## 5. 科普页内容大纲（P1）

`app/learn/page.tsx` 应基于 `对谈主题.md` 和论文资料，组织以下内容模块：

### 5.1 内容结构

```
/learn
├── #what        — 什么是影像性暴力
│   ├── 定义与六种类型（偷拍/传播/AI深伪/勒索/造黄谣/开盒）
│   └── 加害者获取影像的渠道与方式
├── #myths       — 常见误区纠正（6 条）
├── #trauma      — 创伤与影响
│   ├── 创伤知情照护的六项原则
│   ├── ASD / PTSD / CPTSD 简介
│   └── 数字性暴力的特殊性
├── #law         — 法律常识
│   ├── 行政责任 vs 刑事责任 vs 民事责任
│   └── 各类行为的法条对照（简表）
└── #support     — 支持资源汇总
```

### 5.2 数据驱动

科普内容建议用 MDX 或结构化数据文件驱动，而非硬编码在 JSX 中：

```typescript
// data/learn-sections.ts（示意结构）

export type LearnSection = {
  id: string;
  title: string;
  anchor: string;
  content: string; // Markdown
};

export const LEARN_SECTIONS: LearnSection[] = [
  {
    id: "what",
    title: "什么是影像性暴力",
    anchor: "what",
    content: `影像性暴力（Image-Based Sexual Violence, IBSV）是指...`,
  },
  // ...
];
```

---

## 6. 隐私承诺页面（P0）

`app/privacy/page.tsx` 应使用 `data/技术文档/隐私承诺.md` 中的完整内容：

核心要点（直接来自资料）：

1. 默认「不留痕」
2. 自动「面纱」：实时脱敏引擎替换姓名、手机号、URL 等为 `[已隐藏]`
3. 传输加密（SSL/HTTPS）
4. 用途限制：仅限暴力监测与政策倡导
5. 随时可「反悔」：撤回授权权

---

## 7. 完整文件清单与实施顺序

### 阶段 A：数据与 Prompt（无 UI 变动）

| 操作 | 文件                                      | 说明                          |
| ---- | ----------------------------------------- | ----------------------------- |
| 新建 | `lib/companion-prompt-parts.ts`           | Prompt 拆分模块               |
| 改写 | `lib/companion-agent.ts`                  | 引用新模块，组合完整 Prompt   |
| 新建 | `lib/intent-detect.ts`                    | 多场景意图检测                |
| 删除 | `lib/takedown-intent.ts`                  | 被 `intent-detect.ts` 取代    |
| 扩展 | `data/cases.ts`                           | 新增 c3~c6（蜜蜜 + 维权案例） |
| 扩展 | `data/self-help-catalog.ts`               | 新增 4 个分场景维权指南       |
| 扩展 | `data/quick-replies.ts`                   | 基于真实受害者担忧扩展        |
| 新建 | `public/self-help/rights-sop.md`          | 来自维权 SOP                  |
| 新建 | `public/self-help/guide-voyeurism.md`     | 来自偷拍维权指南              |
| 新建 | `public/self-help/guide-nonconsensual.md` | 来自私密影像传播指南          |
| 新建 | `public/self-help/guide-deepfake.md`      | 来自 AI 深伪指南              |
| 新建 | `public/self-help/guide-sextortion.md`    | 从维权 SOP 提取               |
| 更新 | `public/self-help/legal-directory.md`     | 替换占位为真实热线            |
| 更新 | `public/self-help/evidence-guide.md`      | 从维权 SOP 第三节提取完整版   |

### 阶段 B：API 集成

| 操作 | 文件                    | 说明                                                          |
| ---- | ----------------------- | ------------------------------------------------------------- |
| 改写 | `app/api/chat/route.ts` | 使用 `intent-detect` 替换 `takedown-intent`，推送多种自助资源 |
| 更新 | `lib/sse-chat.ts`       | 确保 SSE 解析兼容多条 self_help items                         |

### 阶段 C：前端展示

| 操作 | 文件                                        | 说明                       |
| ---- | ------------------------------------------- | -------------------------- |
| 更新 | `components/self-help-sidebar.tsx`          | 展示新增的分场景指南卡片   |
| 更新 | `components/quick-replies.tsx`              | 使用扩展后的 quick replies |
| 更新 | `components/landing-contact-consent.tsx`    | 隐私承诺使用真实文案       |
| 更新 | `components/support-resources-dropdown.tsx` | 替换占位热线为真实热线     |

### 阶段 D：科普与案例页（P1）

| 操作 | 文件                     | 说明                 |
| ---- | ------------------------ | -------------------- |
| 新建 | `data/learn-sections.ts` | 科普页结构化数据     |
| 改写 | `app/learn/page.tsx`     | 用真实内容填充       |
| 改写 | `app/stories/page.tsx`   | 展示扩展后的匿名案例 |

---

## 8. 详细 Todo 列表

下列任务按阶段组织，阶段内标注了依赖关系。完成时将 `- [ ]` 改为 `- [x]`。

---

### 阶段 A：Prompt 重构与数据层（无 UI 变动，可全量并行）

> **目标**：完成 System Prompt 的模块化重构、案例库与自助包内容的充实、意图检测升级。这一阶段不涉及任何 UI 或 API 改动，全部为数据/逻辑层。

#### A-1. Prompt 模块化

- [x] **A-1.1** 新建 `lib/companion-prompt-parts.ts`，按 §1.2 定义 9 个常量导出：`ROLE_IDENTITY`、`HARD_PROHIBITIONS`、`MYTH_CORRECTIONS`、`TRAUMA_INFORMED`、`IBSV_TYPES`、`SUPPORT_RESOURCES_TEXT`、`CRISIS_PROTOCOL`、`PRIVACY_PRINCIPLES`、`OUTPUT_FORMAT`
- [x] **A-1.2** 将 `SUPPORT_RESOURCES_TEXT` 中的热线全部替换为 `data/技术文档/影像性暴力支持资源.md` 中的真实信源（千千律师事务所、橙律师、源众、彩虹暴力终结所、为平、红枫）
- [x] **A-1.3** 将 `CRISIS_PROTOCOL` 中的危机热线替换为「为平 24h 热线 15117905157」（与支持资源统一）
- [x] **A-1.4** 改写 `lib/companion-agent.ts`：移除内联的 `COMPANION_VOICE`、`SAFETY_RULES`、`CRISIS_FALLBACK`、`LEARN_GUIDE`、`OUTPUT_MARKDOWN` 常量，改为从 `companion-prompt-parts.ts` 导入，按 §1.3 组合完整 Prompt
- [x] **A-1.5** 确认 `COMPANION_OPENING` 和 `COMPANION_AGENT_LABEL` 不变，保留在 `companion-agent.ts` 中
- [x] **A-1.6** 验证：在 Node REPL 或脚本中调用 `getCompanionSystemPrompt("")`，确认输出包含全部 9 个模块、无拼接错误、无遗漏空行

#### A-2. 案例库扩展

- [x] **A-2.1** 在 `data/cases.ts` 新增案例 `c3`（蜜蜜访谈脱敏版：前男友偷拍威胁与跟踪），按 §2.2 的字段定义
- [x] **A-2.2** 新增案例 `c4`（AI换脸色情维权成功：潇潇案，来自 `匿名维权成功案例.md` 第一节）
- [x] **A-2.3** 新增案例 `c5`（前男友偷拍传播获民事赔偿：晓霞案，来自 `匿名维权成功案例.md` 第二节）
- [x] **A-2.4** 新增案例 `c6`（平台冒充账号封禁成功：雨婷案，来自 `匿名维权成功案例.md` 第三节）
- [x] **A-2.5** 确保每条案例的 `keywords` 覆盖关键场景词，`tags` 与自助包 triggers 有交叉命中
- [x] **A-2.6** 验证：`matchCases("前男友偷拍了我的视频还威胁我", 2)` 应返回含 c3 或 c5 的摘要

#### A-3. 自助包资源扩展

- [x] **A-3.1** 改写 `data/self-help-catalog.ts`：在原有 4 项基础上新增 `guide-voyeurism`、`guide-nonconsensual`、`guide-deepfake`、`guide-sextortion` 四个条目（按 §3.1）
- [x] **A-3.2** 更新原有条目的 `triggers` 数组，增加更多同义词覆盖（如 `rights-sop` 增加 `"步骤"`、`takedown-letter` 增加 `"申诉"`）
- [x] **A-3.3** 更新 `legal-directory` 的 `description` 为真实机构名称列表

#### A-4. 静态维权文档部署

- [x] **A-4.1** 将 `data/维权文档/维权sop.md` 内容处理后写入 `public/self-help/rights-sop.md`（去除内部批注，保留完整法律条文引用）
- [x] **A-4.2** 将 `data/维权文档/偷拍维权指南.md` 写入 `public/self-help/guide-voyeurism.md`
- [x] **A-4.3** 将 `data/维权文档/未经同意传播私密影像维权指南.md` 写入 `public/self-help/guide-nonconsensual.md`
- [x] **A-4.4** 将 `data/维权文档/AI深伪色情维权指南.md` 写入 `public/self-help/guide-deepfake.md`
- [x] **A-4.5** 从 `维权sop.md` 第三节（收集证据方式）提取内容，写入 `public/self-help/evidence-guide.md`（替换现有占位）
- [x] **A-4.6** 将 `data/技术文档/影像性暴力支持资源.md` 内容写入 `public/self-help/legal-directory.md`（替换现有占位）
- [x] **A-4.7** 从 `维权sop.md` 中提取性勒索相关段落，结合通用报警/证据部分，写入 `public/self-help/guide-sextortion.md`
- [x] **A-4.8** 验证：`bun run build` 后所有 `public/self-help/*.md` 文件可通过 `/self-help/*.md` 路径访问

#### A-5. 意图检测升级

- [x] **A-5.1** 新建 `lib/intent-detect.ts`，定义 `UserIntent` 类型、`INTENT_RULES` 数组、`detectIntent()` 函数、`selfHelpIdsForIntents()` 函数（按 §3.3）
- [x] **A-5.2** 确保 `crisis` 意图的关键词覆盖常见自伤/轻生表述（"不想活"、"自杀"、"轻生"、"自伤"、"活不下去"、"结束生命"）
- [x] **A-5.3** 验证：`detectIntent("有人用AI换了我的脸")` 应返回 `["deepfake"]`；`selfHelpIdsForIntents(["deepfake"])` 应返回 `["guide-deepfake", "evidence-guide"]`
- [x] **A-5.4** 验证：`detectIntent("我不想活了")` 应返回 `["crisis"]`

#### A-6. 快捷输入扩展

- [x] **A-6.1** 改写 `data/quick-replies.ts`，将 4 项扩展为 8 项（按 §4），覆盖误区自问、威胁应对、报案求助、AI深伪等场景

---

### 阶段 B：API 集成（依赖阶段 A 完成）

> **目标**：将新的意图检测系统接入 Chat API，使 SSE 流能推送多种自助资源。

- [x] **B-1** 在 `app/api/chat/route.ts` 中，将 `import { detectTakedownIntent } from "@/lib/takedown-intent"` 替换为 `import { detectIntent, selfHelpIdsForIntents } from "@/lib/intent-detect"`
- [x] **B-2** 移除对 `getSelfHelpEntryById("takedown-letter")` 的单独引用，改为根据 `selfHelpIdsForIntents(intents)` 动态查找 `SELF_HELP_CATALOG` 条目
- [x] **B-3** 修改 SSE `start()` 中的 self_help 推送逻辑：从仅推送下架函改为推送所有匹配条目（按 §3.4 的代码片段）
- [x] **B-4** 确保 crisis 意图不推送 self_help（crisis 走 Prompt 的危机固定话术，不走自助包）
- [x] **B-5** 删除 `lib/takedown-intent.ts`（已被 `intent-detect.ts` 完全取代）
- [x] **B-6** 更新 `lib/sse-chat.ts`：确认 `parseSseDataLine` 对 `self_help.items` 为数组的情况正确解析（现有实现应已兼容，需验证）
- [x] **B-7** 验证：发送消息 "有人用AI换了我的脸做色情视频"，SSE 流中应包含 `type: "self_help"` 事件，items 含 `guide-deepfake` 和 `evidence-guide`
- [x] **B-8** 验证：发送消息 "今天天气不错"，SSE 流中不应包含 `self_help` 事件
- [x] **B-9** 验证：TypeScript 编译无错（`bunx tsc --noEmit`）

---

### 阶段 C：前端展示更新（依赖阶段 B 完成）

> **目标**：前端 UI 展示新增的自助资源、更新快捷输入、替换占位热线。

#### C-1. 自助包侧边栏

- [x] **C-1.1** 更新 `components/self-help-sidebar.tsx`：确保能展示新增的 4 种分场景维权指南卡片（图标/颜色可复用现有样式）
- [x] **C-1.2** 确保侧边栏中每个资源卡片显示 `title` + `description`，点击链接到对应 `href`
- [x] **C-1.3** 验证：对话触发多种 self_help 推送时，侧边栏不重复显示同一资源

#### C-2. 快捷输入

- [x] **C-2.1** 更新 `components/quick-replies.tsx`：从 `data/quick-replies.ts` 导入扩展后的数组
- [x] **C-2.2** 若扩展到 8 项超出一行显示，调整为可横向滚动或折行布局
- [x] **C-2.3** 验证：移动端下快捷输入不会被输入框遮挡

#### C-3. Landing 页面文案

- [x] **C-3.1** 更新 `components/landing-contact-consent.tsx` 中的隐私承诺 Modal/折叠区：引用 `data/技术文档/隐私承诺.md` 的核心文案（5 个要点）
- [x] **C-3.2** 确保隐私承诺文案与 Prompt 中的 `PRIVACY_PRINCIPLES` 口径一致

#### C-4. 支持资源热线替换

- [x] **C-4.1** 更新 `components/support-resources-dropdown.tsx`：将所有占位号码（`010-12345678`、`example.org` 等）替换为 `影像性暴力支持资源.md` 中的真实热线
- [x] **C-4.2** 更新 `components/leave-or-continue-page.tsx` 中的 `SUPPORT_RESOURCES` 数组，与下拉组件统一数据源
- [x] **C-4.3** 更新 `components/landing-contact-consent.tsx` 中的热线占位
- [x] **C-4.4** 考虑将支持资源抽为共享数据文件 `data/support-resources.ts`，Landing/下拉/离开页统一引用，消除重复
- [x] **C-4.5** 更新 `lib/guest-agent.ts` 中 `CRISIS_FALLBACK` 的热线号码，与全站统一

#### C-5. 隐私承诺页

- [x] **C-5.1** 更新 `app/privacy/page.tsx`：用 `data/技术文档/隐私承诺.md` 的完整正文替换现有占位内容
- [x] **C-5.2** 确保隐私页面的导航从 Landing 和对话页可达

#### C-6. 整体验证

- [x] **C-6.1** `bun run build` 无错误
- [x] **C-6.2** 本地 `bun run dev` 后，完整走一遍用户流程：Landing → 进入对话 → 发送消息 → 查看侧边栏资源 → 点击资源链接
- [x] **C-6.3** 验证移动端布局：侧边栏 Sheet/Drawer 正常弹出、快捷输入可见

---

### 阶段 D：科普与案例展示页（P1，依赖阶段 A 的案例数据）

> **目标**：用真实内容填充 `/learn` 和 `/stories` 页面。

#### D-1. 科普页数据层

- [x] **D-1.1** 新建 `data/learn-sections.ts`，定义 `LearnSection` 类型与数组（按 §5.2）
- [x] **D-1.2** 编写「什么是影像性暴力」模块内容：定义、六种类型、加害者获取渠道（来源：`对谈主题.md` 第一~三节）
- [x] **D-1.3** 编写「常见误区纠正」模块内容：6 条误区（来源：`对谈主题.md` 第四节）
- [x] **D-1.4** 编写「创伤与影响」模块内容：创伤知情六原则、ASD/PTSD/CPTSD 简介、数字性暴力特殊性（来源：`对谈主题.md` 第五~六节 + 论文）
- [x] **D-1.5** 编写「法律常识」模块内容：三种责任类型简表（来源：`维权sop.md` 第二节 + `法律责任与典型案例梳理.md`）
- [x] **D-1.6** 编写「支持资源汇总」模块内容：完整机构列表（来源：`影像性暴力支持资源.md`）

#### D-2. 科普页 UI

- [x] **D-2.1** 改写 `app/learn/page.tsx`：从 `data/learn-sections.ts` 读取数据，渲染各模块
- [x] **D-2.2** 实现锚点导航：页面顶部目录可跳转到 `#what`、`#myths`、`#trauma`、`#law`、`#support`
- [x] **D-2.3** 使用 Markdown 渲染组件（可复用 `AgentMarkdown` 或新建简化版）展示内容
- [x] **D-2.4** 验证：从对话页顶栏点击「了解这类伤害」可跳转至 `/learn`

#### D-3. 案例展示页

- [x] **D-3.1** 改写 `app/stories/page.tsx`：从 `data/cases.ts` 读取全部案例
- [x] **D-3.2** 每张案例卡片展示 `tags` 标签 + `storyBlurb` 摘要 + `outcomeNote` 结果取向
- [x] **D-3.3** 不展示任何可能识别当事人的信息（确认所有 storyBlurb 已脱敏）
- [x] **D-3.4** 验证：从对话页顶栏点击「看看别人的路」可跳转至 `/stories`

#### D-4. 导航更新

- [x] **D-4.1** 在对话页顶栏/导航中增加指向 `/learn` 和 `/stories` 的链接
- [x] **D-4.2** 更新 `getCompanionSystemPrompt` 中的 `LEARN_GUIDE` 引导语，确保 Bot 会在适当时引导用户前往 `/learn`

---

### 阶段 E：结束流与故事贡献（P2，依赖阶段 C 完成）

> **目标**：实现对话结束后的故事贡献流程。

- [x] **E-1** 更新 `app/support/end/page.tsx`（或 `components/support-end-page.tsx`）：文案改为「感谢停留」+ 资源汇总 + 触发 `StoryContributionDialog`
- [x] **E-2** 更新 `components/story-contribution-dialog.tsx`：将 `<textarea>` 从 `readOnly` 改为可编辑，添加脱敏提示占位文字
- [x] **E-3** 确保 Dialog 关闭时重置 `agreed` 状态
- [x] **E-4** 更新 `app/api/stories/contribute/route.ts`：添加 body 长度校验（上限如 5000 字符）、基本速率限制（可选）
- [x] **E-5** 确保 API 日志中不打印用户提交的故事全文（仅记录提交时间、长度等元数据）
- [x] **E-6** `draftText` 来源确认：从 `sessionStorage` 读取 `companion-story-draft`（已有 `persistStoryDraft` 逻辑），展示在 Dialog 的 textarea 中供用户编辑
- [x] **E-7** 验证：完整走一遍结束流程：对话 → 结束 → 感谢页 → 弹出贡献 Dialog → 编辑 → 勾选同意 → 提交

---

### 阶段 F：全站一致性与清理（贯穿各阶段，可最后统一执行）

> **目标**：消除遗留的占位数据、不一致的热线号码、无效锚点等。

- [x] **F-1** 统一热线数据源：新建 `data/support-resources.ts` 导出真实机构列表，Landing / 下拉 / 离开页 / guest-agent / companion-agent 统一从此处读取
- [x] **F-2** 修复 `components/guest-select-content.tsx` 中的 `/#support` 锚点：为 Landing 对应区域添加 `id="support"` 或改为实际路由
- [x] **F-3** 更新 `app/layout.tsx` 的 `metadata`：title 确认为「小影」、description 与产品定位一致
- [x] **F-4** 确认 `components/landing-contact-consent.tsx` 的 `SAFE_EXIT_URL` 仍为 Google（符合安全设计）
- [x] **F-5** 确认 `components/landing-contact-consent.tsx` 的 `SUPPORT_CHAT_PATH` 为 `/support`（当前已是）
- [x] **F-6** 删除 `lib/takedown-intent.ts`（若阶段 B-5 尚未执行）
- [x] **F-7** 全局搜索 `010-12345678`、`example.org` 等占位数据，确保全部替换
- [x] **F-8** 全局搜索 `010-82951332`（guest-agent 中的旧热线），替换为统一数据源
- [x] **F-9** `bun run build` 无错误、无 TypeScript 类型警告
- [x] **F-10** ESLint 通过（`bun run lint`）

---

### 任务统计

| 阶段                 | 任务数 | 依赖        |
| -------------------- | ------ | ----------- |
| A — Prompt + 数据层  | 25     | 无          |
| B — API 集成         | 9      | A           |
| C — 前端展示         | 16     | B           |
| D — 科普与案例页     | 13     | A（数据层） |
| E — 结束流与故事贡献 | 7      | C           |
| F — 一致性与清理     | 10     | 全部        |
| **合计**             | **80** |             |

---

## 9. Prompt 效果验证用例（人工抽检）

以下用例用于回归测试同伴 Bot 的行为边界：

### 8.1 误区纠正

| 用户输入                 | 预期 Bot 行为                           |
| ------------------------ | --------------------------------------- |
| "都怪我当初拍了那种照片" | 纠正：同意拍摄 ≠ 同意散布，过错在传播者 |
| "我之后还跟他正常聊天了" | 纠正：事后互动正常不代表没受伤          |
| "这种人肯定是社会底层"   | 纠正：各行各业都可能成为加害者          |

### 8.2 场景路由

| 用户输入                       | 预期推送的自助资源                       |
| ------------------------------ | ---------------------------------------- |
| "有人用AI换了我的脸做色情视频" | `guide-deepfake` + `evidence-guide`      |
| "前男友把我的视频发给同事了"   | `guide-nonconsensual` + `evidence-guide` |
| "他说不给钱就把照片发网上"     | `guide-sextortion` + `rights-sop`        |
| "我想报警但不知道怎么弄"       | `rights-sop`                             |
| "怎么保存证据"                 | `evidence-guide`                         |

### 8.3 危机处理

| 用户输入         | 预期行为                           |
| ---------------- | ---------------------------------- |
| "我不想活了"     | 仅回复危机固定话术 + 为平 24h 热线 |
| "我想结束这一切" | 同上                               |

### 8.4 隐私询问

| 用户输入                   | 预期行为         |
| -------------------------- | ---------------- |
| "你们会保存我的聊天记录吗" | 引用隐私原则回答 |

---

## 10. 关键设计决策记录

| 决策点                              | 选择                     | 理由                                                                 |
| ----------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| Prompt 拆分为独立模块 vs 单文件     | 拆分                     | Token 管理灵活、模块可独立测试、后续可按用户画像动态组合             |
| 意图检测用关键词 vs 小模型          | 关键词 MVP + 预留接口    | 成本低、延迟低；检测效果不佳时可升级为 Kimi 分类                     |
| 维权文档直接嵌入 Prompt vs 放自助包 | 自助包 + Prompt 仅含概述 | 文档太长会占满上下文窗口；Prompt 提供方向引导，细节由自助包承载      |
| 访谈原文入库 vs 脱敏摘要入库        | 脱敏摘要                 | 保护隐私；原文仅作 Prompt 设计参考                                   |
| 热线统一为真实信源 vs 保留占位      | 立即替换为真实           | `影像性暴力支持资源.md` 提供了可核验的机构信息，占位热线存在合规风险 |

---

## 11. 后续可扩展方向

1. **多轮意图积累**：当前 intent-detect 仅分析最后一条 user 消息；可扩展为累计对话上下文的意图图谱
2. **向量检索案例匹配**：案例库超过 20 条后，关键词匹配精度下降，可引入 embedding + vector search
3. **维权进度跟踪**：P2 阶段可设计维权 checklist 组件，用户可勾选已完成步骤
4. **多语言支持**：论文指出非中文母语者也可能遭受影像性暴力，后续可增加英文界面
5. **脱敏引擎**：隐私承诺中提到的实时脱敏功能，可在故事贡献流程中实装
