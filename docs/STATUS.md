# Current Status

## Completed

- Documentation foundation and second consistency audit against the selected Figma scope.
- Initial npm-workspaces monorepo scaffold: Expo TypeScript app, Express TypeScript API with database-backed health check, Prisma/PostgreSQL schema and migrations, Docker Compose local runtime, and GitHub Actions CI.
- Created the GitHub backlog and four milestones; the open feature issues now include the 17 promoted Page 10 concepts and expanded learner-owned CRUD scope.
- Repository is public and `main` is protected: pull requests, one approval, and passing CI are required; only the owner can update or merge into `main`.
- Issue #6 learning-content schema, seed data, and read APIs are implemented; a seeded PostgreSQL API smoke check passed.
- Issue #2 mobile navigation shell is implemented with five logical tabs and auth/onboarding/detail destinations; typecheck and Android bundle export pass.
- Issue #27 core learning activity API records answers and idempotent completions, derives progress/analytics/skill confidence, and supports planner/evidence CRUD, mission passport/completion, hints, and misconception dismiss/restore. Private routes use verified bearer sessions.
- Issue #3 identity backend ([plan](plans/03-identity-onboarding-settings.md)): part 1 (schema, scrypt passwords, bearer sessions, shared `backend/src/http/` helpers, register/login/logout, profile, password change, session list/revoke) merged in PR #47. Parts 2–3 are implemented together with issue #35: settings read/update/reset with onboarding completion, placement questions and attempts (with the skill-baseline fallback), email verification and resend, password forgot/reset, Google sign-in via `tokeninfo` (disabled unless `GOOGLE_CLIENT_IDS` is set), and account deletion that hands over owned groups and rooms.
- Issue #35 community, League, rooms, and rewards backend: friends and discovery with privacy rules, notifications (including lazy study reminders), study groups with membership, ownership transfer, discussion, and challenges, study rooms with messages and polls, peer review, group plan tasks and whiteboard notes, League tiers and leaderboard, daily quests, achievements, an append-only gem wallet, and reward redemption/cancellation. `/api/progress` and `/api/home` now return the real gem balance. A scripted Docker smoke test covered 55 success, validation, permission, privacy, concurrency, and deletion checks, and the PR #47 auth smoke test still passes.
- Issue #39 practice/vocabulary/reading API: owner-scoped deck/card and bookmark operations, validated import, scheduled custom and mistake-derived review, reading progress, curated story challenge linked to the core exercise API, and demo study-tool/dictionary reads. Mistakes derive from immutable learner answers and can be dismissed without editing that history.
- Issue #33 help articles, owner-scoped support-request CRUD, and local JSON exports of current learner-owned data are implemented. Exports omit passwords, bearer sessions, and authentication-token hashes.
- Issue #32 Flo Tutor backend: provider status, three curated A1 role-play scenarios with branching turns and a hint ladder, owner-scoped chats with question/exercise/mistake/explain context and feedback, learner-message edit/delete that regenerates or removes the linked reply, saved notes CRUD, temporary chats when `saveTutorHistory` is off, and confirmed clear-history. The default `local` provider is an offline, rule-based demo tutor; `TUTOR_PROVIDER=off` returns `503` without blocking lessons. Exports (`version:3`) and account deletion include tutor data. A scripted Docker smoke test covered 34 success, validation, ownership, privacy, concurrency, provider-off, export, and deletion checks; the #35 and auth smoke tests still pass.

## In Progress

- Issue #7 mobile learning flow is partially implemented: course catalog, course/unit/lesson navigation, lesson search, and learning-path comparison use the service layer and current APIs. Personalized continue-learning/progress and the lesson player remain unfinished.
- Mobile Google sign-in is implemented for native builds and connects to `POST /api/auth/google`. End-to-end sign-in requires a development build and valid Google OAuth client IDs.
- [PR #43](https://github.com/Phuocws0/Fluora/pull/43) merged the learning-data and mobile starter work.
- The remaining backlog is consolidated into 12 domain issues plus one Android QA issue. BE work is grouped by domain and can proceed independently; each corresponding FE issue records its API dependency. Issue #20 is assigned to Thành.

## Planned

1. Integrate mobile account/onboarding (#4), profile/settings (#20), and League/community (#17) with the implemented APIs.
2. Build the mobile Tutor tab (#22) against the implemented tutor API.
3. Continue through the remaining practice, support, and tutor flows in `docs/PRODUCT.md`.

## Known limitations

- Login, forgot-password, and resend have no rate limiting in this local demo.
- No email is sent: verification and reset tokens are only written to the backend log (`[dev-mail]` lines).
- Google sign-in can only be verified end to end with a real OAuth client ID; without `GOOGLE_CLIENT_IDS` it returns `503`.
- League tiers, quest targets, and reward prices are calibrated to the four seeded lessons (52 XP in total per learner); scale them when more content is seeded.
- The "finish 1 story" quest counts a story whose reading progress is completed and was last saved today.
- Study reminders appear only when the learner opens notifications; there is no push delivery or scheduler. Room messages and polls refresh by request (no real-time delivery).
- Re-running the seed moves the demo learners' lesson completions to the current time so the weekly leaderboard keeps data.
- Existing feature controllers (`learning`, `support`, `practice`, `activity`) still use their own error/UUID helpers; they can adopt `backend/src/http/*` later.
- Enrollment-aware home selection is not implemented.
- The Flo Tutor has no real AI provider yet: the `local` provider matches keywords against curated topics and role-play replies, so free-form questions outside those topics get a fallback answer. A provider can be added behind `TutorProvider` without changing the API.
- Temporary (unsaved) tutor chats are deleted on the learner's next tutor request after 60 minutes of inactivity, so an expired chat can remain in the database until then.

## Blocked

- None.

## Next Recommended Tasks

- Connect mobile email sign-in, onboarding, placement, and settings screens (#4, #20) to the identity APIs.
- Build the League/community mobile screens (#17) against the implemented contracts.
- Build the Tutor mobile screens (#22) against the implemented tutor contract, including the `503` unavailable state and temporary-chat `expiresAt`.
