# API Contract

This is the planned learner-facing API for the selected Page 09 release and its Page 10 states. The repository has no backend, so every route below is **Planned**. The API supports the user-facing interactions in [PRODUCT.md](PRODUCT.md); it does not add admin content-management APIs that are absent from the Figma.

Use REST/JSON under `/api`. Authenticated calls use `Authorization: Bearer <token>`; register, login, Google sign-in, email verification, and password recovery are public. Keep errors consistent:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request could not be processed." } }
```

Common statuses: `400` invalid input, `401` missing/invalid session, `403` action not allowed by privacy/ownership, `404` missing resource, `409` conflict, `500` unexpected failure. Endpoint-specific errors are listed below.

## Auth and account

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Planned | Create account; `{email,password,displayName}` → `{token,user}` | `400`, `409` |
| `POST /api/auth/login` | Planned | Start session; `{email,password}` → `{token,user}` | `400`, `401` |
| `POST /api/auth/google` | Planned | Continue with Google; `{idToken}` → `{token,user}` | `400`, `401` |
| `POST /api/auth/verify-email` | Planned | Verify email; `{token}` → `{verified:true}` | `400`, `410` |
| `POST /api/auth/password/forgot` | Planned | Request reset link; `{email}` → `{accepted:true}` | `400` |
| `POST /api/auth/password/reset` | Planned | Set a new password; `{token,newPassword}` → `{updated:true}` | `400`, `410` |
| `POST /api/auth/logout` | Planned | End current session; `{}` → `{ok:true}` | `401` |
| `GET /api/users/me` | Planned | Read current profile → `{user}` | `401` |
| `PATCH /api/users/me` | Planned | Update name, bio, or avatar reference; fields → `{user}` | `400`, `401` |
| `PATCH /api/users/me/password` | Planned | Change password; `{currentPassword,newPassword}` → `{updated:true}` | `400`, `401` |
| `GET /api/users/me/sessions` | Planned | List signed-in devices → `{sessions:[...]}` | `401` |
| `DELETE /api/users/me/sessions/:sessionId` | Planned | Revoke one device session → `{revoked:true}` | `401`, `404` |
| `GET /api/users/me/settings` | Planned | Read preferences and privacy/accessibility choices → `{settings}` | `401` |
| `PATCH /api/users/me/settings` | Planned | Update app/course language, learning goal and notification reminders, Flo style, privacy, accessibility, low-bandwidth, or wellbeing settings; changed fields → `{settings}` | `400`, `401` |
| `POST /api/users/me/data-export` | Planned | Prepare the data-export preview shown in Privacy Settings → `{exportId,status}` | `401`, `500` |

The Figma shows account creation, sign-in, verification, reset, security, sessions, and export. It does **not** show a delete-account action; do not add `DELETE /api/users/me` without a product decision.

## Learning content and progress

Course, unit, lesson, story, study-tool, help, and reward definitions are curated/read-only in the learner app. Learner answers and progress are separate user-owned records.

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/home` | Planned | Home cards and continue-learning summary → `{course,progress,streak,wallet}` | `401` |
| `GET /api/courses` | Planned | Course catalog → `{courses:[...]}` | `500` |
| `GET /api/courses/:courseId` | Planned | Course overview and units → `{course}` | `404` |
| `GET /api/courses/:courseId/units` | Planned | Unit catalog → `{units:[...]}` | `404` |
| `GET /api/units/:unitId` | Planned | Unit overview and lessons → `{unit}` | `404` |
| `GET /api/lessons/:lessonId` | Planned | Lesson, exercise sequence, and content → `{lesson}` | `404` |
| `GET /api/lessons/search?query=&level=&skill=&minutes=` | Planned | Search/filter lessons → `{lessons:[...]}` | `400` |
| `GET /api/learning-paths` | Planned | Compare/browse paths and outcomes → `{paths:[...]}` | `500` |
| `GET /api/learning-paths/compare?ids=` | Planned | Compare selected paths and workloads → `{paths:[...]}` | `400`, `404` |
| `GET /api/enrollments` | Planned | Read current learner's selected courses → `{enrollments:[...]}` | `401` |
| `POST /api/enrollments` | Planned | Select/enroll in a course; `{courseId}` → `{enrollment}` | `401`, `404`, `409` |
| `POST /api/placement/attempts` | Planned | Submit the optional placement answers; `{answers:[...]}` → `{level,skillBaseline}` | `400`; session optional if placement precedes registration |
| `GET /api/progress` | Planned | Read completion, XP, streak, and gems → `{completedLessons,currentStreak,xp,gems}` | `401` |
| `POST /api/lessons/:lessonId/complete` | Planned | Record lesson completion → `{lessonId,completedAt,xpEarned}` | `401`, `404`, `409` |
| `GET /api/learning/skill-baseline` | Planned | Read placement level and confidence by skill → `{level,skills:[...]}` | `401`, `404` |
| `GET /api/analytics/weekly` | Planned | Weekly XP/activity chart → `{days:[...],summary}` | `401` |
| `GET /api/learning/evidence` | Planned | Read can-do goals and attached samples → `{goals:[...]}` | `401` |
| `POST /api/learning/evidence` | Planned | Attach a completed learning sample; `{goalId,kind,summary,reference?}` → `{evidence}` | `400`, `401`, `404` |
| `DELETE /api/learning/evidence/:evidenceId` | Planned | Remove a learner-attached sample → `{deleted:true}` | `401`, `404` |

