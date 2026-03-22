# echo-agents 项目研究报告

本文档基于对仓库内源码与配置的通读整理，用于说明 **echo-agents** 的定位、架构、用户路径、AI 集成方式及实现细节。仓库根目录的 `README.md` 仍为 create-next-app 默认模板，**产品级说明主要存在于代码注释与 UI 文案中**；用户近期查看的 `docs/sexual-violence-survivor-agent-*.md` 等文件在当前工作区中未检出，故下文以代码为准。

---

## 1. 产品定位与目标用户场景

### 1.1 一句话概括

**「幸存者故事」** 是一个以 **知情同意 + 触发警告** 为前提的 Web 应用：用户选择一位「嘉宾」（化名 + 主题一句话介绍），通过 **多轮对话** 了解对方愿意分享的经历与观点；回答由 **大模型（Kimi）在 system prompt 约束下** 生成，模拟该嘉宾口吻，而非简单检索固定文案。

### 1.2 领域与伦理取向（从实现反推）

- **敏感主题**：性暴力与创伤相关叙述；首屏与二次确认中明确 **Trigger Warning**。
- **安全设计倾向**：
  - 「暂时离开」跳转外部中性站点（Google），避免挽留式文案。
  - 多处置顶/侧栏 **支持资源**（热线、机构链接占位）。
  - AI 侧 **边界规则**：禁止具体性暴力细节、施害者视角、虚构未授权经历；危机场景固定兜底话术并引导专业资源。
- **MVP 数据**：`data/guests.ts` 中 **9 位嘉宾**，仅 `id`、`name`、`tagline`，**不含**采访正文或创伤细节——真实「授权内容」尚未进入数据结构，当前主要靠 prompt 中的通用约束。

---

## 2. 技术栈与工程形态

| 类别 | 选择 |
|------|------|
| 框架 | Next.js **16.1.6**（App Router） |
| UI | React **19.2**，Tailwind CSS **4**，shadcn **new-york** + Radix/Base UI 等 |
| 语言 | TypeScript（`strict: true`） |
| AI | `openai` 包作为客户端，对接 **Moonshot Kimi**（`baseURL` 默认 `https://api.moonshot.cn/v1`，模型 `kimi-k2.5`） |
| 部署 | **OpenNext + Cloudflare Workers**（`@opennextjs/cloudflare`、`wrangler.jsonc`） |

### 2.1 路径别名

- `@/*` → 仓库根目录（见 `tsconfig.json`）。

### 2.2 构建与部署命令（`package.json`）

- 开发：`npm run dev`
- 标准 Next 构建：`npm run build` / `npm run start`
- Cloudflare：`build:cloudflare`、`preview`、`deploy`，产物使用 `.open-next/`（已在 `.gitignore` 中忽略）

### 2.3 Cloudflare 配置要点（`wrangler.jsonc`）

- Worker 入口：`.open-next/worker.js`
- `nodejs_compat` 兼容标志
- 静态资源目录：`.open-next/assets`，binding `ASSETS`

### 2.4 环境变量

- **必需**：`KIMI_API_KEY`（未设置时 `/api/chat` 会抛错并返回 500）
- **可选**：`KIMI_BASE_URL`（默认 Moonshot 官方 v1）
- `.env*` 已被 gitignore

---

## 3. 信息架构与路由

| 路径 | 文件 | 作用 |
|------|------|------|
| `/` | `app/page.tsx` | 落地页：产品说明、触发警告、支持资源、知情确认、「暂时离开 / 进入」 |
| `/guests` | `app/guests/page.tsx` | 嘉宾网格列表 + 二次触发警告弹窗 |
| `/guests/[id]` | `app/guests/[id]/page.tsx` | 若 `id` 不在 `GUESTS` 则 `notFound()`；否则渲染对话页 |
| `/guests/leave` | `app/guests/leave/page.tsx` | 「离开或继续」收尾页：返回列表、支持资源、温和文案 |

**根布局**（`app/layout.tsx`）：`lang="zh-Hans"`，站点标题/描述与创伤知情叙事一致；字体为 Geist Sans / Mono。

