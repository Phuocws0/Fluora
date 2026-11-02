# Current Status

## Completed

- Documentation foundation and second consistency audit against the selected Figma scope.
- Initial npm-workspaces monorepo scaffold: Expo TypeScript app, Express TypeScript API with database-backed health check, Prisma/PostgreSQL schema and migrations, Docker Compose local runtime, and GitHub Actions CI.
- Created the GitHub backlog and four milestones; the open feature issues now include the 17 promoted Page 10 concepts and expanded learner-owned CRUD scope.
- Repository is public and `main` is protected: pull requests, one approval, and passing CI are required; only the owner can update or merge into `main`.
- Issue #6 learning-content schema, seed data, and read APIs are implemented; a seeded PostgreSQL API smoke check passed.
- Issue #2 mobile navigation shell is implemented with five logical tabs and auth/onboarding/detail destinations; typecheck and Android bundle export pass.
- Issue #27 core learning activity API records answers and idempotent completions, derives progress/analytics/skill confidence, and supports planner/evidence CRUD, mission passport/completion, hints, and misconception dismiss/restore. Private routes use verified bearer sessions.
- Issue #39 practice/vocabulary/reading API: owner-scoped deck/card and bookmark operations, validated import, scheduled custom and mistake-derived review, reading progress, curated story challenge linked to the core exercise API, and demo study-tool/dictionary reads. Mistakes derive from immutable learner answers and can be dismissed without editing that history.
- Issue #33 help articles, owner-scoped support-request CRUD, and local JSON exports of current learner-owned data are implemented. Exports omit passwords, bearer sessions, and authentication-token hashes.

## In Progress

- Issue #3 identity backend, part 1 of 3 (see [plans/03-identity-onboarding-settings.md](plans/03-identity-onboarding-settings.md)): the identity schema and migration, scrypt password hashing, opaque bearer sessions, the `authenticate`/`requireUser` middleware, API-wide JSON 404/error handling, and register, login, logout, profile read/update, password change, and session list/revoke are implemented. A local Docker smoke check covered success, validation, ownership, revocation, and the support/practice integration. Settings, onboarding, placement (part 2), and email verification, password recovery, Google sign-in, and account deletion (part 3) remain planned.
- Issue #7 mobile learning flow is partially implemented: course catalog, course/unit/lesson navigation, lesson search, and learning-path comparison use the service layer and current APIs. Personalized continue-learning/progress and the lesson player remain unfinished.
- [PR #43](https://github.com/Phuocws0/Fluora/pull/43) merged the learning-data and mobile starter work.
- The remaining backlog is consolidated into 12 domain issues plus one Android QA issue. BE work is grouped by domain and can proceed independently; each corresponding FE issue records its API dependency. Issue #20 is assigned to Thành.

## Planned

1. Finish backend identity (#3 parts 2–3), including settings and placement.
2. Integrate mobile sign-in (#4) and lesson/progress UI (#7) with the implemented APIs.
3. Continue through practice, community, profile/settings, support, and tutor flows in `docs/PRODUCT.md`.

## Known limitations

- Login has no rate limiting in this local demo.
- Existing feature controllers (`learning`, `support`, `practice`) still use their own error/UUID helpers; they can adopt `backend/src/http/*` later.
- Enrollment-aware home selection, placement-based baseline, and real gem/reward accounting belong to later domain work.

## Blocked

- None.

## Next Recommended Tasks

- Issue #3 part 2: settings, onboarding resume, and placement endpoints.
- Connect mobile sign-in and lesson/progress screens to the bearer-session and learning-activity APIs.
