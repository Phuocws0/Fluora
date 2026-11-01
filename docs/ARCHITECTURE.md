# Architecture

## Current state

The repository currently contains no application code, package configuration, Prisma schema, or Docker Compose file. The architecture below is the intended plan, not an implemented system.

## Planned application shape

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

Fluora is intended to remain a monorepo, with mobile and backend code in the same repository. The backend is one application. The current scope does not require microservices, an API Gateway, Redis, Kafka, or cloud deployment.

## Planned local development

```text
Host machine
├── React Native + Expo
│
└── Docker Compose
    ├── Express backend
    └── PostgreSQL
```

React Native / Expo runs directly on the host and does not need to run inside Docker. Docker Compose is intended for the backend and database local runtime. Exact configuration and commands remain to be created.

## Responsibilities

- **Mobile frontend:** Render screens and reusable UI, manage navigation and interaction state, call backend services through REST/JSON, and manage device-local downloads/unsent drafts.
- **Backend:** Expose the API, validate requests, apply application logic, and use Prisma for synchronized account, learning, practice, community, rewards, and tutor data.
- **Database:** Store durable account, learning-content, answer, progress, planning, vocabulary, community, reward, support, and tutor records as required by selected demo interactions. Analytics and totals can be derived from source records.

Offline course files and download-queue progress are device-local; the backend serves the existing course/unit/lesson content. Do not add a separate download service or storage platform for the local demo.

## Architecture status

- **Current:** Documentation only; there is no implementation to describe.
- **Planned:** React Native + Expo mobile app, Express + TypeScript backend, Prisma, PostgreSQL, and local Docker Compose for backend/database.
- **Optional future improvements:** Add structure or tooling only when a concrete implementation need appears. No additional infrastructure is currently required.

See [API.md](API.md), [DATABASE.md](DATABASE.md), and [ROUTES.md](ROUTES.md) for the planned contracts and navigation model.
