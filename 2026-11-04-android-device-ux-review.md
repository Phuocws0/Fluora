# Android device UX/UI review — 2026-11-04

Baseline: `b9441d5` (`main`, after PR #60). This is a report-only review of the five main tabs on a physical Android phone. No source code was changed during the review.

## Environment

- Device: Samsung Galaxy S20 FE 5G (`SM-G781U`), 1080 × 2400, connected over USB with USB debugging.
- Expo Go 57.0.9 (SDK 57). Metro and the backend were reached through `adb reverse tcp:8081` and `adb reverse tcp:4000`, with `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000`.
- Backend and PostgreSQL ran with `docker compose up --build -d`; demo data came from `npm run db:seed --workspace @fluora/backend`.
- Signed in as an existing local learner (A1, 0 XP).
- Interaction was driven by `adb shell input` and checked with `uiautomator` UI dumps, screenshots, and `ReactNativeJS` logcat output.

The grey floating gear button in the top-right corner of every screenshot is the Expo Go developer tools button. It is not part of the app.

## Coverage

| Tab | Checked |
| --- | --- |
| Learn | Home scroll, course detail, units path, unit 1 detail, lesson search (level filter, text search), lesson player (hint ladder, correct answer feedback, exit confirmation), Compare learning paths, Study planner, Mission passport, Learning insights |
| Practice | Hub scroll, Listening practice, Browse all study tools, Review vocabulary |
| Tutor | Tutor home, start a chat, send a question, receive Flo's reply |
| League | Leaderboard, league details, quests/achievements, Study groups |
| Profile | Profile summary, Learner profile, Account settings list |

The core flows worked. No JavaScript errors appeared in logcat during the run. Flo answered the test question with the expected local-provider reply.

Not covered:

- Audio playback, microphone recording, and animation smoothness. Screenshots cannot verify these.
- Sign out, data export, reset preferences, and account deletion. These are hard to reverse and were deliberately skipped.
- Creating groups, posts, or rooms, and changing settings.
- The auth and onboarding flow.

Test data written to the local database: one submitted answer in lesson 1 ("Greetings and introductions") and one Tutor chat with one message.

## Findings

### High

```text
Severity: High
Location: mobile/app/(tabs)/_layout.tsx and mobile/features/tutor/TutorScreen.tsx (chat mode)
Problem: When the keyboard opens in Tutor chat, the floating tab bar moves up above the keyboard and covers the lower part of the "Write to Flo…" input and the Send button. With the keyboard closed, Send sits directly against the tab bar.
Impact: The main Tutor action is hard to complete; learners cannot see the Send button while typing.
Recommended fix: Set tabBarHideOnKeyboard: true on the tab navigator and add bottom padding equal to the tab bar height to the chat content.
Evidence: assets/2026-11-04-device-tutor-keyboard-tabbar.png
```

```text
Severity: High
Location: mobile/features/tutor/TutorScreen.tsx (chat mode)
Problem: The chat view renders the Garden footer (GardenFooter) while the expo-router tab bar is also visible. The second bar shows faintly under the real one ("Learn Practice Tutor League Profile").
Impact: The screen looks broken, and taps near the bottom can hit the wrong bar.
Recommended fix: Pass showFooter={false} to the chat Page, as the Tutor home page already does.
Evidence: assets/2026-11-04-device-tutor-chat.png
```

```text
Severity: High
Location: mobile/features/learning/LearningHomeScreen.tsx (Learn) and the Garden Page component in mobile/features/profile/garden-ui.tsx (Practice, League details)
Problem: The fixed primary action button covers the last list item even when the screen is scrolled to the end. Learn: "Learning insights" sits under "Start next lesson". Practice: "Review vocabulary" overlaps the last card. League details: "Back to leaderboard" overlaps the quest list.
Impact: The last entry point on these screens is only partly visible and hard to tap.
Recommended fix: Add bottom content padding equal to the action button height plus the tab bar height in the Garden Page scroll container and the Learning Home scroll view.
Evidence: assets/2026-11-04-device-learn-bottom-overlap.png, assets/2026-11-04-device-practice-bottom-overlap.png
```

### Medium

```text
Severity: Medium
Location: mobile/features/tutor/TutorScreen.tsx:275
Problem: The chat view shows developer text: "Tutor API · Availability depends on backend #32".
Impact: Internal issue references are visible to learners.
Recommended fix: Remove the line, or show an availability message only when the tutor is unavailable.
Evidence: assets/2026-11-04-device-tutor-chat.png
```

```text
Severity: Medium
Location: Tab root screens: Practice, Tutor, League, Profile
Problem: Tab roots show a "‹" back control. On the Practice root it navigates to Learn.
Impact: A back control on a tab root has no clear destination and behaves unexpectedly.
Recommended fix: Hide the back control when the page is a tab root.
```

```text
Severity: Medium
Location: mobile/features/profile/garden-ui.tsx (GardenFooter) and mobile/features/learning/player/LessonPlayerScreen.tsx:472
Problem: Nested screens (course, unit, lesson) use GardenFooter, which sits about 30 px lower than the expo-router tab bar, so the bar jumps between screens. The lesson player also shows the footer, so a tab tap leaves the lesson without the "Exit lesson?" confirmation that the X button shows.
Impact: Navigation feels inconsistent, and a learner can lose an in-progress lesson by accident.
Recommended fix: Hide the footer in the lesson player and align GardenFooter's position and size with the tab bar.
Evidence: assets/2026-11-04-device-unit-detail.png
```

```text
Severity: Medium
Location: Community screens (Study groups, Learner profile), Planner/Passport/Insights, other Garden pages
Problem: Three back-control styles are used: a small "‹ EYEBROW" header (most screens), a full-width green "‹ Back" bar (community screens), and a "←" arrow with a centred title (Planner, Passport, Insights).
Impact: The app looks like separate products stitched together.
Recommended fix: Use one back-header pattern across stack screens.
Evidence: assets/2026-11-04-device-study-groups.png
```

```text
Severity: Medium
Location: mobile/features/profile/settings-screens.tsx:72 (settings list, Page with back={false})
Problem: Account settings has no back control. The primary button is "App language", which duplicates a list row and is not the main action of the screen. The "Accessibility" row is highlighted with no visible reason.
Impact: Learners have no obvious way back, and the main button is confusing.
Recommended fix: Add the standard back header, remove or replace the primary action, and confirm the intended row highlight.
Evidence: assets/2026-11-04-device-settings.png
```

```text
Severity: Medium
Location: mobile/features/community/LeagueScreen.tsx:43
Problem: "View league details" appends the details below the leaderboard, which stays visible, but the button then reads "Back to leaderboard". Friends, Study groups, Rewards, Notifications, and Peer review are only reachable at the bottom of this expanded view.
Impact: The toggle label does not match what is on screen, and the community entry points are hard to find.
Recommended fix: Use a label that matches the toggle (for example "Hide details"), or show the community entry points on the League root.
Evidence: assets/2026-11-04-device-league-details.png
```

### Low

```text
Severity: Low
Location: mobile/features/tutor/TutorScreen.tsx (Tutor home mascot)
Problem: The Flo mascot image has a visible light-green square background on a white page.
Impact: Cosmetic mismatch with the other mascot placements.
Recommended fix: Use a transparent mascot asset or a rounded container matching the page.
```

```text
Severity: Low
Location: Practice hub skill tiles and Tutor home shortcut tiles
Problem: Tiles alternate between filled and unfilled backgrounds ("Listen", "Read", and "Build a prompt" have no fill).
Impact: The unfilled tiles look like missing cards.
Recommended fix: Give every tile a background, or alternate between two filled colours.
```

```text
Severity: Low
Location: mobile/features/learning/LearningDetailScreens.tsx:136
Problem: "WORDS YOU WILL USE" is built by splitting lesson titles, so unit 1 shows "greetings", "introductions", "asking", "simple".
Impact: The section presents title fragments as vocabulary.
Recommended fix: Use lesson vocabulary from the API, or hide the section when no vocabulary is available.
Evidence: assets/2026-11-04-device-unit-detail.png
```

```text
Severity: Low
Location: mobile/features/learning/LearningDetailScreens.tsx (levelProgress width "30%", lessonProgressFill)
Problem: The course roadmap (A1→B2) and the first lesson card progress bar use fixed widths, so they show progress while the learner has completed 0 of 2 lessons.
Impact: Progress indicators do not reflect real progress.
Recommended fix: Derive the widths from the learner's progress, or remove the bars.
```

```text
Severity: Low
Location: Tutor history toggles and other Switch controls
Problem: Switches use the default Android blue instead of the Garden green.
Impact: Visual inconsistency with the rest of the theme.
Recommended fix: Set trackColor and thumbColor from the Garden palette.
```

```text
Severity: Low
Location: backend/src/features/learning/learning.service.ts:206
Problem: Lesson search uses a case-insensitive contains match without accent folding, so "cafe" does not find "Ordering at a café".
Impact: Typical keyboard input misses accented titles.
Recommended fix: Normalize accents for search (for example with PostgreSQL unaccent), or document the limitation.
```

## Recommended order

1. Fix the three High findings first. They are concentrated in `mobile/app/(tabs)/_layout.tsx`, `mobile/features/tutor/TutorScreen.tsx`, `mobile/features/learning/LearningHomeScreen.tsx`, and the Garden `Page` component in `mobile/features/profile/garden-ui.tsx`.
2. Unify the navigation chrome: tab-root back control, footer position, back-header style, and the hidden footer in the lesson player.
3. Address the Low items during a visual-alignment pass.
