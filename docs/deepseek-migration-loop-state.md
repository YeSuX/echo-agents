# DeepSeek migration and thinking display

> Status: deployed; production multi-turn API acceptance passed; browser interaction acceptance pending
> Updated: 2026-09-14

## Objective and boundaries

Replace Kimi with the user-requested DeepSeek endpoint `https://api.deepseek.com`, model `deepseek-flash` (DeepSeek-V4.1-Flash), and enable visible thinking in companion and guest chats. Use the user-supplied key only in ignored server configuration and the production Worker secret. Preserve Clerk, disabled Google login, encrypted conversation data, and database schema. No paid-plan change is authorized. Su Xiong subsequently explicitly requested committing and pushing the code to the existing remote branch on 2026-09-14.

## Verified contract and design

- Official release notes map `deepseek-flash` to DeepSeek-V4.1-Flash. Official thinking documentation specifies `thinking.type=enabled`, default high effort, and streaming `delta.reasoning_content` separate from `delta.content`.
- A real direct request with the provided key returned 177 reasoning characters and 32 final-answer characters; no response text or credentials were logged.
- The application has no model tool calls. DeepSeek documents that reasoning need not be sent back for subsequent requests without tools. Only final replies enter conversation context.
- Server/client configuration and active tests now use DeepSeek names and independent browser storage keys. No fallback to the old Kimi key or model.
- Both conversation pages consume one shared SSE reader. Thinking is displayed in a collapsible, height-limited plain-text panel. It stays in current-page memory; only final answers use the existing encrypted persistence format. Reloading saved history does not restore thinking.
- Existing output boundaries also apply to thinking. Blocked or failed output clears the reasoning display. Empty answers and missing upstream finish markers are treated as failures.
- The shared SSE reader handles split UTF-8 bytes, trailing events without a final separator, thinking-only failures, and cancellation. Missing application `[DONE]` is an interruption, not a successful reply.
- Thinking timeout defaults to 120 seconds. Cancelling the response aborts the upstream request, with saved-turn failure handling preserved.

## Verification

| Check | Expected result | Actual result |
| --- | --- | --- |
| Direct DeepSeek request | Reasoning and answer | Passed |
| `bun run test:safety` | Exit 0 | Passed, 50 tests |
| Initial `bun test scripts/deepseek-stream.test.ts` | Exit 0 | Passed, 15 tests including real route with synthetic upstream; timeout case subsequently added |
| `bun run test:deepseek` | Exit 0 | Passed, 16 tests and 40 assertions, including a real five-second timeout |
| `bun run test:persistence` | Exit 0 | Passed, 7 tests and 18 assertions |
| `bun run lint` | Exit 0 | Passed; existing unused `children` warning in `components/ui/combobox.tsx` |
| `NODE_ENV=production bun run build:cloudflare` | Exit 0 | Passed, including TypeScript |
| `bun run cf-typegen` and `bunx tsc --noEmit` | Exit 0 | Passed; generated binding types now use DeepSeek |
| Local OpenNext Worker | Thinking, answer, and `[DONE]` | Passed: 383 reasoning characters, 112 answer characters, 1769 ms |
| Production companion, two turns | Thinking, answer, and `[DONE]` | Passed: 537/78 and 362/86 reasoning/answer characters; 3.20 and 4.66 seconds |
| Production guest, two turns | Thinking, answer, and `[DONE]` | Passed: 178/54 and 299/101 reasoning/answer characters; 3.07 and 2.22 seconds |
| Production auth/cache smoke | Seven assertion groups pass | Passed after a transport timeout on the initial run |
| Browser display and stop control | Visible collapsible thinking and usable final state | Local page and input rendered; further native UI actions interrupted by manual Chrome use. User availability question remains unanswered. |

## Deployment and review

- Deployed using OpenNext `deploy --strict --secrets-file <temporary-file>`, exit 0. Version: `ffd05a24-0c88-4335-9f33-69a5d208d9bf`.
- The restricted temporary file supplied only `DEEPSEEK_API_KEY` and was removed in a `finally` block. Cloudflare readback confirms its type is `secret_text` and the existing Clerk, webhook, publishable-key, and encryption bindings are retained. The old Kimi secret is unused and was not deleted.
- No configured secrets found in tracked/new source or 85 public build assets. Ignored local and production environment files have mode 0600.
- Source self-review: both UI surfaces use the same stream consumer; reasoning cannot enter `toChatApiMessages` or encrypted turn completion; final output moderation and saved-turn ownership remain in place. Failed/empty/incomplete streams do not persist a successful answer. Reasoning boundaries clear blocked drafts, and cancellation aborts generation.
- Initial Bun production smoke returned one successful reply before `ECONNRESET` on the next request. Switched to independent curl requests. One initial guest smoke assertion failed without an upstream error in the matching Worker event; its full response was not retained, so the exact failed condition cannot be established. The explicit English greeting and follow-up checks above both passed. This is not evidence that every model response must retain reasoning: output boundaries intentionally clear it when blocked.
- The initial auth/cache smoke had a curl transport timeout. Its subsequent full run passed all seven groups. No speculative code change was made for these transport failures.
- Successful post-deployment chat events had `outcome=ok`, zero logs, and zero exceptions. Sample Rays: `a3a879bb388b5a75`, `a3a879d469121557`, `a3a87ac539bce538`, `a3a87bf85bc3d183`.
- The browser-extension tab creation failed with `nodeRepl.fetch request failed`; native Chrome opened the local page successfully, but manual use interrupted the send action. No authenticated history or private message text was read for this migration. Local preview was stopped intentionally after verification.
- Build/deploy retained pre-existing third-party duplicate-key warnings. The local missing webhook-secret warning did not indicate a missing production binding; readback confirmed retention.

## Next step and stop conditions

API and automated acceptance are satisfied. Complete browser expand/collapse, stop-button, and authenticated cloud-history acceptance when Chrome is available. Saved history still contains only final answers; thinking display is intentionally session-local. Source changes, tests, and this record are included in the requested commit; the publication target is `origin/main`, together with the preceding auth and Kimi-recovery commits. Verify a clean worktree and matching local/remote heads after pushing. Stop and escalate after two identical external failures, if a paid-tier change is needed, or if implementation requires a persistence-format migration. Existing Cloudflare CPU-limit risk remains separate; successful samples do not eliminate the documented cap.

## Sources

- https://www.deepseek.com/en/news/deepseek-v4-1-flash/
- https://api-docs.deepseek.com/guides/thinking_mode/
