# Fluora

Fluora is a mobile language-learning application intended for local demonstration. Its planned learning experience covers courses, lessons, practice, progress, and supporting areas such as rewards, community, profile, settings, and the Flo AI Tutor.

## Intended stack

- Mobile: React Native, Expo, TypeScript
- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL
- Local runtime: Docker Compose for backend and PostgreSQL; Expo runs on the host machine

This repository currently contains documentation only. The application stack and run setup are planned; no app, backend, database schema, package scripts, or Docker configuration is present yet.

## Repository structure

```text
fluora/
├── AGENTS.md
├── README.md
├── docs/
├── mobile/                 # planned
├── backend/                # planned
└── docker-compose.yml      # planned
```

## Local development

There are no runnable setup commands yet. The intended setup is to run the Express backend and PostgreSQL with Docker Compose, while running the Expo/React Native app directly on the host. Prerequisites, versions, and commands should be added once the initial project configuration exists. A Node.js environment and Docker with Compose will be needed for the planned setup; an Expo-compatible device or emulator is needed to run the mobile app.

## Project documentation

- [Product overview](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Figma references](docs/FIGMA.md)
- [Navigation routes](docs/ROUTES.md)
- [API contract](docs/API.md)
- [Database model](docs/DATABASE.md)
- [Testing and verification](docs/TESTING.md)
- [Current status](docs/STATUS.md)
- [Agent instructions](AGENTS.md)
