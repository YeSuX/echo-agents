# Anonymous persistence and username authentication loop

Updated: 2026-11-14
Status: development activated; user confirmed manual acceptance; local Git delivery authorized

## Objective and confirmed choices

Persist anonymous chats in encrypted D1 storage. Visitors can resume and delete history in the same browser. After signing in, ask before attaching visitor history to the account. Registration supports username and password without requiring an email; email is optional. Continue using Clerk for credential management.

## Read state

Baseline: clean `main` at `685f8bd`, ahead of `origin/main` by one local commit. Existing anonymous requests explicitly use ephemeral mode. Saved routes require Clerk identity, and `conversations.owner_id` references `app_users.clerk_user_id`. Both login pages use Clerk prebuilt components. Read prior auth/persistence design, delivery state, Google OAuth incident, repository, encryption, API routes, and UI.

Read-only Clerk configuration inspection confirms both dev and prod require a verified email, enable passwords (minimum 15 characters), and disable username sign-up/sign-in. No provider configuration changed. Existing persistence baseline: `bun run test:persistence`, exit 0, 7 passed, 18 assertions.

## Feedforward and implementation boundary

Implement local application changes, a versioned migration, and isolated fixture tests. Never run this migration on the existing local development database or production database without explicit approval. Do not alter Clerk instance settings, secrets, production configuration, or deploy. Stop after two identical unresolved failures. The user's confirmed choices authorize preparing and testing the implementation; review the exact database/provider changes before activation.

## Design

Generalize account-only owners into `conversation_owners`, preserving existing owner IDs, ciphertext, preferences, and conversation IDs. Rename the existing owner table/key and add explicit account/visitor kind plus a hashed, expiring visitor credential. Browser identity comes from a random HttpOnly, SameSite cookie; never accept an owner ID as authentication. Store only the hash of the visitor secret. Preserve AES-GCM and final moderated answer writes.

Use a 30-day visitor credential lifetime refreshed on bootstrap, explicit disclosure, and opportunistic bounded cleanup of expired visitors. Signing in selects the account owner and never silently imports visitor data. A confirmed claim atomically transfers conversation ownership, refuses pending turns, revokes the visitor credential, and retains existing encrypted content. Signing out must reset the active client conversation identity. Add same-origin checks to cookie-authorized mutations.

## Feedback and stop condition

Run owner migration/repository tests in disposable SQLite/Miniflare, token and CSRF tests, saved-route synthetic integration, TypeScript, changed-file ESLint, and relevant browser checks with no live model calls. Cover cross-visitor/account isolation, tampered/expired/missing cookies, explicit opt-out, failure without silent fallback, ownership transition, pending-turn races, replay/revocation, and deletion cascades. Preserve the chat-scroll regression.

Local completion requires reviewable code/migration, passing checks, and concrete Clerk config patches. Production activation requires human approval and is a separate final step. Record every outcome and limitation below before handing off.

## Implemented local result

- Added `0004_visitor_conversation_owners.sql`; existing `0003_story_contributions.sql` remains unchanged. The migration renames `app_users` and its key, preserving owner IDs and SQLite-updated foreign keys, then adds visitor kind, hashed credential, expiry and indexes. No ciphertext is copied or re-encrypted. The old application cannot operate against the renamed table, so activation needs a coordinated migration/application cutover; reverting only the application is not a rollback.
- Added server-derived account-or-visitor identity, a same-origin visitor bootstrap, and a separately confirmed claim endpoint. Claim runs a D1 batch, refuses any pending visitor turn, transfers ownership without changing the AES-GCM AAD, and revokes the visitor credential. Account deletion remains account-only.
- Conversation APIs now support visitor ownership with the same SQL ownership predicates; a caller with no session gets an empty history list and cannot read a specific conversation or write saved turns.
- Anonymous bootstrap defaults saving on and preserves explicit opt-out. Bootstrap failure blocks sending rather than silently selecting ephemeral mode. HttpOnly cookies are Secure in production, SameSite=Lax, scoped to `/`, and use the `__Host-` prefix in production. Only SHA-256 credential hashes are stored. Visitor credentials last 30 days from a conversation-page bootstrap; expired visitor data is cleaned in bounded batches during later bootstraps, not on a strict scheduled deletion deadline.
- Deduplicated Strict Mode bootstrap; Chromium Web Locks serialize first visits across tabs. React components remount on account identity changes and history requests use the new identity. The history page supports visitors and login prompts for optional attachment, without automatic import.
- Added visitor history navigation, save-status/error handling, explicit attachment UI, optional-email password-recovery guidance, updated privacy/FAQ/prompt text, and a new policy version. Story submission authorization remains separate.
- Prepared `docs/username-auth-config.patch.json`: username sign-up/sign-in and username requirement enabled, email optional but verified if supplied, password still enabled/required. No password-strength or existing social/MFA settings are relaxed. Clerk prebuilt components read these instance settings; no local password table or custom credential verifier is introduced.

## Verification completed so far

All successful commands expect exit 0; results below are actual runs.

