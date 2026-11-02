# API Contract

This document records implemented auth/account/settings/placement, content, learning-activity, community, League, and rewards APIs, partial practice APIs, and planned learner-facing API for Page 09 and the 17 Page 10 concepts promoted into scope by the product owner. Endpoint status follows the current source. The API includes a practical CRUD baseline for learner-owned and group-managed data, including controls omitted from draft frames. It does not add admin content-management APIs.

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
| `POST /api/auth/register` | Implemented | Create account, default settings, and first session; `{email,password,displayName,deviceName?}` → `201 {token,user}` | `400`, `409 EMAIL_TAKEN` |
| `POST /api/auth/login` | Implemented | Start session; `{email,password,deviceName?}` → `{token,user}` | `400`, `401 INVALID_CREDENTIALS` |
| `POST /api/auth/google` | Implemented | Continue with Google; `{idToken,deviceName?}` → `{token,user}`; `201` when a new account is created, `200` otherwise. The token is verified with Google `tokeninfo` against `GOOGLE_CLIENT_IDS`. | `400`, `401 INVALID_GOOGLE_TOKEN`, `409 EMAIL_TAKEN` (email registered but not verified by Google), `503 GOOGLE_SIGN_IN_UNAVAILABLE` (no client IDs configured or Google unreachable) |
| `POST /api/auth/verify-email` | Implemented | Verify email; `{token}` → `{verified:true}` | `400 INVALID_TOKEN`, `410 TOKEN_EXPIRED` (expired or already used) |
| `POST /api/auth/verify-email/resend` | Implemented | Issue a new verification token and invalidate older ones (Bearer); `{}` → `{sent:true}` | `401`, `409 ALREADY_VERIFIED` |
| `POST /api/auth/password/forgot` | Implemented | Request a reset token; `{email}` → always `{accepted:true}`, so the response doesn't reveal whether the account exists | `400` |
| `POST /api/auth/password/reset` | Implemented | Set a new password and sign out every session; `{token,newPassword}` → `{updated:true}` | `400`, `410` |
| `POST /api/auth/logout` | Implemented | End current session; `{}` → `{ok:true}` | `401` |
| `GET /api/users/me` | Implemented | Read current profile → `{user}` | `401` |
| `PATCH /api/users/me` | Implemented | Update any of `displayName` (1–50), `bio` (≤160 or `null`), `avatarUrl` (http/https ≤500 or `null`) → `{user}` | `400`, `401` |
| `PATCH /api/users/me/password` | Implemented | Change password; `{currentPassword,newPassword}` → `{updated:true}`. Signs out every other session and keeps the current one. `currentPassword` is required when the account has a password. | `400`, `401 INVALID_CREDENTIALS` |
| `GET /api/users/me/sessions` | Implemented | List unexpired signed-in devices, most recent first → `{sessions:[{id,deviceName,userAgent,createdAt,lastUsedAt,current}]}` | `401` |
| `DELETE /api/users/me/sessions/:sessionId` | Implemented | Revoke one of the learner's sessions → `{revoked:true}` | `400`, `401`, `404` (missing or another learner's session) |
| `GET /api/users/me/settings` | Implemented | Read preferences and privacy/accessibility choices → `{settings}` (a missing row is recreated with defaults) | `401` |
| `PATCH /api/users/me/settings` | Implemented | Update any subset of the `settings` fields below, plus `onboardingCompleted:true`; omitted fields keep their values → `{settings}` | `400`, `401` |
| `DELETE /api/users/me/settings` | Implemented | Reset preferences to defaults; keeps `courseLanguage`, `startingLevel`, and onboarding completion → `{settings}` | `401` |
| `DELETE /api/users/me` | Implemented | Delete the account and its owned data after confirmation; `{confirmEmail}` (case-insensitive) → `{deleted:true}`. Owned study groups and hosted rooms are handed to another member first. | `400 CONFIRMATION_MISMATCH`, `401` |
| `POST /api/users/me/data-exports` | Partial | Create an export job/preview → `{exportId,status}` | `401`, `500` |
| `GET /api/users/me/data-exports` | Partial | List the learner's export jobs → `{exports:[...]}` | `401` |
| `GET /api/users/me/data-exports/:exportId` | Partial | Read export status/details → `{export}` | `401`, `404` |
| `GET /api/users/me/data-exports/:exportId/download` | Partial | Download the prepared local-demo JSON export | `401`, `404`, `409` |
| `DELETE /api/users/me/data-exports/:exportId` | Partial | Cancel/delete an export job → `{deleted:true}` | `401`, `404` |

