# UI refresh

## Homepage concept follow-up (2026-10-13)

The homepage now follows [Figma 206:89](https://www.figma.com/design/kS71785BD8Bj6wnh4tI0A7/?node-id=206-89): a lavender/peach backlit portrait on the left, safety and support contacts on the right, and guest stories with a voluntary sharing card below. Mobile stacks the safety card below the introduction. Existing educational content and case links remain further down the page. The story button reuses the existing draft, review and consent dialog without changing submission behavior.

Two assets were generated with the built-in image tool. The final hero was edited to move the person into the left half and preserve quiet space on the right. Generated source files, optimized WebP paths and exact prompts are recorded in [home-concept-assets.md](home-concept-assets.md). The prior supplied hero is retained. The historical implementation notes below describe the earlier design.

Validation completed on 2026-10-15: changed-file ESLint, TypeScript, diff checks and a local production webpack build passed (20 pages; the existing `ALLOW_CLERK_TEST_KEYS=1` option was used only for local verification). Desktop, 390px and 320px browser checks covered image loading, overflow, support expansion, privacy/story dialogs and navigation to `/support`. No real chat, story submission or deployment was performed.

Implemented on `feature/ui-refresh`, based on the existing application at `107c642`.

## Design references

- [Home, 74:37](https://www.figma.com/design/kS71785BD8Bj6wnh4tI0A7/?node-id=74-37)
- [Initial conversation, 74:55](https://www.figma.com/design/kS71785BD8Bj6wnh4tI0A7/?node-id=74-55)
- [Active conversation, 74:84](https://www.figma.com/design/kS71785BD8Bj6wnh4tI0A7/?node-id=74-84)
- [Guest stories, 206:4](https://www.figma.com/design/kS71785BD8Bj6wnh4tI0A7/?node-id=206-4)

The publicly viewable canvases were reviewed visually. Exact layer measurements and original image exports were unavailable, so this is an implementation of the design direction, not a pixel-exact export.

## Pages and behavior

- `/`: purple photographic hero, companion invitation, educational sections and three existing anonymous cases. Existing support contacts, privacy dialog, sign-in, learning and guest links remain available. Case links now land on the corresponding `/stories` item.
- `/support`: a centered initial state, three suggested questions with access to all eight, persistent composer, pale purple user bubbles and outlined assistant bubbles. The four initial self-help resources remain available before sending; conversation recommendations are merged ahead of these defaults. Resources preserve their actual Markdown/HTML format and support reading or downloading.
- `/guests`: pale purple introduction, two-column cards, real topic filtering and all nine original guest identities. The sensitive-content dialog still allows cancellation before entering the selected guest's route.
- Small screens use stacked cards and a self-help drawer. Conversation controls, privacy information and the composer remain reachable at 320px.

The existing SSE, stop-generation, history restore, encryption/sync controls, authentication, guest IDs, and voluntary story contribution flow were retained. Chinese IME composition no longer sends a message when Enter confirms a candidate. Restored conversations also restore relevant self-help suggestions. No authentication, storage, or backend API policy was changed.

## Assets

- The homepage now uses the supplied portrait and all six supplied type/case illustrations. The companion avatar is shared by home, conversation and guest selection. The nine guest portraits are unchanged.
- Source artwork remains in `public/design/hero-portrait.png`, `public/design/{type-*,case-*,rose}.svg` and `public/logo.PNG`. The supplied `.webp` portrait originally contained PNG bytes; it is now encoded as real WebP from the PNG source.
- `public/design/optimized/` contains generated WebP images: six 512px illustrations, a 512px companion portrait and a 1152px-wide rose. Together with the 2560px-wide hero, the page assets total approximately 252 KB before any further Next image optimization. The original artwork is retained.
- The six square illustrations are displayed in circular frames without the old decorative icon layers. The supplied rose has an opaque background, so it covers the resource panel rather than occupying a partial-height transparent layer. A purple overlay preserves white text readability. The supplied hero already includes blur, so additional CSS blur has been removed.
- `lib/design-assets.ts` uses static image imports; CSS also imports the rose. Changed generated assets receive new URLs, avoiding stale cached portraits after a replacement.

### Replacing artwork

1. Replace the source PNG/SVG files above, keeping their names and actual formats. Treat `hero-portrait.png` as the hero source; do not edit only the generated WebP.
2. Run `node scripts/prepare-design-assets.mjs` from the project directory (or `npm run assets:design` / `bun run assets:design`). It uses Next's installed Sharp dependency and updates the page-sized WebP versions without modifying source artwork.
3. Refresh the development preview, or rebuild before deployment. Include the generated files in version control with the source changes. Generation is explicit rather than performed on each request.

## Validation

Main integration (2026-10-01): merged the UI and supplied artwork onto `9882c91`. Main's DeepSeek provider, reasoning stream, complete history loading, story draft safeguards, prompt refinements, backend routes and deployment configuration were retained. The conversation UI forwards both live and completed reasoning and keeps its input/quick replies disabled while history loads. TypeScript, changed-file ESLint, safety tests, 13 prompt-style tests, and all 34 DeepSeek/history/story persistence tests passed. The production webpack build generated all 20 static pages using main's existing `ALLOW_CLERK_TEST_KEYS=1` option for local verification only. No live model request or deployment was performed.

Asset integration (2026-10-01): TypeScript, lint for changed TypeScript/JavaScript files, and the production webpack build passed. Browser checks covered the desktop homepage, updated companion and guest-header portraits, all six illustration loads, the rose resource panel and 390px resource drawer. Homepage layouts were also checked at 390px and 320px with no broken images or horizontal overflow. This pass changes artwork and presentation only; live chat APIs were not exercised again.

Initial UI implementation:

- TypeScript passed (`tsc --noEmit --incremental false`).
- Production build passed with `next build --webpack` (all 18 static pages generated).
- 48 safety tests, 6 Claude diagnostics tests and 16 mocked Claude route/SDK tests passed.
- ESLint passed for the changed components. Repository lint excluding the already-ignored `.local` scratch directory reports only the existing unused `children` warning in `components/ui/combobox.tsx`. Unfiltered lint also reports a pre-existing CommonJS import in `.local/claude-http-smoke.cjs`.
- Browser checks: desktop home/guest/conversation, 390px home/guest/conversation, 320px conversation, no horizontal overflow, all eight quick replies reachable, Shift+Enter, default resource drawer, guest filtering, cancellation and correct guest navigation, and visible chat failure/recovery state.

Local browser testing used `next dev --webpack --hostname localhost --port 3100`; the default Turbopack preview stalled in this environment. Real assistant replies could not be verified because the local service reports a missing `ANTHROPIC_API_KEY`. Signed-in cloud history was not exercised in this UI pass; its existing implementation and mocked backend tests are retained.