## Planner and practice

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/practice` | Planned | Practice hub recommendations and due-item counts → `{suggestions,reviewDueCount}` | `401` |
| `GET /api/planner/entries` | Planned | Read calendar/weekly plan → `{entries:[...]}` | `401` |
| `POST /api/planner/entries` | Planned | **Control needs confirmation:** add a planned study session; `{date,time,durationMinutes,label?}` → `{entry}` | `400`, `401` |
| `PATCH /api/planner/entries/:entryId` | Planned | **Control needs confirmation:** move or edit a planned session; changed fields → `{entry}` | `400`, `401`, `404` |
| `DELETE /api/planner/entries/:entryId` | Planned | **Control needs confirmation:** remove a planned session → `{deleted:true}` | `401`, `404` |
| `POST /api/exercises/:exerciseId/answers` | Planned | Submit choice, text, matching, dictation, or speaking result; `{answer:{kind,...}}` → `{isCorrect,feedback,explanation?,score?}` | `400`, `401`, `404` |
| `GET /api/exercises/:exerciseId/hints?step=` | Planned | Return the next hint in the hint ladder → `{step,text}` | `400`, `404` |
| `GET /api/practice/review-items?kind=` | Planned | Read due vocabulary and recurring mistakes → `{items:[...]}` | `401` |
| `POST /api/practice/review-items/:itemId/answers` | Planned | Record recall/review outcome and update schedule → `{result,nextReviewAt}` | `400`, `401`, `404` |
| `GET /api/study-tools` | Planned | List available curated study tools → `{tools:[...]}` | `401` |
| `GET /api/study-tools/:toolId` | Planned | Read curated content for selected audio/pronunciation, writing, vocabulary/word-map, grammar, conjugation, or city/café/transit tools → `{tool}` | `401`, `404` |
| `GET /api/dictionary?query=` | Planned | Look up a selected word for the inline dictionary → `{entry}` | `400`, `401`, `404` |

Figma includes microphone recording and pronunciation feedback. It does not define audio upload/storage or a scoring provider. Until that contract is decided, `answer` may carry a client-produced transcript/score for the local demo; do not assume an audio-storage service.

## Vocabulary, bookmarks, stories, and offline use

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/vocabulary/sets` | Planned | List learner decks and provided sets → `{sets:[...]}` | `401` |
| `POST /api/vocabulary/sets` | Planned | **Control not shown:** create a learner deck; `{name}` → `{set}` | `400`, `401` |
| `GET /api/vocabulary/sets/:setId` | Planned | Read a deck and its cards → `{set,cards:[...]}` | `401`, `404` |
| `PATCH /api/vocabulary/sets/:setId` | Planned | Rename/update a learner deck; changed fields → `{set}` | `400`, `401`, `404` |
| `DELETE /api/vocabulary/sets/:setId` | Planned | **Control not shown:** delete a learner-owned deck → `{deleted:true}` | `401`, `404` |
| `GET /api/vocabulary/sets/:setId/cards` | Planned | List deck cards → `{cards:[...]}` | `401`, `404` |
| `POST /api/vocabulary/sets/:setId/cards` | Planned | **Control not shown:** add a card; `{front,back,tag?,example?}` → `{card}` | `400`, `401`, `404` |
| `GET /api/vocabulary/cards/:cardId` | Planned | Read one card → `{card}` | `401`, `404` |
| `PATCH /api/vocabulary/cards/:cardId` | Planned | Edit a card; changed fields → `{card}` | `400`, `401`, `404` |
| `DELETE /api/vocabulary/cards/:cardId` | Planned | **Control not shown:** remove a card → `{deleted:true}` | `401`, `404` |
| `POST /api/vocabulary/import/preview` | Planned | Parse selected rows and column mapping; `{filename,rows,mapping}` → `{validRows,errors}` | `400`, `401` |
| `POST /api/vocabulary/import` | Planned | Import approved rows into a deck; `{destinationSetId,rows,mapping}` → `{importedCount,cards}` | `400`, `401`, `404` |
| `GET /api/bookmarks` | Planned | List saved words/stories → `{bookmarks:[...]}` | `401` |
| `POST /api/bookmarks` | Planned | Save a word or story; `{targetType,targetId}` → `{bookmark}` | `400`, `401`, `404`, `409` |
| `DELETE /api/bookmarks/:bookmarkId` | Planned | Remove a saved item → `{deleted:true}` | `401`, `404` |
| `GET /api/stories` | Planned | Story library → `{stories:[...]}` | `500` |
| `GET /api/stories/:storyId` | Planned | Read a story → `{story}` | `404` |
| `PATCH /api/stories/:storyId/progress` | Planned | Save reading position/completion; `{position,completed?}` → `{progress}` | `400`, `401`, `404` |

