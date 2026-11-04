# Android demo integration QA — 2026-11-03

Tracking issue: [#24](https://github.com/Phuocws0/Fluora/issues/24). Baseline: `ae2b44a` (all feature PRs through #57). This report records observed checks; feature implementation and complete visual acceptance are separate claims.

## Environment

- Ubuntu x86_64, Node.js 24, JDK 21, Docker Compose with the existing PostgreSQL 17 volume and Express backend.
- Local Android SDK outside the repository: platform/build-tools 36, NDK `27.1.12297006`, KVM Android 15/API 35 Google APIs x86_64 emulator. Display is 780 × 1688 at 320 dpi (390 × 844 logical size).
- Expo runs on the host. Generated `mobile/android/`, SDK files, APKs, credentials and raw logs are not committed.
- Primary design comparison: Page 09 [Learning Home](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=294-5497), [choice exercise](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=294-5816), and [Practice Hub](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=294-6145). Page 10 remains supporting reference per [FIGMA.md](../FIGMA.md).

## Verified runtime/API checks

| Check | Observed result |
| --- | --- |
| Documented `docker compose up --build -d`, migrations and repeatable seed | Passed; API/database healthy, no volume reset |
| `node scripts/demo-api-smoke.mjs --restart-services` | 88 HTTP checks passed; two disposable accounts removed |
| Account/onboarding | Register/login, wrong-password response, persisted placement/preferences, invalid settings rejected atomically |
| Core learning | Course → unit → lesson reads; choice, sentence tiles, transcript gap, speaking self-assessment, matching; incorrect/correct feedback, hint, validation and answer history |
| Progress | Four seeded lessons complete for 52 XP; repeated completion awards zero; home IDs, streak, weekly totals and baseline agree |
| Secondary flows | Deck/card, reading progress, profile/support CRUD, friend acceptance, group/discussion CRUD, League/quests/achievements/notifications, Tutor reply and personal export |
| Ownership and private data | Unauthenticated private reads rejected; another account cannot read private deck/chat; lesson reads omit answer keys; export omits credentials |
| Persistence | Restarted both database and backend; existing session, XP, answer history, preferences, card and completed reading record survived |
| Actual Practice FE service against API/PostgreSQL | 56 HTTP checks passed; temporary learners removed |
| Typecheck, Prisma validation, backend build | Passed |
| Node regressions | 18 passed |
| Android JS/assets export | Passed |

API scripts complement native interaction; they do not establish that a screen renders or that device permissions work.

## Android UI acceptance

Passed on a native Android 15/API 35 emulator at 390 × 844 logical pixels:

| Flow | Observed result |
| --- | --- |
| Native app | Debug APK built, installed, and launched; updated JS bundle exported successfully |
| Welcome → register → email verification screen → skip verification | Passed; the app now routes an incomplete account into onboarding instead of directly into Learn |
| Onboarding | Completed all eight steps, saved the plan, and reached Learning Home |
| Learning Home → course → unit → lesson | Passed |
| Multiple-choice answer | Selected a wrong answer, saw explanatory feedback, retried, and saw correct-answer feedback |
| Sentence-tile answer | Built the expected sentence, saw correct feedback, completed the lesson, and saw the +14 XP result |
| Persisted progress | Returned to Home; streak and 14 XP were visible, and the next lesson was offered |
| Secondary practice flow | Opened Practice, opened the café dialogue, advanced the story, and saw “Reading position saved.” |
| Validation state | Empty registration displayed inline validation; the exercise check control stayed disabled until an answer was selected |

The skip-verification route exposed a real flow defect: the link went straight to Learn while `onboardingCompleted` was false. It now uses the existing authenticated continuation rule; a fresh emulator registration confirmed that the eight-step onboarding opens. The app still permits local demo use without verifying email.

Screenshots from the emulator run: [Learning Home](assets/android-learning-home.png), [Practice Hub](assets/android-practice-hub.png), [unanswered choice exercise](assets/android-lesson-choice.png), and [lesson result](assets/android-lesson-result.png).

Page 09 comparison confirmed the Garden visual language, five-tab navigation, learning/practice concepts, and the primary learning flow are represented. Screen content and card composition differ from the selected static Home and Practice frames (the app uses live progress and additional planner, mission, insight, vocabulary, and offline entry points). This pass verifies the selected navigation and interaction flow; it does not claim pixel parity across all frames. Page 10 remains an extended reference.

## Findings and disposition

Confirmed documentation issue:

```text
Severity: Medium
Location: README.md — Prerequisites
Problem: Native Android commands lacked the JDK/Android SDK prerequisites.
Impact: A new clone could pass Node setup but fail before building the app.
Recommended fix: Document the validated native prerequisites and SDK discovery.
Disposition: Fixed in this QA change.
```

Confirmed documentation drift:

```text
Severity: Medium
Location: docs/DATABASE.md — Current implementation
Problem: The seed summary still listed one dialogue after two reading seeds were added.
Impact: Demo setup expectations did not match the seeded content.
Recommended fix: Describe the three seeded reads without changing the schema.
Disposition: Fixed in this QA change.
```

Confirmed navigation defect fixed in this QA change:

```text
Severity: High
Location: mobile/app/(auth)/verify-email.tsx — “Skip for now and continue”
Problem: The route skipped onboarding even when an authenticated account had not completed setup.
Impact: A new learner could enter the core app without completing the required product setup flow.
Recommended fix: Continue through the existing onboarding-aware navigation rule.
Disposition: Fixed and verified on a fresh Android emulator account.
```

Figma comparison note:

```text
Severity: Medium
Location: mobile/app/(tabs)/learn.tsx and mobile/app/(tabs)/practice.tsx
Problem: The screens follow the Garden styling and logical flows, but their live-data cards and content order differ from the selected Page 09 static frames.
Impact: The flow is usable, but this QA run does not establish pixel-level design parity.
Recommended fix: Confirm the final Page 09 screen composition and schedule a focused visual-alignment pass if exact parity is required.
Disposition: Recorded; no broad visual redesign was included in the QA fix.
```

The first native build hit an external React Native Maven artifact read timeout. The downloaded artifact was verified against the official SHA-1 before populating the local Gradle cache and retrying. This is an environment recovery, not a source-code fix or a new repository dependency.

## Remaining scope and demo limits

- Enrollment/course-selection APIs remain planned; the core demo browses the curated course catalog. No enrollment implementation is claimed.
- Google OAuth needs real client IDs/a native build; live Google-account sign-in is separate acceptance. Verification/reset email is represented by local `[dev-mail]` tokens.
- Tutor is the documented rule-based local provider. Pronunciation/writing tools use guided examples and explicit self-assessment; no automatic AI grading is claimed.
- Offline exercises do not earn XP or submit queued answers. Reading changes sync explicitly. The dictionary has three seeded entries.
- Physical-device checks remain separate: microphone quality, native picker, airplane-mode cold start, download interruption recovery, queued reading sync, and account-isolation behavior on real hardware are not established by this emulator run. See [TESTING.md](../TESTING.md), [PRACTICE_HANDOFF.md](../PRACTICE_HANDOFF.md), and [TIEN_HANDOFF.md](../TIEN_HANDOFF.md).
- Passing this minimum smoke flow does not claim pixel parity for every Figma frame or hardware microphone quality.
