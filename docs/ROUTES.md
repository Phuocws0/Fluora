# Navigation Routes

There is no navigation implementation in the repository. This is a proposed logical model derived from the selected Page 09 flow and Page 10 states, not a claim that these routes exist. Adapt names to the navigation library actually used.

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
| Home and learn | Learning Home, course catalog/detail, unit catalog/detail, course/learning-path comparison, syllabus, lesson search, weekly planner, skill baseline, analytics, and can-do evidence |
| Lesson | Lesson introduction/session and exercise modes: sentence building, choice/listening, fill-gap, matching, speaking, pronunciation, and story challenge |
| Practice | Practice hub, vocabulary set/deck editor/import, review/error notebook, stories/reading, grammar and study tools, calendar, bookmarks, and offline downloads |
| Tutor tab | Flo home, conversation/role-play, saved notes, chat history/privacy, prompt composition, and hints |
| League tab | Leaderboard, quests, achievements, friends/profile/requests, groups/discussion/challenges, study room, poll, peer review, group plan, whiteboard, rewards, and notifications |
| Profile and settings | Profile/edit, analytics, account security, notification/accessibility/privacy settings, low-bandwidth and wellbeing controls, help/support, and data export |
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

## Data operations are separate from navigation

Editing a profile, importing a vocabulary list, sending a friend request, voting in a poll, redeeming a reward, or clearing tutor history is an action within a flow; it does not require a new route for each operation. See [API.md](API.md) for planned operations and explicit CRUD coverage, and [FIGMA.md](FIGMA.md) for the selected/draft boundary.
