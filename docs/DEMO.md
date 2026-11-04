# Local demo data and walkthrough

## Prepare any teammate's machine

Prerequisites and mobile/device URLs: [README](../README.md). From the repository root:

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD and the matching DATABASE_URL in the ignored .env.
npm ci
npm run demo:setup
```

`demo:setup` builds/starts backend + PostgreSQL, waits for health (including migrations), then runs the checked-in seed inside the backend container. Expo runs on the host. To seed already-running containers again:

```sh
docker compose exec -T backend npm run db:seed --workspace @fluora/backend
```

When running the backend directly on the host, use `npm run db:deploy` followed by `npm run db:seed`, with a reachable `DATABASE_URL`.

Git contains the schema, migrations, curated content, and seed functions in `backend/src/db/`. Each teammate creates their own local database/Compose volume. Pulling Git alone does not copy or update that volume: run the setup/seed command after pulling seed changes. Do not commit database volumes or private account exports. Do not use `migrate reset` or `docker compose down -v` to refresh this demo.

## Sign-in accounts

The deliberately public **local test password is `FluoraDemo123!`** for all four accounts. These are fixtures, never real credentials. Set optional `DEMO_PASSWORD` before first seeding to use a different local password. Re-seeding preserves an existing account's password; changing the override later does not reset it. Older password-less fixtures are upgraded for email sign-in.

| Email | Starting state | Useful demonstrations |
| --- | --- | --- |
| `demo.linh@fluora.local` | Beginner, no completed lessons | Full learning journey, due review, unvoted polls, incoming friend request; member of the main group, owner of Conversation circle |
| `demo.minh@fluora.local` | Two starter lessons completed | Continue learning, claimable quests, open/closed support, owner/host of Fluora demo garden |
| `demo.an@fluora.local` | All 12 lessons complete | Completed Home/Practice action, analytics/evidence/passport, earned achievements, gem wallet and redemption history; owner of private Writing lab |
| `demo.new@fluora.local` | Onboarding unfinished | Fresh onboarding and placement; no prefilled personal learning/community history |

Register another account for destructive account deletion or a completely empty-state walkthrough. Do not delete a fixture account when another presenter is using it.

## Included fixtures

A fresh database contains:

- Three English courses (A1, A2, B1), six units, 12 lessons, 22 exercises across seven modes: choice, listening choice, sentence tiles, transcript gap, dictation, matching, speaking.
- Four learning paths, five story/article/dialogue reads with comprehension/challenge content, four can-do goals and three passport missions.
- Four daily quests, six achievements, four shop items, two peer-review samples, three Tutor role-play scenarios; 30 curated dictionary terms.
- Six personal decks/90 cards, due and future reviews, correct/incorrect history, bookmarks, partial/completed reading, planner entries, and learning evidence across the three established learners.
- Three study groups (two public, one private), members/owners, discussion/comments, active challenges, task lanes and whiteboard notes. Six rooms include open/closed sessions; polls include open/closed/voted/unvoted states. The main group has enough posts/messages for pagination.
- Accepted/pending friendships, read/unread notifications, support requests in open/closed states, personal export requests, normal chat history, active/completed branching role-play, and saved Tutor notes.
- An's quest/charge/refund ledger starts at 85 gems on a fresh seed, with fulfilled, pending, and cancelled redemption examples. Claims reflect seeded learning/review/reading activity. Amounts change normally when you interact.

Fixtures supply data for implemented flows; they do not add automatic speech/writing grading, translations, push delivery, or cloud services. Guided study tools remain curated/self-assessed. See [API](API.md) for actual behavior and limits.

## Suggested walkthrough

| Area | Action and account |
| --- | --- |
| Welcome/onboarding | Sign in as New; choose a CEFR level, optionally complete placement, finish onboarding. Only English interface/course content is offered in this demo. |
| Course → unit → lesson | Use Linh. Submit a wrong answer, open hints, correct/continue, complete the lesson; inspect XP, progress, calendar and quests. A2/B1 courses cover listening choice and dictation. |
| Completed learning | Use An. Home offers Practice/review; open analytics, misconceptions, goals/evidence and mission passport. Use Minh for partial progress. |
| Accessibility/wellbeing | Save large/extra-large lesson text; toggle captions and Focus mode, open a listening lesson; reduced motion disables modal transitions and moving waveforms. Set a 5-minute reminder and leave the app foregrounded; background time does not count. |
| Vocabulary/import/review | Linh: create/edit/delete a deck/card, flip a flashcard, schedule/answer review, inspect upcoming items. Import the supplied [CSV](demo/vocabulary-import.csv) or [JSON](demo/vocabulary-import.json), mapping front/back/tag/example and previewing before import. Copy the file to your device first. |
| Reading | Open article/dialogue/tree content, save/resume/reset position, bookmark and edit its note, enter a linked story challenge. |
| Downloads | Download an actual lesson/story on this device, inspect ready data, switch offline and reopen it; reconnect and sync reading. Test cancel/retry/remove separately. Downloads are account/device-local and cannot be pre-seeded in PostgreSQL. Offline practice does not award XP. |
| Audio/speaking/tools | Open listening/speaking, allow the microphone, record/stop/play locally and enter self-assessment. Try dictation, sentence tiles, grammar/writing/situation tools. Device TTS voices and real microphone quality depend on the device. |
| Friends/community | Linh: inspect pending request, accept/decline/cancel using the corresponding account; compare public/private visibility. Main-group owner Minh can manage the group/room/challenge/poll; members manage their own content. |
| Discussion/rooms | Create/edit/delete a post/comment/message, load another page, vote/change/withdraw in an open poll and compare a closed poll. Try plan lanes, whiteboard and peer-review comments. Refresh to see another account's updates. |
| Rewards | Minh can claim eligible quests; An can redeem/cancel a deferred reward and inspect transactions/achievements. Linh shows locked/unearned states. |
| Profile/settings/support | Edit a profile, privacy/goals/reminders/companion; compare Minh's open/closed support, submit/edit/cancel a request, download/share/cancel an export. Use a disposable account for password/reset/session/account-deletion checks. Verification/reset tokens appear only in local backend logs. |
| Flo Tutor | Linh: inspect seeded chat/notes, continue active role-play, compare completed history, send/edit/delete a message, save/edit a note, exercise history privacy. Seeded replies are explicitly examples. New replies use the configured provider. |

Tutor defaults to local rules, with no credentials required. Real LLM replies need each machine's own reachable gateway/provider configuration in the ignored `.env`; OAuth sessions and API keys are never seed data. See [README](../README.md).

## Repeatability and verification

Re-running seed uses stable IDs/unique keys; it does not truncate tables, delete ordinary accounts, reset their preferences, or overwrite edited personal cards. Curated course/reference definitions are refreshed. Dedicated demo completions, review-outcome dates, reading activity, planner dates, and challenge windows are refreshed relative to today so time-sensitive views retain useful data. Demo learning history is synthetic and intended for presentation only. Demo quest claims/ledger accumulate by UTC day as days pass; balances need not return to their initial value.

Deleted fixture rows may be recreated on re-seed; existing edits/statuses/passwords are generally preserved. Seed is an additive refresh, not a reset to a pristine account. Use a separate local database if you need an exact pristine fixture state; never erase a teammate's data to achieve it.

`npm run test:seed` creates a uniquely named disposable database on the configured **local** PostgreSQL server, applies migrations, seeds twice, checks preservation/counts, and exercises all seven exercise modes plus ownership, community, rewards and Tutor APIs. It requires a local DB role with permission to create databases, builds the backend, uses the local Tutor, and removes only its own test DB. It never resets the configured project database. Other checks: [TESTING](TESTING.md).
