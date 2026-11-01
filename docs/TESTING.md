# Testing and Verification

Keep verification proportional to a local demo and use tools already present. The scaffold has typecheck/build checks but no feature test suite yet; do not add a testing framework just because this plan exists.

## Current checks and CI

GitHub Actions runs on pull requests and pushes to `main`:

```text
npm ci
npm run typecheck
npm run prisma:validate
npm run build
npm run check:mobile
```

The CI job does not start PostgreSQL or deploy anything. For a local backend/database smoke check, run `docker compose up --build -d` and request `GET http://localhost:4000/health`; it should return `200` with both service and database status `ok`.

## Static verification

Where available, verify:

- TypeScript typecheck passes and imports resolve.
- Existing linting has no clear errors, unjustified `any`, or dead imports.
- Mobile/backend types and API request/response shapes agree with [API.md](API.md).
- Prisma usage agrees with `schema.prisma` and [DATABASE.md](DATABASE.md).

## Backend verification

For each implemented endpoint, verify a valid request, input validation, expected success shape, relevant error response, and the database operation. The current health endpoint should return `503` when its database connection is unavailable. For mutable user-owned resources, verify:

- create/read/update/delete behavior for learner-owned resources and group-managed content in the approved CRUD baseline;
- owner checks, duplicate/conflict handling, and invalid IDs;
- group-role checks for group/room/poll management and ownership checks for personal edits/deletes;
- confirmation and authorization for account deletion, export cancellation, and other destructive actions;
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
