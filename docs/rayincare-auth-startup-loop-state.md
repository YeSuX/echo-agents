# Rayincare authentication startup incident

Updated: 2026-11-17
Status: deployed and original incident resolved; production DNS, TLS, startup and anonymous persistence verified

## Objective and authorization

Fix indefinite saving-settings loading at `https://rayincare.org/support`. Preserve the existing Clerk instance, user IDs, conversation owners and encrypted content. The user initially requested both domains, then explicitly declined a paid satellite setup and chose migrating authentication to rayincare.org with the old site redirecting to it. No subscription purchase or account/database replacement is authorized. Existing untracked `docs/production-rollout-2026-11-14.md` is prior state and must be preserved.

## Reproduction and evidence

- Baseline source: main at `42f4c31`; only the prior rollout document was untracked.
- Read the existing persistence hook, save control, provider/middleware, production rollout and authentication incident records.
- `node .audit/debug-rayincare/probe.mjs`: exit 1. `ready=false`, `clerkLoaded=false`, saving label remains visible, composer disabled, zero visitor bootstrap requests. Clerk JS loads with HTTP 200; `/v1/environment` returns 200; `/v1/client` returns 400 and explicitly reports that production keys are only allowed for `cooper-ai.org` and the Origin is invalid.
- Negative control: `PROBE_ORIGIN=https://echo-agents.cooper-ai.org node .audit/debug-rayincare/probe.mjs`, exit 0. Clerk loaded, visitor bootstrap returned 200, saving label cleared, composer enabled. No model request was made.
- Ranked hypotheses: (1) root-domain mismatch causes Clerk rejection, confirmed by origin comparison; (2) network/script load failure, excluded for this repro by successful script/environment responses; (3) unbounded startup in the hook turns any unresolved SDK/fetch/lock into indefinite loading, confirmed by the explicit authLoaded gate and lack of deadlines.
- Clerk domains API lists only primary `cooper-ai.org`; rayincare.org is not configured.

## Domain decision

Official satellite documentation requires a production paid plan. Verified current monthly list price: Pro $25/month plus $10/month for one satellite. The user chose no purchase and a single canonical domain. Existing identity data stays in the same production instance. Changing its primary domain generates a new publishable key and requires DNS, certificate issuance and a coordinated build/runtime-key update. Existing logins may need re-establishment; visitor cookies are origin-scoped and are not automatically transferred. Do not expose visitor credentials in URLs or migrate/decrypt user messages.

## Feedforward and feedback

Prepare source changes and tests before remote cutover. Add bounded auth/preferences/lock initialization, explicit errors and retry without silently switching to unsaved mode. Configure page redirects from the old origin to rayincare.org while preserving existing API/webhook delivery. Add read-only preflight for DNS conflicts and snapshot existing provider/deployment configuration before domain changes. Never overwrite conflicting DNS, rotate encryption keys, delete users/data, or purchase services. Stop after two identical unresolved external failures, DNS conflicts, certificate failure requiring unsupported changes, or lost identity/data invariants.

Verify a red regression before implementing startup guards, then green timeout/retry/normal cases, TypeScript/ESLint, persistence tests, production build, and the original actual-origin probe after cutover. Final status must distinguish deployment/SDK readiness from unperformed real-user login and cross-origin visitor-history transfer.

## Prepared changes and checker review

- Extracted preference bootstrap with a 15-second deadline covering both the request and a queued Web Lock, cancellation and in-flight deduplication. Authentication also has a 15-second startup deadline. Errors expose retry and keep message submission disabled instead of silently losing persistence.
- Both support and guest conversation pages use the same startup guard. Preference retry retains the current conversation; unresolved SDK retry reloads the page.
- Prepared old-domain GET/HEAD page redirects to the canonical origin while retaining API, webhook, asset and Clerk proxy routes. Strip origin-bound Clerk query parameters. Checker review found a double-slash pathname could otherwise change the target host; URL pathname assignment and a regression assertion now enforce the canonical host.
- Added reusable startup and canonical-origin test commands. The production smoke probe accepts an explicit expected Clerk hostname; its default retains compatibility with prior rollout commands.
- At the initial preparation checkpoint, no production domain, DNS, public key, Worker deployment or database change had been made. See cutover records below for the subsequent authorized deployment. No commit or push has been performed. Preserve unrelated untracked `artifacts/suxiong-profile` and the prior rollout document.

