# Database Model

This document separates the current Prisma model from the conceptual model for the selected Figma features. `backend/prisma/schema.prisma` is the implementation source of truth; the concepts below are not a required one-table-per-feature schema.

## Current implementation

The schema contains `User`; identity models (`Session`, `AuthToken`, `UserSettings`, `PlacementAttempt`); curated learning content (`Course`, `Unit`, `Lesson`, `Exercise`, `ExerciseOption`, `LearningPath`); support/export and practice models; learner activity models (`UserAnswer`, `LessonCompletion`, `PlannerEntry`, `CanDoGoal`, `LearningEvidence`, `Mission`, `MissionCompletion`, `MisconceptionState`); and community, League, and rewards models (listed under "Community, rewards, and help"). Checked-in migrations cover these models. The seed command creates one English course with two units and four lessons (52 XP in total), two learning paths, one dialogue, two can-do goals, one mission, four daily quests, six achievements, four rewards, two peer-review samples, and three password-less demo learners (`demo.*@fluora.local`) with lesson completions in the current week.

Scrypt password hashes, bearer sessions, settings, placement attempts, and single-use verification/reset tokens are implemented. Exercise answers and lesson completions are persisted; progress, analytics, League tiers, quest progress, achievements, and the gem balance are derived from source records.

## Account and preferences

- **users:** Account identity and learner profile: display name, bio, avatar URL, verification time, an optional scrypt `passwordHash` (absent for Google-only accounts), and an optional unique `googleSubject`.
- **user_settings:** One row per user, keyed by `userId`. It holds app/course language, onboarding goals/level, daily target/time budget, learning promise, reminders, Flo companion, accessibility/text size, focus mode, privacy, low-bandwidth, wellbeing, tutor-history preferences, and onboarding completion time.
- **sessions:** Active device sign-ins with a SHA-256 token hash, device name, user agent, last use, and expiry. Learners can review and revoke them.
- **auth_tokens:** Single-use email-verification and password-reset tokens (`purpose`), stored only as SHA-256 hashes with expiry and use time.
- **placement_attempts:** Submitted placement answers, question-set version, suggested level, and skill baseline.
- **data_export_requests:** Owner, request time, status, and expiry for user-initiated export previews/downloads. The local demo assembles JSON from current owned records on download instead of copying those records into an export table.

```text
User
 ├── UserSettings
 ├── Session
 ├── AuthToken
 └── PlacementAttempt
```

Every user-owned model uses `onDelete: Cascade` to `User`, so account deletion removes only that learner's records. Password hashes, token hashes, and `googleSubject` must never appear in API responses or data exports.

## Curated learning content

```text
Course
  └── Unit
       └── Lesson
            └── Exercise
                 └── ExerciseOption

LearningPath
  └── Course
```

- **courses:** Curated course title, language, level, and estimated workload.
- **units:** Ordered course sections.
- **lessons:** Learning sessions in a unit.
- **learning_paths:** Curated path metadata, career goal, estimated workload, level, outcomes, and linked course. Multiple paths can point to the same course while presenting different goals for comparison.
- **exercises:** Ordered lesson prompts. A shared `type` and JSON content/answer key support modes such as sentence tiles, transcript gaps, speaking, and matching without a table per exercise frame.
- **exercise_options:** Ordered choices for supported choice exercises. Correctness flags and exercise answer keys are excluded from learner-facing lesson reads.
- **stories:** Curated story/article/dialogue content, comprehension structures, and story challenges.
- **Study-tool and dictionary content:** Keep reference material and tool configuration with curated lesson/content data where practical; a separate table is not implied by each tool screen.

The learner UI reads these definitions; content-management CRUD is outside the learner app scope.

## Learner progress and planning

- **enrollments:** Courses/paths selected by a learner.
- **placement_attempts:** Placement answers and the resulting suggested starting level/skill baseline.
- **user_answers:** Submitted exercise results and feedback-relevant data.
- **user_progress:** Lesson/course completion, XP, and current progress.
- **streaks:** Derived/recorded learning activity streak.
- **planner_entries:** Learner's planned calendar sessions.
- **learning_evidence:** Samples attached to a can-do goal.
- **missions / user_mission_progress:** Curated mission definitions and completed passport stamps.
- **misconceptions:** Derivable categories from repeated answer mistakes; learner dismissal state may be stored separately.
- **weekly analytics:** Prefer deriving from answers/completions; persist snapshots only if a real use case requires it.

```text
User
 ├── Enrollment ── Course
 ├── PlacementAttempt
 ├── UserAnswer ── Exercise
 ├── UserProgress ── Lesson / Course
 ├── PlannerEntry
 ├── LearningEvidence
 └── Streak
```

## Practice data

- **vocabulary_sets:** Learner-owned decks with full CRUD.
- **vocabulary_cards:** Front/back terms, tags, and optional examples within a deck.
- **bookmarks:** Learner bookmarks for vocabulary or stories, with optional editable note/tag.
- **reading_progress:** Current position/completion for a story.
- **review_items:** Learner-created custom review items and persisted schedules for reviewed mistakes. Mistake entries reference their source exercise; recurring mistakes are derived from the learner's append-only `user_answers` and can be dismissed through `misconception_states`.
- **review_outcomes:** Append-only correct/incorrect outcomes linked to a review item. The current next-review time is stored on `review_items`.
- **offline downloads:** Device-local files, queue, and progress. Do not store downloaded binary content in PostgreSQL for the local demo.

```text
User ── VocabularySet ── VocabularyCard
  ├── Bookmark → word or story
  ├── ReadingProgress ── Story
  └── ReviewItem ── ReviewOutcome
             └── optional source Exercise ← UserAnswer
```

