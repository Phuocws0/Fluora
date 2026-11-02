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
├── mobile/
│   ├── app/                 # Expo Router destinations and tab layout
│   ├── components/          # Shared UI
│   ├── features/learning/   # Learning screens and feature API methods
│   ├── services/            # Shared HTTP transport
│   └── types/               # Mobile API response types
├── docker-compose.yml       # Local backend + PostgreSQL runtime
└── package.json             # npm workspaces and shared commands
```

The mobile app now has the five-tab navigation shell and a first learning flow backed by the curated course, unit, lesson, search, and learning-path APIs. The backend also supports accounts (registration, login, sessions, settings, placement, email verification, password recovery, optional Google sign-in, account deletion), learning activity and progress, and the community, League, and rewards APIs. The mobile account screens, community screens, and the remaining feature screens are still planned. Unfinished destinations show a simple placeholder.

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

Seed the demonstration course after the backend and database are running:

```sh
npm run db:seed --workspace @fluora/backend
```

The seed command is safe to run again and does not reset the database. Besides the course, it adds daily quests, achievements, reward-shop items, peer-review samples, and three password-less demo learners (`demo.*@fluora.local`) so search, profiles, and the League leaderboard have data. The API is under `/api`; see [API.md](docs/API.md) for endpoints and response shapes.

This local demo sends no email. Email-verification and password-reset tokens are written to the backend log instead; read them with:

```sh
docker compose logs -f backend
```

Each token appears once on a line starting with `[dev-mail]`. Google sign-in (`POST /api/auth/google`) stays disabled and returns `503` until you set `GOOGLE_CLIENT_IDS` in `.env` to your OAuth client IDs (comma-separated) and recreate the backend container.

Start Expo in a second terminal:

```sh
npm run dev:mobile
```

For an Android emulator, use `npm run android --workspace @fluora/mobile` or press `a` in the Expo terminal. The app connects to the backend at `10.0.2.2:4000` on Android emulators and `localhost:4000` on iOS simulators and web. For a physical device or a different host, set `EXPO_PUBLIC_API_URL` to an address reachable from that device before starting Expo, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npm run dev:mobile`.

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

The public `main` branch requires a pull request, one approval, and passing CI. Only the repository owner can update or merge into `main`; collaborators can push work to feature branches.

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