## DNS prerequisite and next entry

- Wrangler OAuth was refreshed successfully, but its scopes include zone read and no DNS permission. Zone `rayincare.org` is active, ID `9893a4dd652c7bda4a0247601f1ef078`. DNS record listing is denied with Cloudflare error 10000. Do not repeat DNS calls with that credential.
- Two computer-use connection attempts timed out. The CUA phase was closed with its completion summary. Plugin discovery found no suitable Cloudflare DNS connector.
- Prepared `.audit/debug-rayincare/authorize-dns.sh` using the wizard skill library. `bash -n` passed. The human creates a Zone DNS Edit token restricted to rayincare.org; hidden entry stores it in an ignored mode-0600 file and the wizard verifies read access without changing DNS. The assistant must not run this interactive wizard end-to-end or request the token in chat.
- User was asked to run the local wizard and reply when ready. At that checkpoint, no response or credential file existed. The user subsequently completed authorization; see cutover below. The primary-domain change was gated on verified DNS access and conflict checks.
- After access is verified: snapshot current Clerk configuration/deployment, verify and prepare DNS, migrate the existing production instance to rayincare.org, use authoritative new CNAME targets and new publishable key, verify DNS/TLS, build/scan/upload with all existing secret bindings retained, then deploy and repeat the actual-origin browser probe. No database migration is required. Keep old DNS records and API/webhook routes; preserve user IDs and encryption keys. Fresh real-user login remains manual acceptance.

## Validation ledger

| Command | Expected | Observed | Coverage limit |
| --- | --- | --- | --- |
| `node .audit/debug-rayincare/probe.mjs` | SDK ready and composer enabled | Exit 1; confirmed origin rejection | Original deployed incident, before repair |
| `PROBE_ORIGIN=https://echo-agents.cooper-ai.org node .audit/debug-rayincare/probe.mjs` | SDK ready and composer enabled | Exit 0 | Old origin before cutover |
| `CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:persistence-startup` | Exit 0 | 5 passed (50.7s) | Failed SDK and stalled preferences on both pages, plus queued Web Lock timeout/retry; no production writes |
| `ANONYMOUS_HISTORY_E2E=1 CHAT_TEST_BROWSER_CHANNEL=chrome bunx playwright test scripts/anonymous-history.e2e.spec.ts --grep 'bootstrap failure' --workers=1 --reporter=line` | Exit 0 | 1 passed (6.8s) | Controlled bootstrap 503 keeps input disabled and exposes retry; database-writing cases deliberately excluded on the normal dev server |
| `bun run test:canonical-origin` | Exit 0 | 1 passed, 11 assertions | Pure redirect routing; middleware deployment not yet checked |
| `bun run test:persistence` | Exit 0 | 17 passed, 95 assertions | Isolated storage/ownership/encryption fixtures |
| `bunx tsc --noEmit --incremental false` and targeted ESLint | Exit 0 | Passed after final source changes | Static checks |
| Python `compile()` on `scripts/check-cloudflare-auth.py` | No syntax error | Passed | Production smoke awaits cutover |
| `git diff --check` | Exit 0 | Passed | Whitespace only |
| `CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:thinking` | Exit 0 | 6 passed (45.1s) | Controlled completion/stop/failure on both pages; confirms normal composer/message behavior still works |
| `NODE_ENV=production bun run build:cloudflare` | Exit 0 | Passed | Existing-domain key only; rebuild with the new production key after domain cutover. Local missing webhook-secret and middleware deprecation warnings remain; production bindings are not inferred from this build |

The initial preparation checkpoint did not satisfy the stop condition because production still used the old Clerk primary domain. That prerequisite was subsequently resolved by explicit user completion of DNS authorization. Never treat elapsed time or a preselected question option as authorization completion.

## Authorized cutover resumed

