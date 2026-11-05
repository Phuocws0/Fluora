# Practice, vocabulary, reading, and offline handoff

Issue [#11](https://github.com/Phuocws0/Fluora/issues/11) uses the existing practice APIs from #39 and the lesson player from #7/#27. Source lives in `mobile/features/practice/`; route files delegate to these feature screens. Read [API.md](API.md), [ROUTES.md](ROUTES.md), and [TESTING.md](TESTING.md) for contracts and checks.

## Implemented coverage

| Area | Behavior |
| --- | --- |
| Practice Hub | Due-review summary and recommendations from the API; Listen/Speak/Read/Write entry points, study-tool catalog, vocabulary, downloads, bookmarks, and existing planner/insights links |
| Vocabulary | Personal deck/card CRUD, text/tag filtering, reusable flip-card session with device speech, explicit copy to spaced review |
| Import | Native CSV/JSON file picker or pasted text, 1 MB/500-row limits, quoted CSV parsing, column mapping, backend validation/errors, per-row approval; submission contains only selected valid rows |
| Review | Due/all-scheduled and custom/mistake filters, personal item CRUD, self-assessed recall with server scheduling; derived mistakes can only be dismissed/restored, without changing answer history |
| Study tools | Listening minimal pairs, dictation/gaps, conversation playback with speed/captions/pauses; pronunciation mouth guide, phoneme confidence, rhythm and existing recording studio; writing canvas/local draft, annotated/revised samples and rubric; dictionary; tense/verb reference; semantic maps, sorting, collocations/families; city map, café order and transit timetable |
| Reading | Article, dialogue-comic and comprehension-tree modes, inline dictionary, read aloud, paragraph save/resume/reset, mark read, story/word bookmarks with note/tag edits; graded challenges open the existing lesson player |
| Offline | Persistent account-scoped queue for course/unit/lesson/story snapshots and optional media, actual transfer progress, cancel/remove/retry, failed/interrupted recovery, 200 MB download cap, text-only option, downloaded-content picker and cached lesson/reader fallback |

Custom review items copied from cards are independent records, not synchronized card aliases. Deck flashcards alone do not create review outcomes. Calendar and activity reuse the planner and insights screens.

## Design mapping

Page 09 remains primary. The Practice Hub, decks/cards, reading and downloads use the Garden UI design and existing shared profile UI. Grouped Page 04 nodes `297:2339`–`297:4193` provide the corresponding Practice references and tool samples. The promoted Page 10 article (`264:2932`), comprehension tree (`264:3029`), and dialogue comic (`264:3448`) are reader modes. See [FIGMA.md](FIGMA.md) for the approved scope and file links.

Loading, import errors, flashcard flips, word lookup, editing, confirmations, writing revisions, and comprehension choices are states/components/modals, not additional routes. `practice-mouth-guide.png` is the individual mouth-guide design asset, not a screen screenshot.

## Storage and connection behavior

- Expo FileSystem document storage: `fluora-offline/<accountId>/`, containing a manifest, package folders/media and device drafts. No backend download endpoint or new database model is added.
- Account-scoped writing drafts save on edit. Reading progress saves locally before attempting the existing server PUT; pending changes/reset can be explicitly synced after reconnect. Reading sync uses the local saved position when requested; there is no automatic multi-device conflict merge.
- Low-bandwidth settings default downloads to text-only. Uncached remote media references are omitted from offline playback. Installed device speech voices can read text; download the voice on the device beforehand if required. Current seed lessons have little binary media.
- Offline exercises are explicitly ungraded: no queued answers, automatic submission, completion awards or XP. Reconnect and submit through the normal lesson flow for graded progress. Pronunciation and writing tools use explicit self-assessment, not automatic speech recognition or AI scoring.
- SecureStore caches the last validated user/settings with the exact stored session token. A connection failure can restore that account for an offline cold start; a backend `401` clears the session. Offline access cannot confirm whether a token has since expired/revoked until reconnect.
- Logout clears the session snapshot and hides that account's files; it retains downloads for a later login by the same account. Another account has a separate directory. Clear Library deletes that account's downloads/drafts. Successful account deletion also attempts local-library cleanup and reports failure.
- Transfers are serial per account. Interrupted queued/downloading jobs become failed on restart and require Retry. Cancellation invalidates late metadata responses and cancels active native media tasks. A corrupt index exposes an explicit account-library reset rather than silently discarding files.

## Contract/content changes

`GET /api/practice/review-items?includeScheduled=true` includes future-due items for management. The default remains due-only. Invalid boolean values return `400`; ownership and mistake-history behavior are unchanged.

The repeatable seed adds the Figma market article and café dialogue alongside the existing conversation/challenge. Run the existing seed command to publish them in an existing database; no migration/reset is needed. Tool endpoints still supply metadata. Guided examples are explicitly local demo content. The dictionary currently contains only `hello`, `morning`, and `name`; missing words show the API's not-found state.

## Verification and remaining device acceptance

`npm run test:unit` includes CSV/reading, durable queue/media, cancellation/retry, interrupted/corrupt storage, account isolation, text-only fallback, and token-bound snapshot tests. Native FileSystem is substituted in unit tests. `scripts/practice-api-smoke.mjs` exercises the real mobile service against Express/PostgreSQL with two disposable accounts (56 HTTP checks, cleanup included).

Before device acceptance, use Expo Go for SDK 58 or regenerate/rebuild a custom development client for the SDK 58 packages, migrate/seed the local backend, then verify:

1. Create/edit/delete a deck/card/custom review item; schedule and recall an item; dismiss/restore a mistake without altering answer history.
2. Pick a CSV/JSON on-device, map columns, inspect invalid rows, deselect a valid row, import and confirm only approved rows exist. Check cancel/error paths.
3. Exercise the guided tool modes, recording permission denial/grant, native playback/TTS, writing draft restoration and visible save errors.
4. Read article/dialogue, select comprehension branches/evidence, open a real graded challenge, manage word/story bookmarks and notes/tags, resume/reset reading.
5. Download every supported kind, exercise queue/progress/cancel/remove/retry, interrupt the process during a transfer and retry after relaunch.
6. Enable airplane mode and cold-start with a saved session. Open downloaded lesson/story, play cached media or installed speech, confirm no fake graded progress, save reading position and writing draft.
7. Reconnect, explicitly sync reading, submit online lesson answers, then log out and sign in as another learner: the first learner's drafts/downloads must not appear.
8. Check narrow-screen layout, back navigation, loading/empty/error states and destructive confirmations against Figma.

Android bundle export and native configuration inspection do not replace these device checks. An Android 15/API 35 emulator was available for the core-flow check in [issue #24's report](qa/2026-11-03-android-demo.md), but no physical Android device was available. Microphone quality, native picker, airplane-mode cold start/playback, interrupted-download recovery, pending reading sync, and account isolation still need physical-hardware acceptance.
