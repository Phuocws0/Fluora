# Fluora Agent Instructions

This file defines how coding, implementation, review, and audit agents should work in this repository. The repository currently contains no application source; treat the architecture and contracts in `docs/` as plans until code confirms them.

## Required reading order

Before changing code, read these files in order:

1. `AGENTS.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/FIGMA.md`
5. `docs/ROUTES.md`
6. `docs/API.md`
7. `docs/DATABASE.md`
8. `docs/TESTING.md`
9. `docs/STATUS.md`

Then inspect the relevant existing source code. Documentation does not replace source inspection when source exists.

## Before coding

1. Read the relevant project documentation.
2. Inspect the relevant source files and identify reusable code.
3. Understand the current implementation state; do not infer that a planned item is implemented.
4. Avoid inventing requirements that are not supported by the repository, designs, or user request.
5. Identify whether the task affects the frontend, backend, database, API contract, or multiple layers.

## General rules

- Keep the project simple and make the smallest coherent change that satisfies the request.
- Prefer readable code over unnecessary abstraction. A simple working implementation is better than an architecturally sophisticated implementation.
- Reuse existing components, utilities, services, and patterns before adding new ones. Avoid duplicated logic.
- Use strict TypeScript typing and avoid `any` unless there is a clear reason.
- Do not add a dependency unless it is clearly necessary.
- Do not refactor unrelated areas or change the architecture without explaining why.
- Do not invent implementation status or silently ignore errors.
- Keep the application as a monorepo and backend as one application.
- Do not add microservices, Redis, Kafka, RabbitMQ, an API Gateway, cloud infrastructure, Kubernetes, CI/CD, observability stacks, message queues, event sourcing, or CQRS unless explicitly requested.
- Do not add Redux, GraphQL, Nx, Turborepo, repository abstractions over Prisma, unnecessary dependency-injection frameworks, or other design patterns without a demonstrated need.
- Do not add production-oriented infrastructure for a local demonstration.
- If the current stack solves the requirement cleanly, use it.

## Frontend guidance

The intended organization is a guideline, not a requirement to create empty folders:

```text
mobile/
├── app/
├── components/
├── features/
├── services/
├── hooks/
├── types/
└── utils/
```

- Keep screens out of low-level API details; put HTTP/API calls in the service layer.
- Put reusable UI in reusable components and keep feature-specific logic near its feature.
- Decompose large screen files when the boundaries are clear; avoid abstraction for its own sake.
- Reuse existing design patterns before introducing new ones.
- Do not create a React Native route for every Figma frame. Frames can show states of the same screen.
- Prefer reusable exercise, lesson, card, modal, and state components.
- Organize navigation around logical user flows, not frame count.

## Backend guidance

Use this request flow unless the existing application has a sound established pattern:

```text
Route → Controller → Service → Prisma → PostgreSQL
```

- Routes define endpoints and middleware; controllers handle HTTP concerns; services contain application and business logic.
- Keep Prisma access out of controllers where practical.
- Group code by domain/module where useful, but keep abstractions proportional to the project.
- Do not add repository wrappers over Prisma or dependency-injection frameworks without a clear need.
- Validate incoming data where appropriate and keep response shapes consistent with `docs/API.md`.

## After coding

- Run TypeScript/type checking where available.
- Run relevant tests and build/start checks where available and practical.
- Inspect errors instead of hiding or suppressing them.
- Check that frontend/backend contracts remain consistent and database use matches the schema.
- Update `docs/STATUS.md` after meaningful implementation work. Update other docs when architecture or contracts actually change.
- In the final summary, list changed files, verification performed, and unfinished work or known issues.

## Definition of Done

A task is complete only when:

1. The requested behavior is implemented.
2. Relevant existing code was reused where appropriate.
3. Type checking succeeds where available.
4. Relevant tests and checks succeed where available.
5. Frontend and backend contracts remain consistent.
6. Database use remains consistent with the schema.
7. No unrelated refactor or unnecessary dependency was introduced.
8. No secrets were committed.
9. `docs/STATUS.md` is updated for meaningful implementation work.
10. The final response says what changed, what was verified, and what remains incomplete.

Do not mark a task complete merely because code was generated.

## Audit Mode

When explicitly asked to audit the repository, inspect and report findings before proposing or making changes. Do not immediately rewrite large areas of code. Prioritize findings in this order:

| Severity | Examples |
| --- | --- |
| Critical | App cannot run; broken imports/build or navigation; frontend/backend contract or database/schema mismatch; committed secrets; data loss or destructive behavior; core demo flow broken |
| High | Incorrect user flow; duplicate screens/routes caused by Figma frame duplication; API error handling or state problems; major type-safety issues; critical Figma behavior missing |
| Medium | Code duplication; poor separation of concerns; unnecessary complexity; inconsistent naming; dead code; documentation drift |
| Low | Formatting; minor naming improvements; cosmetic refactors |

Report each finding with this format:

```text
Severity:
Location:
Problem:
Impact:
Recommended fix:
```

Do not perform a large refactor during an audit unless explicitly requested.
