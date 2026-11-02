# Architecture

## Current implementation

Fluora is an npm-workspaces monorepo. The implementation is an initial local-demo scaffold with one connected learning flow:

- `mobile/` is an Expo SDK 57 React Native TypeScript app using Expo Router. It has the five logical tabs and reads published courses, units, lessons, lesson search results, and learning paths through a mobile service layer. The auth, practice, tutor, league, and profile feature UIs remain placeholders.
- `backend/` is one Express 5 TypeScript app. It exposes `GET /health`, public learning-content, help, and story reads, partial support/export, vocabulary, import, review, bookmark, and reading-progress routes, and account registration, login, logout, profile, password, and session management. An `authenticate` middleware resolves bearer sessions into `res.locals.userId` for every `/api` route; private routes return `401` without one. Shared HTTP helpers live in `backend/src/http/` (errors, validation, auth).
- `backend/prisma/schema.prisma` contains `User` with identity models (sessions, settings, auth tokens, placement attempts), curated learning-content models, support/export models, and vocabulary, story, bookmark, reading-progress, and review models with checked-in migrations. Learner-owned answer/lesson-progress data is not implemented.
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

- **Mobile frontend:** Render screens and reusable UI, manage Expo Router navigation and interaction state, call backend services through REST/JSON, and manage device-local downloads/unsent drafts. The current learning feature separates route files, feature screens/services, shared components, API transport, and response types.
- **Backend:** Expose the API, validate requests, apply application logic, and use Prisma for synchronized account, learning, practice, community, rewards, and tutor data.
- **Database:** Store durable account, learning-content, answer, progress, planning, vocabulary, community, reward, support, and tutor records as required by selected demo interactions. Analytics and totals can be derived from source records.
- **CI:** Run lightweight static and build checks. It does not deploy the application.

Offline course files and download-queue progress are device-local; the backend serves course/unit/lesson content. Do not add a separate download service or storage platform for the local demo.

## Planned and optional work

- **Implemented starter:** Logical five-tab navigation and the public learning-content read flow from Learning Home through course, unit, lesson preview, lesson search, and learning-path comparison.
- **Planned:** Continue learner features from `docs/PRODUCT.md`; add learner progress before claiming a personalized continue-learning state.
- **Optional future improvements:** Add structure or tooling only when a concrete implementation need appears. No additional infrastructure is currently required.

See [API.md](API.md), [DATABASE.md](DATABASE.md), [ROUTES.md](ROUTES.md), and [TESTING.md](TESTING.md) for current contracts and guidance.