---

## 4. 核心用户流程（端到端）

1. **首页**阅读说明与警告 → 可选「暂时离开」（新标签打开 Google）或「进入」→ `/guests`。
2. **嘉宾列表**点击「进入对话」→ **Dialog** 再次说明敏感性与可随时离开 → 确认后 `router.push(/guests/{id})`。
3. **对话页**首条为本地写死的 **开场白**（不请求 API）；用户输入后经 `fetch("/api/chat")` **SSE 流式**追加助手消息。
4. 页脚可「返回列表」「结束对话」→ `/guests/leave` 提供离开与支持资源聚合。

---

## 5. 前端组件职责（业务相关）

### 5.1 `components/landing-contact-consent.tsx`

- 客户端组件；最大宽度约 560px 的单栏布局。
- 常量：`SAFE_EXIT_URL = https://www.google.com`，`GUEST_LIST_PATH = /guests`。
- 支持资源：可折叠「更多资源」；热线与外链为 **占位**（如 `010-12345678`、`example.org`）。

### 5.2 `components/guest-select-content.tsx`

- 从 `GUESTS` 映射卡片网格（响应式 1/2/3 列）。
- `TriggerWarningDialog`：关闭时仅更新 `open` 状态，保留 `guestId`/`guestName` 供下次打开（无功能问题）。
- 页脚链到 `/#support`：**首页当前无 `id="support"`**，该锚点可能无效（实现疏漏）。

### 5.3 `components/conversation-page.tsx`（核心交互）

- **消息模型**：`ConversationMessage`，`role: "agent" | "user"`，可选 `isFallback`（错误时友好提示样式）。
- **开场白常量** `AGENT_OPENING` 与 `lib/guest-agent.ts` 中 `DEFAULT_OPENING` 文案一致（注释中写明便于首条不调 API）。
- **发送逻辑**：
  - 将历史 + 本条 user 消息转为 Kimi 格式：`agent` → `assistant`。
  - `POST /api/chat`，body：`{ guestId, messages }`。
  - 读取 `text/event-stream`，解析 `data: {"content":"..."}` 与 `data: [DONE]`。
  - 流式过程中用 `streamingContent` 显示进行中的 agent 气泡；结束后合并为一条消息。
  - `AbortController` 保存在 `abortRef`（当前 UI 未暴露取消按钮，但结构已预留）。
- **依赖**：`handleSend` 的 `useCallback` 依赖包含 `messages` 与 `input`，在快速连续发送时行为符合「每次基于最新 messages」的预期；用户消息通过 `[...messages, userMsg]` 显式拼进请求，避免仅依赖尚未提交的 state。
- **无障碍**：输入框 `aria-label`、发送按钮 `aria-label`、返回链 `aria-label`。

### 5.4 `components/support-resources-dropdown.tsx`

- 嘉宾列表页头、对话页头复用；内容与落地页热线/机构 **同一套占位数据**。

### 5.5 `components/leave-or-continue-page.tsx`

- 独立 `SUPPORT_RESOURCES` 数组（与下拉/首页略有重复，未抽成单一数据源）。

---

## 6. 后端与 AI：`app/api/chat/route.ts`

### 6.1 请求契约

- **方法**：`POST`
- **Body**：`{ guestId: string, messages: Array<{ role, content }> }`
- **校验**：`guestId` 存在且 `messages` 为非空数组，否则 400。

### 6.2 处理流程

1. `getGuestSystemPrompt(guestId)` 生成 **system** 消息（见下节）。
2. `OpenAI` 客户端 `chat.completions.create`，`stream: true`。
3. 将每个 chunk 的 `delta.content` 以 **SSE** 写出：`data: ${JSON.stringify({ content })}\n\n`，结束发送 `data: [DONE]\n\n`。
4. 异常返回 JSON `{ error: message }`，状态码 500。

### 6.3 与 OpenAI SDK 的兼容性

- Moonshot API 与 OpenAI Chat Completions 形态兼容，故可用官方 `openai` 包 + 自定义 `baseURL`。

---

