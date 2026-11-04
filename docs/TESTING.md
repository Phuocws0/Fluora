# Testing and Verification

Keep verification proportional to a local demo and use tools already present. The project has typecheck/build checks plus focused Node tests for transport/Tutor preview, home progress, support attachments, import/reading, account-scoped offline storage and queues. See [TIEN_HANDOFF.md](TIEN_HANDOFF.md) and [PRACTICE_HANDOFF.md](PRACTICE_HANDOFF.md); no separate testing framework is required.

The home-summary regression checks run with `node --experimental-vm-modules --test scripts/learning-home.test.mjs`. They verify completed lesson IDs for new learners and out-of-order completions without requiring PostgreSQL.

The support screenshot validator has a focused check: `npm run build && node --test scripts/support-screenshot.test.mjs`. It covers short references, PNG/JPEG data URLs, the 5 MB boundary, and unsupported data types.

## Current checks and CI

GitHub Actions runs on pull requests and pushes to `main`:

```text
npm ci
npm run typecheck
npm run prisma:validate
npm run build
npm run test:unit
npm run check:mobile
```

The CI job does not start PostgreSQL or deploy anything. For a local backend/database smoke check, run `docker compose up --build -d` and request `GET http://localhost:4000/health`; it should return `200` with both service and database status `ok`.

