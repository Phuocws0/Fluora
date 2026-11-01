# Fluora

Fluora is a mobile language-learning app intended for local demonstration. The product scope and selected Figma flows are documented in [`docs/PRODUCT.md`](docs/PRODUCT.md) and [`docs/FIGMA.md`](docs/FIGMA.md).

## Stack

- Mobile: React Native, Expo SDK 57, TypeScript
- Backend: Node.js 24, Express 5, TypeScript, Prisma ORM 7
- Database: PostgreSQL 17
- Local runtime: Docker Compose for backend and PostgreSQL; Expo runs on the host
- CI: GitHub Actions typecheck, Prisma validation, backend build, and Android bundle export

## Repository structure

```text
fluora/
├── .agents/skills/          # Fluora-specific agent workflows
├── .github/workflows/ci.yml
├── backend/                 # Express app, Prisma schema and migrations
├── docs/                    # Product, architecture, design, API and workflow docs
├── mobile/                  # Expo React Native app
├── docker-compose.yml       # Local backend + PostgreSQL runtime
└── package.json             # npm workspaces and shared commands
```

The mobile app is currently a runnable placeholder. The backend currently exposes only a database-backed health check. Learner features and their APIs are still planned.

## Prerequisites

- Node.js 24 and npm
- Docker with Docker Compose
- An Android emulator or device for the mobile demo; Expo also provides iOS and web start commands

## Run locally

Copy the environment template and install workspace dependencies:

```sh
cp .env.example .env
npm ci
```

The values in `.env.example` are local placeholders. Change the local PostgreSQL password and matching `DATABASE_URL` before starting services. `.env` is ignored by Git.

Start the backend and database:

```sh
docker compose up --build -d
```

The backend applies checked-in Prisma migrations on startup and listens inside Docker on port `4000`; it is published at `http://localhost:4000` by default. Set `PORT` in `.env` to change the host-published backend port. Its database-backed health endpoint is `GET /health`. PostgreSQL is published on port `5433` by default to avoid conflicting with a local PostgreSQL server.

Start Expo in a second terminal:

```sh
npm run dev:mobile
```

For an Android emulator, use `npm run android --workspace @fluora/mobile` or press `a` in the Expo terminal. The mobile placeholder does not call the API yet.

Stop local containers while keeping the database volume:

```sh
docker compose down
```

When changing the Prisma schema, create and apply a migration from the host after the database is running:

```sh
npm run db:migrate --workspace @fluora/backend -- --name describe_change
```

Do not reset the database as a routine setup step.

## Verification commands

```sh
npm run typecheck
npm run prisma:validate
npm run build
npm run check:mobile
```

GitHub Actions runs these checks on pull requests and pushes to `main`. There are no feature tests yet.

## Documentation

- [Product scope](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Figma references](docs/FIGMA.md)
- [Navigation model](docs/ROUTES.md)
- [API contract](docs/API.md)
- [Database model](docs/DATABASE.md)
- [Testing and verification](docs/TESTING.md)
- [Current status](docs/STATUS.md)
- [Agent instructions](AGENTS.md)