The offline queue, transfer progress, storage limit, and downloaded files are device-local. The mobile app downloads content through the existing course/unit/lesson reads and manages pause, cancel, remove, and ready state locally; no server-side CRUD for device downloads is proposed.

## League, rewards, community, and notifications

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/leaderboard` | Planned | Read current league rankings → `{period,entries:[...]}` | `401` |
| `GET /api/leagues/current` | Planned | Read league, tier, and promotion boundary → `{league}` | `401` |
| `GET /api/quests` | Planned | Read daily quests and progress → `{quests:[...]}` | `401` |
| `POST /api/quests/:questId/claim` | Planned | Claim completed quest reward → `{reward}` | `401`, `404`, `409` |
| `GET /api/achievements` | Planned | Read achievement collection → `{achievements:[...]}` | `401` |
| `GET /api/achievements/:achievementId` | Planned | Read achievement detail → `{achievement}` | `401`, `404` |
| `GET /api/wallet` | Planned | Read gem balance/transactions → `{balance,transactions:[...]}` | `401` |
| `GET /api/rewards` | Planned | Read available reward shop items → `{rewards:[...]}` | `401` |
| `POST /api/rewards/:rewardId/redeem` | Planned | Spend gems and redeem item → `{redemption,balance}` | `401`, `404`, `409` |
| `GET /api/friends` | Planned | Read accepted connections → `{friends:[...]}` | `401` |
| `GET /api/users/search?q=` | Planned | Find discoverable learners → `{users:[...]}` | `400`, `401` |
| `GET /api/users/:userId` | Planned | Read profile fields permitted by privacy settings → `{user}` | `401`, `403`, `404` |
| `GET /api/friend-requests` | Planned | **Control not shown:** read incoming/outgoing request status → `{requests:[...]}` | `401` |
| `POST /api/friend-requests` | Planned | Send a request; `{userId}` → `{request}` | `400`, `401`, `404`, `409` |
| `PATCH /api/friend-requests/:requestId` | Planned | **Control not shown:** accept or decline; `{action:"accept"|"decline"}` → `{request}` | `400`, `401`, `404`, `409` |
| `DELETE /api/friends/:userId` | Planned | **Control not shown:** remove an accepted connection → `{removed:true}` | `401`, `404` |
| `GET /api/study-groups` | Planned | Browse groups by goal/topic → `{groups:[...]}` | `401` |
| `GET /api/study-groups/:groupId` | Planned | Read group overview, members, meetup, and challenge → `{group}` | `401`, `404` |
| `POST /api/study-groups/:groupId/membership` | Planned | **Control not shown:** join group → `{membership}` | `401`, `404`, `409` |
| `DELETE /api/study-groups/:groupId/membership` | Planned | **Control not shown:** leave group → `{left:true}` | `401`, `404` |
| `GET /api/study-groups/:groupId/discussion` | Planned | Read the designed discussion feed → `{posts:[...]}` | `401`, `404` |
| `GET /api/study-groups/:groupId/challenge` | Planned | Read shared challenge/progress → `{challenge}` | `401`, `404` |
| `POST /api/study-groups/:groupId/challenge/join` | Planned | **Control not shown:** join a group challenge → `{participant}` | `401`, `404`, `409` |
| `GET /api/study-rooms/:roomId` | Planned | Read active study room/focus → `{room}` | `401`, `404` |
| `POST /api/study-rooms/:roomId/participants` | Planned | **Control not shown:** join a study room → `{participant}` | `401`, `404`, `409` |
| `DELETE /api/study-rooms/:roomId/participants/me` | Planned | **Control not shown:** leave a study room → `{left:true}` | `401`, `404` |
| `GET /api/study-rooms/:roomId/messages` | Planned | Read live room messages → `{messages:[...]}` | `401`, `404` |
| `POST /api/study-rooms/:roomId/messages` | Planned | Send/reply to a room message; `{body,replyToId?}` → `{message}` | `400`, `401`, `404` |
| `GET /api/study-rooms/:roomId/polls` | Planned | Read active poll and choices → `{poll}` | `401`, `404` |
| `POST /api/study-rooms/:roomId/polls/:pollId/votes` | Planned | Submit one vote; `{choiceId}` → `{voteCount,selectedChoice}` | `400`, `401`, `404`, `409` |
| `GET /api/peer-reviews` | Planned | Read available peer-review item → `{submission}` | `401` |
| `POST /api/peer-reviews/:submissionId/comments` | Planned | Submit a review comment; `{body}` → `{comment}` | `400`, `401`, `404` |
| `GET /api/study-groups/:groupId/plan/tasks` | Planned | Read group plan/task lanes → `{tasks:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/plan/tasks` | Planned | **Controls need confirmation:** add a plan task; `{title,lane}` → `{task}` | `400`, `401`, `404` |
| `PATCH /api/study-groups/:groupId/plan/tasks/:taskId` | Planned | **Controls need confirmation:** edit/move a task; changed fields → `{task}` | `400`, `401`, `404` |
| `DELETE /api/study-groups/:groupId/plan/tasks/:taskId` | Planned | **Controls need confirmation:** remove a task → `{deleted:true}` | `401`, `404` |
| `GET /api/study-groups/:groupId/whiteboard/notes` | Planned | Read shared sticky notes → `{notes:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/whiteboard/notes` | Planned | **Controls need confirmation:** add a note; `{text,position?}` → `{note}` | `400`, `401`, `404` |
| `PATCH /api/study-groups/:groupId/whiteboard/notes/:noteId` | Planned | **Controls need confirmation:** edit/move a note; changed fields → `{note}` | `400`, `401`, `404` |
| `DELETE /api/study-groups/:groupId/whiteboard/notes/:noteId` | Planned | **Controls need confirmation:** remove a note → `{deleted:true}` | `401`, `404` |
| `GET /api/notifications` | Planned | Read notifications and unread count → `{notifications:[...],unreadCount}` | `401` |
| `PATCH /api/notifications/read-all` | Planned | Mark all notifications read → `{updatedCount}` | `401` |
| `PATCH /api/notifications/:notificationId` | Planned | Mark one notification read; `{read:true}` → `{notification}` | `401`, `404` |

The Figma shows friend discovery and sending a request, but not accepting/declining/removing a friendship. It does not clearly show group join/leave controls. Those friend/group membership routes remain provisional and must not be implemented until the controls are confirmed. It shows group discussion as a feed without a compose control, so this contract does not invent create/edit/delete endpoints for discussion posts. Group creation/administration is also not shown.

## Help and support

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/help/articles?category=` | Planned | Read FAQ/help topics → `{articles:[...]}` | `400`, `500` |
| `POST /api/support/requests` | Planned | Submit issue; multipart fields `message`, optional PNG/JPG screenshot (≤5 MB), and device details → `{requestId,status}` | `400`, `401`, `413` |

## Flo AI Tutor

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/tutor/role-plays` | Planned | Read designed conversation scenarios → `{scenarios:[...]}` | `401` |
| `GET /api/tutor/chats` | Planned | Read saved conversation list → `{chats:[...]}` | `401` |
| `POST /api/tutor/chats` | Planned | Start chat/role-play; `{scenarioId?}` → `{chat}` | `400`, `401`, `404` |
| `GET /api/tutor/chats/:chatId` | Planned | Read messages and saved-note links → `{chat,messages:[...]}` | `401`, `404` |
| `POST /api/tutor/chats/:chatId/messages` | Planned | Send question, grammar/mistake context, or role-play response; `{message,context?}` → `{userMessage,tutorMessage}` | `400`, `401`, `404`, `500` |
| `DELETE /api/tutor/chats/:chatId` | Planned | **Control not shown:** delete one chat → `{deleted:true}` | `401`, `404` |
| `DELETE /api/tutor/chats` | Planned | Clear all history after confirmation → `{deletedCount}` | `401` |
| `GET /api/tutor/notes` | Planned | Read saved tutor notes → `{notes:[...]}` | `401` |
| `POST /api/tutor/notes` | Planned | Save a phrase/pattern; `{chatId?,phrase,pattern,personalExample?}` → `{note}` | `400`, `401` |
| `GET /api/tutor/notes/:noteId` | Planned | Read one saved note → `{note}` | `401`, `404` |
| `PATCH /api/tutor/notes/:noteId` | Planned | **Control needs confirmation:** edit note/personal example; changed fields → `{note}` | `400`, `401`, `404` |
| `DELETE /api/tutor/notes/:noteId` | Planned | **Control not shown:** delete one saved note → `{deleted:true}` | `401`, `404` |

## CRUD coverage and deliberate boundaries

| Data | Planned learner operations |
| --- | --- |
| Account/profile/settings | Create and read account; update profile/settings; sign in/out, verify/recover credentials, revoke sessions, request export. Account deletion is not in the reviewed design. |
| Course/unit/lesson/exercise definitions | Read only. No learner/admin create/update/delete endpoints. |
| Enrollments and learning evidence | Select/read enrollment; un-enroll is not shown. Read/attach/remove evidence; evidence editing is not confirmed. |
| Placement, answers, progress, review, quests, rewards | Create attempts/answers/claims/redemptions; read results. Progress and rewards are derived, not arbitrary CRUD fields. |
| Planner entries | Calendar/weekly plan is visible; create/read/update/delete are proposed, with exact controls still to confirm. |
| Learner vocabulary sets/cards | Deck name/cards are editable and import is visible; full create/read/update/delete routes are proposed, but explicit add/delete controls still need confirmation. |
| Bookmarks/story progress | Create/read/remove bookmarks; read/update reading progress. |
| Friends and groups | Search/read and send a request. Accept/decline/remove, join/leave, and challenge-join endpoints are provisional because those controls are not shown. No group creation or discussion-post write controls are shown. |
| Study-room activities | Read/send live message, vote, and submit peer feedback are visible. Room join/leave and plan-task/whiteboard-note create/read/update/delete routes are provisional because the frames do not identify all mutation controls. |
| Notifications | Read and mark read; no delete control is shown. |
| Support | Create a request and show its designed confirmation; no later status/read, edit, or delete flow is shown. |
| Tutor chats/notes | Create/read chats and messages and clear all history. Per-chat delete and note update/delete controls are not confirmed; saving a note and adding a personal example are shown. |
| Offline downloads and unsent drafts | Device-local create/read/update/remove behavior; no backend CRUD. |

All routes remain **Planned** until code proves otherwise. Keep payloads small, validate ownership and privacy on every mutation, and update this file when the implementation contract changes. See [DATABASE.md](DATABASE.md) for conceptual data relationships and [TESTING.md](TESTING.md) for CRUD verification.
