# Android UI Review — Figma Page 10

Reviewed: 2026-11-04

Reference: [Page 10 · Interface Diversity Draft — Fluora](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=262-2032)

Page 09 remains the primary flow reference; Page 10 supplies extended states and selected draft concepts. This review covered the implemented welcome/auth and onboarding flow, Learning Home/course/unit/lesson/result, Practice, League, Profile, and Flo Tutor. Frames were mapped to screens, components, and states rather than treated as one route each. The Figma file contains many additional explorations; this note records the checked flows and does not claim pixel parity for every frame.

## Changes made

- Reduced duplicated top spacing using the actual safe-area inset on onboarding and shared screen containers. This keeps headers near the Page 10 position on Android while respecting status bars and cutouts.
- Aligned Learning Home typography, course-card copy width, progress placement, stat cards, and lesson-step spacing with the Page 10 Garden treatment. The seeded first unit is now named **First greetings**, matching the design.
- Set bottom-tab icons to the 20 px size used in Page 10.
- Replaced the Tutor's square-background mascot with the Page 10 Flo vector rendered as a transparent, high-resolution asset. Verified the mascot appears on the white screen without a colored or black square on Android.
- Kept Practice and Profile sticky actions clear of their adjacent content at the tested viewport.
- Corrective verification also fixed dictation copy/transcript behavior, enabled provider-mislabelled CSV files through native file picking, and clarified that speaking practice is not automatically transcribed. See the [functional/UX report](qa/2026-11-04-functional-ux-audit.md).

## Intentional differences from the Figma draft

- **Email sign-in only:** the current demo uses email/password in Expo Go. The Page 10 Google sign-in option is omitted per the product owner's earlier request to use ordinary email sign-in.
- **Welcome shortcut:** the app keeps its Fluora wordmark and direct sign-in shortcut on Welcome to make returning-learner access clear; these are not shown in the Page 10 Welcome frame.
- **Live learner data:** streak, XP, gems, learner name, leaderboard entries, and completion counts are dynamic. Do not replace them with the Figma sample values for visual parity. Home now displays real XP and the lesson header displays the exercise counter instead of an undefined hearts mechanic.
- **Demo content volume:** the expanded seeded catalog has three courses, six units, and 12 lessons, so course and leaderboard density can differ from the static designs. Use actual seeded/account counts.
- **Responsive accessibility:** CEFR uses a wrapping A1–C2 grid instead of fixed stepped positions. Learning cards grow with larger text, and Focus/caption/reduced-motion/break controls have explicit behavior. English and Vietnamese are available for app UI; curated course and exercise content currently remains in English. These usability changes intentionally take priority over a literal draft layout.
- **Device chrome:** Android status/navigation bars and their time/system icons come from the emulator and will differ from Figma's static device chrome.
- **Draft treatments:** where Page 10 marks an interaction as a draft or presents alternatives, keep the established Page 09 flow and existing product behavior unless a specific draft concept is approved in `docs/FIGMA.md`.

## Verification

- Android API 35 emulator, two CPU cores, 720 × 1600 display at 320 dpi. The AVD requests 1536 MB RAM; emulator 37.2.13 raised the guest memory to its 2560 MB minimum at startup.
- Opened and visually checked Learning Home, Practice, Profile, Flo Tutor, and League after the changes. The app launched and served the updated screens from the local Expo development server.
- `npm run typecheck`, `npm run build`, and `npm run check:mobile` completed successfully. The mobile export was repeated after the transparent mascot asset was fixed.

The emulator pass is a visual smoke check, not a claim that every Page 10 frame or native-device edge case has been individually accepted. See [TESTING.md](TESTING.md) for the broader demo checks.
