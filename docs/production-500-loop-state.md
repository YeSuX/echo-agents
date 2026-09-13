# Production HTTP 500 Incident

> Status: resolved and deployed; verified 2026-09-13

## Objective and boundaries

- Restore https://echo-agents.cooper-ai.org/ and prevent builds without Clerk public configuration.
- Preserve the current Clerk instance, Worker secrets, D1 schema, and user data.
- No migrations, secret rotation, authentication bypass, or production settings changes.
- Stop if the same release failure occurs twice or a production configuration change becomes necessary.

## Evidence (2026-09-13)

- Working tree was clean at `ee33d9f` before the fix.
- Active Worker version: `b1703128-dcb3-483d-a069-7f2f976256c4`, deployed 2026-09-07.
- Anonymous GET `/`, `/privacy`, and `/api/config` returned HTTP 500; `/logo.PNG` returned 200.
- `wrangler tail --format json` captured `@clerk/nextjs: Missing publishableKey` from the routing middleware for the failing requests.
- `wrangler versions view ... --json` confirms DB, ASSETS, and all four expected secret bindings remain present. Only binding names were inspected.
- The ignored `.env.production.local` already contains production Clerk keys. `.env.local` contains development Clerk keys. No key values were printed.
- Bun without NODE_ENV loads the development publishable key. Starting Bun with `NODE_ENV=production` loads the production publishable key.
- The exact September 7 build invocation is unavailable. Runtime evidence proves missing public configuration, but does not establish why that build omitted it.

## Changes

- `next.config.ts`: reject production builds with an empty or missing Clerk publishable key before they can produce another broken deployment.
- `README.md`: document build-time Clerk configuration, Bun environment precedence, and deployment smoke checks.
- Rebuild using the existing production environment; do not change production credentials or bindings.

## Verification

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= NODE_ENV=production bun run build`: expected exit 1; actual exit 1 with the explicit build-time configuration error.
- `NODE_ENV=production bun run build:cloudflare`: expected exit 0; actual exit 0, including TypeScript checks.
- `bun run lint`: exit 0, with the existing unused `children` warning in `components/ui/combobox.tsx`.
- `git diff --check`: exit 0.
- Bundle inspection: the production public key is present in both client assets and middleware; the development public key and known server secrets are absent from public assets.
- `bunx wrangler deploy --dry-run`: expected exit 0; actual exit 0. Existing third-party duplicate `options` warnings remain non-fatal.
- Local OpenNext Worker on port 8787: `/`, `/privacy`, `/sign-in`, `/api/config` returned 200; anonymous `/api/conversations` returned 401; anonymous `/conversations` returned 307. All six assertions passed (exit 0).
- Local preview warns about missing runtime secret bindings; the generated OpenNext environment provides existing local values. The deployed Worker already has the required bindings, confirmed read-only above.
- Real authenticated login, conversation persistence, and signed webhook delivery are outside this incident's smoke coverage.
- `NODE_ENV=production bunx opennextjs-cloudflare deploy`: expected exit 0; actual exit 0. New Worker version: `9a36064f-040e-4b8e-a687-dc9d9f79fd4e`.
- `bunx wrangler deployments status --json`: exit 0; deployment `3f9fb151-f6ec-47c1-8429-38a73b0436f2`, created `2026-09-13T14:33:00.380Z`, routes 100% to the new version.
- Production smoke checks using curl with explicit status/body assertions: exit 0; `/`, `/privacy`, `/sign-in`, `/sign-up`, and `/api/config` returned 200; anonymous `/api/conversations` returned 401 with `AUTH_REQUIRED`; anonymous `/conversations` returned 307. The root contains application HTML and the expected application name.
- Browser automation timed out while opening the page; visual rendering and authenticated browser flows were not verified. HTTP and body assertions were completed independently.
- No production settings, bindings, credentials, schema, or application data were changed. Only the application artifact was redeployed.

## Stop condition and next entry

The incident stop condition is satisfied: the verified artifact is deployed, public routes return 200, and anonymous conversation access still returns 401.

The source fix, deployment instructions, and incident records are included in the Git commit requested by Su Xiong. Future remote builds must receive the existing production Clerk public key in their build environment; the new guard rejects a missing value. The prior September 7 build environment was not available for inspection or modification.

For follow-up acceptance, verify real browser login and saved-chat recovery. The current build includes the already committed D1 BLOB normalization fix referenced in `auth-conversation-persistence-loop-state.md`.
