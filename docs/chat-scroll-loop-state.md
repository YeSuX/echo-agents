# Chat composer scroll loop

Updated: 2026-11-14
Status: complete; local fix and browser regressions verified

## Objective and boundaries

Fix the page jumping upward when Enter sends a message on `/support` in Chrome or Edge. Inspect the guest conversation for the same pattern. Keep changes local and reversible. Do not change authentication, persistence, API contracts, production configuration, or deploy. Stop after two identical unresolved failures or before crossing those boundaries.

## Baseline and reproduction

- Started from clean `main` at `88cbbe5`.
- Read the public-feedback state, conversation components, shared scroll area, composer styles, and keyboard handlers.
- Both pages call `scrollIntoView` on a bottom sentinel after message/content/reasoning updates. That API can scroll every scrollable ancestor, including the document.
- Plain fixed-height desktop/mobile Chromium cases did not move the composer.
- A synthetic scrollable-document case, using the real conversation components and styles with a 180px bottom body padding, reproduces an Enter-triggered upward jump: composer top `505 -> 325`, document `scrollY: 0 -> 180`.
- Red command: `node .audit/chat-scroll/overflow.mjs`; exit 1, `Composer moved by -180px after Enter`. The ignored harness bundles the real components and substitutes only framework navigation/image/auth integration; chat responses are synthetic SSE.
- Ranked hypotheses: ancestor scrolling from `scrollIntoView`; layout shift when clearing input; Enter default behavior. Changing only the scroll target distinguishes the first hypothesis from the others.
- This reproduces the reported symptom under an explicit outer-overflow condition. The source of any outer overflow in the user's browser has not been established.

## Implementation

- Target the actual message viewport with `scrollTo({ top: viewport.scrollHeight, behavior })` in each conversation page.
- Remove bottom sentinels. Preserve the existing automatic/smooth behavior and effect dependencies.
- Expose an optional viewport ref on the internal Radix `ScrollArea` wrapper.
- Add a Playwright regression script, a pinned test dependency, a `test:chat-scroll` command, and ignored test output.
- Regression coverage: desktop/mobile, support/guest pages, two Enter sends, a long synthetic reply, per-frame composer position, document offset, and message viewport reaching the bottom. Support also checks Shift+Enter and composition-confirm Enter without a send.

## Verification

- `bunx tsc --noEmit --incremental false`: expected exit 0; passed.
- `bunx eslint components/companion-conversation-page.tsx components/conversation-page.tsx components/ui/scroll-area.tsx scripts/chat-scroll.e2e.spec.ts`: expected exit 0; passed.
- `git diff --check`: expected exit 0; passed.
- Initial Playwright runner attempts could not launch because its matching Chromium was missing. Installing via `bunx playwright install chromium`; this is test tooling setup, not a product test result.
- An exploratory WebKit run could not use the installed older browser due a protocol-version mismatch. No Safari coverage is claimed; the user confirmed Chrome/Edge.
- Initial dev server binding to `127.0.0.1` failed to handle a localhost proxy path; restarted bound to `localhost`, which serves the real page. No application configuration was changed.

## Next entry and stop condition

Stop condition satisfied: baseline regression fails on the reported upward movement, fixed browser cases preserve composer/document positions and reach the bottom of the message viewport, and static checks pass. Resume by reading this record and running the documented regression command if scroll or composer behavior changes.

Task-owned Next (`localhost:3100`) and baseline harness (`127.0.0.1:3101`) were stopped after verification. Historical reproduction commands used `.audit/chat-scroll/`; the prototypes and captures were subsequently moved to the clearly marked, ignored `.audit/debug-chat-scroll/` directory. The maintained regression entry point is `bun run test:chat-scroll`.

## Browser verification and reusable workflow

Use an anonymous local browser context and intercept `/api/chat`; no real model request or stored conversation is created.

```sh
# Terminal 1
bun run dev --hostname localhost --port 3100

# Terminal 2: use installed Chrome
CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:chat-scroll

# Or provision Playwright Chromium, then run without the channel override
bunx playwright install chromium
bun run test:chat-scroll
```

`CHAT_TEST_BASE_URL` selects a different local server. The default is `http://localhost:3100`.

- Baseline negative control: `CHAT_TEST_BROWSER_CHANNEL=chrome CHAT_TEST_BASE_URL=http://127.0.0.1:3101 bun run test:chat-scroll --grep 'support.*390px' --max-failures=1` failed with composer displacement `180` against a `< 2` pixel tolerance. This uses the original component bundle from before the fix, without mutating repository source.
- Fixed real Next application: `CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:chat-scroll` passed all four initial overflow cases, exit 0, in 18.2 seconds.
- Expanded coverage adds the original non-overflow case for each route/viewport. The expanded suite passed 8/8, exit 0, in 1.0 minute.
- Replaced the test's temporary global probe with a scoped browser handle, then reran TypeScript, changed-file ESLint, and diff checks: all exit 0. A final full browser run is recorded below.
- The optional Playwright Chromium download stalled after reaching its transfer total; it was stopped. Using the existing Chrome channel completed the tests. No second download or further WebKit attempts were needed.

## Checker review and limits

- The ref now targets the actual overflow element in both layouts; the Radix root ref would not suffice. The optional viewport ref preserves all existing wrapper callers.
- Effect dependencies and original scroll animation choices are preserved. No global scroll reset, keyboard suppression, auth behavior, or persistence behavior was added.
- The synthetic outer-overflow fixture is intentional and catches ancestor scrolling. Ordinary no-overflow cases verify behavior in the initially non-reproducing environment.
- Shift+Enter and composition-confirm Enter are synthetic browser events, not a physical IME acceptance test. Streaming payload parsing and long completed replies are exercised; a real token-by-token upstream connection is outside this UI test.
- No live AI call, production deployment, or native Edge/Safari test was performed. Chrome exercises the shared Chromium mechanism relevant to the reported Chrome/Edge issue.
- No debug logs were added; targeted `rg -n 'DEBUG-' ...` found none. No build was run; the Next development server compiled and served both affected routes for browser tests.

## Final outcome

Final scoped-probe browser suite: `CHAT_TEST_BROWSER_CHANNEL=chrome bun run test:chat-scroll`, expected exit 0 with all 8 cases passing; actual exit 0, **8 passed (46.2s)**. All assertions passed, including both pages, both viewport sizes, both outer-overflow conditions, repeat sending, inner viewport position, document offset, Shift+Enter and composition safeguards in the support page.

No implementation work remains. Changes are local and reviewable; no commit, push, or deployment was performed. The reusable artifact is the browser regression, which checks the symptom directly instead of asserting a particular DOM method.

## Manual verification handoff

The user requested starting the development environment for manual verification. Started `bun run dev --hostname localhost --port 3100` and left the task-owned server running. Direct-local `GET http://localhost:3100/support` returned HTTP 200. Manual acceptance is pending; the automated verification above remains unchanged.

## Local Git delivery

The user requested committing the current code. The delivery includes the three component changes, the Playwright regression and dependency, the test-output ignore rule, and this state record. Reviewed the current diff against the previously verified implementation; no application or test code changed after the recorded passing checks. `git diff --check` passed again before staging. Manual verification results were not separately reported, so no additional manual acceptance claim is made. Create a normal local commit on `main`; pushing and deployment are outside this request. Completion requires a successful commit and a clean worktree.
