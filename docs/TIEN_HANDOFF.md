# League/community and Flo Tutor mobile handoff

Base: `5932b8469f1ecd8f3e12e2f546e72bce3ed0e49d` (`main`). This working copy has no commit or push.

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

## Tutor boundary: backend issue #32 remains unfinished

The Tutor API adapter calls only planned paths in `docs/API.md`. Its response types in `mobile/features/tutor/tutor.types.ts` are a **proposed UI handoff**, not a verified backend contract: the current API document leaves fields such as chat/message/branch internals unspecified.

Coordinate these fields with the backend owner before live integration:

- Chat: `id`, `title`, `scenarioId?`, `saveHistory`, `nextTurn?`. Rename PATCH uses `{title}`; per-chat saving PATCH uses `{saveHistory}`.
- Message: `id`, `role: user|tutor`, `content`, `createdAt`, optional `replyToId` and `feedback`.
- Feedback: `summary`, optional `explanation`, `hints:string[]`. No extra hint endpoint is invented.
- Turn: `id`, `branchId`, `prompt`, `choices:[{id,label,branchId}]`, `completed?`.
- Sending preserves `context.turnId`, `context.branchId`, and optional `context.choiceId`/`context.topic`; server returns authoritative `nextTurn`. Editing/deleting reloads the conversation to avoid stale branches.
- Editing/deleting an earlier learner turn must reconcile its linked response and later branch state. The preview discards later turns and restores the previous turn snapshot.
- Privacy in preview: the global switch applies to new chats; an existing chat can be explicitly saved/unsaved, and saving is refused while global saving is off. Existing saved history is not deleted by turning the global switch off. Confirm this policy with #32.
- Preview clear-history removes conversations/messages, retaining independently saved notes. Confirm note-link deletion behavior with #32. No raw audio, provider keys, persistent preview database, or fake live AI response is introduced.

The preview is deterministic sample data, **not an AI integration**. It is fresh per preview workspace and disappears on exit/restart. API failures never fall back silently to preview. Learning remains available when Tutor fails.

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

This environment has no Docker daemon/CLI or Android emulator. Database-backed community flows, actual native layout/keyboard/back behavior, and end-to-end provider behavior still need the following manual checks. The UI follows existing repository colors/components; exact Figma visual parity has not been verified.

## Android acceptance checklist

1. Run Docker backend/database, seed, register at least three learners; use email sign-in at League. Password-less seed learners cannot sign in by password.
2. Claim one eligible quest, refresh, verify a second claim is rejected; redeem with sufficient/insufficient gems; cancel only pending redemptions; verify balance refreshes without exposing balance edits.
3. Send/receive/accept/decline/cancel requests; remove a friend; change profile visibility and test inaccessible/duplicate results.
4. Create/join a group, edit as owner, try owner transfer/leave, CRUD posts/comments as author and owner. Verify forbidden actions stay hidden/rejected and confirmations cancel safely.
5. Create/join/leave/close a room; send/edit/reply/delete messages; fetch older messages. Create/edit/close/delete polls, vote/change/withdraw, refresh from another learner. Closed room/poll mutations must fail clearly.
6. Create/edit/join/leave a challenge; create/move/rename/delete tasks as distinct roles; create/move/edit/delete whiteboard notes. Confirm other members may move tasks but cannot edit another author's note.
7. Read/unread/delete/clear notifications and load older pages; submit/edit/delete a peer review.
8. Open Tutor interface preview, choose tea, reopen from history, finish the size turn, edit the earlier answer, and verify branch consistency. Exercise notes and both history switches, cancel and confirm deletion/clear. Exit/re-enter preview and verify data is gone.
9. Switch to Tutor API with #32 absent: show unavailable/error/retry, return to Learn without a crash. After #32 is ready, reconcile the types above, then repeat the Tutor checks against real authenticated sessions and privacy settings.
10. Disconnect network, expire a bearer token, dismiss a modal, use Android Back and the keyboard, rotate or change text size, tap Send twice, and test cursor loading with more than 20 rows.
