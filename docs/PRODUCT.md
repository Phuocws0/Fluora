# Product Overview

Fluora is a mobile language-learning app with a guided course path, focused practice, progress feedback, and optional community and tutor experiences. This document records the product scope shown in the selected Figma prototype; it does not claim that any feature is implemented. See [FIGMA.md](FIGMA.md) for the screen inventory and draft distinction.

## Approximate core journey

```text
Splash / Welcome
↓
Choose course language · Login / Register
↓
Onboarding preferences · Optional placement
↓
Learning Home
↓
Course → Unit → Lesson → Exercise
↓
Result / Feedback → Progress
```

The prototype also includes verification and password recovery, while onboarding captures motivation, starting level, daily goal, and study reminders. Authentication and onboarding order can follow the selected prototype flow.

```text
Learning Home
├── Learn: courses, units, lessons, study tools
├── Practice: vocabulary, stories, review, downloads
├── Tutor: Flo AI Tutor
├── League: leaderboard, friends, groups, quests, rewards
└── Profile: learner profile, analytics, settings
```

The prototype footer has five tabs in this order: **Learn, Practice, Tutor, League, Profile**. Community and rewards are destinations within those flows, not separate bottom tabs.

## Selected product areas

### Account and onboarding

- Splash/welcome; choose course language and app language.
- Register, sign in (including the designed Google option), verify email, sign out, recover/reset password, and view account security and signed-in sessions.
- Set learning motivation, starting level, daily goal, reminders, app preferences, and optional placement/skill baseline.
- Handle validation, sign-in, reset, and connection states.

### Learning paths and lessons

- Learning Home, continue-learning path, course catalog/detail, unit catalog/detail, and enrollment/selection.
- Compare learning paths, browse a career-focused syllabus, and search/filter lessons by query, skill/topic, level, or duration.
- Review placement/skill baseline, confidence by skill, weekly schedule, analytics, and demonstrated goals with learning evidence.
- Lessons support sentence building, listening choices, fill-in-the-gap, vocabulary matching, speaking, pronunciation feedback, and story challenges. Correct/incorrect answers, hints, progress, completion, and celebrations are states in the lesson/practice flow.

### Practice, reading, and vocabulary

- Practice hub, vocabulary sets, flashcards, spaced review, mistake review/error notebook, and learning calendar.
- Listening/dictation, pronunciation and phoneme practice, playback controls, conversation audio, writing/revision feedback, grammar reference, verb practice, inline dictionary, word maps/families/collocations, and reading paths.
- Story library/reader and saved reading progress/bookmarks; applied-language missions include city directions, café ordering, and transit planning.
- The vocabulary deck editor shows an editable deck name/cards and importing a mapped word list after preview. The API proposes full CRUD for learner-owned decks/cards, but explicit create/delete controls are not shown in the current frames and need confirmation. Course content remains curated/read-only in the learner UI.
- Offline downloads have queue, progress, ready, and completion states. The design also shows low-bandwidth settings and a connection-error fallback.

### Progress, motivation, and rewards

- Lesson/course progress, XP, streaks, calendar activity, weekly analytics, quests, and achievement collection/detail.
- Leaderboard and league standings; a reward shop, gem balance, reward redemption, and quest reward feedback.
- Progress, XP, quest completion, streaks, and achievements are earned/derived from learning activity rather than edited as arbitrary profile fields.

### Community

- Find friends, view friend profiles, and send a friend request. The prototype shows a sent state; acceptance/decline and removing an existing connection need a confirmed control before implementation.
- Browse study groups and view group overview/discussion and shared challenge progress. Join/leave controls are not explicit in the reviewed frames and need confirmation before implementation.
- Designed collaborative activities include study rooms, live polls, peer review, a group task plan, and a shared whiteboard. Keep their actions aligned with controls actually shown in the relevant design.
- Notifications cover friend requests, rewards, and reminders. Privacy settings control who can see progress and whether voice samples or AI chats are shared/stored.

### Profile, settings, and help

- View/edit profile name, photo, and bio; choose a Flo companion; inspect analytics and can-do evidence.
- Update daily goals, reminders, app language, accessibility (text size, reduced motion, captions), privacy/data permissions, low-bandwidth options, and wellbeing timer.
- Help center and support request with an optional screenshot and device details; view the submission confirmation.
- Review account security/sessions, change password, sign out, and request a personal data export. The reviewed design does not show account deletion; do not invent that action as part of the initial contract.

### Flo AI Tutor

- Ask grammar/vocabulary questions, get an explanation for an answer or mistake, compose a prompt with context, and practice a selected role-play.
- View private chat history, save tutor notes, add a personal example, control chat-saving privacy, and clear chat history with confirmation.
- Tutor hints and connection/error states support an existing lesson or chat; they do not require a new route for every hint or response.

## Scope boundary

The selected Page 09 release inventory is the baseline. Page 10 supplies alternate states and selected interaction detail; its audit also identifies unselected draft concepts. See [FIGMA.md](FIGMA.md) before treating a draft as approved product scope. The product areas describe user-facing behavior, not one route per Figma frame or a requirement to build every feature in a single implementation pass.
