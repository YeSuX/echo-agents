# 小影（echo-agents）

面向 **AI 影像性暴力** 相关困扰的 Web 应用：同伴式对话（Kimi）、自助资源包、科普与匿名案例示意。技术栈为 **Next.js**（App Router）+ **React** + **TypeScript** + **Tailwind**。

## 文档约定

- 产品说明、研究报告与实现计划等**统一使用 Markdown**（`.md`），便于版本管理与评审。
- 仓库内主要文档示例：`plan.md`、`research.md`；设计稿类说明可在 `docs/` 下维护。
- **对话中的 AI 回复**在界面上按 **Markdown（GFM）** 渲染（列表、加粗、代码块、表格等）；流式生成过程中仍显示为纯文本，完成后切换为渲染结果，避免半段语法闪烁。

## 包管理器：Bun

本项目以 **[Bun](https://bun.sh)** 安装依赖并执行脚本（锁文件为 `bun.lock`）。

```bash
bun install
bun run dev
bun run build
bun run lint
```

### 常用脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 本地开发 |
| `bun run build` | 生产构建 |
| `bun run start` | 启动生产服务 |
| `bun run build:cloudflare` | OpenNext → Cloudflare 构建 |
| `bun run preview` / `bun run deploy` | Cloudflare 预览 / 部署（需已配置 Wrangler） |

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `KIMI_API_KEY`：Moonshot Kimi API Key（对话接口需要；也可仅在浏览器弹窗中配置）
- `KIMI_BASE_URL`：可选，默认 `https://api.moonshot.cn/v1`

在 **同伴对话** 与 **嘉宾对话** 页顶栏点击 **齿轮按钮**，可打开 shadcn `Dialog`，将 `KIMI_API_KEY` / `KIMI_BASE_URL` 存入 **localStorage**；调用 `/api/chat` 时会随请求体带上，**优先于**服务端环境变量。点击「清除本地配置」后恢复为仅使用 `.env`。

## 主要路由

| 路径 | 说明 |
|------|------|
| `/` | 落地页（知情同意、支持资源） |
| `/support` | 同伴对话 |
| `/support/end` | 结束页与可选匿名分享 |
| `/guests` / `/guests/[id]` | 嘉宾叙事对话（保留） |
| `/learn` / `/stories` | 科普与案例 |
| `/privacy` | 隐私说明占位 |

## 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