## 7. 嘉宾 Agent：`lib/guest-agent.ts`

### 7.1 `getGuestSystemPrompt(guestId)`

- 在 `GUESTS` 中查找嘉宾；找不到则 `name` 默认为「我」、`tagline` 空字符串。
- Prompt 结构概要：
  - 角色：嘉宾化名 + 一句话介绍。
  - 行为：第一人称、仅在授权范围内、不编造细节、越界时温和拒绝并引导。
  - **BOUNDARY_RULES**：禁止具体性暴力细节、施害者视角、虚构；用户自曝创伤/危机时不做咨询，使用固定兜底话术。
  - **危机兜底**：嵌入 `CRISIS_FALLBACK` 全文，要求模型在该场景 **仅** 回复此话术（并提示用户看页面「支持资源」）。

### 7.2 与 UI 文案的不一致（重要发现）

- **危机话术中的热线**：`guest-agent.ts` 使用 **010-82951332**（注释为全国 24 小时心理援助热线常见公开号码之一）。
- **页面与下拉中的热线**：多处为 **010-12345678**（明显为占位假号）。
- **影响**：用户若因危机被引导至模型回复，看到的号码与页面不一致，存在 **合规与信任风险**；建议统一为真实备案号码或统一从配置读取。

### 7.3 `DEFAULT_OPENING`

- 与前端 `AGENT_OPENING` 对齐，供未来服务端首包或测试复用。

---

## 8. 数据层

- **唯一业务数据源**：`data/guests.ts` 的 `GUESTS` 常量数组 + 导出类型 `GuestId`。
- **无数据库、无会话持久化、无用户账号**：对话仅存于客户端 React state，刷新即丢失。

---

## 9. UI 组件库与样式

- **shadcn**：`components.json` 指定 `new-york`、`neutral`、CSS 变量主题。
- **`app/globals.css`**：`@import "tailwindcss"`、`tw-animate-css`、`shadcn/tailwind.css`；`:root` / `.dark` 下大量 OKLCH 色板与 sidebar/chart token。
- **`components/ui/*`**：大量通用组件（button、dialog、dropdown、scroll-area 等），业务页主要使用其中子集。

---

## 10. 测试、质量与缺口

- 仓库内 **未发现** `*.test.*`、`*.spec.*` 或 `__tests__` 配置引用。
- **ESLint**：`eslint-config-next`。
- **API 安全**：`/api/chat` 无鉴权、无速率限制；任何能访问部署地址的客户端均可携带任意 `guestId` 与消息调用 Kimi（成本与滥用风险需在生产策略中考虑）。

---

## 11. 架构小结图（逻辑）

```mermaid
flowchart LR
  subgraph client [Browser]
    L[Landing /]
    G[Guest list /guests]
    C[Conversation /guests/id]
    LV[Leave /guests/leave]
    L --> G --> C
    C --> LV
    C -->|POST SSE| API[/api/chat]
  end
  subgraph server [Next.js Server]
    API --> GP[getGuestSystemPrompt]
    GP --> GUESTS[(data/guests.ts)]
    API --> KIMI[Moonshot Kimi API]
  end
```

---

## 12. 结论与后续可演进方向（基于代码事实）

**当前实现已完成**：创伤知情叙事下的多页流程、嘉宾选择、Kimi 流式对话、system 层安全与边界约束、Cloudflare 部署脚手架。

**与「完整产品」之间的差距**（代码层面可见）：

1. 嘉宾 **真实授权语料** 未进入 RAG/结构化档案，模型仅依赖化名 + tagline + 通用规则，回答质量与合规高度依赖模型遵循度。
2. 支持资源 **占位链接与不一致热线** 需统一为可核验信源。
3. 会话无持久化、无反馈闭环、无监控/审计日志。
4. `/#support` 锚点缺失等小问题可顺手修复。

---

*报告生成依据：仓库内 `app/`、`components/`（业务组件）、`lib/`、`data/`、`app/api/chat/route.ts`、`package.json`、`wrangler.jsonc`、`open-next.config.ts`、`tsconfig.json`、`components.json`、`app/globals.css` 等。*
