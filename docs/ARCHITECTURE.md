# Architecture

## Current implementation

Fluora is an npm-workspaces monorepo for a local demo. The mobile app has a connected learning flow and initial League/community and Tutor screens:

- `mobile/` is an Expo SDK 57 React Native TypeScript app using Expo Router. It has five logical tabs, a learning content flow, League/community screens, and a Flo Tutor screen with a backend API adapter and an explicit in-memory preview. Account/onboarding, practice, and profile screens are still incomplete.
- `backend/` is one Express 5 TypeScript app. It exposes `GET /health`; public learning-content, help, story, hint, mission, and placement-question reads; account, session, settings, placement, email-verification, password-recovery, Google sign-in, and account-deletion APIs; learning activity, progress, planner, evidence, mission, and insights APIs; community (friends, profiles, notifications), study groups, rooms, polls, peer review, group plan and whiteboard, League, quests, achievements, wallet, and rewards APIs; Flo Tutor status, role-play, chat/message, hint, history, and note APIs; and partial support/export and practice APIs. Shared `backend/src/http/` code resolves bearer sessions, validates input, paginates lists, and returns JSON errors; private routes return `401` without a valid session.
- Feature modules live in `backend/src/features/<domain>/` (identity, learning, activity, practice, support, community, groups, rooms, league, tutor) as routes, controllers, and services over Prisma. Membership and role checks for groups and rooms are centralized in `features/groups/access.ts`; privacy decisions in `features/community/visibility.ts`; and reads of other domains' activity data for the League in `features/league/activity.ts`. Flo's replies come from one `TutorProvider` interface in `features/tutor/provider/`; the default `local` provider is an offline, rule-based demo tutor, and `TUTOR_PROVIDER=off` makes the tutor unavailable.
- `backend/prisma/schema.prisma` contains identity, curated content, support/export, practice, answer/completion, planner/evidence, mission, misconception, community, League, rewards, and tutor models with checked-in migrations.
- Verification and password-reset emails are not sent in this local demo; the backend logs each one-time token with a `[dev-mail]` prefix. Google sign-in is enabled only when `GOOGLE_CLIENT_IDS` is set.
- `backend/src/db/seed.ts` provides repeatable demo content seeding; apply it explicitly after migrations.
- `docker-compose.yml` runs the backend and PostgreSQL. Expo runs directly on the host.
- `.github/workflows/ci.yml` runs typecheck, Prisma validation, backend build, and Android bundle export on pull requests and pushes to `main`.

## Intended application shape

```text
React Native + Expo
        │
        │ REST / JSON
        ▼
Node.js + Express
        │
      Prisma
        │
        ▼
PostgreSQL
```

Mobile and backend code remain in this repository. The backend stays one application. The current scope does not require microservices, an API Gateway, Redis, Kafka, or cloud deployment.

## Local development

```text
Host machine
├── React Native + Expo
│
└── Docker Compose
    ├── Express backend
    └── PostgreSQL
```

Run Expo on the host; it does not need Docker. Compose starts PostgreSQL and the backend, applies checked-in migrations, then starts the API. PostgreSQL is published on host port `5433` by default. The backend listens on port `4000` inside Docker and is published on host port `4000` by default (`PORT` can change the host port). See [README.md](../README.md) for setup commands.

## Responsibilities

- **Mobile frontend:** Render screens and reusable UI, manage Expo Router navigation and interaction state, call backend services through REST/JSON, and manage device-local downloads/unsent drafts. Feature modules separate route files, screens, services, shared components, API transport, and response types.
- **Backend:** Expose the API, validate requests, apply application logic, and use Prisma for synchronized account, learning, practice, community, rewards, and tutor data.
- **Database:** Store durable account, learning-content, answer, progress, planning, vocabulary, community, reward, support, and tutor records as required by selected demo interactions. Analytics and totals can be derived from source records.
- **CI:** Run lightweight static and build checks. It does not deploy the application.

Offline course files and download-queue progress are device-local; the backend serves course/unit/lesson content. Do not add a separate download service or storage platform for the local demo.

## Planned and optional work

- **Implemented starter:** Logical five-tab navigation and the public learning-content read flow from Learning Home through course, unit, lesson preview, lesson search, and learning-path comparison.
- **Planned:** Continue the account/onboarding, profile/settings, practice, and personalized learning flows in `docs/PRODUCT.md`. League/community and Tutor screens still need Android and live-backend acceptance.
- **Optional future improvements:** Add structure or tooling only when a concrete implementation need appears. No additional infrastructure is currently required.

See [API.md](API.md), [DATABASE.md](DATABASE.md), [ROUTES.md](ROUTES.md), and [TESTING.md](TESTING.md) for current contracts and guidance.
