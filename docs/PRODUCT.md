# Product Overview

Fluora is a mobile language-learning app with a guided course path, focused practice, progress feedback, and optional community and tutor experiences. This document records the Page 09 scope plus 17 Page 10 concepts explicitly promoted into planned scope by the product owner; it does not claim that any feature is implemented. See [FIGMA.md](FIGMA.md) for the screen inventory and remaining draft boundary.

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
- Set learning motivation, starting level, daily goal, reminders, a daily time budget, a learning promise, app preferences, and optional placement/skill baseline.
- Handle validation, sign-in, reset, and connection states.

### Learning paths and lessons

- Learning Home, continue-learning path, course catalog/detail, unit catalog/detail, and enrollment/selection.
- Compare learning paths, browse a career-focused syllabus, and search/filter lessons by query, skill/topic, level, or duration.
- Review placement/skill baseline, confidence by skill, weekly schedule, analytics, and demonstrated goals with learning evidence.
- Lessons support sentence building/tiles, listening choices, transcript gaps, vocabulary matching, speaking, pronunciation feedback, waveform playback, audio-only sessions, local recording practice with a speaking scorecard, and story challenges. Correct/incorrect answers, hints, progress, completion, and celebrations are states in the lesson/practice flow.
- The mission passport summarizes completed learning missions; the misconception map groups recurring errors from submitted answers. Both are derived views, not editable score records.

### Practice, reading, and vocabulary

- Practice hub, vocabulary sets, flashcards, spaced review, mistake review/error notebook, and learning calendar.
- Listening/dictation, waveform playback, transcript gaps, local recording practice and speaking scorecards, pronunciation and phoneme practice, playback controls, conversation audio, writing/revision feedback, grammar reference, verb practice, inline dictionary, word maps/families/collocations, and reading paths.
- Story library, article reader, comprehension tree, dialogue comic, saved reading progress/bookmarks; applied-language missions include city directions, café ordering, and transit planning.
- Learners can create, read, edit, and delete their own vocabulary decks/cards; import still uses preview and validation. Course and reference content remains curated/read-only in the learner UI.
- Offline downloads have queue, progress, ready, and completion states. The design also shows low-bandwidth settings and a connection-error fallback.

### Progress, motivation, and rewards

- Lesson/course progress, XP, streaks, calendar activity, weekly analytics, quests, and achievement collection/detail.
- Leaderboard and league standings; a reward shop, gem balance, reward redemption, and quest reward feedback.
- Progress, XP, quest completion, streaks, and achievements are earned/derived from learning activity rather than edited as arbitrary profile fields.

### Community

- Find friends, view friend profiles, send/accept/decline/cancel requests, and remove a connection.
- Browse or create study groups, manage a group the learner owns, join/leave groups and challenges, and create/edit/delete one's own discussion posts and comments.
- Designed collaborative activities include study rooms, live polls, peer review, a group task plan, and a shared whiteboard. Group owners/hosts can manage rooms/challenges/polls; members can manage their own messages, votes, review comments, tasks, and notes under the CRUD rules in [API.md](API.md).
- Notifications cover friend requests, rewards, and reminders. Privacy settings control who can see progress and whether tutor chats are saved. Voice practice stays on the device in this demo.

### Profile, settings, and help

- View/edit profile name, photo, and bio; choose a Flo companion; inspect analytics and can-do evidence.
- Update daily goals/time budget, learning promise, reminders, app language, accessibility (text size, large-type preview, reduced motion, captions), privacy/data permissions, low-bandwidth options, focus mode, and wellbeing timer.
- Help center and support request with an optional screenshot and device details; view the submission confirmation.
- Review account security/sessions, change password, sign out, request/cancel a personal data export, and delete the account after explicit confirmation.

### Flo AI Tutor

- Ask grammar/vocabulary questions, get tutor feedback on an answer or mistake, compose a prompt with context, and practice a branching role-play.
- View private chat history, create/read/edit/delete chats and saved tutor notes, add a personal example, control chat-saving privacy, and clear chat history with confirmation.
- Tutor hints and connection/error states support an existing lesson or chat; they do not require a new route for every hint or response.

## Scope boundary

Page 09 remains the primary implementation baseline. The product owner has also included the 17 concepts listed in [FIGMA.md](FIGMA.md) from Page 10; their visuals remain draft references. The product areas describe user-facing behavior, not one route per Figma frame or a requirement to build every feature in a single implementation pass.
