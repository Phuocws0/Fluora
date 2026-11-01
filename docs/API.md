# API Contract

This document records the implemented runtime health, learning-content reads, story reads, partial practice API, and planned learner-facing API for Page 09 and the 17 Page 10 concepts promoted into scope by the product owner. Endpoints are marked **Planned** until implemented in the current source. The API includes a practical CRUD baseline for learner-owned and group-managed data, including controls omitted from draft frames. It does not add admin content-management APIs.

Use REST/JSON under `/api`. Authenticated calls use `Authorization: Bearer <token>`; register, login, Google sign-in, email verification, and password recovery are public. Keep errors consistent:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request could not be processed." } }
```

Common statuses: `400` invalid input, `401` missing/invalid session, `403` action not allowed by privacy/ownership, `404` missing resource, `409` conflict, `500` unexpected failure. Endpoint-specific errors are listed below.

## Local runtime

| Method / path | Status | Purpose; response | Errors |
| --- | --- | --- | --- |
| `GET /health` | Implemented | Check the Express process and PostgreSQL connection → `200 {status:"ok",database:"ok"}` | `503 {status:"error",database:"unavailable"}` |

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
| `PATCH /api/users/me/settings` | Planned | Update languages, goals/time budget, learning promise, reminders, Flo style, privacy, accessibility/text size, focus mode, low-bandwidth, or wellbeing settings; changed fields → `{settings}` | `400`, `401` |
| `DELETE /api/users/me/settings` | Planned | Reset preferences to defaults → `{settings}` | `401` |
| `DELETE /api/users/me` | Planned | Delete the account and its owned data after confirmation; `{confirmEmail}` → `{deleted:true}` | `400`, `401`, `409` |
| `POST /api/users/me/data-exports` | Partial | Create an export job/preview → `{exportId,status}` | `401`, `500` |
| `GET /api/users/me/data-exports` | Partial | List the learner's export jobs → `{exports:[...]}` | `401` |
| `GET /api/users/me/data-exports/:exportId` | Partial | Read export status/details → `{export}` | `401`, `404` |
| `GET /api/users/me/data-exports/:exportId/download` | Partial | Download the prepared local-demo JSON export | `401`, `404`, `409` |
| `DELETE /api/users/me/data-exports/:exportId` | Partial | Cancel/delete an export job → `{deleted:true}` | `401`, `404` |

Account deletion requires explicit confirmation and removes the user's personal records. It does not delete curated content or other learners' records.

## Learning content and progress

Course, unit, lesson, story, study-tool, help, and reward definitions are curated/read-only in the learner app. Learner answers and progress are separate user-owned records.

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/home` | Planned | Home cards and continue-learning summary → `{course,progress,streak,wallet}` | `401` |
| `GET /api/courses` | Implemented | Published course catalog → `{courses:[{id,slug,title,description,language,level,estimatedMinutes,unitCount,lessonCount,learningPaths}]}` | `500` |
| `GET /api/courses/:courseId` | Implemented | Course overview and ordered syllabus units/lessons → `{course:{...,units:[...],learningPaths:[...]}}` | `400`, `404`, `500` |
| `GET /api/courses/:courseId/units` | Implemented | Ordered unit catalog with lesson counts → `{units:[{id,slug,title,description,order,lessonCount}]}` | `400`, `404`, `500` |
| `GET /api/units/:unitId` | Implemented | Unit overview, course summary, and ordered lessons → `{unit:{...,course,lessons:[...]}}` | `400`, `404`, `500` |
| `GET /api/lessons/:lessonId` | Implemented | Lesson, ordered exercises, public exercise content/options, and course/unit summaries → `{lesson:{...,exercises:[...]}}` | `400`, `404`, `500` |
| `GET /api/lessons/search?query=&level=&skill=&minutes=` | Implemented | Search title/description and filter by level, skill, or maximum duration in minutes → `{lessons:[...]}` | `400`, `500` |
| `GET /api/learning-paths` | Implemented | Published path metadata, outcomes, and linked course → `{paths:[...]}` | `500` |
| `GET /api/learning-paths/compare?ids=<id1>,<id2>` | Implemented | Compare at least two distinct path IDs, returned in request order → `{paths:[...]}` | `400`, `404`, `500` |
| `GET /api/enrollments` | Planned | Read current learner's selected courses → `{enrollments:[...]}` | `401` |
| `POST /api/enrollments` | Planned | Select/enroll in a course; `{courseId}` → `{enrollment}` | `401`, `404`, `409` |
| `PATCH /api/enrollments/:enrollmentId` | Planned | Update learner-owned enrollment selection/state; changed fields → `{enrollment}` | `400`, `401`, `404` |
| `DELETE /api/enrollments/:enrollmentId` | Planned | Unenroll from a course → `{deleted:true}` | `401`, `404` |
| `GET /api/placement/attempts` | Planned | Read placement history and baseline → `{attempts:[...]}` | `401` |
| `POST /api/placement/attempts` | Planned | Submit the optional placement answers; `{answers:[...]}` → `{level,skillBaseline}` | `400`; session optional if placement precedes registration |
| `GET /api/progress` | Planned | Read completion, XP, streak, and gems → `{completedLessons,currentStreak,xp,gems}` | `401` |
| `POST /api/lessons/:lessonId/complete` | Planned | Record lesson completion → `{lessonId,completedAt,xpEarned}` | `401`, `404`, `409` |
| `GET /api/learning/skill-baseline` | Planned | Read placement level and confidence by skill → `{level,skills:[...]}` | `401`, `404` |
| `GET /api/analytics/weekly` | Planned | Weekly XP/activity chart → `{days:[...],summary}` | `401` |
| `GET /api/learning/evidence` | Planned | Read can-do goals and attached samples → `{goals:[...]}` | `401` |
| `POST /api/learning/evidence` | Planned | Attach a completed learning sample; `{goalId,kind,summary,reference?}` → `{evidence}` | `400`, `401`, `404` |
| `PATCH /api/learning/evidence/:evidenceId` | Planned | Edit a learner-owned evidence sample; changed fields → `{evidence}` | `400`, `401`, `404` |
| `DELETE /api/learning/evidence/:evidenceId` | Planned | Remove a learner-attached sample → `{deleted:true}` | `401`, `404` |
| `GET /api/missions/passport` | Planned | Read mission passport and earned stamps → `{missions:[...]}` | `401` |
| `GET /api/missions/:missionId` | Planned | Read curated mission instructions → `{mission}` | `404` |
| `POST /api/missions/:missionId/complete` | Planned | Record completed mission evidence; progress is derived → `{completion}` | `400`, `401`, `404`, `409` |
| `GET /api/learning/misconceptions` | Planned | Read recurring error patterns derived from answers → `{items:[...]}` | `401` |
| `PATCH /api/learning/misconceptions/:itemId` | Planned | Dismiss/restore a learner's misconception card; `{dismissed}` → `{item}` | `400`, `401`, `404` |

