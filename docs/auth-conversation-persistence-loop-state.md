# Auth and Conversation Persistence Loop State

> Status: implementation complete locally; production provisioning pending
> Updated: 2026-08-29

## Current objective

Add Clerk authentication and opt-in encrypted Cloudflare D1 conversation history without changing the default anonymous, non-persistent chat behavior.

## Completed

- Installed Clerk CLI 3.2.0, authenticated through the local credential store, and linked the repository to Clerk application `app_3IZfz7kJOQMVFk8bd4of54ieWKE` (`echo-agents`).
- Ran `clerk init`; it preserved the existing provider, middleware, and auth routes, and pulled development-instance credentials into the ignored `.env.local` file.
- Added the Clerk auto-proxy matcher `/__clerk/:path*` after the API matcher.
- Added Clerk provider, sign-in/sign-up pages, account controls, and resource-level authorization.
- Added a D1 binding, versioned migration, generated Cloudflare types, and local OpenNext binding support.
- Added minimal local user preferences keyed by Clerk user ID without copying Clerk profile data.
- Added AES-256-GCM content encryption with per-value IV, AAD binding, and key version support.
- Added owner-scoped conversation repository operations and cascade deletion.
- Added preference, conversation CRUD, delete-all, and verified Clerk deletion webhook routes.
- Added saved chat mode with server-authoritative history, idempotent client message IDs, final-content-only persistence, crisis persistence, and explicit persistence failure events.
- Added opt-in controls to companion and guest chat, encrypted history list, resume, and delete flows.
- Updated privacy, setup, design, and safety test documentation.
- Added repository ownership, migration, encryption, AAD tamper, and context tests.

## Failed attempts and decisions

- A real signed-in local save attempt reached conversation creation but `/api/chat` returned `500` because `CONVERSATION_ENCRYPTION_KEY_V1` is intentionally not configured yet. Saved-chat acceptance remains pending until the deployment secret phase; ephemeral chat remains functional.
- Clerk v7 removed `SignedIn` and `SignedOut`. The first Next build failed during prerender; the UI now uses `Show` and the repeated build passed.
- Next.js 16 `proxy.ts` is Node-only. OpenNext Cloudflare 1.17 does not support Node Middleware, so the first OpenNext build failed. The project temporarily uses deprecated `middleware.ts`, which remains Edge-based and builds successfully. Migrate back to `proxy.ts` only after OpenNext adds Node Middleware support.
- The legal golden command loaded an existing Kimi key and attempted live tests without a running server. Live legal and E2E LLM tests now require explicit `LEGAL_GOLDEN_LIVE=1` and `E2E_LIVE_LLM=1` flags.
- D1 delete metadata counts cascaded rows, so delete success checks use `changes > 0` rather than `changes === 1`.

## Verification completed

- `clerk doctor`: core checks passed; the development instance is configured and the production instance remains pending.
- Local route smoke test: `/`, `/sign-in`, and `/sign-up` returned `200`; signed-out `/conversations` returned `307` to `/sign-in?redirect_url=/conversations`.
- Real development-instance email verification completed; authenticated `/conversations`, preferences, and conversation list/create requests returned successful responses.
- `bunx wrangler d1 migrations apply echo-agents-db --local`: passed; six migration commands applied.
- `bun run test:persistence`: 5 passed, 0 failed.
- `bun run test:safety`: 46 passed, 0 failed.
- `E2E_LIVE_LLM=0 bun run test:safety:e2e`: 9 passed, 1 explicitly skipped, 0 failed.
- `LEGAL_GOLDEN_LIVE=0 bun run test:legal-golden`: 18 passed, 10 explicitly skipped, 0 failed.
- `bunx tsc --noEmit`: passed.
- `bun run lint`: passed with one pre-existing warning in `components/ui/combobox.tsx`.
- `bun run build`: passed with non-production test credentials.
- `bun run build:cloudflare`: passed with non-production test credentials.

## Production blockers requiring Su Xiong

1. Create or select separate Clerk development and production applications.
2. Choose the irreversible D1 data location or jurisdiction.
3. Create the remote D1 database and replace the all-zero `database_id` in `wrangler.jsonc`.
4. Configure the Clerk and encryption Worker secrets without committing their values.
5. Apply the D1 migration remotely after reviewing the target database and Time Travel bookmark.
6. Configure the Clerk `user.deleted` webhook and verify one real delivery and replay.
7. Run real browser registration, session refresh, saved chat, cross-device resume, and account deletion acceptance tests.
8. Decide whether to add automatic retention; the current implementation keeps history until user deletion and makes no automatic-expiry promise.

## Next loop entry

Create or activate the Clerk production instance, provision D1, and configure the encryption secret before re-running saved-chat acceptance. Do not run remote migrations or replace the placeholder database ID without confirming the selected D1 database and jurisdiction.

## Stop conditions

- Stop before remote migration, production secret changes, or jurisdiction selection without explicit human confirmation.
- Stop release on any cross-user access, plaintext conversation storage, raw model output persistence, or silent persistence failure.
- If the same deployment failure repeats twice, preserve the exact command and output here before changing strategy.
