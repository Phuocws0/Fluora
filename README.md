# Fluora

Fluora is a mobile language-learning app intended for local demonstration. The product scope and selected Figma flows are documented in [`docs/PRODUCT.md`](docs/PRODUCT.md) and [`docs/FIGMA.md`](docs/FIGMA.md).

## Stack

- Mobile: React Native, Expo SDK 57, TypeScript
- Backend: Node.js 24, Express 5, TypeScript, Prisma ORM 7
- Database: PostgreSQL 17
- Local runtime: Docker Compose for backend and PostgreSQL; Expo runs on the host
- CI: GitHub Actions typecheck, Prisma validation, backend build, focused regression checks, and Android bundle export

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

The mobile app connects learning, account/onboarding, profile/settings, Practice/vocabulary/reading/offline, League/community, and Flo Tutor flows to the existing backend. Tutor also offers a separate in-memory preview. Backend APIs cover those domains; some study tools and dictionary entries intentionally use small curated demo datasets. See the [Practice handoff](docs/PRACTICE_HANDOFF.md), [League/Tutor handoff](docs/TIEN_HANDOFF.md), and [current status](docs/STATUS.md) for coverage and outstanding native-device acceptance.

## Prerequisites

- Node.js 24 and npm
- Docker with Docker Compose
- An Android emulator or device for the mobile demo; Expo also provides iOS and web start commands
- Native Android builds also need a JDK and Android SDK (Android Studio can manage these). The QA environment uses JDK 21, SDK platform/build-tools 36, and NDK `27.1.12297006`; Gradle installs missing licensed native build packages. Set `ANDROID_HOME` to your SDK directory and make `adb` available on `PATH`. Enable USB debugging for a device, or start an emulator with hardware acceleration.

## Run locally

Copy the environment template and install workspace dependencies:

```sh
cp .env.example .env
npm ci
```

The values in `.env.example` are local placeholders. Change the local PostgreSQL password and matching `DATABASE_URL` before starting services. `.env` is ignored by Git.

Start the backend/database, apply migrations, and load all demo fixtures:

```sh
npm run demo:setup
```

The backend applies checked-in Prisma migrations on startup and listens inside Docker on port `4000`; it is published at `http://localhost:4000` by default. Set `PORT` in `.env` to change the host-published backend port. Its database-backed health endpoint is `GET /health`. PostgreSQL is published on port `5433` by default to avoid conflicting with a local PostgreSQL server.

The checked-in seed provides four email/password accounts, three courses, 12 lessons/22 exercises, personal practice/progress, groups/rooms/polls, rewards and Tutor history. Demo accounts share the deliberately public local test password `FluoraDemo123!` (optional first-seed override: `DEMO_PASSWORD`). See [demo accounts, repeat-seed behavior, import files and walkthrough](docs/DEMO.md).

To refresh an existing runtime after pulling seed changes:

```sh
docker compose exec -T backend npm run db:seed --workspace @fluora/backend
```

Each teammate gets these fixtures in their own local database; Git does not contain the Docker data volume. This command does not reset the database. The API is under `/api`; see [API.md](docs/API.md).

This local demo sends no email. Email-verification and password-reset tokens are written to the backend log instead; read them with:

```sh
docker compose logs -f backend
```

Each token appears once on a line starting with `[dev-mail]`.

The Flo Tutor uses `TUTOR_PROVIDER=local` by default: an offline, rule-based demo tutor that needs no API key. Set `TUTOR_PROVIDER=off` in `.env` and recreate the backend container to check the "Flo is unavailable" state.

To use a real LLM through an OpenAI-compatible gateway such as 9Router, configure the ignored root `.env`:

```dotenv
TUTOR_PROVIDER=openai
LLM_BASE_URL=http://host.docker.internal:20128/v1
LLM_API_KEY=<your-local-9router-key>
LLM_MODEL=ag/gemini-3-flash
```

The model above was tested with this machine's Antigravity connection; use a model actually available to your own connection. In 9Router, enable only the accounts you authorize for the selected provider: the gateway key does not pin a chat request to a particular account. Connect accounts through 9Router's own sign-in UI and keep all OAuth credentials in 9Router. Fluora receives only the gateway API key, never a ChatGPT/Google password or OAuth token. Nothing is configured in mobile.

On Linux, a gateway bound only to `127.0.0.1` cannot be reached from the backend container. Compose adds `host.docker.internal:host-gateway`. On the current machine, 9Router runs on the Docker host bridge address `172.17.0.1`, without listening on the LAN. Find your bridge address with `docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}'`, then start the installed gateway with `9router --host <bridge-address> --no-browser`. Its dashboard is at `http://<bridge-address>:20128`. For a backend running directly on the host, use that address instead of `host.docker.internal` in `LLM_BASE_URL`.

Apply backend configuration/code changes with `docker compose up --build -d backend`. General chat and explanations use the LLM. Unsubmitted exercise hints stay curated; role-play grading and branches stay deterministic while the LLM adds feedback. Upstream failures return the existing unavailable state and do not save a partial message. A signed-in mobile account uses the backend; guest Tutor preview remains an explicit local preview. See [API.md](docs/API.md) for provider status, timeouts, and privacy.

Mobile sign-in and registration use email and password; no Google OAuth configuration is needed for the demo. To run on an iPhone with Expo Go, start Expo from `mobile/` and point it at the host machine's LAN address:

```sh
cd mobile
EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:4000 npx expo start --go --lan
```

Keep the iPhone and development computer on the same Wi-Fi network, then scan the displayed QR code with Expo Go. Verification and password-reset tokens appear in backend logs as described above.

To build and start the native Android app or an iOS app on macOS:

```sh
npm run android --workspace @fluora/mobile
# On macOS with Xcode:
npm run ios --workspace @fluora/mobile
```

For Android or a different backend host, set `EXPO_PUBLIC_API_URL` to an address reachable from that device before building or starting Metro, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npm run android --workspace @fluora/mobile`.

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
npm run test:unit
npm run check:mobile
```

GitHub Actions runs these checks on pull requests and pushes to `main`. `test:unit` uses Node's existing test runner; build the backend first. Live API/device acceptance remains separate; see [TESTING.md](docs/TESTING.md).

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
- [Demo setup, accounts and walkthrough](docs/DEMO.md)
- [Practice implementation and device QA](docs/PRACTICE_HANDOFF.md)
- [Agent instructions](AGENTS.md)
