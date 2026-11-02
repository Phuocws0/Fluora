# Current Status

## Completed

- Documentation foundation and second consistency audit against the selected Figma scope.
- Initial npm-workspaces monorepo scaffold: Expo TypeScript app, Express TypeScript API with database-backed health check, Prisma/PostgreSQL schema and migrations, Docker Compose local runtime, and GitHub Actions CI.
- Created the GitHub backlog and four milestones; the open feature issues now include the 17 promoted Page 10 concepts and expanded learner-owned CRUD scope.
- Repository is public and `main` is protected: pull requests, one approval, and passing CI are required; only the owner can update or merge into `main`.
- Issue #6 learning-content schema, seed data, and read APIs are implemented; a seeded PostgreSQL API smoke check passed.
- Issue #2 mobile navigation shell is implemented with five logical tabs and auth/onboarding/detail destinations; typecheck and Android bundle export pass.

## In Progress

- Issue #3 identity backend, part 1 of 3 (see [plans/03-identity-onboarding-settings.md](plans/03-identity-onboarding-settings.md)): the identity schema and migration, scrypt password hashing, opaque bearer sessions, the `authenticate`/`requireUser` middleware, API-wide JSON 404/error handling, and register, login, logout, profile read/update, password change, and session list/revoke are implemented. A local Docker smoke check covered success, validation, ownership, revocation, and the support/practice integration. Settings, onboarding, placement (part 2), and email verification, password recovery, Google sign-in, and account deletion (part 3) remain planned.
- Issue #39 backend foundation: learner deck/card CRUD, import preview/import, custom review scheduling, curated story reads, story bookmarks, reading progress, and basic practice/study-tool/dictionary reads are implemented. Private routes now use the issue #3 bearer session. Mistake-derived review, word bookmarks, richer tool content, and story challenge answers remain planned.
- Issue #7 mobile learning flow is partially implemented: course catalog, course/unit/lesson navigation, lesson search, and learning-path comparison use the service layer and current APIs. Personalized continue-learning/progress and the lesson player remain unfinished.
- Issue #33 support/export backend foundation has merged: help articles, owner-scoped support requests, and local JSON export persistence are implemented. Private routes now use the issue #3 bearer session; exports include the public user fields and support requests.
- [PR #43](https://github.com/Phuocws0/Fluora/pull/43) merged the learning-data and mobile starter work.
- The remaining backlog is consolidated into 12 domain issues plus one Android QA issue. BE work is grouped by domain and can proceed independently; each corresponding FE issue records its API dependency. Issue #20 is assigned to Thành.

## Planned

1. Finish backend identity (#3 parts 2–3) and implement core learning (#27).
2. Integrate the matching FE flows when their API contracts are available; mobile sign-in (#4) can start against the implemented auth endpoints.
3. Continue through practice, community, profile/settings, support, and tutor flows in `docs/PRODUCT.md`.

## Known limitations

- Login has no rate limiting in this local demo.
- Existing feature controllers (`learning`, `support`, `practice`) still use their own error/UUID helpers; they can adopt `backend/src/http/*` later.

## Blocked

- None.

## Next Recommended Tasks

- Issue #3 part 2: settings, onboarding resume, and placement endpoints.
- Issue #27 core-learning APIs can now use `requireUser` and `res.locals.userId`.