The implemented course, unit, lesson, and learning-path reads are public curated content and do not require authentication. The course detail response is the course syllabus. Lesson responses omit exercise answer keys, correctness flags, and feedback explanations; those remain server-side until an answer is submitted.

## Planner and practice

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/practice` | Partial | Practice hub recommendations and due-item counts → `{suggestions,reviewDueCount}` | `401` |
| `GET /api/planner/entries` | Planned | Read calendar/weekly plan → `{entries:[...]}` | `401` |
| `POST /api/planner/entries` | Planned | Create a planned study session; `{date,time,durationMinutes,label?}` → `{entry}` | `400`, `401` |
| `GET /api/planner/entries/:entryId` | Planned | Read one learner-owned session → `{entry}` | `401`, `404` |
| `PATCH /api/planner/entries/:entryId` | Planned | Move or edit a planned session; changed fields → `{entry}` | `400`, `401`, `404` |
| `DELETE /api/planner/entries/:entryId` | Planned | Remove a planned session → `{deleted:true}` | `401`, `404` |
| `GET /api/lessons/:lessonId/answers` | Planned | Read the learner's immutable answer history for a lesson → `{answers:[...]}` | `401`, `404` |
| `POST /api/exercises/:exerciseId/answers` | Planned | Submit choice, sentence tiles, transcript gap, dictation, or speaking/recording result; `{answer:{kind,...}}` → `{isCorrect,feedback,explanation?,score?,speakingScorecard?}` | `400`, `401`, `404` |
| `GET /api/exercises/:exerciseId/hints?step=` | Planned | Return the next hint in the hint ladder → `{step,text}` | `400`, `404` |
| `GET /api/practice/review-items?kind=` | Partial | Read due vocabulary and recurring mistakes → `{items:[...]}` | `401` |
| `GET /api/practice/review-items/:itemId` | Partial | Read one saved review item → `{item}` | `401`, `404` |
| `POST /api/practice/review-items` | Partial | Create a learner-owned review item; `{front,back,kind?}` → `{item}` | `400`, `401` |
| `PATCH /api/practice/review-items/:itemId` | Partial | Edit a custom review item or dismiss a derived mistake; changed fields → `{item}` | `400`, `401`, `404` |
| `DELETE /api/practice/review-items/:itemId` | Partial | Delete a custom item or hide a derived mistake from this learner's queue → `{deleted:true}` | `401`, `404` |
| `POST /api/practice/review-items/:itemId/answers` | Partial | Record recall/review outcome and update schedule → `{result,nextReviewAt}` | `400`, `401`, `404` |
| `GET /api/study-tools` | Partial | List available curated study tools → `{tools:[...]}` | `401` |
| `GET /api/study-tools/:toolId` | Partial | Read curated audio/waveform, pronunciation, writing, vocabulary/word-map, grammar, conjugation, or city/café/transit content → `{tool}` | `401`, `404` |
| `GET /api/dictionary?query=` | Partial | Look up a selected word for the inline dictionary → `{entry}` | `400`, `401`, `404` |

Recording Studio captures audio locally on the device. The demo answer may include a client-produced transcript/score for the speaking scorecard; do not upload or persist raw voice samples on the backend. Tutor feedback and branching role-play use the existing chat/message contract.

## Vocabulary, bookmarks, stories, and offline use

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/vocabulary/sets` | Partial | List learner decks and provided sets → `{sets:[...]}` | `401` |
| `POST /api/vocabulary/sets` | Partial | Create a learner-owned deck; `{name}` → `{set}` | `400`, `401` |
| `GET /api/vocabulary/sets/:setId` | Partial | Read a deck and its cards → `{set,cards:[...]}` | `401`, `404` |
| `PATCH /api/vocabulary/sets/:setId` | Partial | Rename/update a learner deck; changed fields → `{set}` | `400`, `401`, `404` |
| `DELETE /api/vocabulary/sets/:setId` | Partial | Delete a learner-owned deck and its cards → `{deleted:true}` | `401`, `404` |
| `GET /api/vocabulary/sets/:setId/cards` | Partial | List deck cards → `{cards:[...]}` | `401`, `404` |
| `POST /api/vocabulary/sets/:setId/cards` | Partial | Add a card; `{front,back,tag?,example?}` → `{card}` | `400`, `401`, `404` |
| `GET /api/vocabulary/cards/:cardId` | Partial | Read one card → `{card}` | `401`, `404` |
| `PATCH /api/vocabulary/cards/:cardId` | Partial | Edit a card; changed fields → `{card}` | `400`, `401`, `404` |
| `DELETE /api/vocabulary/cards/:cardId` | Partial | Remove a card → `{deleted:true}` | `401`, `404` |
| `POST /api/vocabulary/import/preview` | Partial | Parse selected rows and column mapping; `{filename,rows,mapping}` → `{validRows,errors}` | `400`, `401` |
| `POST /api/vocabulary/import` | Partial | Import approved rows into a deck; `{destinationSetId,rows,mapping}` → `{importedCount,cards}` | `400`, `401`, `404` |
| `GET /api/bookmarks` | Partial | List saved words/stories → `{bookmarks:[...]}` | `401` |
| `POST /api/bookmarks` | Partial | Save a word or story; `{targetType,targetId}` → `{bookmark}` | `400`, `401`, `404`, `409` |
| `PATCH /api/bookmarks/:bookmarkId` | Partial | Edit learner note/tag; changed fields → `{bookmark}` | `400`, `401`, `404` |
| `DELETE /api/bookmarks/:bookmarkId` | Partial | Remove a saved item → `{deleted:true}` | `401`, `404` |
| `GET /api/stories` | Implemented | Story library → `{stories:[...]}` | `500` |
| `GET /api/stories/:storyId` | Implemented | Read a story/article/dialogue and comprehension tree → `{story}` | `404` |
| `GET /api/stories/:storyId/progress` | Partial | Read learner reading position → `{progress}` | `401`, `404` |
| `PUT /api/stories/:storyId/progress` | Partial | Create/update position or completion; `{position,completed?}` → `{progress}` | `400`, `401`, `404` |
| `DELETE /api/stories/:storyId/progress` | Partial | Reset learner reading position → `{deleted:true}` | `401`, `404` |