| Check | Result |
| --- | --- |
| Baseline `bun run test:persistence` | 7 passed before changes |
| Updated `bun run test:persistence` | 17 passed, 95 assertions; includes owner migration, encrypted legacy data, opt-out, isolation, expiry, claim/revocation, pending-turn and concurrent begin/claim boundaries |
| `bun test scripts/anonymous-persistence.test.ts scripts/conversation-persistence.test.ts scripts/story-contribution.test.ts` | 27 passed before adding the final concurrent-claim case; the final persistence run above includes that additional case |
| `bun run test:deepseek` | 28 passed, 91 assertions; synthetic upstream only, including reviewed answer persistence and cancellation |
| `bun run test:safety` | 99 passed |
| `bun run test:prompts` | 19 passed |
| TypeScript and changed/new-file ESLint | Passed after fixing newly introduced test typing and render-ref issues |
| `python3 -m py_compile scripts/check-cloudflare-auth.py` | Passed; generated cache moved to ignored debug directory |
| `git diff --check` | Passed |
| `wrangler d1 migrations apply ... --local --persist-to .audit/visitor-preview` | All 4 migrations applied to a newly created disposable database only; existing `.wrangler/state` and remote databases untouched |
| Anonymous browser acceptance, real Next API + isolated D1 + synthetic upstream | Initial two cases passed in 46.2s: save/resume/isolate/delete and no silent fallback; final three-case suite adds concurrent first-visit tabs |
| `CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:chat-scroll` | 8 passed in 53.5s; bootstrap is mocked to opt-out so this UI-only test creates no persisted conversations |

### Corrections and observed failures

- Initial browser attempt used the platform proxy's raw persistence directory while Wrangler CLI appends `/v3`, so the preview reached a separate empty database and returned `no such table`. Confirmed the directory layout and restarted Next with the disposable path ending in `/v3`. No real database was migrated or repaired.
- The first failure-UI assertion also matched Next's hidden route announcer. Scoped it to the visible error text and reran successfully.
- TypeScript caught the test's untyped JSON and the bundled DOM/Bun Web Locks nested-Promise signature; explicit response types and `Promise.resolve` fixed these. ESLint caught render-time ref mutation; conversation refs now carry identity and are inspected only in callbacks.

## Review and activation gate

The user's supplied AGENTS.md sections 4.3 and 5 require escalation before migration, security/permissions changes and production configuration. Implementation and disposable validation are authorized; do not apply the real migration or Clerk patch without the next explicit confirmation.

Suggested next activation scope: **existing local development D1 plus the existing Clerk development instance only**. Back up the local D1 files and record schema/migration state before applying migration 0004; stop the dev server during migration. Read back the exact Clerk development config before and after applying the prepared patch and verify unrelated fields are unchanged. Complete username-only registration/login and optional email recovery acceptance, then rerun visitor-to-account attachment using synthetic data. No production configuration, remote migration, commit, push or deployment is part of this scope unless separately requested.

Production must have its own approved backup/bookmark, coordinated migration/build deployment, and account deletion acceptance. The old account-only design document is historical; this loop record supersedes its anonymous-storage decision.

## Remaining limits

- The Clerk development patch was applied and read back during the authorized activation below. The user subsequently reported successful manual acceptance. The agent did not create an account; no case-by-case manual test results were supplied. Username rules remain Clerk's Latin-character rules, not arbitrary Unicode names.
- Device Trust remains enabled; Clerk documents that it requires a verified email/phone. Keep its behavior for accounts that provide one; verify username-only behavior with a real development test after activation instead of disabling protection globally.
- Visitors without Web Locks may still race simultaneous first visits across tabs; access remains server-authorized, and failures are explicit. Chrome/Edge use the serialized path.
- A stale pending turn from an interrupted request blocks attachment until that conversation is stopped/removed. No silent ownership transfer is attempted.
- Expired visitor cleanup is opportunistic, not a guaranteed retention SLA. No cron or production infrastructure setting was added.
- Login changes have service/component coverage and user-reported development acceptance. Separate password-recovery branch results and real Edge/Safari acceptance were not reported.

## Final review and activation preparation

