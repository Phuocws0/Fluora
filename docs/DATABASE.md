# Database Model

This document separates the current Prisma model from the conceptual model for the selected Figma features. `backend/prisma/schema.prisma` is the implementation source of truth; the concepts below are not a required one-table-per-feature schema.

## Current implementation

The schema contains `User` plus the curated learning-content models `Course`, `Unit`, `Lesson`, `Exercise`, `ExerciseOption`, and `LearningPath`. The initial account migration and the learning-content migration are checked in. The seed command creates one sample English course, two ordered units, four lessons with representative exercise modes, and two learning paths for comparison. Passwords, sessions, enrollments, learner answers, and progress are not implemented yet.

## Account and preferences

- **users:** Account identity and learner profile (display name, bio, avatar reference, verification state).
- **user_settings:** App/course language, onboarding goals/level, daily target/time budget, learning promise, reminders, Flo companion, accessibility/text size, focus mode, privacy, low-bandwidth, wellbeing, and tutor-history preferences.
- **sessions:** Active device sign-ins that can be reviewed and revoked.
- **data_export_requests:** Owner, request time, status, and expiry for user-initiated export previews/downloads.

```text
User
 ├── UserSettings
 └── Session
```

Password reset/verification tokens should be short-lived auth data; exact persistence belongs in the implementation design and should avoid storing raw credentials/tokens.

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

- **vocabulary_sets:** Curated read-only decks or learner-owned decks with full CRUD for owner-created sets.
- **vocabulary_cards:** Front/back terms, tags, and optional examples within a deck.
- **bookmarks:** Learner bookmarks for vocabulary or stories, with optional editable note/tag.
- **reading_progress:** Current position/completion for a story.
- **review_items / review_schedule:** Learner-created review items and schedules; mistake-derived entries remain linked to immutable answer history.
- **offline downloads:** Device-local files, queue, and progress. Do not store downloaded binary content in PostgreSQL for the local demo.

```text
User ── VocabularySet ── VocabularyCard
  ├── Bookmark → word or story
  ├── ReadingProgress ── Story
  └── ReviewSchedule ── VocabularyCard / UserAnswer
```

Learner-owned decks/cards, bookmarks, reading position, review items, and planner entries support the CRUD operations documented in `API.md`.

## Community, rewards, and help

- **friend_requests / friendships:** Pending connection requests and accepted learner relationships.
- **study_groups / group_memberships:** Learner-created/owned groups, group membership, role, and lifecycle state.
- **group_challenges / challenge_participants:** Group-owned challenge details and member participation; completion is derived from learning activity.
- **group_posts / group_comments:** Group discussion posts and comments with author ownership and edit/delete timestamps.
- **study_rooms / room_messages:** Group-managed rooms and member messages/replies; members can edit/delete their own messages.
- **polls / poll_votes:** Host-managed poll definitions and participant votes that can be changed or withdrawn while open.
- **peer_reviews:** Review assignment and learner-owned feedback comments.
- **group_plan_tasks:** Shared tasks and their board lane/status.
- **whiteboard_notes:** Shared note text/position and author.
- **notifications:** Friend-request, quest, and reminder items with read state.
- **quests / user_quest_progress:** Quest definitions and a learner's completion/claim state.
- **achievements / user_achievements:** Achievement definitions and earned status.
- **wallet_transactions / reward_redemptions:** Gem balance changes and redeemed rewards; treat balance as derived from transactions where practical.
- **support_requests:** Learner-owned drafts/submissions, optional screenshot reference, device details, and response status; edits/cancellation are limited to open requests.

```text
User ├── FriendRequest / Friendship
     ├── GroupMembership ── StudyGroup ── GroupPlanTask / WhiteboardNote
     ├── RoomMessage / PollVote / PeerReview
     ├── Notification
     ├── GroupPost / GroupComment
     ├── QuestProgress / UserAchievement
     ├── WalletTransaction / RewardRedemption
     └── SupportRequest
```

The product owner has approved the missing learner CRUD actions for this local demo. Keep group ownership/roles explicit. Notification records are system-created and user-deletable; groups and posts are user/group-managed rather than admin content. Account deletion removes the user's own data after confirmation.

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