Learner-owned decks/cards, bookmarks, reading position, review items, and planner entries support the CRUD operations documented in `API.md`.

## Community, rewards, and help

Implemented models (table names in parentheses):

- **FriendRequest** (`friend_requests`): one row per learner pair, keyed by a unique `pairKey` (smaller UUID first). Status `pending`, `accepted`, or `declined`; an accepted request is the friendship.
- **Notification** (`notifications`): system-created items with `type`, `title`, `body`, JSON `data`, `readAt`, and a `dedupeKey` unique per user, so the same event never notifies twice.
- **StudyGroup / GroupMembership** (`study_groups`, `group_memberships`): learner-created groups with `visibility`, topic, and meetup fields; membership `role` is `owner` (exactly one) or `member`.
- **GroupPost / GroupComment** (`group_posts`, `group_comments`): discussion with author ownership and `editedAt`.
- **GroupChallenge / ChallengeParticipant** (`group_challenges`, `challenge_participants`): one challenge per group (`metric` `xp` or `lessons`, `target`, time window) and its participants. Progress is derived from `LessonCompletion`.
- **StudyRoom / RoomParticipant / RoomMessage** (`study_rooms`, `room_participants`, `room_messages`): rooms hosted by a member (`hostId`), closable once (`closedAt`); messages can reply to another message in the same room.
- **Poll / PollChoice / PollVote** (`polls`, `poll_choices`, `poll_votes`): host-managed polls; one vote per learner per poll, changeable or withdrawable while open.
- **PeerReviewSubmission / PeerReviewComment** (`peer_review_submissions`, `peer_review_comments`): curated sample writing and learner-owned review comments.
- **GroupPlanTask** (`group_plan_tasks`): shared tasks with `lane` (`todo`, `doing`, `done`) and `order`.
- **WhiteboardNote** (`whiteboard_notes`): shared sticky notes with text, `x`/`y` position, color, and author.
- **Quest / QuestClaim** (`quests`, `quest_claims`): curated daily quests; a claim is unique per `(user, quest, periodKey)`, where `periodKey` is the UTC date.
- **Achievement / UserAchievement** (`achievements`, `user_achievements`): curated definitions; a row records the first time a learner qualified (`earnedAt`).
- **Reward / RewardRedemption** (`rewards`, `reward_redemptions`): curated shop items (`instant` or `deferred` fulfillment) and redemptions (`fulfilled`, `pending`, `cancelled`) with the cost snapshot.
- **WalletTransaction** (`wallet_transactions`): append-only gem ledger (`quest_reward`, `redemption`, `refund`). The balance is `SUM(amount)`; a redemption has at most one charge and one refund (`@@unique([redemptionId, reason])`).
- **support_requests:** Learner-owned drafts/submissions, optional screenshot reference, device details, and response status; edits/cancellation are limited to open requests.

```text
User ├── FriendRequest (requester / addressee)
     ├── Notification
     ├── GroupMembership ── StudyGroup ── GroupPost ── GroupComment
     │                        ├── GroupChallenge ── ChallengeParticipant
     │                        ├── StudyRoom ── RoomParticipant / RoomMessage / Poll ── PollChoice / PollVote
     │                        └── GroupPlanTask / WhiteboardNote
     ├── PeerReviewComment ── PeerReviewSubmission
     ├── QuestClaim ── Quest
     ├── UserAchievement ── Achievement
     ├── RewardRedemption ── Reward
     ├── WalletTransaction → QuestClaim / RewardRedemption
     └── SupportRequest
```

Integrity rules:

- Every relation to `User` uses `onDelete: Cascade`, so deleting an account removes only that learner's rows. Before the delete, the account-deletion service hands each owned group to its earliest-joined other member (or deletes the group when it has no other members) and gives hosted rooms to the group's owner.
- Curated parents (`Quest`, `Achievement`, `Reward`) use `onDelete: Restrict`, so a seed change can't silently delete earned history.
- `WalletTransaction` links to its claim or redemption use `onDelete: NoAction`. PostgreSQL checks `NO ACTION` at the end of the statement, so an account-deletion cascade can remove the claim, redemption, and transactions together, while deleting a referenced claim or redemption on its own fails.
- No API path updates or deletes `WalletTransaction` or `QuestClaim` rows; a cancellation appends a refund.

The product owner has approved the missing learner CRUD actions for this local demo. Notification records are system-created and user-deletable; groups and posts are user/group-managed rather than admin content.

## Flo AI Tutor

- **tutor_conversations:** A saved tutor chat or role-play session, subject to the learner's chat-saving preference.
- **tutor_messages:** Learner and tutor messages associated with a conversation.
- **tutor_notes:** Saved phrase/pattern and the learner's optional personal example.
- **role-play scenarios:** Curated branching prompts/turns; response feedback is attached to tutor messages and answer context.

```text
User ── TutorConversation ── TutorMessage
  └── TutorNote ── optional source conversation
```

Clearing chat history should remove the learner's conversation data according to the chosen privacy behavior. Do not retain transcripts or voice samples beyond the documented user preference.

## Modeling guidance

- Keep the model proportional to the local demo; combine small settings values where appropriate.
- Prefer deriving analytics, progress totals, achievement status, and wallet balance from their source activity/transactions when practical.
- Keep user-owned records associated with their owner and enforce ownership in service/API behavior.
- Keep submitted answers, reward transactions, and completion events append-only; derive progress, misconception maps, XP, and wallet balances instead of allowing arbitrary edits.
- Do not create separate tables for each exercise type, screen, UI state, or draft Figma frame.
- Keep study-tool and dictionary content in the existing curated-content model unless implementation demonstrates a need for separate storage.
- Reconcile this model with the real `schema.prisma` before implementation; document actual relationships rather than forcing this proposal onto the schema.