The practice branch implements deck/card CRUD, story reads, story bookmarks, and reading progress. Private routes need issue #3 to set `res.locals.userId` from a verified bearer session; until then they return `401`. Custom review items and scheduling, deck import preview/import, basic study-tool metadata, a small local dictionary, and story-based recommendations are implemented. Mistake-derived review, word bookmarks, richer tool content, and story challenge answers remain planned; story challenge answers reuse issue #27.

The offline queue, audio recordings, transfer progress, storage limit, and downloaded files are device-local. The mobile app manages create/read/update/remove states locally; no server-side CRUD for device media/downloads is proposed.

## League, rewards, community, and notifications

### Rewards and achievements

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/leaderboard` | Planned | Read current league rankings → `{period,entries:[...]}` | `401` |
| `GET /api/leagues/current` | Planned | Read league, tier, and promotion boundary → `{league}` | `401` |
| `GET /api/quests` | Planned | Read daily quests and progress → `{quests:[...]}` | `401` |
| `POST /api/quests/:questId/claim` | Planned | Claim completed quest reward → `{reward}` | `401`, `404`, `409` |
| `GET /api/achievements` | Planned | Read achievement collection → `{achievements:[...]}` | `401` |
| `GET /api/achievements/:achievementId` | Planned | Read achievement detail → `{achievement}` | `401`, `404` |
| `GET /api/wallet` | Planned | Read gem balance/immutable transactions → `{balance,transactions:[...]}` | `401` |
| `GET /api/rewards` | Planned | Read available reward shop items → `{rewards:[...]}` | `401` |
| `POST /api/rewards/:rewardId/redeem` | Planned | Spend gems and redeem item → `{redemption,balance}` | `401`, `404`, `409` |
| `GET /api/redemptions` | Planned | Read own redemptions → `{redemptions:[...]}` | `401` |
| `DELETE /api/redemptions/:redemptionId` | Planned | Cancel an unfulfilled redemption and refund gems → `{cancelled:true,balance}` | `401`, `404`, `409` |

Quest/achievement definitions and wallet transactions are curated/derived or append-only; learners cannot edit historical balances or awards.

### Friends

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/friends` | Planned | Read accepted connections → `{friends:[...]}` | `401` |
| `GET /api/users/search?q=` | Planned | Find discoverable learners → `{users:[...]}` | `400`, `401` |
| `GET /api/users/:userId` | Planned | Read profile fields permitted by privacy settings → `{user}` | `401`, `403`, `404` |
| `GET /api/friend-requests` | Planned | Read incoming/outgoing requests → `{requests:[...]}` | `401` |
| `POST /api/friend-requests` | Planned | Send a request; `{userId}` → `{request}` | `400`, `401`, `404`, `409` |
| `PATCH /api/friend-requests/:requestId` | Planned | Accept or decline; `{action:"accept"|"decline"}` → `{request}` | `400`, `401`, `404`, `409` |
| `DELETE /api/friend-requests/:requestId` | Planned | Cancel own outgoing request or remove a declined request → `{deleted:true}` | `401`, `404` |
| `DELETE /api/friends/:userId` | Planned | Remove an accepted connection → `{removed:true}` | `401`, `404` |

