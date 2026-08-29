# 小荧（echo-agents）

面向 **AI 影像性暴力** 相关困扰的 Web 应用：同伴式对话（Kimi）、自助资源包、科普与匿名案例示意。技术栈为 **Next.js**（App Router）+ **React** + **TypeScript** + **Tailwind**。

## 文档约定

- 产品说明、研究报告与实现计划等**统一使用 Markdown**（`.md`），便于版本管理与评审。
- 仓库内主要文档示例：`plan.md`、`research.md`、`docs/safety-test-cases.md`（安全验收）、`docs/legal-manual-review-sop.md`（**法律顾问人工抽检 SOP**）；设计稿类说明可在 `docs/` 下维护。
- **对话中的 AI 回复**在界面上按 **Markdown（GFM）** 渲染（列表、加粗、代码块、表格等）；流式生成过程中仍显示为纯文本，完成后切换为渲染结果，避免半段语法闪烁。

## 包管理器：Bun

本项目以 **[Bun](https://bun.sh)** 安装依赖并执行脚本（锁文件为 `bun.lock`）。

```bash
bun install
bun run dev
bun run build
bun run lint
bun run test:safety
bun run test:safety:e2e   # 需另开终端 bun run dev
bun run test:legal-golden # 法律问句 golden 回归；live 需 KIMI_API_KEY
```

### 常用脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 本地开发 |
| `bun run build` | 生产构建 |
| `bun run start` | 启动生产服务 |
| `bun run build:cloudflare` | OpenNext → Cloudflare 构建 |
| `bun run preview` / `bun run deploy` | Cloudflare 预览 / 部署（需已配置 Wrangler） |
| `bun run test:safety` | 安全护栏单元回归（见 `docs/safety-test-cases.md`） |
| `bun run test:safety:e2e` | 安全护栏 E2E（需先 `bun run dev`） |
| `bun run test:legal-golden` | 法律 Golden 自动回归（人工抽检 SOP：`docs/legal-manual-review-sop.md`） |

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `KIMI_API_KEY`：Moonshot Kimi API Key（对话接口需要；也可仅在浏览器弹窗中配置）
- `KIMI_BASE_URL`：可选，默认 `https://api.moonshot.cn/v1`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`：Clerk frontend publishable key
- `CLERK_SECRET_KEY`：Clerk server secret
- `CLERK_WEBHOOK_SIGNING_SECRET`：Clerk `user.deleted` webhook verification secret
- `CONVERSATION_ENCRYPTION_KEY_V1`：32-byte Base64 key，用于对话正文 AES-GCM 加密

Cloudflare D1 使用 `DB` binding。仓库内的 `database_id` 是全零占位符；创建远端数据库并确认数据 location 后，必须替换为真实 ID。创建本地 schema：

```bash
bunx wrangler d1 migrations apply echo-agents-db --local
bun run cf-typegen
```

在 **同伴对话** 与 **嘉宾对话** 页顶栏点击 **齿轮按钮**，可打开 shadcn `Dialog`，将 `KIMI_API_KEY` / `KIMI_BASE_URL` 存入 **localStorage**；调用 `/api/chat` 时会随请求体带上，**优先于**服务端环境变量。点击「清除本地配置」后恢复为仅使用 `.env`。

## 主要路由

| 路径 | 说明 |
|------|------|
| `/` | 落地页（知情同意、支持资源） |
| `/support` | 同伴对话 |
| `/support/end` | 结束页与可选匿名分享 |
| `/guests` / `/guests/[id]` | 嘉宾叙事对话（保留） |
| `/learn` / `/stories` | 科普与案例 |
| `/privacy` | 隐私与对话存储说明 |
| `/sign-in` / `/sign-up` | Clerk 登录与注册 |
| `/conversations` | 登录用户的加密对话记录 |

## 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
