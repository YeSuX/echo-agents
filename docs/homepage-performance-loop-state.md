# Homepage Performance Investigation

> Status: diagnosis complete; cache improvements subsequently deployed during production auth recovery
> Updated: 2026-09-13

## Objective and boundaries

Investigate slow loading of https://echo-agents.cooper-ai.org/. Read the earlier production-500 and Worker resource-limit incident records first. This task authorizes diagnosis; do not change production settings, billing, authentication, or data.

## Current deployment

- Working tree started clean at `b5e7cf2`.
- Production has advanced since the previous incident: version `2ad08794-cfed-44a0-b03b-9d310b81ca7d`, deployment `e0040e47-1361-45c7-8487-8d529808f083`, 100%, created `2026-09-13T15:18:04.200Z`.
- Read-only version inspection confirms `ASSETS` and `DB`, with no `IMAGES` binding or R2 cache binding. Only binding names were printed. Exact deployed source revision was not established.

## Findings

### Homepage rendering cache is missing

- Four compressed anonymous homepage probes returned 200, TTFB 1.413-2.076 seconds, total 2.172-2.311 seconds, 21,699 compressed bytes. An initial uncompressed request took 2.539 seconds for 97,216 bytes.
- Initial and later response-header samples both report `x-nextjs-cache: MISS`, despite `x-nextjs-prerender: 1` and `s-maxage=31536000`. The latter header alone does not establish a working page cache.
- Four matched live Worker events report CPU/wall milliseconds of 471/492, 201/229, 616/649, and 654/675. All were anonymous, outcome `ok`, with no exceptions or application logs. CPU accounts for most of the observed Worker execution time; it is only part of client TTFB.
- Local `.next/prerender-manifest.json` marks `/` as prerendered without periodic revalidation. `open-next.config.ts` calls `defineCloudflareConfig()` with no cache implementation. Installed adapter 1.17.1 defaults to `dummy`, whose reads and writes do not store data. This explains the missing cache path; a profile or before/after experiment is still needed to divide CPU between Clerk middleware and Next rendering.
- No `revalidate`, `unstable_cache`, `use cache`, or `force-cache` use was found under `app` or `lib`.

### Logo image optimization falls back to the original

- The header displays the logo at 36 CSS pixels. Its sampled Next image URL requests width 96 and quality 75.
- `/_next/image?url=%2Flogo.PNG&w=96&q=75` returns the original 592,844-byte, 903 by 903 PNG. SHA-256 comparison with `public/logo.PNG` confirms identical bytes.
- Two transfers took 3.306 and 8.676 seconds. Worker image-handler time was only 24 and 36 ms, with 3 and 4 ms CPU, so image download time must not be attributed to expensive image computation.
- Installed/generated image-handler code returns the original image when `env.IMAGES` is absent. Production binding inspection confirms that absence.
- The same large PNG is also configured as an icon. Browser caching may avoid duplicate transfers; no duplicate-transfer claim was verified.

### Connection latency and browser resource overhead

- Existing shell proxy settings were used for the primary probes. Connections to application assets varied from roughly 0.3 to 5.0 seconds before response processing. A separate `curl --noproxy '*'` homepage probe also returned 200 but took 2.062 seconds to first byte and 2.408 seconds total; the slowdown is not exclusive to the configured shell proxy.
- Sampled application responses used the LAX edge; Clerk responses used HKG. These are sampled request routes, not the user's physical location or proof that every browser request follows the same route.
- Clerk's main browser script took 5.243 seconds in one probe, including 4.812 seconds accumulated connection setup; its UI entry took 1.508 seconds. Both completed with 200 after one redirect. This does not establish Clerk server processing as the cause.
- HTML references/preloads 16 first-party JS files totaling 281,728 transferred compressed bytes, plus Clerk entry scripts totaling 124,718 bytes. This excludes further runtime imports and is not a browser waterfall or a measured blocking-byte total.
- A hashed Next JS asset returns `cf-cache-status: HIT` but `Cache-Control: public, max-age=0, must-revalidate`. `public/_headers` has no immutable rule for `/_next/static/*`, causing avoidable browser revalidation on repeat visits.
- `app/providers.tsx` mounts `KimiConfigProvider` on the homepage, which fetches `/api/config` after hydration even though the landing content does not need it. This adds a Worker request but does not gate the main content rendering.

## Verification and limits

- `curl --compressed` timing and asset probes: expected success; all selected application resources returned 200. Clerk entry requests initially returned 307; follow-up `curl -L --compressed` checks returned 200. Probe wrappers exited 0.
- Bounded 100-second sanitized `wrangler tail --format json` collection: exit 0; nine events, all `ok`, zero exceptions. Collected only path without query, timing, cookie presence, Ray ID, and counts, never cookie values or raw application logs.
- `bunx wrangler deployments status --json` and captured/sanitized `wrangler versions view ... --json`: exit 0.
- Browser automation failed twice with the same connection/timeout problem; stopped browser attempts. No LCP, INP, hydration timing, complete browser waterfall, or authenticated-session performance was measured.
- Text searches with no matches returned the expected ripgrep exit 1; they are negative search results, not a passing application test.
- No application code changed and no unit/build tests were needed for diagnosis. No deployment, Clerk update, resource-limit change, or billing operation was performed.
- The prior authenticated Error 1102 root cause remains unresolved; successful anonymous timing samples do not close that incident.

## Recommended next implementation

Follow-up: `production-auth-loop-state.md` records the deployed Static Assets cache, prerendered auth entry pages, and immutable JS headers. The logo and Kimi provider changes below were not part of that repair.

1. Configure OpenNext's static-assets incremental cache for prerendered content; evaluate cache interception in a local Worker. Verify HTML/RSC cache behavior, fresh deployment content, and that authenticated API/history access still enforces Clerk. Do not add a blanket shared cache for personalized responses.
2. Serve an appropriately sized, pre-generated logo and icon to remove the original PNG transfer without requiring a paid image service.
3. Add the immutable cache header for hashed Next assets. Consider scoping the Kimi configuration provider to pages that use it after measuring its contribution.
4. Compare the same homepage probes and Worker CPU samples after optimization; obtain browser rendering metrics when browser control is available. Profile authenticated requests separately before claiming the earlier 1102 is fixed.

The diagnostic stop condition is satisfied: concrete application bottlenecks and network contributions are documented, with measured boundaries. Optimization and deployment remain a subsequent task.

## Reproduction

```sh
curl -sS --compressed --max-time 30 -o /dev/null \
  -w 'status=%{http_code} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total} bytes=%{size_download}\n' \
  https://echo-agents.cooper-ai.org/
curl -sS --compressed --max-time 30 -o /dev/null \
  -w 'status=%{http_code} total=%{time_total} bytes=%{size_download}\n' \
  'https://echo-agents.cooper-ai.org/_next/image?url=%2Flogo.PNG&w=96&q=75'
```

## References

- https://opennext.js.org/cloudflare/caching
- https://opennext.js.org/cloudflare/howtos/image
- https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