Account deletion requires explicit confirmation and removes the user's personal records across every domain (sessions, settings, placement, support, exports, practice, activity, community, and wallet rows). It does not delete curated content or other learners' records. Before deleting, the backend promotes the earliest-joined other member of each group the learner owns (or deletes the group when nobody else is left) and gives the learner's hosted rooms to that group's owner.

### Implemented session and account behavior

- **Session token:** `register` and `login` return an opaque random `token`. Send it as `Authorization: Bearer <token>`. The database stores only its SHA-256 hash. A session lasts 30 days and its expiry slides forward while it is used. Expired sessions are deleted when they are presented.
- **Identity on every `/api` request:** the `authenticate` middleware resolves a valid bearer token into `res.locals.userId` and `res.locals.sessionId`. It never rejects a request, so public routes work even with a stale token. Private routes use `requireUser` and return `401 UNAUTHORIZED` without a valid session. Support/export, practice, learning-activity, community, groups, rooms, and League routes use this identity.
- **`user` shape:** `{id,email,displayName,bio,avatarUrl,emailVerified,hasPassword,createdAt}`. Password hashes, token hashes, and Google subject IDs are never returned. `hasPassword` is `false` for future Google-only accounts.
- **Input rules:** strings are trimmed; passwords are not. Emails are stored lowercase (≤254 chars). Passwords are 8–128 characters for register and change. `deviceName` is optional (≤80 chars) and appears in the session list together with the request's `User-Agent`. Unknown body fields return `400`.
- **Login failures:** an unknown email, a wrong password, and an account without a password all return the same `401 INVALID_CREDENTIALS` message.
- **Unverified email:** sign-in and app use are allowed while `emailVerified` is `false`. Mobile can show a verification prompt and offer `verify-email/resend`.
- **Verification and reset tokens:** register issues an email-verification token (24 h); `password/forgot` issues a password-reset token (30 min). Issuing a token invalidates the learner's older unused tokens of the same kind. Tokens are single-use, including under concurrent requests, and stored only as SHA-256 hashes. This local demo sends no email; the backend writes one line per token to its log: `[dev-mail] <purpose> for <email>: <token>` (read with `docker compose logs -f backend`). A password reset also marks the email as verified and signs out every session.
- **Google sign-in:** the account is matched by Google subject first, then linked to an existing account with the same email when Google reports the email as verified, otherwise a password-less account (`hasPassword:false`) with default settings is created.
- **API-wide errors:** malformed JSON returns `400 VALIDATION_ERROR`, an oversized body returns `413 PAYLOAD_TOO_LARGE`, and an unknown `/api` path returns `404 NOT_FOUND`, all in the standard error shape.
- There is no rate limiting for this local demo.

### Learner settings

`settings` shape (all fields are writable through `PATCH` except `onboardingCompleted`, which can only be set to `true`, and `updatedAt`):

| Field | Type and rule | Default |
| --- | --- | --- |
| `appLanguage` | language code `^[a-z]{2}(-[A-Z]{2})?$`, not null | `"en"` |
| `courseLanguage` | language code or `null` | `null` |
| `motivation`, `floCompanion` | slug `^[a-z0-9_-]{1,40}$` or `null`; option lists are owned by mobile | `null` |
| `startingLevel` | `A1`–`C2` or `null` | `null` |
| `dailyGoalMinutes`, `dailyTimeBudgetMinutes` | whole number 1–240 or `null` | `null` |
| `learningPromise` | ≤200 characters or `null` | `null` |
| `reminderEnabled` | boolean; `true` requires a `reminderTime` (stored or in the same request) | `false` |
| `reminderTime` | `HH:mm` (24 h) or `null` | `null` |
| `reminderDays` | unique days `0` (Sunday) to `6`; empty means every day | `[]` |
| `timezone` | IANA time zone (for example `Asia/Ho_Chi_Minh`) or `null` (UTC) | `null` |
| `notifyFriendRequests`, `notifyRewards`, `notifyReminders` | boolean | `true` |
| `progressVisibility` | `public`, `friends`, or `private` | `"friends"` |
| `discoverable`, `saveTutorHistory` | boolean | `true` |
| `textSize` | `default`, `large`, or `extra_large` | `"default"` |
| `reducedMotion`, `captions`, `focusMode`, `lowBandwidth` | boolean | `false` |
| `wellbeingTimerMinutes` | whole number 5–180 or `null` | `null` |
| `onboardingCompleted` | boolean; set once with `onboardingCompleted:true` and never cleared | `false` |

