# Navigation Routes

The Expo app currently has one placeholder `App.tsx` and no navigation library. The following is a proposed logical model derived from the selected Page 09 flow and Page 10 states, not a claim that these routes exist. Choose a navigation library when implementing the first real navigation flow and adapt names to it.

```text
/
├── (auth)/
│   ├── splash
│   ├── welcome
│   ├── login
│   ├── register
│   ├── verify-email
│   ├── forgot-password
│   └── reset-password
│
├── (onboarding)/
│   ├── course-language
│   ├── motivation
│   ├── starting-level
│   ├── placement
│   ├── placement-result
│   ├── daily-goal
│   └── study-reminder
│
├── (tabs)/
│   ├── learn
│   ├── practice
│   ├── tutor
│   ├── league
│   └── profile
│
├── course/[courseId]
├── unit/[unitId]
├── lesson/[lessonId]
├── planner
├── missions/passport
├── learning/insights
├── learning-tools/[toolId]
├── vocabulary/sets/[setId]
├── stories/[storyId]
├── downloads
├── community/friends/[userId]
├── community/groups/[groupId]
├── community/groups/[groupId]/room
├── notifications
├── rewards
├── settings/[section]
└── tutor/chats/[chatId]
```

## Route coverage by product flow

| Logical route area | Figma destinations covered |
| --- | --- |
| Auth and onboarding | Welcome/splash, register, sign-in, email verification, password recovery, app/course language, motivation, level/placement, daily goal, reminder, and validation/result states |
| Home and learn | Learning Home, course catalog/detail, unit catalog/detail, course/learning-path comparison, syllabus, lesson search, weekly planner, skill baseline, analytics, can-do evidence, mission passport, and misconception map |
| Lesson | Lesson session and sentence tiles, transcript gaps, listening/waveform/audio-only, local recording and speaking scorecard; these remain exercise modes/states within a lesson |
| Practice | Practice hub, vocabulary set/deck CRUD/import, review/error notebook, article/story reader, comprehension tree, dialogue comic, grammar and study tools, calendar, bookmarks, and offline downloads |
| Tutor tab | Flo home, branching role-play, feedback, saved notes, chat history/privacy, prompt composition, and hints |
| League tab | Leaderboard, quests, achievements, friends/requests, group CRUD/discussion/challenges, study-room CRUD, polls, peer review, group plan, whiteboard, rewards, and notifications |
| Profile and settings | Profile/edit/delete account, analytics, account security, notification/accessibility/privacy settings, large-type preview, focus mode, low-bandwidth and wellbeing controls, help/support CRUD, and data exports |
| Rewards | Reward shop and redemption confirmation, reached within the League/Profile flow |

This table groups the selected screen inventory in [FIGMA.md](FIGMA.md); it does not create a route for every numbered frame. An independently navigable tool can use a shared tool route/screen where that fits the implementation.

## Route, screen, component, state, modal, and overlay

- **Route:** A navigable location.
- **Screen:** The main view for a route.
- **Component:** Reusable UI or behavior embedded in screens.
- **UI state:** A condition within a screen or component.
- **Modal:** A temporary focused view over the current screen.
- **Overlay:** Supporting UI over content, such as a tooltip or dialog.

Examples:

| Figma item | Likely representation |
| --- | --- |
| Learning Home, Course Detail, Unit Detail | Route / Screen |
| Lesson and study tool | Route / Screen or shared tool screen, based on navigation flow |
| Friend profile, group, tutor conversation | Route / Screen |
| Correct/incorrect answer, selected answer, loading, validation error, connection error | UI state |
| Lesson completed, quest reward, password reset success | UI state or modal |
| Sign-out / clear-history confirmation | Modal |
| Tooltip and small contextual hint | Overlay |
| Waveform, transcript gap, recording studio, speaking scorecard, sentence tiles | Components/states inside lesson or practice screens |
| Article reader, comprehension tree, dialogue comic | Content modes within the story reader route |
| Daily time budget, learning promise, focus mode, large-type preview | Onboarding/settings fields or preview states |
| Mission passport, misconception map, tutor branching/feedback | Learning insights or tutor conversation screens/states |

## Data operations are separate from navigation

Editing a profile, managing a group post, importing a vocabulary list, sending a friend request, voting in a poll, redeeming a reward, or clearing tutor history is an action within a flow; it does not require a new route for each operation. The product-approved CRUD baseline is in [API.md](API.md), and [FIGMA.md](FIGMA.md) distinguishes the 17 promoted Page 10 concepts from other drafts.
