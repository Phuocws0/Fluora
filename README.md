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

The mobile app has the five-tab navigation shell, a learning flow backed by course/unit/lesson APIs, League/community screens, and a Flo Tutor screen connected to the Tutor API with a separate in-memory preview. The backend supports accounts (registration, login, sessions, settings, placement, email verification, password recovery, optional Google sign-in, account deletion), learning activity and progress, and the community, League, rewards, and Tutor APIs. The main mobile account screens and remaining practice/profile features are still planned. See [the handoff](docs/TIEN_HANDOFF.md) for screen coverage and outstanding device/backend acceptance checks. Other unfinished destinations show a simple placeholder.

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

The seed command is safe to run again and does not reset the database. Besides the course, it adds daily quests, achievements, reward-shop items, peer-review samples, three Flo Tutor role-play scenarios, and three password-less demo learners (`demo.*@fluora.local`) so search, profiles, and the League leaderboard have data. The API is under `/api`; see [API.md](docs/API.md) for endpoints and response shapes.

This local demo sends no email. Email-verification and password-reset tokens are written to the backend log instead; read them with:

```sh
docker compose logs -f backend
```

Each token appears once on a line starting with `[dev-mail]`.

The Flo Tutor uses `TUTOR_PROVIDER=local` by default: an offline, rule-based demo tutor that needs no API key. Set `TUTOR_PROVIDER=off` in `.env` and recreate the backend container to check the "Flo is unavailable" state.

Google sign-in uses a native module, so it needs a development build and does not run in Expo Go. Set the public web client ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and include that same ID in `GOOGLE_CLIENT_IDS` so the backend accepts the returned ID token. For Android, register package `com.fluora.mobile` and the development build's SHA-1 fingerprint in Google Cloud Console. For iOS, also set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; the app config uses it to register the callback URL scheme. These OAuth client IDs are public identifiers, not secrets. After changing `.env`, recreate the backend container.

Build and start the native Android app in a second terminal. From the repository root, load the environment values first so Expo receives the Google client IDs:

```sh
set -a
. ./.env
set +a
npm run android --workspace @fluora/mobile
```

The native Google module requires a development build; Expo Go cannot load it. `npm run ios --workspace @fluora/mobile` builds the iOS app when an iOS client ID is configured. For a physical device or a different backend host, set `EXPO_PUBLIC_API_URL` to an address reachable from that device before building or starting Metro, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npm run android --workspace @fluora/mobile`.

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

GitHub Actions runs these checks on pull requests and pushes to `main`. Focused mobile transport and Tutor-preview unit checks can be run with `node --experimental-vm-modules --test scripts/mobile-features.test.mjs`; live API/device acceptance remains separate.

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