An unknown field, a wrong type, or an empty body returns `400` and nothing is written. Onboarding answers collected before registration can be sent in one `PATCH` right after register or login. `discoverable` and `progressVisibility` control search, profiles, friends' progress, and the leaderboard; the notification and reminder fields control notifications (see League and community).

## Learning content and progress

Course, unit, lesson, story, study-tool, help, and reward definitions are curated/read-only in the learner app. Learner answers and progress are separate user-owned records.

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/home` | Partial | Home cards and continue-learning summary → `{course,progress,streak,wallet}` | `401` |
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
| `GET /api/placement/questions` | Implemented | Public, versioned placement question bank without answer keys → `{version,questions:[{id,skill,prompt,options:[{id,label}]}]}` | — |
| `GET /api/placement/attempts` | Implemented | Read the learner's placement history, newest first → `{attempts:[{id,level,skillBaseline,questionSetVersion,createdAt}]}` | `401` |
| `POST /api/placement/attempts` | Implemented | Submit placement answers; `{answers:[{questionId,optionId}]}` (1–10, no repeats) → `{attemptId,level,skillBaseline:[{skill,score,correct,total}]}`. With a session the attempt is stored (`201`); without one it is scored but not stored (`200`, `attemptId:null`). The level is a suggestion and does not change `settings.startingLevel`. | `400`; session optional because placement can precede registration |
| `GET /api/progress` | Implemented | Read completion, XP, streak, and gems → `{completedLessons,currentStreak,xp,gems}` | `401` |
| `POST /api/lessons/:lessonId/complete` | Implemented | Record lesson completion → `{lessonId,completedAt,xpEarned}` | `401`, `404`, `409` |
| `GET /api/learning/skill-baseline` | Implemented | Read level and confidence by skill → `{level,skills:[{skill,confidence,attempts}],source:"answers"|"placement"}`. Derived from recorded answers; a learner with no answers gets the latest placement attempt (level from `settings.startingLevel` when set). | `401`, `404` (no answers and no placement) |
| `GET /api/analytics/weekly` | Implemented | Weekly XP/activity chart → `{days:[...],summary}` | `401` |
| `GET /api/learning/evidence` | Implemented | Read can-do goals and attached samples → `{goals:[...]}` | `401` |
| `POST /api/learning/evidence` | Implemented | Attach a completed learning sample; `{goalId,kind,summary,reference?}` → `{evidence}` | `400`, `401`, `404` |
| `PATCH /api/learning/evidence/:evidenceId` | Implemented | Edit a learner-owned evidence sample; changed fields → `{evidence}` | `400`, `401`, `404` |
| `DELETE /api/learning/evidence/:evidenceId` | Implemented | Remove a learner-attached sample → `{deleted:true}` | `401`, `404` |
| `GET /api/missions/passport` | Implemented | Read mission passport and earned stamps → `{missions:[...]}` | `401` |
| `GET /api/missions/:missionId` | Implemented | Read curated mission instructions → `{mission}` | `404` |
| `POST /api/missions/:missionId/complete` | Implemented | Record completed mission evidence; progress is derived → `{completion}` | `400`, `401`, `404`, `409` |
| `GET /api/learning/misconceptions` | Implemented | Read recurring error patterns derived from answers → `{items:[...]}` | `401` |
| `PATCH /api/learning/misconceptions/:itemId` | Implemented | Dismiss/restore a learner's misconception card; `{dismissed}` → `{item}` | `400`, `401`, `404` |

Issue #27 implements core learning activity persistence. Private routes use the verified bearer session from issue #3 and return `401` without one. `GET /api/home` uses the first published course (enrollment-aware selection is still planned), XP/streak from completions, and the real gem balance from the wallet ledger. `GET /api/progress` returns the same derived gem balance.

The implemented course, unit, lesson, and learning-path reads are public curated content and do not require authentication. The course detail response is the course syllabus. Lesson responses omit exercise answer keys, correctness flags, and feedback explanations; those remain server-side until an answer is submitted.

## Planner and practice

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/practice` | Partial | Practice hub recommendations and due-item counts → `{suggestions,reviewDueCount}` | `401` |
| `GET /api/planner/entries` | Implemented | Read calendar/weekly plan → `{entries:[...]}` | `401` |
| `POST /api/planner/entries` | Implemented | Create a planned study session; `{date,time,durationMinutes,label?}` → `{entry}` | `400`, `401` |
| `GET /api/planner/entries/:entryId` | Implemented | Read one learner-owned session → `{entry}` | `401`, `404` |
| `PATCH /api/planner/entries/:entryId` | Implemented | Move or edit a learner-owned session; changed fields → `{entry}` | `400`, `401`, `404` |
| `DELETE /api/planner/entries/:entryId` | Implemented | Remove a learner-owned session → `{deleted:true}` | `401`, `404` |
| `GET /api/lessons/:lessonId/answers` | Implemented | Read the learner's immutable answer history for a lesson → `{answers:[...]}` | `401`, `404` |
| `POST /api/exercises/:exerciseId/answers` | Implemented | Submit choice, sentence tiles, transcript gap, dictation, or speaking/recording result; `{answer:{kind,...}}` → `{isCorrect,feedback,explanation?,score?,speakingScorecard?}` | `400`, `401`, `404` |
| `GET /api/exercises/:exerciseId/hints?step=` | Implemented | Return the next hint in the hint ladder → `{step,text}` | `400`, `404` |
| `GET /api/practice/review-items?kind=` | Partial | Read due vocabulary and recurring mistakes → `{items:[...]}` | `401` |
| `GET /api/practice/review-items/:itemId` | Partial | Read one saved review item → `{item}` | `401`, `404` |
| `POST /api/practice/review-items` | Partial | Create a learner-owned review item; `{front,back,kind?}` → `{item}` | `400`, `401` |
| `PATCH /api/practice/review-items/:itemId` | Partial | Edit a custom review item or dismiss a derived mistake; changed fields → `{item}` | `400`, `401`, `404` |
| `DELETE /api/practice/review-items/:itemId` | Partial | Delete a custom item or hide a derived mistake from this learner's queue → `{deleted:true}` | `401`, `404` |
| `POST /api/practice/review-items/:itemId/answers` | Partial | Record recall/review outcome and update schedule → `{result,nextReviewAt}` | `400`, `401`, `404` |
| `GET /api/study-tools` | Partial | List available curated study tools → `{tools:[...]}` | `401` |
| `GET /api/study-tools/:toolId` | Partial | Read curated audio/waveform, pronunciation, writing, vocabulary/word-map, grammar, conjugation, or city/café/transit content → `{tool}` | `401`, `404` |
| `GET /api/dictionary?query=` | Partial | Look up a selected word for the inline dictionary → `{entry}` | `400`, `401`, `404` |