For the integrated demo (#24), migrate/seed the local runtime, then run `node scripts/demo-api-smoke.mjs`. It creates two disposable learners, checks account/onboarding, all five seeded exercise modes, idempotent completion, progress, practice/profile/community/tutor/export behavior and ownership/errors, then deletes its accounts. `FLUORA_API_URL` overrides the default `http://localhost:4000`. To additionally prove database/session persistence, run `node scripts/demo-api-smoke.mjs --restart-services`: this deliberately restarts the existing local Compose `db` and `backend` services, keeps their volume, and rechecks saved data. Restart mode accepts only localhost URLs; run it when a brief interruption to the local demo is acceptable. It is not part of CI and does not replace Android UI verification.

For issue #11, after migrations and `npm run db:seed`, run `node --experimental-vm-modules scripts/practice-api-smoke.mjs` against the default `http://localhost:4000` (override with `FLUORA_API_URL`). It drives the actual mobile practice service, creates two disposable accounts, checks 56 API success/validation/ownership/history paths, and deletes the accounts in cleanup. Use a local demonstration database. Unit queue tests use a native-filesystem substitute and cannot establish physical-device correctness.

The emulator corrective pass verified native CSV picking/import, recording controls, and cached cold start with the backend unavailable. Physical-device Practice acceptance must still include CSV/JSON file picking; deck/card/review/bookmark CRUD; invalid import rows excluded from submission; microphone permission/recording/playback and TTS; article/dialogue/tree modes and resume/reset; course/unit/lesson/story download, cancellation, removal, retry and process interruption; airplane-mode cold start and cached playback; text-only downloads with no network media request; pending reading sync after reconnect; and logout/second-account cache isolation. Rebuild the development client after native package changes. `expo-audio` and `expo-speech` must match Expo SDK 57. Follow the detailed checklist in [PRACTICE_HANDOFF.md](PRACTICE_HANDOFF.md).

## Full-seed acceptance

Run `npm run test:seed` with the local PostgreSQL server running and a role allowed to create databases. It builds the backend and creates a uniquely named disposable database, deploys all migrations, seeds twice, checks fixture counts and preservation of ordinary user settings/edited cards, then runs 136 HTTP assertions. It covers all 22 exercises/seven modes, idempotent XP, Home course advancement, all four sign-ins, CEFR persistence, unsupported-language validation, private-group/owner access, community pagination/CRUD, open/closed polls and rooms, wallet/quests, support/export, and Tutor fixtures. The test uses the local Tutor and deletes only its own temporary database. It does not reset the configured project DB or run in the existing DB-free CI job.

`npm run test:unit` includes regressions for exact CEFR labels/values, completed Home, course advancement, text-size factors, foreground-only break timing and seed mode/ID consistency. The learning-preference Android checks and remaining hardware limits are recorded in the [functional/UX report](qa/2026-11-04-functional-ux-audit.md). Demo accounts and reproducible walkthrough: [DEMO.md](DEMO.md).

## Static verification

Where available, verify:

- TypeScript typecheck passes and imports resolve.
- Existing linting has no clear errors, unjustified `any`, or dead imports.
- Mobile/backend types and API request/response shapes agree with [API.md](API.md).
- Prisma usage agrees with `schema.prisma` and [DATABASE.md](DATABASE.md).

## Backend verification

For each implemented endpoint, verify a valid request, input validation, expected success shape, relevant error response, and the database operation. The current health endpoint should return `503` when its database connection is unavailable.

For the learning-content API, seed the local database and check the course catalog, course syllabus, ordered units/lessons/exercises, lesson search filters, and comparison of at least two learning paths. Confirm lesson responses do not expose answer keys, option correctness flags, or feedback explanations before an answer is submitted.

For learning activity, check each seeded exercise answer mode, reject raw audio payloads, require lesson answers before completion, and confirm a repeated completion earns zero additional XP. Verify answer history ownership, UTC streak/weekly totals, planner/evidence ownership, mission eligibility, and misconception dismiss/restore without changing answer history.

For practice, vocabulary, and reading, check owner-scoped deck/card CRUD, import preview mapping/row errors, and rejection of invalid imports. Verify custom and mistake review queues, append-only outcomes and due-time updates, dismissal without answer-history edits, word/story bookmark ownership, and reading progress save/resume/reset. Confirm story challenge choices use the linked exercise endpoint and never expose correctness flags in story content.

For identity, check settings partial update/validation/reset (nothing is written when any field is invalid), onboarding completion staying stable, placement scoring with and without a session, single-use verification and reset tokens read from the `[dev-mail]` backend log lines (including parallel use of one token), that a password reset signs out every session, the Google `503` path without `GOOGLE_CLIENT_IDS`, and account deletion with a wrong and a correct confirmation email.

For community, League, and rewards, use at least three registered learners plus the seeded demo learners. Change privacy and reminder preferences through `PATCH /api/users/me/settings`. Check search and profile privacy, every friend-request transition, owner/member/host/author permissions in groups and rooms, owner leave and ownership transfer, poll open/closed and vote-change rules, quest claims once per UTC day, parallel redemptions against a small balance (exactly one may succeed), that the wallet balance equals the ledger sum, and that deleting an account hands owned groups and hosted rooms to another member.

For the Flo Tutor, use at least two registered learners. Check question, exercise, mistake, and explain contexts (exercise help never shows the answer; another learner's answer or chat returns `404`); every role-play branch, `almost`/`try_again` grading, completion, and the hint ladder; that editing a learner message regenerates the same reply and deleting it removes the reply, with only the latest role-play message changeable; parallel replies to one turn (only one is graded); that `saveTutorHistory:false` makes chats temporary and an expired one (set `lastActivityAt` back with `psql`) is purged; that clear-history needs `{confirm:true}` and keeps notes; note CRUD and link checks; that audio fields are rejected; and, with `TUTOR_PROVIDER=off`, that send/edit return `503` and store nothing while history, notes, and lessons keep working.

For `TUTOR_PROVIDER=openai`, run the existing `npm run build` and `npm run test:unit`. The focused provider tests use a local HTTP substitute and cover the outbound contract/history, exercise hint isolation, deterministic role-play branches, malformed/truncated/oversized replies, credential-error sanitization, timeout, and incomplete configuration without consuming LLM quota. With a configured gateway, additionally verify a real free-form chat, persisted history, reply regeneration, and role-play feedback through the backend API. Check the authorized gateway account/model separately; a configured `available:true` is not proof of a successful inference. Keep gateway keys, OAuth tokens, and private chat text out of test output and fixtures.

For mutable user-owned resources, verify:

- create/read/update/delete behavior for learner-owned resources and group-managed content in the approved CRUD baseline;
- owner checks, duplicate/conflict handling, and invalid IDs;
- group-role checks for group/room/poll management and ownership checks for personal edits/deletes;
- confirmation and authorization for account deletion, export cancellation, and other destructive actions;
- personal-data export includes current learner-owned records while excluding password hashes, sessions, and one-time token hashes; verify owner isolation and the non-ready conflict response;
- profile/privacy choices affect returned friend/community/tutor data;
- reward/quest/progress totals change through recorded actions rather than arbitrary updates;
- tutor history clearing and export behavior match settings/privacy choices.

Check that device-local offline queues and drafts do not accidentally depend on a server-side CRUD endpoint. Confirm each response/error against [API.md](API.md).

## Mobile verification

For implemented screens/flows, verify layout, navigation, major controls, loading/error states, and Android behavior. Use the full feature coverage in [PRODUCT.md](PRODUCT.md) and selected frame inventory in [FIGMA.md](FIGMA.md). At minimum check:

- account registration, sign-in, verification/recovery, onboarding, placement, and sign-out;
- learning home, course/unit/lesson navigation, search/filter, planner, and progress;
- lesson exercise variants, correct/incorrect/hint/completion states, review, and pronunciation feedback;
- vocabulary deck editing/import preview, stories/bookmarks, offline download/connection fallback;
- league/rewards, friends/groups, notifications, profile/settings/privacy/export, support;
- tutor chat/role-play, saved note, privacy controls, and clear-history confirmation.

Do not treat each Figma frame as a route. Test route navigation and the contained UI states together.

iOS verification is desirable but not mandatory for each local task unless the change involves iOS behavior.

## CRUD and design-gap checks

For every mutation added to the API, confirm it is in the owner-approved baseline in [API.md](API.md), then implement a clear control/state consistent with the selected design. Test create/read/update/delete for decks/cards, planner entries, friend requests/connections, groups/posts/comments, group challenges/rooms/polls, plan tasks/whiteboard notes, support requests, tutor chats/messages/notes, and data-export jobs. Keep curated learning content and derived progress/reward ledgers read-only or append-only as documented.

## Demo smoke flow

Once these features exist, use this as the minimum end-to-end sanity check:

```text
Launch app
↓
Choose app/course language and onboarding preferences
↓
Register or login and complete placement if offered
↓
Learning Home
↓
Open Course → Unit → Lesson
↓
Complete an exercise → show feedback/result
↓
Update progress, XP, and streak
↓
Open Practice → review/save a vocabulary item
↓
Open Profile or Tutor and verify the selected secondary flow
```

Add a focused check for each changed domain; the smoke flow is not a replacement for the CRUD/error-path checks above.
