# Production Authentication Recovery

> Status: deployed; real production sign-in and history access confirmed by Su Xiong
> Updated: 2026-09-13

## Objective and boundaries

Fix production sign-in and sign-up hanging after a reported successful login. Keep Google disabled. Preserve the existing production Clerk instance, user data, encryption keys, and webhook configuration. Deployment of a verified repair is authorized; paid-plan changes require a separate decision.

## Direct evidence

- Read the existing Worker 1102, production-500, and homepage-performance records before editing.
- Native Chrome initially showed the real production user signed in. History navigation completed and returned an empty list; visiting `/sign-in` while signed in redirected to `/support`, which loaded saved-chat preferences. No messages were sent or conversations deleted.
- Signed out through Clerk's user menu to inspect the normal sign-in entry.
- Reproduced Error 1102 on `/sign-in` at `2026-09-13T15:27:34Z`, Ray `a3a82d3f9a711400`. Matching tail event: `outcome=exceededCpu`, CPU 10 ms, wall 13 ms. Subsequent homepage/privacy RSC requests also reported `exceededCpu` at 10 ms. This establishes CPU termination, unlike the earlier unclassified 1102 report.
- Earlier successful requests above 10 ms do not invalidate the finding: Cloudflare documents temporary over-limit flexibility before enforcement.
- An anonymous Clerk cache-invalidation server-action probe returned 200 and valid RSC; its Worker event was `ok`, 168 ms CPU. No session credentials were supplied. This probe did not reproduce a universal server-action failure.
- During investigation an external deployment replaced production: version `2a03ed76-d3b8-4a0b-b3ed-1cbcff066814`, deployment `b4755084-0dd5-4d4f-8222-b42e922b8201`, created `2026-09-13T15:29:04.879Z`. This agent had not deployed any changes at that time.
- Live HTML then contained a development publishable key and loaded `central-dogfish-8661.clerk.accounts.dev`, matching neither the original production key nor the local development key. Chrome subsequently showed a Clerk handshake URL ending in Internal Server Error. Do not retain or replay handshake parameters.
- Su Xiong confirmed that no other deployment is still running and instructed this repair to continue.

## Changes deployed

- `open-next.config.ts`: use prerendered Static Assets cache and cache interception; leave personalized routes dynamic.
- Auth catch-all pages: prerender `/sign-in` and `/sign-up` entries using `generateStaticParams`; keep dynamic auth subpaths available.
- `public/_headers`: mark hashed Next assets immutable to avoid repeat revalidation.
- `next.config.ts`: reject development public keys and any supplied development secret during production builds, in addition to the existing missing-key guard.
- README: document production-key checks, OpenNext cache population, cache verification, and the read-only cache's revalidation constraint.

## Verification so far

- Initial production OpenNext build: exit 0, including TypeScript; sign-in and sign-up entries appear as SSG.
- Missing public key, development public key, and production-public/development-secret builds: each rejected before compilation as expected; negative-test wrapper exit 0.
- ESLint: exit 0; existing unused `children` warning in `components/ui/combobox.tsx` only.
- Upload dry run: exit 0 with existing third-party duplicate-key warnings.
- Initial bare `wrangler dev` smoke assertion failed because it does not populate Static Assets cache. Switched to the documented `opennextjs-cloudflare preview`, which populated it successfully.
- Local Worker assertions: HTML and RSC cache hits for `/`, `/sign-in`, `/sign-up`; 200 for sign-in/factor-one, sign-up/verify-email-address, and support; anonymous conversation/preferences APIs 401; anonymous history 307; hashed JS immutable. Wrapper exit 0.
- Dynamic auth subpaths render correctly but the read-only cache reports that it cannot store newly generated fallback paths. Only the prerendered entries receive the cache benefit. This limitation does not solve the 10 ms budget for all dynamic requests.
- Local preview processes were stopped intentionally after verification.

## Production deployment and acceptance

- Final `NODE_ENV=production bun run build:cloudflare`: exit 0, including TypeScript.
- Public asset scan: production publishable key present in client assets and middleware; no development publishable keys or known server secrets in public assets. Exit 0.
- Deployed with `opennextjs-cloudflare deploy --secrets-file <temporary-file> --strict`: exit 0. The restrictive temporary file supplied only the existing production `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`; it was removed after deployment. No new credentials or instance were created.
- Version `0f75490f-e79b-4cc9-89a6-d0ec62136fec`; deployment `5aab3547-85b9-4d7f-b583-10cb01bfe4f1`, created `2026-09-13T15:35:56.842Z`, 100%.
- Secret-name readback confirms the existing Kimi, webhook, and conversation-encryption secrets are retained along with both Clerk keys. Secret values were not printed.
- Production curl assertions: `/`, `/sign-in`, `/sign-up` return 200 and cache HIT with the original production Clerk frontend; `/api/config` 200; anonymous `/api/conversations` 401 and `/conversations` 307. HTML and RSC responses are correctly distinguished; hashed JS has immutable caching.
- Added reusable `scripts/check-cloudflare-auth.py`. Its initial urllib transport received 403, unlike the successful curl checks. Switched the probe to the already verified curl transport; `python3 scripts/check-cloudflare-auth.py https://echo-agents.cooper-ai.org` passed all seven groups, exit 0. This verifies route/cache behavior, not form completion.
- Su Xiong explicitly confirmed a fresh production login and opening conversation history both work after deployment.
- The old development-instance handshake generated a signing-key mismatch warning after deployment before the fresh login. Fresh navigation is required when an old tab retains the invalid handshake URL.
- Inspected post-deployment events include successful cookie-bearing requests for support and preference loading, with warm prerendered RSC requests often using 3-6 ms CPU. Some cold and dynamic requests still exceed the nominal 10 ms budget; successful samples do not establish that the resource cap is eliminated.
- Full new-account registration/email verification was not performed. Both registration entry HTML/RSC and its verification subpath were checked; real new-user registration remains separate acceptance.
- User-driven chat requests observed during the final log window reported sanitized upstream Kimi errors. This auth task did not invoke the model or change its key. The subsequent authorized chat repair is tracked in `docs/production-chat-loop-state.md`: the configured account rejected the old model with 404, and production streaming recovered after switching to an available model.

## Next step and stop conditions

The production login recovery acceptance is satisfied by the verified deployment and Su Xiong's successful fresh login/history check. Keep Google disabled. Source changes and incident records are included in the commit requested by Su Xiong; this commit has not been pushed. Run the reusable smoke command after every future deployment; a server-only key update cannot repair a browser bundle built against a development instance.

If CPU termination recurs after this repair, do not keep retrying the same deployment. Present the measured 10 ms constraint and request a decision on Workers Paid or a larger architectural move. No subscription, limit increase, or auth bypass was performed or authorized here. Registration completion and CPU-cap resilience are not claimed by the successful login acceptance.

## References

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://opennext.js.org/cloudflare/caching