- User completed the scoped DNS wizard. API read and write access verified. No existing Clerk DNS records or CAA conflicts were present in rayincare.org. Kept the original unrelated DNS record intact.
- Restricted snapshots are under `.audit/debug-rayincare/cutover`: Clerk configuration/domain/user count, DNS, Worker version and D1 statistics. Baseline active Worker is `4a5f268a-f02f-43bd-b04a-ea7c415053ea`. Clerk has one current user; D1 has four account owners, five visitor owners, 24 conversations, 76 turns, two story contributions and no foreign-key violations. The first statistics command used the wrong story table name and failed read-only; corrected it using the checked-in migration before capturing the baseline.
- Created the two generic frontend/account CNAMEs before switching. Public DNS resolution verified. Authorized `POST /instance/change_domain` with `home_url=https://rayincare.org` succeeded on the existing application/production instance. New primary domain ID is `dmn_3MDKWxgh4lCUK37v1ErZO2gysSp`; no satellite or new instance was created.
- Fetched authoritative DNS targets after migration. Mail/DKIM targets changed to `a1v61tqlsydo`; configured all five CNAMEs DNS-only and verified public resolution. Triggered the Clerk platform DNS check. A prior status lookup with the wrong platform path returned 404; corrected `/platform/applications/...` succeeds. No failed mutation was repeated.
- Pulled the new production key into a restricted ignored file, verified its decoded frontend is `clerk.rayincare.org$`, and replaced only the public-key line in `.env.production.local`. Original environment snapshot retained; local server secret values unchanged. Additive upload secrets file contains only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Post-migration `clerk config pull` compares equal to the full pre-migration authentication configuration. All username/password/email/provider settings remain unchanged.
- `NODE_ENV=production bun run build:cloudflare`: exit 0 with the new live public key. Scanned 114 public assets before upload: new public key present, no configured server secret exposed. The local webhook-secret warning does not establish remote binding availability; inspect candidate bindings before activation.
- Candidate upload command: `NODE_ENV=production bunx opennextjs-cloudflare upload --strict --keep-vars --tag=rayincare-auth-20261117 --secrets-file=.audit/debug-rayincare/cutover/public-key-only.json`. Upload preserves existing secrets additively. Deployment and actual-origin acceptance still pending at this checkpoint.
- Upload succeeded: candidate `c46f1de8-8196-452f-a157-dc7ad6afe58c`. Remote inspection confirms all eight prior binding names retained, including Clerk/webhook/encryption/model secrets. Current Clerk status confirms all five DNS records and mail complete; authentication hostname certificate complete. Account Portal certificate remains in progress. Two Account Portal curl TLS checks timed out; stop repeating that transport probe and report the external limit. Authentication frontend TLS returned HTTP 200. The initial deployment shell was gated behind the failed Account Portal curl and therefore did not execute; activate the verified candidate separately to restore the main application, then inspect browser acceptance. Portal readiness remains a separate incomplete condition.

## Deployment and final feedback

