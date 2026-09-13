# Production Google OAuth Incident

> Status: Google sign-in disabled after post-login Worker Error 1102; credentials retained
> Updated: 2026-09-13

## Objective and boundaries

Restore Google sign-in on https://echo-agents.cooper-ai.org without replacing the existing Clerk instance or altering user data.
Production authentication configuration and credentials require Su Xiong's approval. Do not put OAuth secrets in source control or chat.

## Findings

- The user reports Google `400: invalid_request`.
- Read the previous HTTP 500 incident state and current SignIn/SignUp components. They use Clerk's prebuilt components; no custom Google authorization request is constructed in application code.
- `GET https://clerk.cooper-ai.org/v1/environment` succeeds and identifies a production instance. The `oauth_google` social strategy is enabled and authenticatable.
- A credential-free diagnostic `POST /v1/client/sign_ins`, using strategy `oauth_google` and the application sign-in callback, returns a pending sign-in attempt with a Google authorization URL.
- The generated Google request contains an empty `client_id` value. No account sign-in was completed and no user was created by this diagnostic.
- The generated Google `redirect_uri` is `https://clerk.cooper-ai.org/v1/oauth_callback`.
- The generated response type is `code`; scopes are `openid`, Google userinfo email, and Google userinfo profile.
- Do not infer `redirect_uri_mismatch` from HTTP 400: the observed code is `invalid_request`, and the generated request is missing the client identifier.
- `clerk whoami` exits 1 with `auth_required`: the management session expired. Browser control also timed out while obtaining state. No private Google connection settings could be inspected.
- No application code or production configuration was changed during this investigation.

## Concrete remediation

1. In the existing Google Cloud project, locate the intended OAuth client (or create one if none exists). It must be a Web application client.
2. Ensure the authorized JavaScript origin includes `https://echo-agents.cooper-ai.org`.
3. Ensure the authorized redirect URIs include exactly `https://clerk.cooper-ai.org/v1/oauth_callback`.
4. In the existing Clerk application's production instance, open SSO connections > Google. Enable custom credentials and set that client's Client ID and Client Secret together. Keep the secret within the trusted provider dashboards.
5. Review the Google app audience and publishing status before allowing general production users.
6. Save only after Su Xiong approves the specific production authentication change. A Next.js rebuild should not be needed for provider-side OAuth credentials.

## Verification and stop condition

- Public Clerk environment: exit 0, Google strategy enabled.
- Diagnostic authorization generation: exit 0; empty client ID confirmed, actual callback URI extracted without displaying OAuth state or tokens.
- A Google authorization request containing the same non-sensitive parameters reproduces both `Missing required parameter: client_id` and `invalid_request`. Curl exits 0; no Google account or credentials were used.
- After remediation, verify the generated client ID is nonempty and matches the intended Google OAuth client.
- Complete a real Google sign-in in a supported external browser, verify the callback returns to the application and the authenticated session works.
- Do not mark resolved until the real Google flow succeeds. Escalate if the same configuration failure recurs twice.

## Next entry

Read `worker-resource-limits-loop-state.md` first. After credentials were configured successfully, Su Xiong reported Worker Error 1102 on return to the application homepage and explicitly authorized disabling Google if a reliable fix could not be established. Google is now disabled and that fallback is verified. Do not re-enable it merely to repeat the earlier OAuth setup.

The existing Google OAuth Web client and credentials remain configured. A future investigation should focus on authenticated homepage resource usage and actual Cloudflare limits before proposing re-enablement.

## References

- https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google
- https://developers.google.com/identity/protocols/oauth2/web-server

## Management follow-up

- Su Xiong completed Clerk login. `clerk whoami` now exits 0 and resolves production instance `ins_3IZlKGdbKHHwyYNhwE0yBjY9rKP`.
- A read-only `clerk config pull` against that exact instance exits 0. `connection_oauth_google` has `enabled=true`, `authenticatable=true`, `client_id=""`, and an empty `client_secret`. Secret values are never printed.
- The prior inference is now confirmed directly in production settings: both custom OAuth credential fields are absent.
- Asked whether a Google OAuth Web application client already exists. No credentials or provider settings have been changed.