### Study groups, posts, and challenges

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/study-groups` | Planned | Browse groups by goal/topic → `{groups:[...]}` | `401` |
| `POST /api/study-groups` | Planned | Create a learner-owned group; `{name,goal,topic,visibility}` → `{group}` | `400`, `401` |
| `GET /api/study-groups/:groupId` | Planned | Read group overview, members, meetup, and challenge → `{group}` | `401`, `404` |
| `PATCH /api/study-groups/:groupId` | Planned | Edit group settings as owner → `{group}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId` | Planned | Archive/delete an owned group → `{deleted:true}` | `401`, `403`, `404`, `409` |
| `GET /api/study-groups/:groupId/members` | Planned | Read group members/roles → `{members:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/membership` | Planned | Join group → `{membership}` | `401`, `404`, `409` |
| `DELETE /api/study-groups/:groupId/membership` | Planned | Leave group → `{left:true}` | `401`, `404` |
| `GET /api/study-groups/:groupId/discussion` | Planned | Read discussion feed → `{posts:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/discussion` | Planned | Create own post; `{body}` → `{post}` | `400`, `401`, `404` |
| `PATCH /api/study-groups/:groupId/discussion/:postId` | Planned | Edit own post; `{body}` → `{post}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId/discussion/:postId` | Planned | Delete own post → `{deleted:true}` | `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/discussion/:postId/comments` | Planned | Read post comments → `{comments:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/discussion/:postId/comments` | Planned | Add own comment; `{body}` → `{comment}` | `400`, `401`, `404` |
| `PATCH /api/study-groups/:groupId/discussion/:postId/comments/:commentId` | Planned | Edit own comment; `{body}` → `{comment}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId/discussion/:postId/comments/:commentId` | Planned | Delete own comment → `{deleted:true}` | `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/challenge` | Planned | Read shared challenge/progress → `{challenge}` | `401`, `404` |
| `POST /api/study-groups/:groupId/challenge` | Planned | Create group challenge as owner; challenge fields → `{challenge}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-groups/:groupId/challenge` | Planned | Edit group challenge as owner → `{challenge}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId/challenge` | Planned | Delete group challenge as owner → `{deleted:true}` | `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/challenge/join` | Planned | Join a group challenge → `{participant}` | `401`, `404`, `409` |
| `DELETE /api/study-groups/:groupId/challenge/join` | Planned | Leave a group challenge → `{left:true}` | `401`, `404` |

### Study rooms and shared activities

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `POST /api/study-groups/:groupId/rooms` | Planned | Create a room as group owner; `{name?,startsAt?}` → `{room}` | `400`, `401`, `403`, `404` |
| `GET /api/study-rooms/:roomId` | Planned | Read active study room/focus → `{room}` | `401`, `404` |
| `PATCH /api/study-rooms/:roomId` | Planned | Edit room settings as host → `{room}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-rooms/:roomId` | Planned | Close/delete room as host → `{deleted:true}` | `401`, `403`, `404` |
| `POST /api/study-rooms/:roomId/participants` | Planned | Join a study room → `{participant}` | `401`, `404`, `409` |
| `DELETE /api/study-rooms/:roomId/participants/me` | Planned | Leave a study room → `{left:true}` | `401`, `404` |
| `GET /api/study-rooms/:roomId/messages` | Planned | Read room messages → `{messages:[...]}` | `401`, `404` |
| `POST /api/study-rooms/:roomId/messages` | Planned | Send/reply to a room message; `{body,replyToId?}` → `{message}` | `400`, `401`, `404` |
| `PATCH /api/study-rooms/:roomId/messages/:messageId` | Planned | Edit own message → `{message}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-rooms/:roomId/messages/:messageId` | Planned | Delete own message → `{deleted:true}` | `401`, `403`, `404` |
| `GET /api/study-rooms/:roomId/polls` | Planned | Read polls and own vote → `{polls:[...]}` | `401`, `404` |
| `POST /api/study-rooms/:roomId/polls` | Planned | Create a poll as host; `{question,choices:[...]}` → `{poll}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-rooms/:roomId/polls/:pollId` | Planned | Edit poll as host → `{poll}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-rooms/:roomId/polls/:pollId` | Planned | Delete poll as host → `{deleted:true}` | `401`, `403`, `404` |
| `POST /api/study-rooms/:roomId/polls/:pollId/votes` | Planned | Submit vote; `{choiceId}` → `{voteCount,selectedChoice}` | `400`, `401`, `404`, `409` |
| `PATCH /api/study-rooms/:roomId/polls/:pollId/votes/me` | Planned | Change own vote; `{choiceId}` → `{voteCount,selectedChoice}` | `400`, `401`, `404` |
| `DELETE /api/study-rooms/:roomId/polls/:pollId/votes/me` | Planned | Withdraw own vote while poll is open → `{deleted:true}` | `401`, `404`, `409` |
| `GET /api/peer-reviews` | Planned | Read available peer-review item → `{submission}` | `401` |
| `POST /api/peer-reviews/:submissionId/comments` | Planned | Submit own review comment; `{body}` → `{comment}` | `400`, `401`, `404` |
| `PATCH /api/peer-reviews/:submissionId/comments/:commentId` | Planned | Edit own review comment → `{comment}` | `400`, `401`, `403`, `404` |
| `DELETE /api/peer-reviews/:submissionId/comments/:commentId` | Planned | Delete own review comment → `{deleted:true}` | `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/plan/tasks` | Planned | Read group plan/task lanes → `{tasks:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/plan/tasks` | Planned | Add a task; `{title,lane}` → `{task}` | `400`, `401`, `404` |
| `PATCH /api/study-groups/:groupId/plan/tasks/:taskId` | Planned | Edit/move a task → `{task}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId/plan/tasks/:taskId` | Planned | Remove a task → `{deleted:true}` | `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/whiteboard/notes` | Planned | Read shared notes → `{notes:[...]}` | `401`, `404` |
| `POST /api/study-groups/:groupId/whiteboard/notes` | Planned | Add a note; `{text,position?}` → `{note}` | `400`, `401`, `404` |
| `PATCH /api/study-groups/:groupId/whiteboard/notes/:noteId` | Planned | Edit/move own note → `{note}` | `400`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId/whiteboard/notes/:noteId` | Planned | Remove own note → `{deleted:true}` | `401`, `403`, `404` |

Group, room, challenge, and poll administration requires the relevant owner/host role. Members may change only their own records.

### Notifications

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/notifications` | Planned | Read notifications and unread count → `{notifications:[...],unreadCount}` | `401` |
| `PATCH /api/notifications/read-all` | Planned | Mark all notifications read → `{updatedCount}` | `401` |
| `PATCH /api/notifications/:notificationId` | Planned | Mark one notification read/unread; `{read}` → `{notification}` | `400`, `401`, `404` |
| `DELETE /api/notifications/:notificationId` | Planned | Delete one own notification → `{deleted:true}` | `401`, `404` |
| `DELETE /api/notifications` | Planned | Clear own notification list → `{deletedCount}` | `401` |

Notifications are system-created; clients can read, update read state, and delete them.

## Help and support

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/help/articles?category=` | Implemented | Read FAQ/help topics → `{articles:[...]}` | `400`, `500` |
| `GET /api/support/requests` | Partial | Read the learner's own support requests → `{requests:[...]}` | `401` |
| `POST /api/support/requests` | Partial | Create a request; `{message,screenshot?,deviceDetails}` → `{request}` | `400`, `401`, `413` |
| `PATCH /api/support/requests/:requestId` | Partial | Edit an open request → `{request}` | `400`, `401`, `403`, `404`, `409` |
| `DELETE /api/support/requests/:requestId` | Partial | Cancel/delete an open request → `{deleted:true}` | `401`, `403`, `404`, `409` |

Help articles remain curated/read-only. Support requests can be changed only while open; this local demo stores a request record and does not require an external ticketing service.

The support/export implementation needs issue #3 to set `res.locals.userId` from a verified bearer session. Until then, private routes return `401`. Export downloads currently contain the existing `User` fields and support requests; extend the payload as other learner-owned models are implemented.

## Flo AI Tutor

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/tutor/role-plays` | Planned | Read curated branching role-play scenarios → `{scenarios:[...]}` | `401` |
| `GET /api/tutor/chats` | Planned | Read saved conversation list → `{chats:[...]}` | `401` |
| `POST /api/tutor/chats` | Planned | Start chat/role-play; `{scenarioId?}` → `{chat}` | `400`, `401`, `404` |
| `PATCH /api/tutor/chats/:chatId` | Planned | Rename a chat or update its save preference → `{chat}` | `400`, `401`, `404` |
| `GET /api/tutor/chats/:chatId` | Planned | Read messages and saved-note links → `{chat,messages:[...]}` | `401`, `404` |
| `POST /api/tutor/chats/:chatId/messages` | Planned | Send question, grammar/mistake context, or role-play response; `{message,context?}` → `{userMessage,tutorMessage,feedback?,nextTurn?}` | `400`, `401`, `404`, `500` |
| `PATCH /api/tutor/chats/:chatId/messages/:messageId` | Planned | Edit own message and regenerate tutor feedback → `{userMessage,tutorMessage}` | `400`, `401`, `403`, `404` |
| `DELETE /api/tutor/chats/:chatId/messages/:messageId` | Planned | Delete own message and linked response → `{deleted:true}` | `401`, `403`, `404` |
| `DELETE /api/tutor/chats/:chatId` | Planned | Delete one chat after confirmation → `{deleted:true}` | `401`, `404` |
| `DELETE /api/tutor/chats` | Planned | Clear all history after confirmation → `{deletedCount}` | `401` |
| `GET /api/tutor/notes` | Planned | Read saved tutor notes → `{notes:[...]}` | `401` |
| `POST /api/tutor/notes` | Planned | Save a phrase/pattern; `{chatId?,phrase,pattern,personalExample?}` → `{note}` | `400`, `401` |
| `GET /api/tutor/notes/:noteId` | Planned | Read one saved note → `{note}` | `401`, `404` |
| `PATCH /api/tutor/notes/:noteId` | Planned | Edit note/personal example; changed fields → `{note}` | `400`, `401`, `404` |
| `DELETE /api/tutor/notes/:noteId` | Planned | Delete one saved note → `{deleted:true}` | `401`, `404` |

## CRUD coverage and deliberate boundaries

| Data | Planned learner operations |
| --- | --- |
| Account/profile/settings/exports | Create/read account; update profile/settings; delete account with confirmation; reset settings; revoke sessions; create/read/download/cancel export jobs. |
| Course/unit/lesson/exercise definitions | Read only. No learner/admin create/update/delete endpoints. |
| Enrollments/evidence/planner | Enrollment, evidence, and planner entries support create/read/update/delete under the learner's ownership. |
| Placement/answers/progress/missions | Placement attempts and answers are create/read. Submitted answers and completion events are immutable; progress, mission passport, XP, streaks, and analytics are derived. Misconception cards can be dismissed/restored, not edited as source answers. |
| Practice data | Learner decks/cards, bookmarks, reading progress, and custom review items support create/read/update/delete. Import creates cards after preview. Offline media/queue is device-local CRUD. |
| Friends | Requests support create/read/update (accept/decline)/delete (cancel); friendships support read/delete. |
| Groups/discussion/challenges | Group owners support group/challenge create/read/update/delete; membership supports join/read/leave; posts/comments support create/read/update/delete by their authors or authorized group owners. |
| Study rooms | Hosts manage room/poll create/read/update/delete; members join/leave, manage their own messages, votes, review comments, plan tasks, and whiteboard notes. |
| Rewards/achievements | Definitions and earned summaries are read-only; claims/redemptions are actions. Wallet transactions remain append-only; only unfulfilled redemptions may be canceled. |
| Notifications | System-created; learners read, mark read/unread, delete one, or clear their own list. |
| Support | Learner requests support create/read/update/delete while the request is open. |
| Tutor chats/messages/notes | Create/read/update/delete owned chats/messages/notes; clear all history after confirmation. |
| Offline downloads and unsent drafts | Device-local create/read/update/remove behavior; no backend CRUD. |

Learner routes remain **Planned** or **Partial** until source code implements their documented behavior. Validate ownership and group roles on every mutation; confirm destructive account/group/history actions. Do not expose mutation endpoints for curated definitions or derived/append-only records. See [DATABASE.md](DATABASE.md) for conceptual data relationships and [TESTING.md](TESTING.md) for CRUD verification.
