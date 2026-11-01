---
name: fluora-feature
description: Implement or modify a Fluora application feature across the relevant mobile, API, and database layers while keeping contracts consistent.
---

# Fluora Feature Workflow

1. Read `AGENTS.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROUTES.md`, `docs/API.md`, `docs/DATABASE.md`, and `docs/STATUS.md`.
2. Inspect the existing implementation for the requested feature. Identify reusable code and the affected layers: mobile, backend, database, or a vertical slice.
3. For work spanning layers, implement a coherent vertical slice:

   ```text
   UI → service/API client → Express endpoint → service → Prisma → PostgreSQL
   ```

4. Reuse existing patterns, keep FE/BE request and response contracts synchronized, and follow `AGENTS.md` for scope and dependency decisions.
5. Update documentation only when a documented contract or project status changes. Update `docs/STATUS.md` after meaningful implementation.
6. Verify the typecheck, relevant backend and mobile behavior, and the affected demo flow using the checks available in the repository. See `docs/TESTING.md`.
7. Report changed files, implemented behavior, verification performed, and known limitations.