- `bunx wrangler versions deploy c46f1de8-8196-452f-a157-dc7ad6afe58c@100 --yes --message 'Fix rayincare Clerk origin and bounded conversation startup'`: exit 0. Final deployment `28ae5dc1-b6b5-4200-82c0-eb88267b9476`, created `2026-11-17T01:47:31.893142Z`, confirms the candidate at 100%.
- Provider status subsequently became `complete`: DNS, mail, SSL and both `accounts.rayincare.org` and `clerk.rayincare.org` certificates complete. Snapshot: `.audit/debug-rayincare/cutover/domain-status.json`.
- `node .audit/debug-rayincare/probe.mjs`: exit 0 on the original failing URL. `ready=true`, `clerkLoaded=true`, `savingLabel=false`, `inputDisabled=false`; exactly one bootstrap returns 200. Clerk client/environment endpoints return 200 on the new frontend hostname, with no SDK error messages. This is the original red-capable incident probe now green against the actual deployed application.
- `PROBE_ORIGIN=https://echo-agents.cooper-ai.org node .audit/debug-rayincare/probe.mjs`: exit 0. Final origin is rayincare.org; SDK/bootstrap/composer readiness all pass. Independent HTTP checks confirm old support/sign-in pages redirect with 307, conversation query is retained and Clerk ticket stripped. Unsigned old-domain Clerk webhook POST remains non-redirecting HTTP 400.
- `python3 scripts/check-cloudflare-auth.py https://rayincare.org --clerk-host clerk.rayincare.org`: exit 0. All seven route/cache/anonymous-access groups pass. Updated README with the canonical command.
- `CHAT_TEST_BASE_URL=https://rayincare.org CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:persistence-startup`: exit 0, 5 passed (28.0s) on the deployed frontend. Failed SDK, stalled preferences and queued Web Lock all terminate with errors, keep the composer disabled and recover through retry. Mocked preferences avoid production storage/model writes in these cases.
- `python3 .audit/debug-rayincare/cutover/smoke.py`: exit 0. A fresh secure HttpOnly visitor cookie defaults to saving; one synthetic greeting completes through the real saved-chat/model path. Saved history exactly matches the submitted user content and final assistant output, both encrypted BLOBs. No-cookie access is denied. Deleted only that synthetic conversation and its exact empty visitor owner; verified 404 afterwards. No original user message was read/decrypted.
- Removed exactly two empty visitor owners created by fresh readiness probes, using recorded synthetic IDs with kind/no-conversation predicates. Final D1 statistics match the baseline exactly: four account owners, five visitor owners, 24 conversations, 76 turns, two story contributions, zero foreign-key violations. Statistics-only snapshots retained before/after; no database migration was required.
- Clerk `/instance` still reports `ins_3IZlKGdbKHHwyYNhwE0yBjY9rKP`; user-count snapshot equals baseline. Full authentication configuration compares equal before/after. Original users and server-side secrets remain in the same instance and Worker bindings.
- Read-only main-site form inspection passes: sign-in identifier is required; sign-up username/password are required and email is not required. The first two form-audit attempts incorrectly asserted that the sign-in first step required a password. Captured DOM showed `aria-required=false` for that field; corrected the audit to respect Clerk's staged sign-in and reran successfully. No production credential was entered or account created. Actual personal login, recovery and account attachment remain manual acceptance.
- After certificate completion, a fresh headless Account Portal request returns HTTP 403 with `cf-mitigated=challenge` and title `Just a moment...`. This is a Cloudflare browser challenge; do not bypass it or treat it as proof of a broken main-site sign-in. Account Portal login is not claimed as verified. The main site's embedded forms and the original conversation page are verified independently.

## Final state and next entry

Stop condition met for this incident: canonical authentication migration complete on the existing instance, deployed new-key version active at 100%, original production repro green, old pages redirect, actual anonymous encrypted persistence round trip passes, deployed timeout/retry guards pass, and existing data/configuration invariants hold. Remaining manual coverage is personal login/account attachment and the challenged hosted Account Portal; old-origin anonymous cookies/history are not automatically transferred and no data was deleted to achieve the domain cutover.

Deployment source baseline is `42f4c31` plus the local patch. Publication was pending at deployment; see user acceptance below. `.audit/debug-rayincare/cutover/source-manifest.json` records changed file hashes. The scoped DNS credential and provider/environment snapshots are ignored and restricted. The temporary DNS token may be revoked after acceptance. Do not print or commit any secret artifact.

Recovery: previous Worker `4a5f268a-f02f-43bd-b04a-ea7c415053ea` embeds the old Clerk domain. A code-only rollback to it would reintroduce the origin mismatch after the provider domain migration; prefer a compatible forward fix. Reversing the provider domain would require coordinated DNS/public-key/build changes and a separate decision. Retain existing encryption and webhook secrets and old-domain API delivery. Read this record and check the live deployment before any further production work.

## User acceptance and source publication

- On 2026-11-17, the user reported manual verification passed and explicitly requested commit and push.
- Pre-commit verification: application, test and README hashes match the verified production rollout manifest; `git diff --check` passes. No implementation change requires repeating the already passing build and tests.
- Publish only the incident source, regression tests, README and this state record. Preserve the unrelated pre-existing untracked `docs/production-rollout-2026-11-14.md`; ignored credentials, snapshots and build outputs must remain outside Git.
- Publish using a normal commit and fast-forward push to `origin/main`, without rewriting history. The resulting commit is discoverable through this file's Git history. Verify the remote branch equals local HEAD after push; stop on divergence or a push rejection rather than forcing it.