Answer payloads use `{answer:{kind,...}}`: `choice` needs `optionId`; `sentence_tiles` needs `tokens`; `transcript_gap`/`dictation` need `text`; `matching` needs `pairs`; `speaking` needs a client-produced `transcript` and integer `score` from 0 to 100. Unknown fields, including raw audio, are rejected. Lesson completion requires at least one answer for every exercise. Its first response includes earned XP and `alreadyCompleted:false`; repeats return `xpEarned:0` and `alreadyCompleted:true`. Planner dates use `YYYY-MM-DD`, times use `HH:mm`, and durations are 1–480 minutes. Misconception cards appear after two incorrect answers for an exercise; dismiss/restore changes only the view state.

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

The practice branch implements deck/card CRUD, story reads, story bookmarks, and reading progress. Private routes use the bearer-session identity from issue #3 (`res.locals.userId`) and return `401` without a valid session. Custom review items and scheduling, deck import preview/import, basic study-tool metadata, a small local dictionary, and story-based recommendations are implemented. Mistake-derived review, word bookmarks, richer tool content, and story challenge answers remain planned; story challenge answers reuse issue #27.

The offline queue, audio recordings, transfer progress, storage limit, and downloaded files are device-local. The mobile app manages create/read/update/remove states locally; no server-side CRUD for device media/downloads is proposed.

## League, rewards, community, and notifications

