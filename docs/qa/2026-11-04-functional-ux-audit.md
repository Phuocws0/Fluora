# Functional and UX audit — 2026-11-04

This review accepts differences from Figma when the flow is clear, coherent, and functional. Findings concern incorrect behavior, misleading controls, or unusable layout; visual differences alone are not defects. The audit covers the current working tree, including the uncommitted UI and LLM integration changes.

## Verification and limits

- `node scripts/demo-api-smoke.mjs`: **83 HTTP checks passed**, covering account/settings, all five seeded exercise modes, answer validation, completion/progress, practice, selected community operations, Tutor, ownership, and exports.
- `node --experimental-vm-modules scripts/practice-api-smoke.mjs`: **56 HTTP checks passed**, using the actual mobile service and PostgreSQL. Both scripts removed their disposable accounts.
- Android API 35 emulator at 360 × 800 dp: inspected onboarding and reproduced the selected-level/summary mismatch and right-edge overflow. Previous selected-screen and LLM checks remain documented in `STATUS.md`; this audit does not claim every screen/interaction was driven on device.
- A separate disposable account confirmed settings persistence and the first-English-course Home behavior; the account was deleted afterward. Directly saving `courseLanguage:ja` through the API does not select a Japanese course. This is a documented backend selection limit, not a normal onboarding UI failure: the UI already blocks unsupported courses with an explanatory dialog.
- The preceding implementation pass passed workspace typechecking, backend build, 25 Node regression checks, and Android export. No implementation source was changed during this audit.

No Critical failure was found in these checked flows. Full application acceptance is still pending: physical microphone/file picker, offline cold start and interruption recovery, iOS Expo Go acceptance, and every multi-user community/room/poll interaction were not exhaustively verified here.

## Confirmed findings

### H1 — Selected CEFR level changes in the summary

Severity: **High — confirmed on Android and in source.**

Location: `mobile/features/onboarding/OnboardingWizard.tsx:84`, `:468`, `:912`.

Problem: the displayed options `A0/A1/A2/B1` map to stored IDs `A1/A2/B1/B2`. Selecting **A1** produces **Starting Level: A2** in the summary. Placement results can also highlight a differently labeled option.

Impact: the learner cannot reliably select or review the intended starting level.

Recommended fix: keep visible CEFR labels, draft values, summary, placement selection, and saved settings consistent. If current proficiency and recommended next level are intentionally different, name and display them separately; do not silently shift the value.

Evidence: [A1 selected](assets/2026-11-04-starting-level.png), [summary shows A2](assets/2026-11-04-onboarding-summary.png).

### H2 — App-language selection does not change the interface

Severity: **High — confirmed by source; preference persistence verified through the API.**

Location: `mobile/features/profile/settings-screens.tsx:254`, `mobile/app/_layout.tsx` and screens with English literal strings.

Problem: Vietnamese, Spanish, and French can be saved as the app language, but there is no interface-language consumer/translation mapping. The control reports a successful save while the interface remains English.

Impact: learners are promised an interface language the application does not provide.

Recommended fix: implement the offered translations or make unavailable options explicitly unavailable for the demo. Saving an unsupported language should not imply it has been applied.

### H3 — Larger-text preview promises lesson changes that are not applied

Severity: **High — confirmed by source.**

Location: `mobile/features/profile/settings-screens.tsx:260`, `mobile/features/learning/player/LessonPlayerScreen.tsx:553` and exercise components.

Problem: the preview says “This is how lesson text will appear,” but the lesson player and exercises use fixed text styles without consuming the saved `textSize`. The story reader does consume it, so behavior is inconsistent across learning flows.

Impact: learners selecting larger text still receive the original lesson text size.

Recommended fix: apply the setting to the lesson/exercise text through the existing shared UI patterns, then check wrapping and scrolling at each offered size. Adjust preview wording until the promised scope is supported.

### M1 — Several experience controls only store a preference

