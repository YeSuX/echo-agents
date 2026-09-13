# Production chat recovery

> Status: deployed; real production streaming passed; authenticated persistence acceptance pending
> Updated: 2026-09-13

> Superseded provider configuration: the user requested DeepSeek on 2026-09-14. See `docs/deepseek-migration-loop-state.md` for the current model, thinking display, deployment, and validation.

## Objective and boundaries

Restore real agent replies with cloud persistence enabled and disabled. Preserve the existing Clerk instance, disabled Google login, credentials, encryption, and conversation data. No paid-plan changes or Git history rewriting. Stop and escalate if the same deployment failure repeats twice or the repair requires changes outside these boundaries.

## Evidence and repair

- Production anonymous `/api/chat` returned HTTP 200 SSE with the generic upstream-error replacement and `[DONE]`, without an actual reply. The matching Worker event was `ok`, not CPU termination.
- A direct call using the existing configured Moonshot account returned HTTP 404 for the hardcoded `kimi-k2.5`: model not found or permission denied. The account's model list includes `kimi-k2.6` but not `kimi-k2.5`.
- A direct streaming `kimi-k2.6` request with thinking disabled returned a real greeting in 840 ms.
- The shared streaming path now defaults to `kimi-k2.6`. Optional server-side `KIMI_MODEL` supports future model changes. Thinking is disabled only for the verified default model; overrides receive no model-specific parameter.
- Sanitized error logs now include numeric upstream HTTP status and a classified failure kind without serializing provider bodies, headers, or message content.
- Both saved and ephemeral requests use this same upstream path. Persistence, authorization, and output moderation are unchanged.

## Validation

| Command/check | Expected | Result |
| --- | --- | --- |
| `bun run test:safety` | Exit 0 | Passed, 50 tests; includes model selection, HTTP failure classification, and log redaction |
| `bun run test:persistence` | Exit 0 | Passed, 7 tests, 18 assertions |
| `bun run lint` | Exit 0 | Passed; existing unused `children` warning in `components/ui/combobox.tsx` |
| `NODE_ENV=production bun run build:cloudflare` | Exit 0 | Passed, including TypeScript |
| Local OpenNext preview and real HTTP streaming | Non-fallback text and `[DONE]` | Passed: 107 characters across 55 content chunks; preview stopped intentionally after verification |
| `NODE_ENV=production bunx opennextjs-cloudflare deploy --strict` | Exit 0 | Passed; version `2683773d-76fa-4606-8b79-6d2f6d995693` |
| Production companion and guest ephemeral requests | Non-fallback text and `[DONE]` | Passed: 112 characters / 59 chunks / 5.20 s and 51 characters / 28 chunks / 6.08 s |
| `python3 scripts/check-cloudflare-auth.py https://echo-agents.cooper-ai.org` | Exit 0 | Passed all seven route, cache, and anonymous authorization groups |
| Authenticated saved chat and reload | Completed reply remains readable | Pending |

Production streaming checks used only synthetic greetings. Both matching Worker events reported `ok`, zero logs, and zero exceptions (Rays `a3a850546a51f7b5` and `a3a850750cf6f7d1`). Existing credential bindings were retained by deployment; no keys were changed. Local build/preview warned about missing webhook secrets, and bundling retained pre-existing third-party duplicate-key warnings; these did not prevent successful validation or deployment.

Native Chrome showed an existing signed-in production session, but manual tab switching interrupted automated navigation. Requested user acceptance of both cloud settings and reload persistence instead of competing for control of Chrome. No personal message content, session tokens, or cookies were extracted.

## Remaining work

Await the requested authenticated cloud-on/cloud-off and reload check, then record the actual result. Existing free-tier CPU-limit risk remains a separate measured issue; model recovery does not establish that the 10 ms cap is eliminated. Source changes, regression tests, and this incident record are included in the commit requested by Su Xiong. This repair and the earlier auth commit have not been pushed.

## Reference

- https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart
