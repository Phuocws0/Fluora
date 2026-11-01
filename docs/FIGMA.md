# Figma References and Coverage

## Source file and page roles

Main file: [E-learning platform](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform)

The file contains a shared design system and feature pages, followed by a prototype release inventory and an extended selection audit:

| Page | Figma node | Use |
| --- | --- | --- |
| 02 · Onboarding & Account | `24:1216` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=24-1216) | Account, onboarding, placement, language, and preferences |
| 03 · Lessons & Learning Path | `24:1217` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=24-1217) | Home, courses, lessons, learning tools, search, and planning |
| 04 · Practice & Offline | `24:1218` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=24-1218) | Practice modes, vocabulary, reading, review, and downloads |
| 05 · Community & Rewards | `24:1219` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=24-1219) | League, quests, achievements, friends, groups, and rewards |
| 06 · Profile & Settings | `24:1220` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=24-1220) | Profile, analytics, privacy, accessibility, support, and security |
| 07 · Flo AI Tutor | `24:1221` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=24-1221) | Tutor chat, role-play, saved notes, history, and hints |
| 09 · Prototype Demo — Garden UI | `76:66` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=76-66) | **Primary implementation reference and selected 100-screen release inventory** |
| 10 · Interface Diversity Draft — Fluora | `262:2032` · [open](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=262-2032) | Extended states, alternatives, draft explorations, and the release selection audit |

Page 09 is the primary source for the application flow, navigation, main UI, implementation priority, and demo journey. Pages 02–07 group the same product domains. Page 10 is not a separate app and its 160 design explorations are not 160 routes or 160 additional release features.

The approved Page 09 footer has five tabs in fixed order: **Learn, Practice, Tutor, League, Profile**. Home is the Learn landing screen; community/leaderboard and rewards are reached within League/Profile flows.

## Page 09 selected release screen inventory

The prototype directory labels a 100-screen selected release. This grouped list preserves all 100 numbered screen names; use it with [PRODUCT.md](PRODUCT.md) for product behavior and [ROUTES.md](ROUTES.md) for logical navigation.

- **Account and onboarding (9):** 01 Learning motivation; 02 Starting level; 03 Daily goal; 04 Study reminder; 05 Create account; 06 Sign in; 07 Verify email; 08 Forgot password; 51 App language.
- **Home and learning paths (12):** 09 Learning home; 10 Course catalog; 11 English course overview; 12 Unit catalog; 13 Unit overview; 58 Skill baseline radar; 59 Confidence matrix; 60 Weekly planner; 91 Career learning syllabus; 92 Lesson search and filters; 93 Compare learning paths; 94 Can-do evidence checklist.
- **Lessons, practice, reading, and vocabulary (42):** 14 Choose a greeting; 15 Build a sentence; 16 Listening choice; 17 Complete a sentence; 18 Speaking practice; 19 Match word meanings; 20 Practice hub; 21 Vocabulary sets; 22 Flashcard front; 23 Pronunciation feedback; 24 Learning calendar; 25 Story library; 26 Story reader; 27 Story opening challenge; 28 Offline downloads; 61 Minimal pairs; 62 Playback controls; 63 Conversation soundscape; 64 Phoneme heatmap; 65 Mouth guide; 66 Rhythm timeline; 67 Writing canvas; 68 Annotated draft; 69 Rewrite comparison; 70 Writing rubric; 71 Inline dictionary; 72 Reading path; 73 Bookmark shelf; 74 Semantic word map; 75 Spaced review schedule; 76 Word sorting; 77 Collocation puzzle; 78 Word family tree; 79 City mission map; 80 Café menu; 81 Transit planner; 95 Grammar reference matrix; 96 Verb conjugation workbench; 97 Personal error notebook; 98 Free-text listening dictation; 99 Custom vocabulary deck editor; 100 Vocabulary import mapping.
- **Community, league, and rewards (19):** 29 Leaderboard; 30 League overview; 31 Daily quests; 32 Achievement collection; 33 Friends; 34 Find friends; 35 Friend profile; 36 Study groups; 37 Study group overview; 38 Group discussion; 39 Group challenge; 40 Notifications; 49 Reward shop; 50 Redeem reward; 82 Study room; 83 Live poll; 84 Peer review; 85 Group plan; 86 Shared whiteboard.
- **Profile, settings, and help (11):** 41 Edit profile; 42 Learning analytics; 43 Settings; 44 Notification settings; 45 Accessibility; 46 Privacy settings; 47 Help center; 48 Contact support; 52 Account security; 89 Low-bandwidth mode; 90 Wellbeing timer.
- **Flo AI Tutor (7):** 53 AI tutor home; 54 Chatbot conversation; 55 Role-play scenarios; 56 Saved tutor notes; 57 Tutor chat history; 87 Prompt composer; 88 Hint ladder.

## Page 10 selection audit and additional states

Page 10 records 160 numbered design explorations and an audit mapping 100 selected tasks into the Page 09 release. Its numbered frames 01–100 include authentication and placement variants, exercise/flashcard states, lesson and practice results, download completion, achievement details, friend-request confirmation, profile and settings alternatives, and tutor explanation/privacy/error states. Use those frames to resolve interaction details; do not count them again as separate features or routes.

The 60 frames labeled `DRAFT / 101–160` include design variants. The audit maps 43 of these source designs to selected release tasks. The following 17 concepts are not in the selected 100 and must remain clearly marked as draft candidates unless the product scope is explicitly expanded:

`103 Daily time budget`, `105 Learning promise`, `106 Waveform player`, `108 Transcript gap`, `111 Recording studio`, `115 Speaking scorecard`, `117 Sentence tiles`, `121 Article reader`, `124 Comprehension tree`, `133 Dialogue comic`, `135 Mission passport`, `143 Misconception map`, `144 Branching role-play`, `145 Tutor feedback`, `146 Focus mode`, `147 Large type preview`, and `148 Audio-only lesson`.

## How to map a Figma frame

Classify each frame as a **route**, **screen**, **reusable component**, **UI state**, **modal**, or **overlay**. A frame is not automatically a route. Correct/incorrect answers, selected/unselected values, loading, validation, connection errors, completion, reward feedback, and confirmation dialogs are normally states or overlays within a logical flow.

Use visible controls and copy to identify data operations. A list or detail frame alone does not prove create, update, or delete behavior. When a CRUD action is not shown or its effect is unclear, record the design gap and do not invent behavior. The planned endpoint coverage and unresolved actions are tracked in [API.md](API.md).

If Figma access is available, inspect the relevant frame before UI implementation. If direct access fails, do not invent visual details; use this document, existing UI, and user-provided screenshots/specifications.

## Prototype interaction audit

Prototype reactions inspected in Page 09/10 confirm these linked flows:

- Vocabulary deck editor → import mapping → back to the deck; the import screen supports column selection/preview. The deck screen labels its name/cards editable but does not show explicit add/delete controls for cards or a delete-deck action.
- Friends → find learner → friend profile → **friend request sent** state. The reviewed prototype does not show accept/decline controls or removal of an accepted friend.
- Group discussion → group challenge → notifications. The discussion frame is a feed with no compose/edit/delete control.
- Reward shop → redeem reward → learning calendar.
- Profile privacy toggles update UI state and open a data-export preview overlay; support submission leads to a sent confirmation.
- Account security links to password update; sign-out uses a confirmation dialog and returns to the welcome/account flow.
- Tutor privacy has settings and a **clear chat history** confirmation overlay.
- The selected collaborative-study exploration links study room → poll → peer review → group plan → shared whiteboard. It shows live message/reply, poll choices, a comment box, task lanes, and sticky notes; the detailed create/edit/delete controls are not specified consistently in the frames.

These findings are reflected in [API.md](API.md). Before implementing an action that is not visible (especially delete controls, friend request acceptance, group membership changes, or group content editing), either confirm the interaction in Figma or keep it marked as a product/API decision. The prototype confirms the feature area, but a visible list/detail alone does not define its full CRUD behavior.
