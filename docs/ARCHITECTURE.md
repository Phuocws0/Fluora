# Architecture

## Current implementation

Fluora is an npm-workspaces monorepo. The implementation is an initial runnable scaffold, not the learner application:

- `mobile/` is an Expo SDK 57 React Native TypeScript placeholder with no navigation or product features.
- `backend/` is one Express 5 TypeScript app. It exposes `GET /health` and public, read-only course, unit, lesson, lesson-search, and learning-path endpoints under `/api`.
- `backend/prisma/schema.prisma` contains the initial `User` model and the curated `Course`, `Unit`, `Lesson`, `Exercise`, `ExerciseOption`, and `LearningPath` models with checked-in migrations. Authentication and learner-owned answer/progress data are not implemented.
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

- **Mobile frontend:** Render screens and reusable UI, manage navigation and interaction state, call backend services through REST/JSON, and manage device-local downloads/unsent drafts.
- **Backend:** Expose the API, validate requests, apply application logic, and use Prisma for synchronized account, learning, practice, community, rewards, and tutor data.
- **Database:** Store durable account, learning-content, answer, progress, planning, vocabulary, community, reward, support, and tutor records as required by selected demo interactions. Analytics and totals can be derived from source records.
- **CI:** Run lightweight static and build checks. It does not deploy the application.

Offline course files and download-queue progress are device-local; the backend serves course/unit/lesson content. Do not add a separate download service or storage platform for the local demo.

## Planned and optional work

- **Planned:** Implement logical navigation and learner features from `docs/PRODUCT.md`, then extend API/schema in step with those features.
- **Optional future improvements:** Add structure or tooling only when a concrete implementation need appears. No additional infrastructure is currently required.

See [API.md](API.md), [DATABASE.md](DATABASE.md), [ROUTES.md](ROUTES.md), and [TESTING.md](TESTING.md) for current contracts and guidance.
