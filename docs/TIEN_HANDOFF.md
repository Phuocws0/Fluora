# League/community and Flo Tutor mobile handoff

This handoff summarizes the League/community and Tutor mobile work in PR #53, rebased on the merged Tutor backend in PR #52.

## Implemented mobile code

- League tab: current tier, weekly League/friends standings, daily quest claims, earned achievement collection.
- Reward shop, confirmed redemption, cancellable redemption/refund, read-only wallet activity.
- Friends: discovery, profile/privacy, incoming accept/decline, outgoing cancel, declined-request cleanup, connection removal.
- Groups: discovery, create/edit/delete, join/leave, ownership transfer, meetup fields, members, challenge CRUD/join/leave with derived progress.
- Discussion/comments and room messages: create/read/edit/delete with server-provided permissions, message replies, cursor pagination, manual refresh.
- Rooms: create/read/edit/close/delete, join/leave; host-managed polls and vote/change/withdraw flows.
- Peer review: read curated samples and create/edit/delete the learner's feedback.
- Group plan lanes and task movement/order; whiteboard note CRUD/text/coordinates/colors with a scrollable board.
- Notifications: read/unread, read-all, delete, confirmed clear-all, cursor pagination.
- Tutor: explicit API entry and separate opt-in in-memory interface preview; chat, branching café scenario, feedback/explanations/hints, context composer, rename, message editing/deletion, notes CRUD, history, per-chat save switch, global `saveTutorHistory`, confirmed deletion/clear.
- Shared UI uses the existing garden colors, `ScreenContainer`, `ContentState`, service/session transport, native confirmations, keyboard handling, mutation locks and loading/error/empty/success states. No new runtime dependency.

The main email-login screen is still outside this work. A small email sign-in gate for the two private feature entries uses `/auth/login` and the existing SecureStore session. Users need an existing registered account. No authentication bypass or hard-coded token is supplied. Auth checks keep active chats mounted on tab refocus; invalid sessions clear the private workspace. Preview does not require an account.

## Tutor API integration

The Tutor service maps the implemented backend contract into the screen's view types. It translates `saved` to `saveHistory`, `currentTurn` to the UI turn shape, and `learner`/`body` messages to `user`/`content`. The service uses `{saved}` when updating chat history and sends `{confirm:true}` when clearing all chats. Role-play hints use the backend hint endpoint. Editing/deleting is reloaded from the server; only the latest learner role-play message is editable in API mode.

The preview is still separate: it uses deterministic sample data in memory and does not call an AI, backend, or device persistence. API failures do not switch into preview silently. The live backend's default `local` provider is rule-based, not a real AI provider; see [API.md](API.md#flo-ai-tutor).

The preview is deterministic sample data, **not an AI integration**. It is fresh per preview workspace and disappears on exit/restart. Learning remains available when Tutor fails.

## Verification

Run from repository root with Node.js 24:

```sh
npm ci
npm run typecheck
npm run prisma:validate
npm run build
npm run check:mobile
node --experimental-vm-modules --test scripts/mobile-features.test.mjs
```

The focused tests use Node's built-in runner and existing TypeScript; they cover tea-branch preservation/reopening, stale/completed-turn rejection, response invalidation on earlier edits, message deletion/branch rollback, privacy/new-chat behavior, per-chat saving, notes/history isolation and CRUD, snapshot isolation, and the real shared HTTP transport's Android host/bearer/PATCH/DELETE/error paths. The VM-modules warning is expected in this test command. These are unit checks, not live backend or device tests.

The isolated Docker Tutor smoke flow passed against a fresh temporary database. Android device/emulator acceptance, live community flows on device, keyboard/back behavior, and exact Figma visual parity have not been verified.

## Android acceptance checklist

1. Run Docker backend/database, seed, register at least three learners; use email sign-in at League. Password-less seed learners cannot sign in by password.
2. Claim one eligible quest, refresh, verify a second claim is rejected; redeem with sufficient/insufficient gems; cancel only pending redemptions; verify balance refreshes without exposing balance edits.
3. Send/receive/accept/decline/cancel requests; remove a friend; change profile visibility and test inaccessible/duplicate results.
4. Create/join a group, edit as owner, try owner transfer/leave, CRUD posts/comments as author and owner. Verify forbidden actions stay hidden/rejected and confirmations cancel safely.
5. Create/join/leave/close a room; send/edit/reply/delete messages; fetch older messages. Create/edit/close/delete polls, vote/change/withdraw, refresh from another learner. Closed room/poll mutations must fail clearly.
6. Create/edit/join/leave a challenge; create/move/rename/delete tasks as distinct roles; create/move/edit/delete whiteboard notes. Confirm other members may move tasks but cannot edit another author's note.
7. Read/unread/delete/clear notifications and load older pages; submit/edit/delete a peer review.
8. Open Tutor interface preview, choose tea, reopen from history, finish the size turn, edit the earlier answer, and verify branch consistency. Exercise notes and both history switches, cancel and confirm deletion/clear. Exit/re-enter preview and verify data is gone.
9. Use Tutor API with the local backend: create a chat and role-play, verify the local provider response, hints, edit/delete rules, notes, history saving, confirmed clear-history, and the `503` state with `TUTOR_PROVIDER=off`.
10. Disconnect network, expire a bearer token, dismiss a modal, use Android Back and the keyboard, rotate or change text size, tap Send twice, and test cursor loading with more than 20 rows.