Severity: **Medium — confirmed by source and API persistence.**

Location: `mobile/features/profile/settings-screens.tsx:264`, `:269`, `:279`; lesson/player and application layout.

Problem: reduced motion, listening captions, Focus mode, and wellbeing interval are saved but are not consumed by the relevant lesson UI, animation/audio behavior, or a break-reminder timer. The wellbeing clock is a static rendering of the configured interval.

Impact: the interface indicates an experience change or break reminder without delivering it.

Recommended fix: wire each offered control to its intended behavior or clearly label/disable its unavailable demo behavior. A simple foreground reminder is sufficient; no push infrastructure is required.

### M2 — Completed catalog still offers “Start next lesson”

Severity: **Medium — confirmed by source.**

Location: `mobile/features/learning/LearningHomeScreen.tsx:70`, `:99`.

Problem: when every lesson is completed, the next-lesson calculation falls back to the first lesson, and the CTA still says “Start next lesson.”

Impact: finishing the demo catalog looks like an unfinished loop; the learner is sent to an already completed lesson without an explanation.

Recommended fix: preserve an explicit completed state and offer a clearly labeled review/replay or Practice action. Keep the existing idempotent XP behavior.

### M3 — Hearts look like live progress but remain fixed

Severity: **Medium — confirmed by source.**

Location: `mobile/features/learning/LearningHomeScreen.tsx:137`, `mobile/features/learning/player/LessonPlayerScreen.tsx:267`.

Problem: both screens display a literal `5`; the lesson accessibility label also always says “Five hearts remaining.” There is no corresponding dynamic heart state.

Impact: users can interpret the number as a live remaining-attempt count, including after wrong answers. The earlier UI notes incorrectly grouped hearts with dynamic metrics.

Recommended fix: remove or explicitly identify the demo indicator until there is a defined mechanic. Do not invent a lives/penalty system merely to match Figma. The documentation claim has been corrected in this audit.

### L1 — CEFR cards overflow the narrow viewport

Severity: **Low — confirmed on Android; the labels and main flow remain usable.**

Location: `mobile/features/onboarding/OnboardingWizard.tsx:473`, `:1487`.

Problem: four cards use fixed 87 dp offsets and 78 dp widths inside a narrower content area. At 360 dp screen width the last card extends past the content margin and is clipped at the screen's right edge.

Impact: inconsistent spacing and a partly off-screen touch area on the tested demo device.

Recommended fix: calculate widths/gaps from available width or use a responsive row. Verify the smallest supported screen and larger text without requiring a copy of the Figma frame dimensions.

Evidence: [starting-level screen](assets/2026-11-04-starting-level.png).

## Demo boundaries, not counted as UX defects

- Non-English courses already show an unavailable-course dialog and keep English selected.
- Email verification/reset uses local backend tokens; room/poll updates use manual refresh; there is no push delivery. These are documented local-demo limits.
- Tutor chat uses a real configured LLM; unsubmitted exercise hints and role-play verdicts/branches stay curated. Speaking/writing practice does not claim automatic audio grading.
- Offline exercises do not earn queued XP; the dictionary had three curated entries at audit time (expanded to 30 in the corrective pass below).
- Differences in colors/layout/card composition from Figma are acceptable when the interaction remains coherent. Community shortcuts could be easier to discover, but their placement behind League details is not counted as a confirmed broken flow here.

## Disposition

The seven findings above describe the original audit state. A subsequent owner-authorized corrective pass implemented:

