---
name: fluora-backend
description: Implement or modify Fluora backend APIs using Express, TypeScript, Prisma, and PostgreSQL without adding unnecessary architecture.
---

# Fluora Backend Workflow

1. Read `AGENTS.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, and `docs/STATUS.md`.
2. Inspect the relevant backend modules and Prisma schema before changing them.
3. Follow the existing request flow, or the intended flow when no pattern exists:

   ```text
   Route → Controller → Service → Prisma → PostgreSQL
   ```

4. Keep controllers focused on HTTP concerns and business logic in services. Avoid repository wrappers over Prisma unless a demonstrated need exists. Follow `AGENTS.md` for architecture and dependency constraints.
5. Keep behavior synchronized with `docs/API.md`. For database changes, update the Prisma schema and use the existing migration workflow; do not destructively reset data unless explicitly requested.
6. Verify typechecking, endpoint behavior, validation, database operations, and expected error behavior using available project checks. See `docs/TESTING.md`.
7. Update `docs/API.md` for contract changes, `docs/DATABASE.md` for conceptual relationship changes, and `docs/STATUS.md` after meaningful work.
8. Report changed files, verification performed, and known limitations.
