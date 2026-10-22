# Public feedback implementation loop

Updated: 2026-10-22
Status: local implementation verified; editorial and external content pending

## Objective and boundaries

Apply the supplied public-test feedback to home, organization information, case assistance, guest expectation-setting, story dialog localization, and companion artwork. Preserve existing chat, authentication, consent scope, encrypted persistence, and submission API contracts. No deployment, migration, real story submission, publication of interview materials, or external messages are authorized by this implementation task.

## Read state and findings

- Baseline: clean `main` at `dc0a4e5` after fast-forward pull.
- Read existing UI refresh, asset preparation, story contribution, and homepage performance records.
- The linked Google Doc, `1XNq66hz-TjZFWQYVmRDI08sQLH7cDubB3EYpXhG5PWo`, supplies organization description and `rayinsupport@proton.me`. It explicitly marks partner organizations as awaiting contact. Social platform names are listed without account URLs.
- The live guest prompt receives only each alias and tagline. Interview reference files exist in `data/`, but are not mapped to guest identities or accompanied by publishable authorization records. Do not infer authorization or feed those materials into the model.
- Anonymous story submissions are encrypted, pending review, and separate from guest data; no automatic publication or import exists.
- Found the requested white-sweater avatar at `e48dc5c^:public/logo.PNG`. Current asset is the purple-jacket variant. Keep distinct source paths for organization mark and companion avatar.
- Project files and Git history contain no verified organization social URLs or approved partner logo assets. Public lookup did not establish official account URLs; `rayincare.org` could not be read through the web tool. Do not fabricate URLs or publish an unverified reporting form.

## Selected approach

Preserve the current light lavender visual language and existing component system. Design variance 3, motion intensity 2, density 4. Use the attached illustration as the home background and companion resource background. Add `/about` and `/assistance`; preserve existing `/learn`, `/stories`, and chat URLs. Move detailed education/case sections to assistance, leaving concise home entry points plus FAQ and a truthful partner empty state. Centralize confirmed organization content and future social/partner entries. Localize UI without altering consent purpose or stored formats.

## Feedback and stop conditions

Run changed-file ESLint, TypeScript, existing story/prompt/safety regressions, a local production build, and browser checks at desktop, 390px and 320px. Use only synthetic data and mocked submission responses for UI branches. Stop after two identical external failures, or before changing permissions, credentials, production configuration, public API contracts, consent scope, or persistent formats. Missing partner/social content must remain explicitly pending.

## Next entry

Local implementation and validation are recorded below. Resume with the pending-content list; re-read this state before further changes.

## Implemented result

- Added static `/about` and `/assistance` routes with page metadata. Home navigation begins with these two entries; existing `/learn`, `/stories` and chat routes remain available. Home's `#understand` anchor now leads to the assistance entry card.
- Reused the supplied illustration for home and the companion resource panel. Source: `public/design/supplied/support-illustration.jpg`; WebP: approximately 29.1 KB. Recovered white-sweater source: `public/design/supplied/companion-white-sweater.png`; WebP: approximately 42.9 KB. Original artwork is retained.
- Shared brand and public footer components use `如荧RAYIN` and the white-sweater avatar. Companion, end and leave screens reuse the avatar. The existing root browser icon is outside this page-logo update and remains unchanged.
- Moved detailed education and case content into `ViolenceEducation`, used on assistance. Desktop illustrations are 128px, mobile 80px and narrow mobile 64px; body copy is 16px on desktop and 15px on mobile. Added companion, referral-resource and manual takedown entry points without guaranteeing outcomes or exposing an unverified reporting form.
- Added four factual service FAQs and a partner section with an explicit pending state. `data/organization.ts` contains the organization copy, contact email, FAQ data, and typed empty social/partner registries. The footer now has the confirmed email contact; no fabricated social links or partner logos are displayed.
- Guest home/list/dialog/opening/prompt now identify the current AI topic experience. Only aliases and taglines are model facts. Source interviews remain untouched and are not imported into runtime prompts. Anonymous submissions remain separate and pending review.
- Localized story dialog instructions, consent translation, preview, limits, success receipt, storage/network errors, rate limits and server-status feedback. `storySubmissionError` maps status codes to Chinese without exposing arbitrary upstream text. Consent purpose, consent version, schema, receipt matching, deduplication and encryption are unchanged. Shared dialog/sheet close labels are Chinese.
- Added three regression tests for rate-limit/HTTP feedback, the exact companion greeting, and the guest simulation/factual boundary. Updated README routes and UI refresh documentation.

## Verification results

All final checks below passed with exit code 0 unless stated otherwise.