- Final persistence suite: 17 passed, 95 assertions. Story fixtures also pass against the new owner schema. Final anonymous browser suite: **3 passed (47.5s)**, using real cookie/API/D1 plumbing, a disposable database, and a loop-owned synthetic model upstream.
- `clerk config patch --app app_3IZfz7kJOQMVFk8bd4of54ieWKE --instance dev --file docs/username-auth-config.patch.json --dry-run` exited 0: `Validation passed — no changes applied`. Its diff contains exactly four changes: three username booleans from false to true, and required email from true to false. Password and unrelated provider settings are unchanged.
- A checker pass found that a resumed visitor history could return 404 after login and incorrectly disable attachment forever. Claim is now blocked by active sending, not history loading; a successfully claimed but not yet readable history reloads. The history list refreshes after attachment.
- Verified that specific UI chain with a scoped component harness: `node .audit/debug-visitor-claim/check.mjs`, exit 0, `PASS: unlinked history can be claimed and reloads into the account history`. The harness bundles the real conversation/claim components and substitutes Clerk identity and API responses; full provider sign-in remains pending.
- Final TypeScript, changed/new-file ESLint and diff checks passed after the checker correction.
- Created restricted SQLite backups of the existing local owner databases under ignored `.audit/anonymous-activation-backup/` using read-only source connections and SQLite backup. No existing schema/data changed. The configured database's file is `ef93918ccb12d9f7b60cadc4fa82322abdaf05a52afe656b778070b52cce95e3.sqlite`; its baseline has one account owner, six conversations and four turns. Migration records contain only 0001 and 0002, so **0003_story_contributions.sql and 0004_visitor_conversation_owners.sql** are pending for local activation. A second historical local D1 file was backed up as well; do not migrate that extra file by guessing its purpose.
- Stopped the disposable Next preview, synthetic upstream and component harness after verification. The existing development service was stopped before schema-dependent testing and has not been restarted against an unmigrated database.

### References

- Clerk authentication options: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
- Clerk Device Trust limitations: https://clerk.com/docs/guides/protect/device-trust
- SQLite table/column rename and foreign-key propagation: https://sqlite.org/lang_altertable.html
- Cloudflare D1 migration behavior: https://developers.cloudflare.com/d1/reference/migrations/

## Pre-activation checkpoint

`ALLOW_CLERK_TEST_KEYS=1 bunx next build --webpack` exited 0 after the final implementation changes; 24 static pages generated and both visitor routes included. Existing missing-webhook-secret and middleware-deprecation notices remain; no secret or middleware configuration was changed. No failing implementation check remains. The code, migration, provider patch and restricted local backups are ready for review. Await explicit approval for the existing local database migrations (0003 and 0004) and the Clerk development-instance patch, then start ordinary development for manual acceptance. Do not modify production or apply a remote migration under that development-only approval.


## Authorized development activation (2026-11-14)

The user explicitly approved applying the local migrations, updating the Clerk development instance, and starting development for manual acceptance. This supersedes the earlier development activation gate only; production remains outside scope.

- Stopped-server preflight confirmed no listener on port 3100 and pending local migrations 0003 and 0004.
- Created a fresh restricted SQLite backup with a read-only source connection: `.audit/anonymous-activation-backup/local-pre-activation-20261114T031439Z.sqlite`. The prior-state summary and before/after Clerk configuration snapshots are restricted and ignored in the same directory. No credential values were printed.
- `bunx wrangler d1 migrations apply echo-agents-db --local`: exit 0, both pending migrations applied. Read-only verification confirms all four migration records, one preserved owner, six preserved conversations, four preserved turns, an empty new story table, and zero foreign-key violations. The historical extra local D1 file was not migrated.
- Captured the full existing Clerk development config, applied `clerk config patch --app app_3IZfz7kJOQMVFk8bd4of54ieWKE --instance dev --file docs/username-auth-config.patch.json --yes`, then pulled it again. Both patch and read-back checks exited 0. A flattened comparison confirms exactly four requested changes: username sign-up/sign-in/required enabled and required email disabled. Password minimum remains 15 characters; password settings and all unrelated configuration are unchanged.
- Started `env -u CONVERSATION_TEST_PERSIST_PATH bun run dev --hostname localhost --port 3100` against ordinary `.wrangler/state/v3` and `.env.local`, without synthetic upstream overrides. Left the task-owned server running for the user.
- Direct-local HTTP checks returned 200 for `/support`, `/sign-up`, `/sign-in`, and `/conversations`.
- Read-only Chrome registration-form check passed: visible username and password inputs are required; no email input is required or displayed in the initial form. No account was created or credential submitted.
- Live local visitor bootstrap smoke check passed: POST returns 200, saving defaults on, an HttpOnly visitor cookie is issued, and a fresh visitor sees an empty history list. This creates one empty local visitor identity; no conversation, message, model request, or stored real account history was created or modified by that check.

Stop condition satisfied for this activation request: approved development changes verified, routes and registration form available, server running. Full user registration/login, password recovery and real conversation/attachment acceptance are intentionally left to the user's requested manual verification. No remote D1 migration, production Clerk change, deployment, commit or push was performed. The server process is the task-owned Next dev instance on `http://localhost:3100` (exec session 90297); leave it running unless asked to stop.


## Manual acceptance and local Git delivery

The user reported that verification passed and explicitly requested committing the code. Record this as user-reported acceptance without inferring individual registration, recovery or browser cases. Reviewed the current change inventory and previous automated/build results; no application code was changed during this delivery step. `git diff --check` passed again before staging.

The commit includes the visitor identity/API/UI implementation, encrypted-owner migration, provider configuration patch, privacy copy, regression tests and activation record. Restricted database/config backups, environment files, generated output and local test artifacts remain ignored and excluded. Create a normal local commit on `main`; pushing and production activation are outside this request. Completion requires a successful commit and a clean worktree. Keep the development server running.