## Sources

- https://clerk.com/docs/guides/development/deployment/changing-domains
- https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains
- https://clerk.com/pricing
- https://clerk.com/articles/clerk-pricing-explained

## Beta registration recovery on 2026-11-25

- Target: the existing production Clerk instance at clerk.rayincare.org. Acceptance is limited to the public registration/login pages and configuration. The owner explicitly chose to skip creating a production acceptance account.
- The public smoke check failed with `Development Clerk key in production artifact`. The canonical URL, a fresh query URL and the legacy redirect all returned a test publishable key. A fresh browser showed the development instance's email/password registration form.
- The GitHub Workers Builds check for main commit `089d0b0` explicitly identifies Cloudflare build `013925da-a9d2-4c8c-920f-b73866dc1825` and version `88647d1d-6ac6-4c9d-b713-825e11480f66`. At 2026-11-17 02:11 UTC this version took 100% of traffic, superseding the verified live-key artifact from 01:47 UTC. The current sources match the accepted source manifest. The regression is in the frontend build artifact. The exact stored build-variable values were not available to this session.
- Recovery: Wrangler deployed verified version `c46f1de8-8196-452f-a157-dc7ad6afe58c` at 100%. Deployment `4d5e8d8e-49f6-4b30-bec9-ef55f2e76851` confirmed by read-back. No user, DNS, secret or database migration was needed.
- `python3 scripts/check-cloudflare-auth.py https://rayincare.org --clerk-host clerk.rayincare.org`: exit 1 before recovery and 0 after recovery, all seven groups passed. Fresh browser DOM/SDK checks for both routes: exit 0. The registration form requires username/password; the login identifier accepts username. Production environment read-back: email enabled and optional, username length 4–64, password minimum 15. No credentials submitted.
- The local Workers Builds main-branch guard blocks the preview override and a live key from another Clerk domain. `bun test scripts/clerk-production-build.test.ts`: three failing regression cases before the fix, all four cases passing after it. Targeted ESLint, TypeScript and diff checks passed. The refreshed one-page guide at `docs/beta-account-registration.docx` embeds the two live form captures. Render and hyperlink checks passed.
- Next release: the Workers Builds API rejected this session with HTTP 403 (Cloudflare code 10000); browser management was unavailable. The automatic build settings have not been corrected or revalidated. Before the next main push, set the production trigger's build-time NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to the existing canonical live key, disable ALLOW_CLERK_TEST_KEYS on that trigger and ensure any build-time CLERK_SECRET_KEY belongs to the same production instance. Land the local guard through normal source review and run the same public smoke and browser checks against the resulting deployment.

## Production build configuration and beta guide follow-up

- Requested order: repair the production trigger, verify its configuration, commit and push the scoped changes, then verify the automatic production deployment, public registration form and configuration. Keep acceptance read-only.
- Rechecked the Wrangler credential: Workers Builds returned 403. API variable updates require account-scoped Workers CI Write. An ignored mode-0600 token handoff and a trigger-scoped patch/read-back helper are prepared under `.audit/beta-auth-20261125`. No remote build settings or traffic changed in this follow-up yet.
- The guide and sign-up page use the beta_ username convention. The guide includes an example at both registration and login, the existing homepage companion illustration, homepage typography and colors, and both live form screenshots. Local checks passed for its one-page render, image integrity and hyperlinks. No account created.
- `WORKERS_CI=1 WORKERS_CI_BRANCH=main NODE_ENV=production bun run build:cloudflare` completed. The generated registration HTML contains the beta example, the canonical Clerk frontend and no development key. All four guard tests, targeted ESLint, TypeScript and diff checks passed.
- Created a seven-day, single-account Workers Builds Configuration Edit token through the external Chrome dashboard. Verified the historical main build and its active main-only trigger. Updated the existing build variables for the canonical live publishable key, a disabled preview override and the existing secret key as a masked secret. Exact read-back passed for both public values; secret protection and all unrelated build settings were preserved.
- Release acceptance: verify the new main commit’s Workers Builds check and deployment, then repeat the seven public smoke checks, the beta hint and required fields on the live form.
