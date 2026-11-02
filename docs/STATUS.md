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

## In Progress

- Issue #39 backend foundation: learner deck/card CRUD, import preview/import, custom review scheduling, curated story reads, story bookmarks, reading progress, and basic practice/study-tool/dictionary reads are implemented. Mistake-derived review, word bookmarks, richer tool content, and story challenge answers remain planned.
- Issue #7 mobile learning flow is partially implemented: course catalog, course/unit/lesson navigation, lesson search, and learning-path comparison use the service layer and current APIs. Personalized continue-learning/progress and the lesson player remain unfinished.
- Issue #33 support/export backend foundation has merged: help articles, owner-scoped support requests, and local JSON export persistence are implemented. Exports include the public user fields and support requests; settings, community, and wallet data are not included yet.
- [PR #43](https://github.com/Phuocws0/Fluora/pull/43) merged the learning-data and mobile starter work.
- The remaining backlog is consolidated into 12 domain issues plus one Android QA issue. BE work is grouped by domain and can proceed independently; each corresponding FE issue records its API dependency. Issue #20 is assigned to Thành.

## Planned

1. Integrate mobile account/onboarding (#4), profile/settings (#20), and League/community (#17) with the implemented APIs.
2. Implement the Flo Tutor backend (#32); it should read `saveTutorHistory` through `getPrivacySettings` in `features/identity/settings.service.ts`.
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

## Blocked

- None.

## Next Recommended Tasks

- Connect mobile sign-in, onboarding, placement, and settings screens (#4, #20) to the identity APIs.
- Build the League/community mobile screens (#17) against the implemented contracts.