## OAuth client creation follow-up

- Su Xiong explicitly asked the agent to help create the Google OAuth client. This authorizes preparing the creation workflow; observe any action-time browser confirmation for credentials and terms.
- Browser extension tab creation still timed out. Read the browser troubleshooting documentation and successfully accessed the same Google Chrome application through the documented native CUA interface.
- Opened a new Google Cloud Auth clients tab. The selected project shown by the page is `suxiong-claw` (display name `suxiong claw`); project suitability has not been verified, and no resources have been created.
- Native automation was interrupted by manual Chrome changes. Requested a short period without manual Chrome interaction before continuing.
- Prepared client parameters: name `echo-agents-production`, type `Web application`, JavaScript origin `https://echo-agents.cooper-ai.org`, redirect URI `https://clerk.cooper-ai.org/v1/oauth_callback`.
- Next step: inspect available projects, select the intended project or prepare a dedicated project, then populate the OAuth creation form. Show the concrete project, client settings, and any consent-screen terms before the final credential-creation confirmation.

## Browser blocker after user yielded Chrome

- Su Xiong confirmed the agent may continue Chrome interaction without manual interference.
- The native interface selected the existing Google Cloud tab using Command+9, and the window title confirms the Auth clients page for `suxiong claw`.
- Full accessibility state now contains only the window title; screenshot capture is unavailable. Reacquiring Chrome by its observed bundle ID did not restore page visibility.
- A final documented browser tab-list request also timed out after 15 seconds. Both available control paths are unusable for inspecting or submitting the OAuth form.
- Stopped without creating projects, OAuth clients, consent screens, or changing Clerk settings. Do not blindly submit controls without page visibility.
- Resume after browser control can read the Google Cloud page. A user-supplied current-page screenshot can support guided manual setup if control cannot be restored.

## Authorized credential installation

- The user supplied the Google Web client credentials and explicitly requested adding them to Clerk. This satisfies the approval requirement for this specific production configuration update.
- Target: application `app_3IZfz7kJOQMVFk8bd4of54ieWKE`, production instance `ins_3IZlKGdbKHHwyYNhwE0yBjY9rKP`.
- Applied a minimal `clerk config patch --file <temporary-file> --yes` containing only `connection_oauth_google.client_id` and `connection_oauth_google.client_secret`. The temporary directory and file used restrictive permissions and were removed after the request. CLI output was captured without printing credentials.
- The Client ID matches the user-supplied client. Its project is `suxiong-claw`, callback is `https://clerk.cooper-ai.org/v1/oauth_callback`, and JavaScript origin is `https://echo-agents.cooper-ai.org`.
- The patch command succeeded. The first wrapper exited 1 because it incorrectly expected a plaintext Secret on read-back; Clerk returns a masked value. A follow-up read exited 0 and confirmed a nonempty masked Secret. No second patch was needed.
- Read-back confirms Google remains enabled and authenticatable, all other Google fields are unchanged, and all other configuration sections (excluding config version metadata) are unchanged.
- Generated a new unauthenticated Clerk Google sign-in attempt and verified the authorization host, supplied Client ID, exact callback URI, and code response type. All four assertions passed.
- Replayed the non-sensitive OAuth authorization parameters to Google without account credentials, state, or tokens. Curl exited 0 and returned the Google sign-in page. `Missing required parameter: client_id`, `invalid_request`, `redirect_uri_mismatch`, and `invalid_client` are all absent. Verification script exited 0.
- No application rebuild, Worker deployment, data migration, or user creation was performed. The requested Clerk credential installation is complete; real Google sign-in and token exchange remain unverified.
- The user pasted the Secret into chat. Do not reproduce it in reports, repository files, or future messages; recommend a subsequent rotation through a private credential channel.
