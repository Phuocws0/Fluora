# Current Status

## Completed

- Documentation foundation and second consistency audit against the selected Figma scope.
- Initial npm-workspaces monorepo scaffold: Expo TypeScript app, Express TypeScript API with database-backed health check, Prisma/PostgreSQL schema and migrations, Docker Compose local runtime, and GitHub Actions CI.
- Created the GitHub backlog and four milestones; the open feature issues now include the 17 promoted Page 10 concepts and expanded learner-owned CRUD scope.
- Repository is public and `main` is protected: pull requests, one approval, and passing CI are required; only the owner can update or merge into `main`.
- Issue #6 learning-content schema, seed data, and read APIs are implemented; a seeded PostgreSQL API smoke check passed.
- Issue #2 mobile navigation shell is implemented with five logical tabs and auth/onboarding/detail destinations; typecheck and Android bundle export pass.

## In Progress

- Issue #39 backend branch: learner deck/card CRUD, import preview/import, custom review scheduling, curated story reads, story bookmarks, reading progress, and basic practice/study-tool/dictionary reads are implemented. Private routes await verified session identity from issue #3. Mistake-derived review, word bookmarks, richer tool content, and story challenge answers remain planned.
- Issue #7 mobile learning flow is partially implemented: course catalog, course/unit/lesson navigation, lesson search, and learning-path comparison use the service layer and current APIs. Personalized continue-learning/progress and the lesson player remain unfinished.
- Issue #33 support/export backend branch: help articles, owner-scoped support requests, and local JSON export persistence are implemented. Private routes await verified bearer-session identity from issue #3; exports currently include the existing user fields and support requests.
- [PR #43](https://github.com/Phuocws0/Fluora/pull/43) merged the learning-data and mobile starter work.
- The remaining backlog is consolidated into 12 domain issues plus one Android QA issue. BE work is grouped by domain and can proceed independently; each corresponding FE issue records its API dependency. Issue #20 is assigned to Thành.

## Planned

1. Implement backend identity (#3) and core-learning (#27) domains.
2. Integrate the matching FE flows when their API contracts are available.
3. Continue through practice, community, profile/settings, support, and tutor flows in `docs/PRODUCT.md`.

## Blocked

- None.

## Next Recommended Tasks

- Implement backend issue #3 and issue #27 as independent domain tasks; FE issues identify their API prerequisites.