| Command or check | Expected | Actual / coverage |
| --- | --- | --- |
| `bun run assets:design` | Valid WebP outputs | Passed. A four-byte unrelated re-encoding difference in an old case illustration was restored to baseline. |
| `bunx tsc --noEmit --incremental false` | Exit 0 | Passed before and after final code changes. |
| Changed-file `bunx eslint` | Exit 0, no warnings | Passed for all changed TS/TSX/MJS files. First run found a newly added internal anchor using `<a>`; replaced it with `Link` and reran. |
| `bun test scripts/story-submission-feedback.test.ts scripts/story-contribution.test.ts` | No failed tests | 14 passed; 54 assertions. Includes isolated synthetic D1 persistence and idempotency tests. |
| `bun run test:prompts` | Protected prompt sections preserved | 13 passed. |
| `bun run test:safety` | No failed safety tests | 50 passed. |
| `bun run test:deepseek` | Synthetic route and stream tests pass | 16 passed; no live model request. |
| `ALLOW_CLERK_TEST_KEYS=1 bunx next build --webpack` | Exit 0 | Passed; 22 pages generated, including both new static routes. The existing local-only build flag was used; no credentials or production settings changed. |
| `git diff --check` | Exit 0 | Passed. |
| Local Python HTTP smoke check | HTTP 200 | Direct-local `build_opener(ProxyHandler({}))` check passed for `/`, `/about`, `/assistance`, `/guests`, `/support`, `/learn`, `/stories`. Initial environment-proxied request failed with HTTP 502; the direct-local retry exited 0. |
| Chrome UI checks | Working layout and interactions | Passed at 1440px desktop, 390px and 320px where relevant; no horizontal document overflow or broken images in sampled pages. |
| Story dialog in Chrome | Chinese UI, local preview, retained draft, reset authorization | Passed using synthetic text only. Email was masked; consent enabled submit, editing disabled it again, cancel/reopen retained text. The synthetic draft was cleared through the editor. No POST was sent. |
| Guest entry in Chrome | Notice before entry and explicit opening | Passed; navigated to `/guests/1` without sending a model request. |
| Home/assistance interactions | Functional entry points | FAQ and resource expansion work; assistance table-of-contents anchor reaches services. |

The exact ESLint invocation covered:

```sh
bunx eslint components/landing-contact-consent.tsx components/site-brand.tsx components/organization-footer.tsx components/public-page-layout.tsx components/violence-education.tsx components/guest-select-content.tsx components/story-contribution-dialog.tsx components/companion-conversation-page.tsx components/conversation-page.tsx components/support-end-page.tsx components/leave-or-continue-page.tsx components/ui/dialog.tsx components/ui/sheet.tsx app/about/page.tsx app/assistance/page.tsx data/organization.ts data/guests.ts lib/design-assets.ts lib/companion-agent.ts lib/guest-agent.ts lib/story-submission-feedback.ts scripts/story-submission-feedback.test.ts scripts/prepare-design-assets.mjs
```

### Failures and limits

- Initial Python HTTP probing inherited the environment proxy and returned HTTP 502. A direct-local request without proxy forwarding returned 200 for all seven routes. This is a transport-path difference, not evidence of an application 502.
- The in-app browser timed out twice while creating/binding a local tab. Stopped that backend and switched to the available Chrome connection, which completed the UI checks.
- One locator interpreted an HTML summary as a button although the DOM did not expose that role. Used the observed accessibility action instead and verified expansion.
- A development hydration mismatch occurred while source text was being edited during navigation. It identified the old/new brand strings from that edit. Final checks used a fresh production build instead of the stale development document.
- Build output retains existing middleware-deprecation and missing webhook-secret notices. No webhook or authentication behavior was modified.
- No authenticated cloud-history acceptance, live AI conversation, production deployment, or real story submission was performed. HTTP error mappings are unit-tested; success/error submission UI branches were not exercised through an actual browser POST.

### Review artifacts

Ignored local screenshots, relative to the repository:

- `.audit/ui-feedback/home-desktop.png`
- `.audit/ui-feedback/home-sections.png`
- `.audit/ui-feedback/home-mobile.png`
- `.audit/ui-feedback/companion-desktop.png`
- `.audit/ui-feedback/companion-mobile.png`

## Pending content and next entry

1. Replace the initial factual FAQs with the editorial owner's approved questions and answers in `data/organization.ts`.
2. Add confirmed official social URLs and corresponding approved platform logo paths to `SOCIAL_CHANNELS`.
3. Add organizations to `PARTNERS` only after confirming cooperation and logo usage. The source document's prospective list is not authorization.
4. Review final organization/service wording and verify any future reporting-form destination before linking it.
5. Real guest stories require explicit source-to-guest mapping and separate authorization, review, withdrawal, and publication rules. Do not treat existing interview references or story-submission consent as that authorization.

Stop condition: the local implementation is reviewable, build, static checks and regressions pass, and missing external content is explicitly represented without invented facts. No code remains blocked on those content inputs. The user subsequently authorized committing and pushing this implementation to `origin/main`; deployment remains outside this delivery. Local preview is served by `bunx next start --hostname localhost --port 3100`; stop that task-owned process when the preview is no longer needed.


## Git delivery authorization (2026-10-22)

The user explicitly requested committing and pushing the current code. The delivery includes the implementation, supplied source artwork, optimized assets, tests, and review documentation described above. No application code changed during this delivery step, so the passing checks remain applicable. Ignored local screenshots, environment files, and generated build output are excluded.

Fetch the remote before committing and use an ordinary push to `origin/main`. Verify the delivered commit with `git status --short --branch`, `git rev-list --left-right --count HEAD...origin/main`, and `git ls-remote origin refs/heads/main`; success requires a clean worktree, `0 0`, and a remote SHA matching HEAD. Stop on a non-fast-forward rejection; do not rewrite history.
