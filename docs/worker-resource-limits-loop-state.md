# Worker Resource Limit Incident After Google Sign-In

> Status: Google sign-in disabled as explicitly authorized fallback; Worker resource root cause unresolved
> Updated: 2026-09-13

## Objective and boundaries

Investigate Cloudflare Error 1102 after Google login. If a reliable fix cannot be established, disable the Clerk production Google login option as explicitly authorized by Su Xiong.

Do not upgrade billing, increase resource limits, change authentication enforcement, migrate data, or rotate credentials as part of this fallback.

## Evidence

- User-reported Ray ID: `a3a8083f8b9190c9`, timestamp `2026-09-13 15:02:18 UTC`.
- The user confirmed the failing URL is the application root `https://echo-agents.cooper-ai.org/`, after returning from Google sign-in.
- Active Worker version remains `9a36064f-040e-4b8e-a687-dc9d9f79fd4e`, deployment `3f9fb151-f6ec-47c1-8429-38a73b0436f2` at 100%.
- Reviewed middleware, root layout, auth helpers, and sign-in routes. Authentication is implemented with Clerk middleware and prebuilt components; there is no custom Google callback handler to patch.
- Anonymous HTTP checks returned 200 for `/`, `/sign-in`, `/sign-in/sso-callback`, `/sign-up/sso-callback`, `/support`, and `/api/config`; `/api/conversations` returned 401.
- A bounded 180-second `wrangler tail --format json` session emitted only sanitized records: method, path without query, Ray ID, presence of cookies, outcome, CPU/wall times, and redacted errors. No cookies, JWTs, or OAuth state were printed.
- The seven anonymous requests had `outcome=ok`, no logged errors, and CPU times of 193, 231, 300, 334, 543, 621, and 629 ms. These successful samples do not identify which resource caused the user's failure.
- Read-only Cloudflare API checks show account default and script usage model `standard`, compatibility date `2026-03-02`, and `nodejs_compat`. No explicit limits or observability settings were returned. This does not establish the account's paid/free plan or effective CPU limit.
- An exact-Ray historical telemetry query for a four-minute window around the incident returned HTTP 403, Cloudflare error 10000. Current credentials cannot access Workers Observability queries, so the historical exception and resource measurements were not available.
- Native Chrome inspection found an open Worker resource-limit error tab, but manual browser activity prevented controlled reproduction of the authenticated request. No authenticated session tokens were extracted or manufactured.

## Decision and action

A reliable application fix could not be established from the available evidence. Applied the user's fallback rather than making an unverified production runtime change.

- Patched only `connection_oauth_google.enabled=false` in Clerk application `app_3IZfz7kJOQMVFk8bd4of54ieWKE`, production instance `ins_3IZlKGdbKHHwyYNhwE0yBjY9rKP`.
- Kept existing Google credentials, other Google fields, email-code/password settings, and other configuration sections unchanged.
- No Worker deployment, code change, billing update, resource-limit change, or application-data mutation was performed.
- Disabling Google prevents new attempts through that option; it does not prove that authenticated homepage resource usage or other login methods are fixed.

## Verification

- Clerk patch/read-back wrapper: expected exit 0; actual exit 0. All five checks passed: Google disabled; email unchanged; password unchanged; remaining Google fields unchanged; other configuration sections unchanged.
- Public configuration and disabled-flow rejection wrapper: expected exit 0; actual exit 0. The public environment reports Google disabled, with email-code and password strategies still available. A new `oauth_google` sign-in request returns HTTP 422 and `form_param_value_invalid`, so the disabled provider can no longer start a Google authorization flow.
- No complete authenticated Google flow or alternate login flow was tested during this incident.

## Next entry and stop condition

The requested fallback is complete: the public Clerk environment disables Google and a new Google sign-in attempt is rejected. Keep Google disabled until a future authenticated resource-usage investigation verifies the homepage under the actual Worker limits.

Future investigation requires access to the exact historical invocation or a controlled authenticated reproduction with resource profiling. Check the effective Cloudflare plan/limits before proposing runtime or paid-plan changes. An account upgrade was not authorized or attempted.

## References

- https://developers.cloudflare.com/workers/observability/errors/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/
