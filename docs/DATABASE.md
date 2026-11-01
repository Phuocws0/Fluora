# Database Model

This document separates the current Prisma model from the conceptual model for the selected Figma features. `backend/prisma/schema.prisma` is the implementation source of truth; the concepts below are not a required one-table-per-feature schema.

## Current implementation

The initial schema contains only `User` with a UUID, unique email, optional display name, and creation/update timestamps. Its first migration is checked in. Passwords, sessions, settings, and learner-domain data are not implemented yet. Extend the actual schema with the first feature slice instead of treating the conceptual model below as an existing database.

## Account and preferences

- **users:** Account identity and learner profile (display name, bio, avatar reference, verification state).
- **user_settings:** App/course language, onboarding goals/level, daily target, reminders, Flo companion, accessibility, privacy, low-bandwidth, wellbeing, and tutor-history preferences.
- **sessions:** Active device sign-ins that can be reviewed and revoked.

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
```

- **courses:** Learner-facing courses and learning paths.
- **units:** Ordered course sections.
- **lessons:** Learning sessions in a unit.
- **exercises:** Lesson prompts, including listening, speaking, writing, vocabulary, grammar, and story activities.
- **exercise_options:** Options for choice/matching exercises.
- **stories:** Curated reading content and story challenges.
- **Study-tool and dictionary content:** Keep reference material and tool configuration with curated lesson/content data where practical; a separate table is not implied by each tool screen.

The learner UI reads these definitions; content-management CRUD is outside the reviewed Figma scope.

## Learner progress and planning

- **enrollments:** Courses/paths selected by a learner.
- **placement_attempts:** Placement answers and the resulting suggested starting level/skill baseline.
- **user_answers:** Submitted exercise results and feedback-relevant data.
- **user_progress:** Lesson/course completion, XP, and current progress.
- **streaks:** Derived/recorded learning activity streak.
- **planner_entries:** Learner's planned calendar sessions.
- **learning_evidence:** Samples attached to a can-do goal.
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

- **vocabulary_sets:** Curated or learner-owned decks.
- **vocabulary_cards:** Front/back terms, tags, and optional examples within a deck.
- **bookmarks:** Learner bookmarks for vocabulary or stories.
- **reading_progress:** Current position/completion for a story.
- **review_items / review_schedule:** Due vocabulary and recurring mistakes; derive from answers where practical.
- **offline downloads:** Device-local files, queue, and progress. Do not store downloaded binary content in PostgreSQL for the local demo.

```text
User ── VocabularySet ── VocabularyCard
  ├── Bookmark → word or story
  ├── ReadingProgress ── Story
  └── ReviewSchedule ── VocabularyCard / UserAnswer
```

The custom deck editor/import screens support learner-owned vocabulary data. The prototype does not show every create/delete affordance; confirm controls before treating every proposed CRUD action as final.

## Community, rewards, and help

- **friend_requests / friendships:** Pending connection requests and accepted learner relationships.
- **study_groups / group_memberships:** Group directory and learner membership.
- **group_posts:** The selected discussion frame is a feed without a compose control; keep its learner write behavior out of the initial model unless the UI is clarified.
- **study_rooms / room_messages:** Room participation and the visible live message/reply interaction.
- **polls / poll_votes:** Choices and a learner's vote in a room poll.
- **peer_reviews:** Review assignment and submitted feedback comment.
- **group_plan_tasks:** Shared tasks and their board lane/status.
- **whiteboard_notes:** Shared note text/position and author.
- **notifications:** Friend-request, quest, and reminder items with read state.
- **quests / user_quest_progress:** Quest definitions and a learner's completion/claim state.
- **achievements / user_achievements:** Achievement definitions and earned status.
- **wallet_transactions / reward_redemptions:** Gem balance changes and redeemed rewards; treat balance as derived from transactions where practical.
- **support_requests:** Learner-submitted issue, optional screenshot reference, device details, and response status.

```text
User ├── FriendRequest / Friendship
     ├── GroupMembership ── StudyGroup ── GroupPlanTask / WhiteboardNote
     ├── RoomMessage / PollVote / PeerReview
     ├── Notification
     ├── QuestProgress / UserAchievement
     ├── WalletTransaction / RewardRedemption
     └── SupportRequest
```

Study-group creation, discussion-post editing/deletion, notification deletion, and account deletion are not shown as learner actions in the reviewed prototype; do not add them to the schema without confirming product behavior.

## Flo AI Tutor

- **tutor_conversations:** A saved tutor chat or role-play session, subject to the learner's chat-saving preference.
- **tutor_messages:** Learner and tutor messages associated with a conversation.
- **tutor_notes:** Saved phrase/pattern and the learner's optional personal example.

```text
User ── TutorConversation ── TutorMessage
  └── TutorNote ── optional source conversation
```

Clearing chat history should remove the learner's conversation data according to the chosen privacy behavior. Do not retain transcripts or voice samples beyond the documented user preference.

## Modeling guidance

- Keep the model proportional to the local demo; combine small settings values where appropriate.
- Prefer deriving analytics, progress totals, achievement status, and wallet balance from their source activity/transactions when practical.
- Keep user-owned records associated with their owner and enforce ownership in service/API behavior.
- Do not create separate tables for each exercise type, screen, UI state, or draft Figma frame.
- Keep study-tool and dictionary content in the existing curated-content model unless implementation demonstrates a need for separate storage.
- Reconcile this model with the real `schema.prisma` before implementation; document actual relationships rather than forcing this proposal onto the schema.
