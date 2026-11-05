# Recheck of the Android device UX/UI review

Reviewed source: `4e2941a` (`main`, after PR #61). Input: repository-root `2026-11-04-android-device-ux-review.md`, which explicitly tested **`b9441d5`, before PR #61**.

The owner requested comparison against current code, with no work on obsolete findings. No application source was modified. A finding's old origin and its continued presence are separate facts: this log does not establish a regression introduced by PR #61.

## Verification

- Read all 15 findings; compared relevant current source with `git diff b9441d5 HEAD` and `git blame`. Several implicated modules have no behavioral changes since that baseline.
- Inspected current Learn, Practice, Tutor chat/history and League on the available API 35 emulator (360 × 800 dp). Opened an existing seeded conversation without sending messages or changing learning content/settings.
- Reproduced Home's covered final row, duplicate Tutor footers and visible internal issue text. Opening the keyboard hid the composer/Send on this emulator; the physical report's exact tab-bar movement was not reproduced identically.
- At the end of the current Practice and expanded League lists, their last entries were visible above the action. The reported Samsung overlap remains unverified for those two screens; no current physical phone is connected.
- Live public search returned zero lessons for `cafe`, one for `café` (`Ordering at a café`).
- Current Tutor mascot uses the new PNG, whose alpha channel ranges from 0 to 255.
- The physical-device `assets/2026-11-04-device-*.png` referenced by the input were not supplied in this working tree. Current emulator evidence is linked below; it does not replace Samsung/Expo Go acceptance.
- No build/test rerun was needed for this source/history/UI comparison. No application code, credentials, or database fixtures were changed.

## All 15 input findings

IDs follow their order within each severity section in the input file.

| ID | Original severity | Finding | Current disposition |
| --- | --- | --- | --- |
| H1 | High | Keyboard covers Tutor input/Send | Functional obstruction reproduced; exact tab-bar movement varies by runtime. Missing keyboard/footer handling predates #61. |
| H2 | High | Two Tutor footers | Still present and reproduced. Workspace `Page` keeps its own footer alongside the real tab navigator. Old code. |
| H3 | High | Primary action covers final item | Partly reproduced: Home still covers its last course row. Practice/League end-of-list overlap not reproduced here; do not claim a general fix or a current Samsung failure without rechecking. Bottom layout constants predate #61. |
| M1 | Medium | Developer text in Tutor | Still present and visible. Old code. |
| M2 | Medium | Back buttons on tab roots | Still present in Practice/Tutor/League/Profile. Old code. |
| M3 | Medium | Footer position and lesson exit bypass | Partial mitigation: #61 hides the lesson footer in Focus mode only. With Focus off, direct tab replacement still bypasses the X confirmation; footer dimensions/position still differ. Old unresolved behavior, not a new regression. |
| M4 | Medium | Inconsistent back-header styles | Still different, but cosmetic consistency is optional under the owner's usable-flow criterion. |
| M5 | Medium | Account-settings back/action/highlight | Still `back={false}`, with App language CTA and highlighted Accessibility. Old code. |
| M6 | Medium | League toggle and hidden community shortcuts | Still appends details while retaining the board; the label remains Back to leaderboard and shortcuts are at the bottom. Old code. |
| L1 | Low | Square Tutor mascot background | Resolved by #61: transparent `fluora-flo-sprout.png`. |
| L2 | Low | Filled/unfilled shortcut cards | Still intentionally mixed fills. Optional visual treatment; white cards alone do not establish broken behavior. |
| L3 | Low | Vocabulary made from lesson-title fragments | Still present. Old code. |
| L4 | Low | Hard-coded course/unit progress bars | Still 30% / 38%. Old code; real Home metrics fixed in #61 do not fix these separate detail screens. |
| L5 | Low | Native Switch colors | Some Tutor switches still use platform defaults; profile setting toggles already set a green track. Optional theme consistency, not a functional defect. |
| L6 | Low | Search misses unaccented cafe | Still present and confirmed by current API. Old code. |

Summary: **one resolved, two partially addressed/reproduced, nine persisting behavior/content findings, and three optional visual consistency items. No newly introduced regression from PR #61 was established among these 15 items.** This does not mean the existing app has no remaining bugs.

## Persisting findings and recommended fixes

These are recommendations only, not implementation performed in this recheck.

### H1

Severity: High; current keyboard obstruction confirmed, exact physical-device placement unverified.
Location: `mobile/app/(tabs)/_layout.tsx:11`, `mobile/features/profile/garden-ui.tsx:73`, `mobile/features/tutor/TutorScreen.tsx:595`.
Problem: Tabs lack explicit keyboard hiding, Page does not apply keyboard avoidance on Android, and the chat composer can disappear behind the keyboard.
Impact: The learner cannot see the main input/Send while typing without further navigation/scrolling.
Recommended fix: Resolve duplicate footer ownership first, handle keyboard height/scrolling for the composer, and validate on both the current native emulator and Samsung Expo Go; a single tab option alone is not proven sufficient.

### H2

Severity: High; confirmed.
Location: `mobile/features/tutor/TutorScreen.tsx:271`, `mobile/features/profile/garden-ui.tsx:83`.
Problem: Chat Page defaults to rendering GardenFooter while Expo Router also renders tabs.
Impact: Two overlapping navigation bars and inconsistent selected state/tap targets.
Recommended fix: Give the tab navigator sole footer ownership for the entire Tutor workspace, matching Tutor home.

### H3

Severity: High; confirmed on Home only in this recheck.
Location: `mobile/components/ScreenContainer.tsx:26`, `mobile/features/learning/LearningHomeScreen.tsx:103`.
Problem: Scroll content reserves 112 dp while the overlaid Home action occupies approximately 82 + 56 dp from the bottom; the final course link remains underneath it at the scroll limit.
Impact: The last link is partly hidden and difficult to activate.
Recommended fix: Reserve measured action height plus bottom offset/insets in scroll content. Recheck Practice/League on the reported device before changing their separate in-flow Page layout.

### M1

Severity: Medium; confirmed.
Location: `mobile/features/tutor/TutorScreen.tsx:275`.
Problem: Tutor API · Availability depends on backend #32 remains user-facing.
Impact: Implementation/issue details are presented instead of useful learner status.
Recommended fix: Remove internal copy; show actionable availability text only when needed.

### M2

Severity: Medium; confirmed by source.
Location: `mobile/features/practice/practice-ui.tsx:11`, `mobile/features/tutor/TutorScreen.tsx:50`, `mobile/features/community/LeagueScreen.tsx:42`, `mobile/app/(tabs)/profile.tsx:39`.
Problem: Tab landing pages still offer generic Back navigation.
Impact: Their destination can depend on unrelated navigation history or fall back to another tab.
Recommended fix: Hide Back on tab roots and retain it on stack/detail pages.

### M3

Severity: Medium; confirmed by source, partially mitigated in Focus mode.
Location: `mobile/features/learning/player/LessonPlayerScreen.tsx:464`, `mobile/features/profile/garden-ui.tsx:47`, `mobile/app/(tabs)/_layout.tsx:22`.
Problem: Normal-mode lesson footer calls router.replace directly, bypassing handleExit. Nested footer uses a different bottom margin/inset model from real tabs.
Impact: A lesson can be left without its exit confirmation and navigation chrome shifts between destinations.
Recommended fix: Hide the footer for all lesson modes or route every leave action through a shared guard; align nested footer metrics/insets where retained. Saved API answers persist, so this does not establish database data loss.

### M5

Severity: Medium; confirmed by source.
Location: `mobile/features/profile/settings-screens.tsx:72`, `:79`.
Problem: Account settings hides Back, elevates a duplicate App language action and highlights Accessibility without selection context.
Impact: Returning to the previous page and interpreting the primary action are unclear.
Recommended fix: Restore stack navigation and use list actions without an arbitrary primary/selected item.

### M6

Severity: Medium; confirmed by source and current League view.
Location: `mobile/features/community/LeagueScreen.tsx:43`, `:61`, `:99`.
Problem: Back to leaderboard toggles appended details rather than navigating back; community links require expanding and scrolling past quests/achievements.
Impact: Misleading navigation wording and poor discoverability.
Recommended fix: Use a truthful collapse label and expose the useful community links earlier.

### L3

Severity: Low; confirmed by source.
Location: `mobile/features/learning/LearningDetailScreens.tsx:136`.
Problem: The vocabulary list is derived by splitting lesson titles.
Impact: Title fragments are presented as taught words.
Recommended fix: Read curated vocabulary when available or omit the section; do not infer teaching content from titles.

### L4

Severity: Low; confirmed by source.
Location: `mobile/features/learning/LearningDetailScreens.tsx:207`, `:228`.
Problem: Course/unit bars use fixed 30% and 38% widths, independently of learner completion.
Impact: Learners see unearned progress, despite correct metrics on Home.
Recommended fix: Derive the bars from actual completed lesson IDs or remove the unbacked progress claim.

### L6

Severity: Low; confirmed by source and live API.
Location: `backend/src/features/learning/learning.service.ts:206`.
Problem: Case-insensitive contains does not match cafe to café.
Impact: Common unaccented input misses existing content.
Recommended fix: Add proportional accent-insensitive matching using the current stack, with a regression case; do not introduce infrastructure just for this small demo search.

## Current emulator evidence

- [Covered Home row](assets/2026-11-04-device-recheck-home.png)
- [Duplicate Tutor footer and internal copy](assets/2026-11-04-device-recheck-tutor.png)
- [Practice end without reproduced overlap](assets/2026-11-04-device-recheck-practice.png)
- [League end without reproduced overlap](assets/2026-11-04-device-recheck-league.png)

Keyboard evidence was inspected locally but is not included as a screenshot because the system keyboard displayed a clipboard suggestion. No private clipboard data is copied into the report.