### Rewards and achievements

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/leaderboard?scope=league\|friends` | Implemented | Rank by this week's XP (Monday 00:00 UTC). `league` (default): learners in the caller's tier; `friends`: the caller and accepted friends. Learners whose progress the caller may not see are left out. Top 50, plus the caller's own row when outside. → `{period:{startsAt,endsAt},scope,entries:[{rank,user,weeklyXp,isCurrentUser}]}` | `400`, `401` |
| `GET /api/leagues/current` | Implemented | Read tier, next tier, and promotion boundary → `{league:{tier,nextTier,totalXp,xpToNextTier,weeklyXp,rank,period}}` | `401` |
| `GET /api/quests` | Implemented | Read today's (UTC) quests and progress → `{period:{key,endsAt},quests:[{id,slug,title,metric,target,progress,rewardGems,status:"in_progress"\|"claimable"\|"claimed"}]}` | `401` |
| `POST /api/quests/:questId/claim` | Implemented | Claim a completed quest once per UTC day → `{reward:{gems,balance}}` | `400`, `401`, `404`, `409 QUEST_NOT_COMPLETE`, `409 ALREADY_CLAIMED` |
| `GET /api/achievements` | Implemented | Read achievement collection → `{achievements:[{id,slug,title,description,target,progress,earned,earnedAt}]}` | `401` |
| `GET /api/achievements/:achievementId` | Implemented | Read achievement detail (adds `metric`) → `{achievement}` | `400`, `401`, `404` |
| `GET /api/wallet` | Implemented | Read the derived gem balance and the newest 50 immutable transactions → `{balance,transactions:[{id,amount,reason,createdAt,quest,reward}]}` | `401` |
| `GET /api/rewards` | Implemented | Read active reward shop items → `{balance,rewards:[{id,slug,name,description,costGems,kind,fulfillment,affordable}]}` | `401` |
| `POST /api/rewards/:rewardId/redeem` | Implemented | Spend gems; `instant` rewards are `fulfilled`, `deferred` rewards stay `pending` → `201 {redemption,balance}` | `400`, `401`, `404`, `409 INSUFFICIENT_GEMS` |
| `GET /api/redemptions` | Implemented | Read own redemptions → `{redemptions:[{id,reward,costGems,status,createdAt,cancelledAt,cancellable}]}` | `401` |
| `DELETE /api/redemptions/:redemptionId` | Implemented | Cancel a `pending` redemption once and refund its gems → `{cancelled:true,balance}` | `400`, `401`, `404`, `409 NOT_CANCELLABLE` |

Quest, achievement, and reward definitions are curated seed data; wallet transactions are append-only (`quest_reward`, `redemption`, `refund`) and the balance is their sum. Learners cannot edit balances, claims, or awards. Spends and refunds take a per-learner lock, so parallel redemptions cannot overspend.

- **Tiers** are derived from lifetime lesson XP: Seedling 0, Sprout 15, Bloom 30, Grove 45, Forest 52. The thresholds are calibrated to the demo seed (four lessons worth 52 XP in total).
- **Quest metrics** are derived for the current UTC day: lessons completed, XP earned, review answers, and stories marked completed (a story counts when its reading progress is completed and was last saved today).
- **Achievements** are derived from lifetime totals (lessons, XP, streak, friends, groups joined, quests claimed). The first time a learner qualifies, `earnedAt` is recorded and stays stable.

### Friends

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/friends` | Implemented | Read accepted connections → `{friends:[{id,displayName,avatarUrl,friendsSince,progress\|null}]}` (`progress` is hidden when the friend's visibility is `private`) | `401` |
| `GET /api/users/search?q=` | Implemented | Find discoverable learners by display name, or by exact email; max 20; never lists the caller → `{users:[{id,displayName,avatarUrl,relationship}]}` | `400` (`q` 2–50 chars), `401` |
| `GET /api/users/:userId` | Implemented | Read a profile → `{user:{id,displayName,avatarUrl,bio,relationship,progress\|null,achievements\|null}}`. Visible to the learner, anyone with a friend-request relationship or shared group, or anyone when the target is `discoverable`. `progress` (`{totalXp,weeklyXp,currentStreak,tier}`) and earned achievements follow `progressVisibility`. | `400`, `401`, `403 PROFILE_PRIVATE`, `404` |
| `GET /api/friend-requests` | Implemented | Read pending requests in both directions plus the caller's own declined requests → `{requests:[{id,direction,status,user,createdAt,respondedAt}]}` | `401` |
| `POST /api/friend-requests` | Implemented | Send a request; `{userId}` → `201 {request}` and a notification for the addressee | `400 CANNOT_FRIEND_SELF`, `401`, `404`, `409 ALREADY_FRIENDS`, `409 REQUEST_PENDING`, `409 INCOMING_REQUEST_PENDING`, `409 REQUEST_DECLINED` |
| `PATCH /api/friend-requests/:requestId` | Implemented | Addressee accepts or declines; `{action:"accept"\|"decline"}` → `{request}`; acceptance notifies the requester | `400`, `401`, `404`, `409 REQUEST_NOT_PENDING` |
| `DELETE /api/friend-requests/:requestId` | Implemented | Requester cancels a pending request or clears a declined one → `{deleted:true}` | `400`, `401`, `404`, `409 USE_FRIEND_REMOVAL` |
| `DELETE /api/friends/:userId` | Implemented | Remove an accepted connection (either side) → `{removed:true}` | `400`, `401`, `404` |

`relationship` is one of `self`, `friends`, `outgoing`, `incoming`, `declined`, or `none`. Each pair of learners has at most one friend-request row; if the caller previously declined the other learner's request, sending a request reuses that row in the new direction.

### Study groups, posts, and challenges

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/study-groups?query=&topic=&mine=` | Implemented | Browse public groups and the caller's groups (`mine=true`: only the caller's) → `{groups:[{id,name,goal,topic,visibility,meetupAt,meetupNote,createdAt,memberCount,myRole}]}` | `400`, `401` |
| `POST /api/study-groups` | Implemented | Create a group owned by the caller; `{name (3–60),goal (≤200),topic (slug),visibility?:"public"\|"private"}` → `201 {group}` | `400`, `401` |
| `GET /api/study-groups/:groupId` | Implemented | Group overview with `memberCount`, `myRole`, meetup, challenge summary, and rooms (members only); non-members can preview public groups → `{group}` | `400`, `401`, `404` (missing, or private and not a member) |
| `PATCH /api/study-groups/:groupId` | Implemented | Owner edits `name`, `goal`, `topic`, `visibility`, `meetupAt\|null`, `meetupNote\|null`, or transfers ownership with `ownerId` (an existing member) → `{group}` | `400`, `400 NOT_A_MEMBER`, `401`, `403`, `404` |
| `DELETE /api/study-groups/:groupId` | Implemented | Owner deletes the group with its posts, challenge, rooms, tasks, and notes → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/members` | Implemented | Members read members/roles, owner first → `{members:[{id,displayName,avatarUrl,role,joinedAt}]}` | `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/membership` | Implemented | Join a public group → `201 {membership}` | `401`, `403 GROUP_PRIVATE`, `404`, `409 ALREADY_MEMBER` |
| `DELETE /api/study-groups/:groupId/membership` | Implemented | Leave group. Removes the learner's challenge and room participation and open-poll votes; hosted rooms go to the owner; authored content stays. An owner who is the only member deletes the group. → `{left:true}` | `401`, `404`, `409 OWNER_MUST_TRANSFER` |
| `GET /api/study-groups/:groupId/discussion?before=&limit=` | Implemented | Members read the feed, newest first → `{posts:[{id,body,author,commentCount,editedAt,createdAt,canEdit,canDelete}],nextBefore}` | `400`, `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/discussion` | Implemented | Create own post; `{body}` (1–2000) → `201 {post}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-groups/:groupId/discussion/:postId` | Implemented | Edit own post; `{body}` → `{post}` | `400`, `401`, `403 AUTHOR_ONLY`, `404` |
| `DELETE /api/study-groups/:groupId/discussion/:postId` | Implemented | Author or group owner deletes a post and its comments → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/discussion/:postId/comments?before=&limit=` | Implemented | Read post comments, newest first → `{comments:[...],nextBefore}` | `400`, `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/discussion/:postId/comments` | Implemented | Add own comment; `{body}` (1–1000) → `201 {comment}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-groups/:groupId/discussion/:postId/comments/:commentId` | Implemented | Edit own comment; `{body}` → `{comment}` | `400`, `401`, `403 AUTHOR_ONLY`, `404` |
| `DELETE /api/study-groups/:groupId/discussion/:postId/comments/:commentId` | Implemented | Author or group owner deletes a comment → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/challenge` | Implemented | Members read the challenge with derived progress → `{challenge:{id,title,metric,target,startsAt,endsAt,status,groupProgress,myProgress,joined,participants:[{...user,joinedAt,progress}]}}` | `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/challenge` | Implemented | Owner creates the group's single challenge; `{title (3–80),metric:"xp"\|"lessons",target (1–100000),startsAt,endsAt}` (at most 31 days) → `201 {challenge}` | `400`, `401`, `403`, `404`, `409 CHALLENGE_EXISTS` |
| `PATCH /api/study-groups/:groupId/challenge` | Implemented | Owner edits challenge fields; `metric` is fixed once learners have joined → `{challenge}` | `400`, `401`, `403`, `404`, `409 CHALLENGE_STARTED` |
| `DELETE /api/study-groups/:groupId/challenge` | Implemented | Owner deletes the challenge → `{deleted:true}` | `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/challenge/join` | Implemented | Member joins → `201 {participant}` | `401`, `403`, `404`, `409 ALREADY_JOINED`, `409 CHALLENGE_ENDED` |
| `DELETE /api/study-groups/:groupId/challenge/join` | Implemented | Leave a group challenge → `{left:true}` | `401`, `403`, `404` |

Challenge progress is derived from lesson XP or completed lessons inside the challenge window; it cannot be edited. Joining a challenge shares challenge progress with the group.

### Study rooms and shared activities

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `POST /api/study-groups/:groupId/rooms` | Implemented | Group owner creates a room and becomes host and first participant; `{name?,focus?,startsAt?}` → `201 {room}` | `400`, `401`, `403 OWNER_ONLY`, `404` |
| `GET /api/study-rooms/:roomId` | Implemented | Group members read the room → `{room:{id,groupId,name,focus,startsAt,closedAt,createdAt,host,isHost,joined,participants}}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-rooms/:roomId` | Implemented | Host edits `name`, `focus`, `startsAt`, or closes the room with `closed:true` (cannot be reopened) → `{room}` | `400`, `401`, `403 HOST_ONLY`, `404` |
| `DELETE /api/study-rooms/:roomId` | Implemented | Host deletes the room with its messages and polls → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `POST /api/study-rooms/:roomId/participants` | Implemented | Group member joins an open room → `201 {participant}` | `401`, `403`, `404`, `409 ALREADY_JOINED`, `409 ROOM_CLOSED` |
| `DELETE /api/study-rooms/:roomId/participants/me` | Implemented | Leave a study room → `{left:true}` | `401`, `403`, `404`, `409 HOST_CANNOT_LEAVE` |
| `GET /api/study-rooms/:roomId/messages?before=&limit=` | Implemented | Group members read messages, newest first → `{messages:[{id,body,author,replyTo:{id,author,excerpt}\|null,editedAt,createdAt,canEdit,canDelete}],nextBefore}` | `400`, `401`, `403`, `404` |
| `POST /api/study-rooms/:roomId/messages` | Implemented | Participants send or reply in an open room; `{body (1–1000),replyToId?}` → `201 {message}` | `400`, `401`, `403 NOT_PARTICIPANT`, `404`, `409 ROOM_CLOSED` |
| `PATCH /api/study-rooms/:roomId/messages/:messageId` | Implemented | Edit own message while the room is open → `{message}` | `400`, `401`, `403 AUTHOR_ONLY`, `404`, `409` |
| `DELETE /api/study-rooms/:roomId/messages/:messageId` | Implemented | Author or host deletes a message; replies keep their text → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `GET /api/study-rooms/:roomId/polls` | Implemented | Read polls with counts and own vote → `{polls:[{id,question,closed,closedAt,createdAt,choices:[{id,label,voteCount}],totalVotes,myChoiceId}]}` | `400`, `401`, `403`, `404` |
| `POST /api/study-rooms/:roomId/polls` | Implemented | Host creates a poll in an open room; `{question (3–200),choices:[2–6 unique labels]}` → `201 {poll}` | `400`, `401`, `403 HOST_ONLY`, `404`, `409` |
| `PATCH /api/study-rooms/:roomId/polls/:pollId` | Implemented | Host edits `question`, replaces `choices` (only before any vote), or closes with `closed:true` → `{poll}` | `400`, `401`, `403`, `404`, `409 POLL_HAS_VOTES` |
| `DELETE /api/study-rooms/:roomId/polls/:pollId` | Implemented | Host deletes a poll → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `POST /api/study-rooms/:roomId/polls/:pollId/votes` | Implemented | Group member votes; `{choiceId}` → `201 {voteCount,selectedChoice}` (`voteCount` is the poll total) | `400`, `401`, `403`, `404`, `409 ALREADY_VOTED`, `409 POLL_CLOSED` |
| `PATCH /api/study-rooms/:roomId/polls/:pollId/votes/me` | Implemented | Change own vote while open; `{choiceId}` → `{voteCount,selectedChoice}` | `400`, `401`, `403`, `404`, `409 POLL_CLOSED` |
| `DELETE /api/study-rooms/:roomId/polls/:pollId/votes/me` | Implemented | Withdraw own vote while the poll is open → `{deleted:true}` | `401`, `403`, `404`, `409 POLL_CLOSED` |
| `GET /api/peer-reviews?submissionId=` | Implemented | Read a curated sample for review; without `submissionId`, the first one the caller hasn't commented on → `{submission:{id,title,prompt,body,authorLabel,comments}, remaining}` | `400`, `401`, `404` |
| `POST /api/peer-reviews/:submissionId/comments` | Implemented | Submit own review comment; `{body}` (1–1000) → `201 {comment}` | `400`, `401`, `404` |
| `PATCH /api/peer-reviews/:submissionId/comments/:commentId` | Implemented | Edit own review comment → `{comment}` | `400`, `401`, `403 AUTHOR_ONLY`, `404` |
| `DELETE /api/peer-reviews/:submissionId/comments/:commentId` | Implemented | Delete own review comment → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/plan/tasks` | Implemented | Members read tasks by lane (`todo`, `doing`, `done`) and order → `{tasks:[{id,title,lane,order,createdBy,createdAt,updatedAt,canEdit,canDelete}]}` | `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/plan/tasks` | Implemented | Add a task; `{title (1–120),lane?}` → `201 {task}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-groups/:groupId/plan/tasks/:taskId` | Implemented | Any member moves a task (`lane`, `order`); renaming needs its creator or the owner → `{task}` | `400`, `401`, `403 AUTHOR_ONLY`, `404` |
| `DELETE /api/study-groups/:groupId/plan/tasks/:taskId` | Implemented | Creator or owner removes a task → `{deleted:true}` | `400`, `401`, `403`, `404` |
| `GET /api/study-groups/:groupId/whiteboard/notes` | Implemented | Members read shared notes → `{notes:[{id,text,x,y,color,author,createdAt,updatedAt,canEdit,canDelete}]}` | `401`, `403`, `404` |
| `POST /api/study-groups/:groupId/whiteboard/notes` | Implemented | Add a note; `{text (1–280),x?,y? (0–4000),color?:"yellow"\|"green"\|"blue"\|"pink"}` → `201 {note}` | `400`, `401`, `403`, `404` |
| `PATCH /api/study-groups/:groupId/whiteboard/notes/:noteId` | Implemented | Edit/move own note (`text`, `x`, `y`, `color`) → `{note}` | `400`, `401`, `403 AUTHOR_ONLY`, `404` |
| `DELETE /api/study-groups/:groupId/whiteboard/notes/:noteId` | Implemented | Author or owner removes a note → `{deleted:true}` | `400`, `401`, `403`, `404` |

Group, room, challenge, and poll administration requires the relevant owner/host role. Members may change only their own records; `canEdit`/`canDelete`/`myRole`/`isHost` in responses tell mobile which controls to show. Private groups return `404` to non-members; public groups return `403 NOT_A_MEMBER` for member-only actions. There is no real-time delivery: mobile refreshes room messages and polls by request.

### Notifications

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/notifications?unread=&before=&limit=` | Implemented | Read notifications, newest first, and the unread count → `{notifications:[{id,type,title,body,data,read,createdAt}],unreadCount,nextBefore}` | `400`, `401` |
| `PATCH /api/notifications/read-all` | Implemented | Mark all notifications read → `{updatedCount}` | `401` |
| `PATCH /api/notifications/:notificationId` | Implemented | Mark one notification read/unread; `{read}` → `{notification}` | `400`, `401`, `404` |
| `DELETE /api/notifications/:notificationId` | Implemented | Delete one own notification → `{deleted:true}` | `400`, `401`, `404` |
| `DELETE /api/notifications` | Implemented | Clear own notification list → `{deletedCount}` | `401` |

Notifications are system-created; clients can read, update read state, and delete them. Types: `friend_request_received`, `friend_request_accepted`, `reward_earned` (quest claim), `reward_redeemed`, and `study_reminder`. They respect `notifyFriendRequests`, `notifyRewards`, and `notifyReminders`. Study reminders need no scheduler: when the learner reads notifications after `reminderTime` on a reminder day (in their `timezone`) without a lesson completed that day, one reminder is created for that date. Cancelling a pending friend request removes the addressee's unread request notification.

Cursor lists (`discussion`, `comments`, `messages`, `notifications`) accept `?before=<ISO date-time>&limit=` (default 20, max 50) and return `nextBefore` for the next page, or `null` at the end.

## Help and support

| Method / path | Status | Purpose; request → response | Errors |
| --- | --- | --- | --- |
| `GET /api/help/articles?category=` | Implemented | Read FAQ/help topics → `{articles:[...]}` | `400`, `500` |
| `GET /api/support/requests` | Partial | Read the learner's own support requests → `{requests:[...]}` | `401` |
| `POST /api/support/requests` | Partial | Create a request; `{message,screenshot?,deviceDetails}` → `{request}` | `400`, `401`, `413` |
| `PATCH /api/support/requests/:requestId` | Partial | Edit an open request → `{request}` | `400`, `401`, `403`, `404`, `409` |
| `DELETE /api/support/requests/:requestId` | Partial | Cancel/delete an open request → `{deleted:true}` | `401`, `403`, `404`, `409` |

Help articles remain curated/read-only. Support requests can be changed only while open; this local demo stores a request record and does not require an external ticketing service.

The support/export routes use the bearer-session identity from issue #3 (`res.locals.userId`) and return `401` without a valid session. Export downloads currently contain the public `User` fields and support requests (never credential columns); extend the payload as other learner-owned models are implemented.

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