| Finding | Resolution |
| --- | --- |
| H1 | CEFR labels and values are identical A1–C2, shared with selection/summary; regression and API persistence checks cover all six. |
| H2 | The 2026-11-04 pass explicitly limited the interface to English and rejected other language codes. On 2026-11-05, the owner requested Vietnamese UI; the app now supports English/Vietnamese and rejects unsupported codes. Curated course and exercise content stays in its learning language. |
| H3 | Shared text wrappers apply 100%/120%/140% sizes to learning/lesson components and readers while retaining OS scaling. Home cards and labels wrap instead of truncating larger text. |
| M1 | Focus hides lesson distractions; captions expose listening transcripts; modal/waveform behavior consumes reduced motion; a foreground-only break reminder consumes the configured interval. |
| M2 | Home selects a course with unfinished lessons, then offers Practice/review after completion without awarding duplicate XP. |
| M3 | Fixed hearts replaced with real XP on Home and current exercise/total in lessons. No lives mechanic was invented. |
| L1 | Six CEFR cards wrap into available width; fixed offsets/heights removed. |

Verification: workspace typecheck, backend build, 33 Node regression tests and Android bundle export passed; fresh migrations, two seeds, preserved ordinary account settings and edited cards, plus 136 real HTTP checks passed in a disposable DB. Every one of the 22 exercises/seven modes was answered and all 12 lessons completed with repeated completion awarding zero XP. `npm run demo:setup` succeeded on the existing runtime; the original 83-check demo and 56-check Practice suites passed again. No main DB reset was performed.

Android API 35 acceptance of the updated preferences and seed is recorded below. These results do not establish that every device/hardware interaction has passed; physical microphone quality, physical-device interruption/offline cases and iOS Expo Go remain separate acceptance work.


## Corrective Android acceptance

Device: Android API 35 emulator, 360 × 800 dp. Tested against the updated local backend and expanded fixtures:

- Email sign-in with the seeded An account; all 12 lessons/164 XP and 85-gem wallet displayed. Completed Home offers Practice/review. At extra-large text the course card grows, the title wraps, and the exercise prompt/choices remain scrollable.
- C1 selection stays C1 in the onboarding summary; all six responsive cards fit the content area. API acceptance separately verifies A1–C2 persistence.
- Extra-large listening text, captions, Focus label/hidden footer, selection/submission/feedback and exercise counter were exercised. The 5-minute foreground break reminder appeared; its break action returned Home. Dedicated QA preferences were restored afterward.
- Native CSV file picking initially exposed a real additional bug: the restricted MIME filter disabled an Android-provider CSV file. The picker now permits provider MIME variants and relies on the existing 1 MB/parser/mapping/preview validation. Re-tested actual CSV selection → mapping → 3-row preview → import; all three cards and optional fields were verified in PostgreSQL, then removed as temporary QA data.
- Microphone permission, record/stop and local recording playback were exercised without native/JS errors. The speaking scorecard now calls its sample text a practice phrase, not a recorded transcription; no transcription engine exists.
- The expanded seed exposed dictation's use of the gap-only label/full-transcript card. It now has a sentence-length answer input, distinct copy and no unconditional transcript card. Explicit enabled captions can still show the transcript as a learning aid.
- Downloaded the starter course, stopped the backend, force-stopped/relaunched the app, and opened the account's cached library successfully while the backend was unavailable. Restored the backend, then opened a downloaded lesson in explicit offline mode with its ungraded/no-XP banner. This is a backend-outage/cached-state check, not an airplane-mode or physical-device media-quality claim.

Evidence: [C1 selection](assets/2026-11-04-cefr-c1-fixed.png), [C1 summary](assets/2026-11-04-cefr-summary-fixed.png), [large-text completed Home](assets/2026-11-04-completed-home-fixed.png), [lesson preferences](assets/2026-11-04-lesson-preferences-fixed.png), [break reminder](assets/2026-11-04-break-reminder-fixed.png), [native import](assets/2026-11-04-native-import-fixed.png), [cached cold start](assets/2026-11-04-download-cold-start.png), [offline lesson](assets/2026-11-04-offline-lesson.png).

All seven originally confirmed findings have fixes with the checks above. Additional dictation/import/transcription-copy issues found during verification were also fixed. Remaining physical-device/iOS and exhaustive multi-user/interruption acceptance limits still apply; this is not a guarantee that no undiscovered bug exists.
