# Anonymous story submission recovery

> Status: deployed with user approval; production submission and retry verified
> Updated: 2026-09-14

## Objective and boundaries

Fix failed anonymous story submissions and incomplete conversation drafts. Preserve Clerk, DeepSeek, existing conversation tables, keys, and user records. Test with synthetic content only. Prepare and verify all changes before requesting approval for the additive production D1 migration, as required by the user-provided AGENTS.md section 5. Do not publish actual user stories or create a public story-reading endpoint.

## Findings

- Both conversation pages built the draft from user messages only, dropping all assistant replies.
- The end-page state initializer read and immediately deleted sessionStorage. Refresh, strict-mode initialization, and reopening could lose the draft.
- The story endpoint attempted to append `.local/pending-stories.jsonl` under the Worker bundle. Cloudflare's bundle filesystem is read-only and temporary files are not durable storage.
- A synthetic production POST returned HTTP 500 with `Could not save`. An earlier probe had a transport timeout; no actual user text was submitted.
- The old backend rejected more than 5,000 characters without corresponding UI limits. The dialog did not catch network exceptions and reported all HTTP failures identically.
- Cloud history returned only the first 100 turns, with no pagination consumed by either chat page.

## Implemented changes

- Shared full-transcript builder includes user messages and completed assistant replies in order, with role labels. Excludes opening text, marked fallback messages, and model thinking. No context-window truncation is applied.
- Drafts are read non-destructively, edits are retained in sessionStorage, and successful verified receipts clear only the matching draft. Legacy text drafts remain readable. Ending while generating or before history has loaded is blocked with an explanation.
- Both history screens load all pages, with ownership checks retained in the API/repository. Loading failures do not silently return partial history.
- The dialog supports editing, a local anonymized preview, explicit consent, length feedback, actionable network/rate-limit/server errors, and stable submission IDs for retries. Editing the content resets consent and generates a new ID.
- Maximum text length is 100,000 characters; streaming request reading also enforces a byte ceiling. Overlong input is rejected without silently cutting the draft.
- `0003_story_contributions.sql` adds only `story_contributions` and its review index. No existing tables are changed. Records contain redacted encrypted content, a random receipt ID, encryption metadata, lengths, consent version, pending status, and timestamp. No account ID, IP, or raw plaintext is stored in the table.
- The existing AES-GCM codec/key is reused under a separate story AAD namespace. Insert conflicts are checked against decrypted existing content; matching retries are idempotent and differing content cannot overwrite the record.
- The API confirms success only after persistence, returns a receipt, and does not automatically publish submissions.

## Validation

| Check | Expected | Actual |
| --- | --- | --- |
| Initial story tests | Exit 0 | Failed on duplicate submission because D1 returned BLOBs as arrays; fixed explicit conversion before decryption |
| `bun run test:stories` | Exit 0 | Passed, 11 tests / 36 assertions |
| `bun run test:persistence` | Exit 0 | Passed, 7 tests / 18 assertions |
| Initial standalone TypeScript check | Exit 0 | Found test-only required-env deletion and unknown receipt types; corrected both |
| `bunx tsc --noEmit` | Exit 0 | Passed |
| `bun run lint` | Exit 0 | Passed; pre-existing unused `children` warning in `components/ui/combobox.tsx` |
| `NODE_ENV=production bun run build:cloudflare` | Exit 0 | Passed final artifact |
| Local Worker POST and duplicate retry | 201 followed by 200; one encrypted row | Passed with a 16,072-character redacted fixture; receipt IDs match |
| Isolated local D1 readback | One pending BLOB record | Passed: row_count=1, status=pending, ciphertext_type=blob |
| `bunx wrangler d1 migrations list echo-agents-db --remote` | Only additive migration 0003 pending | Confirmed |
| Public artifact secret scan and `git diff --check` | No secrets or whitespace errors | Passed; 85 public files scanned |
| `bunx wrangler d1 migrations apply echo-agents-db --remote` | Exit 0; only migration 0003 applied | Passed after explicit user confirmation |
| `NODE_ENV=production bunx opennextjs-cloudflare deploy --strict` | Exit 0 | Passed; version `d316eb8d-1e3f-4b64-8f2a-3f83ef517d70` |
| Production synthetic submission and identical retry | 201 then 200, matching receipts and redacted contacts | Passed with 13,125 characters of redacted synthetic text |
| Production D1 receipt readback | Exactly one pending BLOB record | Passed; receipt `27907d40-f322-4d2b-92ce-010e80e8e60d` |
| `python3 scripts/check-cloudflare-auth.py https://echo-agents.cooper-ai.org` | Exit 0 for all public cache and anonymous access checks | Incomplete: first run passed home and sign-in HTML/RSC checks, then curl timed out on sign-up RSC (28); retry failed during home TLS connection (35) |

An intermediate auth-check invocation omitted the production origin and failed against the stopped localhost preview with curl code 7. That invocation did not test production. The corrected production retry is recorded above. Transport failures do not establish a Worker application regression; the complete auth/cache suite cannot be reported as passing for this deployment.

Local Worker verification used a separate temporary D1 store at `/tmp/echo-story-preview.Z8AxES`, populated with migrations 0001–0003 and synthetic data only. OpenNext preview used `--persist-to` with that directory; the normal local database was not migrated. The preview process was stopped intentionally after checks.

Following explicit user confirmation, production migration 0003 was applied and deployment `d895f916-caad-401a-829a-d08f9d2d02b9` activated the new version at 100% on `2026-09-13T16:57:48.743792Z`. The synthetic acceptance record remains pending and clearly labels itself as test data. Only its count, status, and ciphertext type were read back; no existing personal records were accessed or modified.

No browser submission or authenticated long-history acceptance test was completed. Browser automation was interrupted by manual Chrome interaction; the existing local draft was left untouched and no actual user story was submitted. Automated pagination tests cover 203 turns, with separate database ownership checks. A refreshed online conversation page must generate a new draft to include assistant messages; an old user-only draft cannot recover omitted content on its own.

## Next step and stop conditions

The authorized migration and deployment are complete, and the production submission/retry acceptance condition is met. Broad auth/cache acceptance remains incomplete because two production probes failed at the transport layer; stop blind retries and report this limit. Once connectivity is stable, rerun `python3 scripts/check-cloudflare-auth.py https://echo-agents.cooper-ai.org`. Browser interaction and authenticated history acceptance remain separate from passing synthetic API and pagination tests. Stop after two identical external failures or if a destructive migration, paid-plan change, or credential change is required.

The user subsequently requested committing and pushing this repair to `origin/main`. This record accompanies that commit. No application changes were made during the submission step, so the existing test and build results apply. Verify delivery using `git status --short` and `git rev-list --left-right --count HEAD...origin/main`; the expected results are a clean worktree and `0 0`.

## Reference

- https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/
