# Architecture

## Current implementation

Fluora is an npm-workspaces monorepo for a local demo. The mobile app has connected learning, account/profile, Practice, League/community and Tutor flows; native-device acceptance is tracked separately:

- `mobile/` is an Expo SDK 58 / React Native 0.88.1 / React 19.3 TypeScript app using Expo Router 58. The workspace pins React/React DOM to 19.3.0 so transitive peers cannot install a second incompatible React. Native Expo modules follow SDK 58 compatible versions. Expo Go runs on the phone; development clients built for an older SDK must be rebuilt. Five logical tabs lead to learning, Practice, account/onboarding/profile/settings, League/community, and Flo Tutor screens. The Tutor has an explicit in-memory preview separate from its backend API adapter. Practice uses the existing API plus account-scoped device storage; guided study-tool samples are local, not generated grading.
- `backend/` is one Express 5 TypeScript app. It exposes `GET /health`; public learning-content, help, story, hint, mission, and placement-question reads; account, session, settings, placement, email-verification, password-recovery, Google sign-in, and account-deletion APIs; learning activity, progress, planner, evidence, mission, and insights APIs; community (friends, profiles, notifications), study groups, rooms, polls, peer review, group plan and whiteboard, League, quests, achievements, wallet, and rewards APIs; Flo Tutor status, role-play, chat/message, hint, history, and note APIs; and partial support/export and practice APIs. Shared `backend/src/http/` code resolves bearer sessions, validates input, paginates lists, and returns JSON errors; private routes return `401` without a valid session.
- Feature modules live in `backend/src/features/<domain>/` (identity, learning, activity, practice, support, community, groups, rooms, league, tutor) as routes, controllers, and services over Prisma. Membership and role checks for groups and rooms are centralized in `features/groups/access.ts`; privacy decisions in `features/community/visibility.ts`; and reads of other domains' activity data for the League in `features/league/activity.ts`. Flo's replies come from one `TutorProvider` interface in `features/tutor/provider/`; `local` is an offline rule-based demo, `openai` uses built-in Node fetch to call an OpenAI-compatible LLM API, and `off` disables replies. The HTTP provider keeps exercise hints and role-play grading/branches curated. It adds no SDK, database model, or additional application service.
- `backend/prisma/schema.prisma` contains identity, curated content, support/export, practice, answer/completion, planner/evidence, mission, misconception, community, League, rewards, and tutor models with checked-in migrations.
- Verification and password-reset emails are not sent in this local demo; the backend logs each one-time token with a `[dev-mail]` prefix. Google sign-in is enabled only when `GOOGLE_CLIENT_IDS` is set.
- `backend/src/db/seed.ts`, `demo-content.ts`, and `seed-demo.ts` provide repeatable curated content and full demo account fixtures. `npm run demo:setup` waits for migrations/health before seeding. See [DEMO.md](DEMO.md); database volumes are local, not committed.
- `docker-compose.yml` runs the backend and PostgreSQL. Expo runs directly on the host.
- `.github/workflows/ci.yml` runs typecheck, Prisma validation, backend build, focused Node regression checks, and Android bundle export on pull requests and pushes to `main`.

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

An optional local 9Router gateway can provide the Tutor's LLM API. It is installed/run separately on the host and is not a required Compose service. The backend reaches it through `host.docker.internal` (Compose maps this to the host gateway). Gateway API keys remain in the ignored backend environment; OAuth account sessions remain in 9Router. See the concrete setup in [README.md](../README.md).

## Responsibilities

- **Mobile frontend:** Render screens and reusable UI, manage Expo Router navigation and interaction state, call backend services through REST/JSON, and manage device-local downloads/unsent drafts. Feature modules separate route files, screens, services, shared components, API transport, and response types.
- **Backend:** Expose the API, validate requests, apply application logic, and use Prisma for synchronized account, learning, practice, community, rewards, and tutor data.
- **Database:** Store durable account, learning-content, answer, progress, planning, vocabulary, community, reward, support, and tutor records as required by selected demo interactions. Analytics and totals can be derived from source records.
- **CI:** Run lightweight static and build checks. It does not deploy the application.

Offline course/unit/lesson/story snapshots, optional media, download-queue progress, reading positions pending sync, and writing drafts live in Expo FileSystem document storage under the authenticated account ID. Native transfer tasks support progress and cancellation; interrupted jobs require an explicit retry. A 200 MB download cap and text-only option keep the demo small. SecureStore retains the last validated account/settings snapshot bound to the stored token for offline cold starts; a server `401` still invalidates the session. Offline exercise practice does not claim graded progress or XP. See [PRACTICE_HANDOFF.md](PRACTICE_HANDOFF.md). Do not add a separate download service or storage platform.

Mobile learning/reading text uses a shared preference-aware wrapper; modal transitions and audio waveforms consume reduced-motion/Focus settings. The app includes a small in-repository English/Vietnamese UI copy catalog without an external localization dependency. The selected interface language comes from account settings, with a device-local choice for signed-out onboarding; curated course/exercise/story content and learner-authored content keep their stored language. A small root component provides a foreground-only wellbeing reminder. Home selects the first course containing unfinished work and exposes an explicit review/Practice state when the catalog is complete.

## Planned and optional work

- **Implemented:** Logical five-tab navigation, learning activity/progress, account/onboarding, profile/settings, Practice and reading/offline flows, plus League/community and Tutor screens. Backend capabilities and demo limitations are documented in [API.md](API.md).
- **Pending acceptance:** Android visual/interaction, native file/audio, offline restart, and full live-backend demo checks. Implementation presence does not imply these have passed.
- **Optional future improvements:** Add structure or tooling only when a concrete implementation need appears. No additional infrastructure is currently required.

See [API.md](API.md), [DATABASE.md](DATABASE.md), [ROUTES.md](ROUTES.md), and [TESTING.md](TESTING.md) for current contracts and guidance.
