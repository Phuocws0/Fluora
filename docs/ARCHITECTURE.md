# Architecture

## Current implementation

Fluora is an npm-workspaces monorepo. The implementation is an initial local-demo scaffold with one connected learning flow:

- `mobile/` is an Expo SDK 57 React Native TypeScript app using Expo Router. It has the five logical tabs and reads published courses, units, lessons, lesson search results, and learning paths through a mobile service layer. The auth, practice, tutor, league, and profile feature UIs remain placeholders.
- `backend/` is one Express 5 TypeScript app. It exposes `GET /health`, public learning-content, help, story, hint, and mission reads, plus account/session management and partial support/export, practice, learning activity, progress, planner, evidence, mission, and insights APIs. Shared `backend/src/http/` middleware resolves bearer sessions before private routes; routes return `401` without a valid session.
- `backend/prisma/schema.prisma` contains identity, curated content, support/export, practice, answer/completion, planner/evidence, mission, and misconception models with checked-in migrations. Settings, placement, verification, and reset tables exist, while their API flows remain in progress under issue #3.
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
