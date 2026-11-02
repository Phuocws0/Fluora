# Plan: Issue #3 — Identity, onboarding, and learner settings API

| Field | Value |
| --- | --- |
| Issue | [#3 [02A BE] Identity, onboarding, and learner settings API](https://github.com/Phuocws0/Fluora/issues/3) |
| Owner | MinhKhoa2209 |
| Milestone | M1 - Foundation and onboarding |
| Status | **PR 1 implemented** on branch `feat/3-identity-auth-core` (schema, sessions, core auth). PR 2 and PR 3 are planned. |
| Baseline | `main` at `f6c6d18`: PR #43, #44 (#33), and #45 (#39) are merged. |
| Unblocks | Mobile #4 (account/onboarding) and #20 (profile/settings). Also unblocks every private route in #27, #32, #33, #35, and #39, which all need a verified learner identity. |

This plan turns the issue and `docs/API.md` into ordered, verifiable work. It proposes some small additive contract changes and lists the open questions that need an answer before or during implementation. Update `docs/API.md` and `docs/DATABASE.md` when code lands. Don't treat this plan as the contract.

## 1. Current state (verified in source before PR 1)

- `backend/prisma/schema.prisma` has `User { id, email @unique, displayName?, createdAt, updatedAt }` plus the curated learning models from #6. There are no password, session, settings, or placement fields.
- `backend/src/app.ts` mounts `express.json()`, `learningRouter` under `/api`, and `GET /health`. There is no auth middleware and no JSON error handler. A malformed JSON body currently gets Express's default HTML error.
- The established pattern is Route → Controller → Service → Prisma (`backend/src/features/learning/*`). Validation is hand-written in controllers, and no validation library is installed. Each controller defines its own `sendError`, UUID regex, and `run()` wrapper.
- The draft PRs #44 and #45 already depend on #3 through one contract: **a verified bearer session must set `res.locals.userId`** (a UUID string). Each PR has its own `requireUser` that returns `401 UNAUTHORIZED` when `res.locals.userId` is missing. Their user-owned models use `onDelete: Cascade` to `User`.
- PR #44 (#33) owns the `/api/users/me/data-exports*` endpoints, even though `docs/API.md` lists them in the "Auth and account" table. Its export uses an explicit `select` on `User`, so new credential columns are not leaked. Keep it that way.
- The mobile app has placeholder destinations for `(auth)/welcome`, `login`, `register`, `verify-email`, `forgot-password`, `reset-password`, `onboarding`, and `settings/[section]` (#2). Mobile integration belongs to #4 and #20, not this issue.

## 2. Scope

### In scope (#3)

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `/login`, `/google`, `/verify-email`, `/password/forgot`, `/password/reset`, `/logout` |
| Account | `GET` and `PATCH /api/users/me`, `PATCH /api/users/me/password`, `GET /api/users/me/sessions`, `DELETE /api/users/me/sessions/:sessionId`, `DELETE /api/users/me` |
| Settings | `GET`, `PATCH`, and `DELETE /api/users/me/settings` |
| Placement | `GET /api/placement/attempts`, `POST /api/placement/attempts`, and the proposed `GET /api/placement/questions` (see §5.4) |
| Shared backend | Authentication middleware that sets `res.locals.userId`/`sessionId`, a shared `requireUser`, shared error helpers, and a JSON error and 404 handler for `/api` |

### Out of scope

- Data export endpoints belong to #33 / PR #44. #3 only has to keep credential columns out of that export.
- Friend discovery, privacy enforcement in community reads (#35), and tutor history enforcement (#32). #3 stores the preferences and gives those domains a helper to read them.
- `GET /api/learning/skill-baseline`, enrollments, and progress belong to #27. #3 stores placement results in a shape #27 can read (§5.4).
- Mobile screens, secure token storage, and Google sign-in UI (#4, #20).
- Real email delivery, rate-limiting infrastructure, Redis, queues, JWT libraries, and OAuth platforms (see `AGENTS.md`).

## 3. Key technical decisions

| Decision | Choice | Reason | Alternative considered |
| --- | --- | --- | --- |
| Session token | Opaque random token (`crypto.randomBytes(32)`, base64url). Only its SHA-256 hash is stored in `sessions.token_hash`. | The session list and revoke endpoints need a database row per session anyway. Revocation takes effect immediately. No new dependency. | JWT: needs a library and a denylist for revocation, so it is more code for no benefit here. |
| Password hashing | Node built-in `crypto.scrypt` (N=16384, r=8, p=1, 64-byte key, 16-byte random salt), stored as `scrypt$N$r$p$salt$hash`, compared with `timingSafeEqual`. | Secure, no native dependency, and works in Docker Alpine. | `bcrypt`/`argon2`: native builds and an extra dependency. |
| Session lifetime | 30 days. `lastUsedAt` is updated at most every 5 minutes. Expired rows are deleted when they are looked up. | Simple sliding sessions without a background job. | Refresh tokens: unnecessary for a local demo. |
| Email delivery | No SMTP. The backend logs verification and reset tokens to the server console (`docker compose logs backend`). | Local demo; no external service. | Ethereal/SMTP: an extra dependency and account for no demo value. |
| Verification/reset tokens | One `auth_tokens` table with `purpose`. The raw token is shown once in the log and only its SHA-256 hash is stored. Email verification lasts 24 h; password reset lasts 30 min. Tokens are single-use. | One table covers both flows and raw tokens are never stored. | Separate tables per purpose. |
| Google sign-in | Verify `idToken` with Google's `tokeninfo` endpoint and check `aud` against `GOOGLE_CLIENT_IDS`. Without that env value, return `503 GOOGLE_SIGN_IN_UNAVAILABLE`. | No dependency. The endpoint works when the team has a Google OAuth client and degrades with an explicit error when it doesn't. | `google-auth-library`: an extra dependency; reconsider if `tokeninfo` proves unreliable. |
| Validation | Hand-written validators in a shared `backend/src/http/validation.ts`, following the existing controller style. | Matches the codebase; no validation library. | Zod: a new dependency the repo hasn't adopted. |
| Settings storage | One `user_settings` row per user (1:1, primary key `userId`) with typed columns, created in the registration transaction. | GET never returns 404, PATCH is a partial update, and there are no duplicate onboarding records. | JSON blob: no column typing or defaults. |
| Settings shape | Flat object (§5.3). | Maps 1:1 to columns and keeps partial PATCH simple. Mobile can group fields per screen. | Nested groups: harder partial-merge validation. |
| Status strings | Plain `String` columns validated in code, like `Exercise.type` today. | Follows the existing schema convention. | Prisma enums. |
| `User` table name | Keep `"User"` (no `@@map`). | Renaming is a breaking migration with no benefit. | — |

## 4. Database changes (one migration, additive)

PR 1 created `backend/prisma/migrations/20261102003000_identity_sessions_settings`. `prisma migrate dev` refuses to run in a non-interactive shell, so the SQL was generated with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` after `db:deploy`, then applied with `db:deploy`. A second `migrate diff --exit-code` reported no drift. All `User` columns are nullable or have defaults, so existing rows remain valid.

```prisma
model User {
  id                String             @id @default(uuid()) @db.Uuid
  email             String             @unique            // stored trimmed + lowercase
  displayName       String?
  bio               String?            @db.Text
  avatarUrl         String?
  passwordHash      String?                               // null for Google-only accounts
  googleSubject     String?            @unique
  emailVerifiedAt   DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  settings          UserSettings?
  sessions          Session[]
  authTokens        AuthToken[]
  placementAttempts PlacementAttempt[]
  // relations added by other domains (#33, #39, ...) stay here
}

model Session {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  tokenHash  String   @unique
  deviceName String?
  userAgent  String?
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @default(now())
  expiresAt  DateTime
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, lastUsedAt])
  @@map("sessions")
}

model AuthToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  purpose   String    // "email_verification" | "password_reset"
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@map("auth_tokens")
}

model UserSettings {
  userId                 String    @id @db.Uuid
  appLanguage            String    @default("en")
  courseLanguage         String?
  motivation             String?
  startingLevel          String?
  dailyGoalMinutes       Int?
  dailyTimeBudgetMinutes Int?
  learningPromise        String?
  reminderEnabled        Boolean   @default(false)
  reminderTime           String?   // "HH:mm", 24 h
  reminderDays           Int[]     @default([]) // 0 = Sunday … 6 = Saturday
  timezone               String?   // IANA, e.g. "Asia/Ho_Chi_Minh"
  notifyFriendRequests   Boolean   @default(true)
  notifyRewards          Boolean   @default(true)
  notifyReminders        Boolean   @default(true)
  floCompanion           String?
  progressVisibility     String    @default("friends") // public | friends | private
  discoverable           Boolean   @default(true)
  saveTutorHistory       Boolean   @default(true)
  textSize               String    @default("default") // default | large | extra_large
  reducedMotion          Boolean   @default(false)
  captions               Boolean   @default(false)
  focusMode              Boolean   @default(false)
  lowBandwidth           Boolean   @default(false)
  wellbeingTimerMinutes  Int?
  onboardingCompletedAt  DateTime?
  updatedAt              DateTime  @updatedAt
  user                   User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

model PlacementAttempt {
  id                 String   @id @default(uuid()) @db.Uuid
  userId             String   @db.Uuid
  questionSetVersion Int
  answers            Json     // [{questionId, optionId}]
  level              String   // CEFR A1..C2
  skillBaseline      Json     // [{skill, score, correct, total}]
  createdAt          DateTime @default(now())
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("placement_attempts")
}
```

Rules to add to `docs/DATABASE.md`:

- Every user-owned model must use `onDelete: Cascade` (or explicit cleanup in the account-deletion service) so that `DELETE /api/users/me` removes only that learner's data.
- `passwordHash`, `googleSubject`, `sessions.tokenHash`, and `auth_tokens.tokenHash` are never returned by any API, including the #33 data export.

## 5. API contract details

All bodies are JSON. Errors use the existing `{ "error": { "code", "message" } }` shape. Strings are trimmed before validation.

### 5.1 Shared shapes

```ts
type PublicUser = {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;      // emailVerifiedAt !== null
  hasPassword: boolean;        // passwordHash !== null (Google-only accounts → false)
  createdAt: string;           // ISO 8601
};

type AuthResponse = { token: string; user: PublicUser };

type SessionSummary = {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};
```

### 5.2 Auth and account

| Endpoint | Auth | Request validation | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/auth/register` | Public | `email` valid format, ≤254 chars, lowercased; `password` 8–128 chars; `displayName` 1–50 chars; optional `deviceName` ≤80 chars | `201 AuthResponse`. One transaction creates the user, the default settings, and the session. It then creates a verification token and logs it. | `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN` |
| `POST /api/auth/login` | Public | `email`, `password` strings; optional `deviceName` | `200 AuthResponse` | `400`, `401 INVALID_CREDENTIALS` (same message for an unknown email, a wrong password, and a Google-only account) |
| `POST /api/auth/google` | Public | `idToken` string ≤4096; optional `deviceName` | `200 AuthResponse` for an existing user, `201` for a new one | `400`, `401 INVALID_GOOGLE_TOKEN`, `503 GOOGLE_SIGN_IN_UNAVAILABLE` (*new*) |
| `POST /api/auth/verify-email` | Public | `token` string | `200 {verified:true}`; sets `emailVerifiedAt` and `usedAt` | `400 INVALID_TOKEN`, `410 TOKEN_EXPIRED` (expired or already used) |
| `POST /api/auth/password/forgot` | Public | `email` | Always `200 {accepted:true}` (no account enumeration). If the account exists, older unused reset tokens are invalidated and a new one is logged. | `400` |
| `POST /api/auth/password/reset` | Public | `token`; `newPassword` 8–128 chars | `200 {updated:true}`. One transaction updates the hash, marks the token used, sets `emailVerifiedAt` if it is empty, and **revokes all sessions**. | `400`, `410` |
| `POST /api/auth/logout` | Bearer | — | `200 {ok:true}`; deletes the current session | `401` |
| `GET /api/users/me` | Bearer | — | `200 {user:PublicUser}` | `401` |
| `PATCH /api/users/me` | Bearer | At least one of: `displayName` 1–50; `bio` ≤160 or `null`; `avatarUrl` an `http(s)` URL ≤500 or `null`. Unknown fields → `400`. | `200 {user}` | `400`, `401` |
| `PATCH /api/users/me/password` | Bearer | `newPassword` 8–128; `currentPassword` required when `hasPassword` | `200 {updated:true}`; revokes **other** sessions and keeps the current one | `400`, `401 INVALID_CREDENTIALS` (wrong current password) |
| `GET /api/users/me/sessions` | Bearer | — | `200 {sessions:SessionSummary[]}`, unexpired only, most recent first | `401` |
| `DELETE /api/users/me/sessions/:sessionId` | Bearer | UUID | `200 {revoked:true}`. Revoking the current session works like logout. | `400`, `401`, `404` (missing **or another user's** session) |
| `DELETE /api/users/me` | Bearer | `confirmEmail` must equal the account email (case-insensitive) | `200 {deleted:true}`; deletes the `User` row and its cascaded records | `400 CONFIRMATION_MISMATCH`, `401`, `409` (reserved for #35, e.g. the learner still owns groups with members; not returned by #3) |

Other auth behavior:

- **Unverified email:** login and app use are allowed. `emailVerified:false` lets mobile show a verification prompt. *(Open question Q7.)*
- **Google account linking:** match on `googleSubject` first. If none matches and Google reports `email_verified`, find the account by email and link it. Otherwise create a user with `passwordHash = null` and `displayName` taken from the Google `name` claim.
- **Login timing:** when the email doesn't exist, still run one scrypt verification against a fixed dummy hash so response timing doesn't reveal which emails are registered.

### 5.3 Settings

`GET /api/users/me/settings` → `200 {settings}`:

```ts
type LearnerSettings = {
  appLanguage: string;                 // "en", "vi", … — /^[a-z]{2}(-[A-Z]{2})?$/
  courseLanguage: string | null;       // same format
  motivation: string | null;           // slug /^[a-z0-9_-]{1,40}$/, option list owned by mobile (Q4)
  startingLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  dailyGoalMinutes: number | null;     // 1–240 (Q3)
  dailyTimeBudgetMinutes: number | null; // 1–240  (Page 10 · 103)
  learningPromise: string | null;      // ≤200     (Page 10 · 105)
  reminderEnabled: boolean;
  reminderTime: string | null;         // "HH:mm"
  reminderDays: number[];              // unique 0–6
  timezone: string | null;             // validated with Intl.DateTimeFormat
  notifyFriendRequests: boolean;
  notifyRewards: boolean;
  notifyReminders: boolean;
  floCompanion: string | null;         // slug ≤40
  progressVisibility: "public" | "friends" | "private";
  discoverable: boolean;
  saveTutorHistory: boolean;
  textSize: "default" | "large" | "extra_large"; // Page 10 · 147 preview
  reducedMotion: boolean;
  captions: boolean;
  focusMode: boolean;                  // Page 10 · 146
  lowBandwidth: boolean;
  wellbeingTimerMinutes: number | null; // 5–180
  onboardingCompleted: boolean;        // onboardingCompletedAt !== null
  updatedAt: string;
};
```

- **`PATCH`** accepts any subset of the writable fields above, plus `onboardingCompleted: true`, which sets `onboardingCompletedAt` once and is never cleared by PATCH. Omitted fields keep their values. An unknown field, a wrong type, or an empty body returns `400`, and nothing is written for that request. `reminderEnabled: true` requires `reminderTime` (already stored or in the same body). The row is upserted, so repeated onboarding submissions never duplicate records.
- **`DELETE`** resets app preferences to the column defaults and returns `200 {settings}`. **Proposed:** keep `courseLanguage`, `startingLevel`, and `onboardingCompletedAt`, so a reset doesn't send the learner back into onboarding or detach them from their course. *(Q5.)*
- **Onboarding resume:** Page 09 asks for motivation, level, goal, and reminder **before** account creation (frames 01–05). Mobile keeps those answers as a local draft and sends them in one `PATCH /api/users/me/settings` right after register or login, then sends `onboardingCompleted: true`. This needs no anonymous settings storage and no change to `register`.
- **Helper for other domains:** export `getPrivacySettings(userId)` from the settings service. It returns `{progressVisibility, discoverable, saveTutorHistory}` and falls back to defaults when no row exists. #35 uses it for discovery and progress visibility; #32 uses it for tutor-history persistence.

### 5.4 Placement

`docs/API.md` has no endpoint that gives mobile the placement questions, so this plan proposes one.

| Endpoint | Auth | Behavior |
| --- | --- | --- |
| `GET /api/placement/questions` (*new*) | Public | `200 {version, questions:[{id, skill, prompt, options:[{id,label}]}]}`. Answer keys are never returned. |
| `POST /api/placement/attempts` | **Optional** | Body `{answers:[{questionId, optionId}]}`: 1–N items, known IDs, the option must belong to its question, no duplicate questions. Unanswered questions count as incorrect. → `{attemptId, level, skillBaseline}`. With a valid session the attempt is stored and the response is `201` with a UUID `attemptId`. Without a session the result is computed but not stored, and the response is `200` with `attemptId: null`. Errors: `400`. |
| `GET /api/placement/attempts` | Bearer | `200 {attempts:[{id, level, skillBaseline, questionSetVersion, createdAt}]}`, newest first |

- **Question bank:** a small curated, versioned constant in `backend/src/features/identity/placement.questions.ts`, with about 10 single-choice questions across `vocabulary`, `grammar`, `reading`, and `listening` (listening as a transcript prompt until audio assets exist). It is read-only curated content with no CRUD. Moving it into the database is only worth doing if non-developers need to edit it.
- **Scoring (demo heuristic, documented in API.md):** skill score = `round(100 × correct / total)`. Overall percentage maps to a level: `<40 → A1`, `<60 → A2`, `<80 → B1`, otherwise `B2`. The demo caps at B2.
- **The level is a suggestion.** Submitting an attempt does **not** overwrite `settings.startingLevel`. Mobile shows the result and the learner confirms it with `PATCH /settings { startingLevel }`, which matches the "Starting level" choice in frame 02.
- **#27 handoff:** `GET /api/learning/skill-baseline` (#27) reads the latest `PlacementAttempt.skillBaseline` together with `settings.startingLevel`. Keep `skillBaseline` as `[{skill, score, correct, total}]`. If #27 needs a different shape, change it in this PR before merge, not after.

### 5.5 Contract changes to record in `docs/API.md`

All of these are additive:

1. New `GET /api/placement/questions`.
2. `POST /api/placement/attempts` response adds `attemptId` (nullable).
3. Optional `deviceName` on register, login, and Google sign-in. React Native's User-Agent (`okhttp/...`) is not readable as a device name in the session list (frame 52).
4. `503 GOOGLE_SIGN_IN_UNAVAILABLE` on `POST /api/auth/google`.
5. Concrete `PublicUser`, `SessionSummary`, and `LearnerSettings` shapes; endpoint-specific error codes; `hasPassword`.
6. A note that the data export rows are owned by #33.
7. *(Optional, Q2)* `POST /api/auth/verify-email/resend` (Bearer) → `{sent:true}`.

## 6. Code layout

```text
backend/src/
├── app.ts                          # + authenticate, identityRouter, /api 404 + error handler
├── types/express.d.ts              # Express.Locals { userId?: string; sessionId?: string }
├── http/
│   ├── errors.ts                   # HttpError, sendError, apiNotFound, jsonErrorHandler
│   ├── validation.ts               # readBody (rejects unknown fields), readText, readEmail, readPassword, readUuidParam, …
│   └── auth.ts                     # authenticate (optional bearer → res.locals), requireUser, currentUserId/SessionId
└── features/identity/
    ├── identity.routes.ts          # all #3 routes
    ├── credentials.ts              # scrypt hash/verify, token generate/sha256
    ├── session.service.ts          # create/find/slide/list/revoke sessions (PR 1)
    ├── auth.controller.ts / auth.service.ts           # register, login, logout (PR 1); google, verify, forgot, reset (PR 3)
    ├── account.controller.ts / account.service.ts     # me, profile, password, sessions (PR 1); delete (PR 3)
    ├── settings.controller.ts / settings.service.ts   # settings CRUD, defaults, getPrivacySettings (PR 2)
    ├── placement.controller.ts / placement.service.ts # questions, attempts, scoring (PR 2)
    └── placement.questions.ts      # curated question bank, versioned (PR 2)
```

- **Error flow (implemented):** controllers and services throw `HttpError(status, code, message)`. Express 5 forwards rejected async handlers to `jsonErrorHandler`, so identity controllers need no per-controller `run()` wrapper.

- **`authenticate`** runs on every request before the `/api` routers. If `Authorization: Bearer <token>` matches an unexpired session, it sets `res.locals.userId` and `res.locals.sessionId`. **It never rejects a request.** That way public routes (courses, placement questions) still work when a stale token is sent, and the existing `requireUser` checks in #44 and #45 work unchanged.
- **`requireUser`** returns `401 UNAUTHORIZED` when `res.locals.userId` is missing. Other domains can switch to the shared one later; that switch is not part of this issue.
- **`jsonErrorHandler`** maps body-parser `SyntaxError` and `entity.too.large` errors to `400`/`413` JSON. Any other error is logged and returns `500 INTERNAL_SERVER_ERROR` without exposing internals. The `/api` 404 handler returns `404 NOT_FOUND` JSON.
- Controllers handle HTTP and validation, services own the Prisma calls and transactions, and there is no repository layer.
- Don't refactor `learning.controller.ts` or the draft PR controllers here. List the shared helpers in the PR description so the other owners can adopt them.

## 7. Configuration

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `GOOGLE_CLIENT_IDS` | `.env.example` (empty), `docker-compose.yml` backend `environment` (`${GOOGLE_CLIENT_IDS:-}`) | empty → Google sign-in returns 503 | Comma-separated Android/iOS/web OAuth client IDs accepted as `aud` |

The session TTL, token TTLs, and scrypt parameters are code constants because they don't need per-environment tuning. No secrets are committed. Document the log-based token delivery in `README.md`, using `docker compose logs -f backend`.

## 8. Delivery plan (three PRs into `main`)

Each PR keeps CI green (`npm run typecheck`, `prisma:validate`, `build`, `check:mobile`) and updates `docs/API.md` (status → Implemented), `docs/DATABASE.md`, and `docs/STATUS.md` for what it ships.

### PR 1 — Schema, sessions, and core auth (unblocks #44, #45, #27, and #4 sign-in) — implemented

PR 1 does not issue a verification token at registration. That step arrives with the PR 3 `auth_tokens` flows, so the V1 "token in log" check belongs to PR 3.

1. Rebase onto `main`. Add the §4 schema and one migration. Run `prisma validate` and `migrate dev` against the Compose database.
2. Add `types/express.d.ts`, `http/errors.ts`, `http/validation.ts`, and `http/auth.ts`, and mount `authenticate`, the 404 handler, and the error handler in `app.ts`.
3. Add `credentials.ts` (scrypt and tokens).
4. Implement register (including default settings), login, logout, `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`, and the session list/revoke endpoints.
5. Smoke-check the endpoints, then tell the #44/#45 owner that `res.locals.userId` is live.

### PR 2 — Settings, onboarding, and placement (unblocks #4 onboarding and #20 preferences)

1. Settings GET/PATCH/DELETE with full validation, the upsert, and `getPrivacySettings`.
2. Placement question bank, `GET /placement/questions`, `POST` and `GET /placement/attempts`, and the scoring.
3. Confirm the `skillBaseline` shape with the #27 owner.

### PR 3 — Verification, recovery, Google, and account deletion

1. `auth_tokens` flows: the verification token logged at registration, `verify-email`, `password/forgot`, `password/reset`, and optionally resend (Q2).
2. `POST /api/auth/google` with `tokeninfo` verification, account linking, and the 503 when not configured.
3. `DELETE /api/users/me` with the confirmation check and cascade deletion. Verify that curated content and other users' data stay intact.
4. Close #3 once every acceptance criterion in §10 is checked.

**Merge-order note:** PRs #44 and #45 also edit `model User`, `schema.prisma`, `app.ts`, and `docs/API.md`. Whichever PR merges second must rebase, resolve the `User` relation lines, run `npm run db:migrate` to confirm there is no schema drift, and re-run CI. Merging #3 PR 1 first is the simplest order, because both drafts already wait on it.

## 9. Verification checklist

No test framework is added (see `docs/TESTING.md`). Run `docker compose up --build -d`, then the seed, then manual HTTP checks with PowerShell `Invoke-RestMethod` or curl. Record the results in each PR description.

| # | Check | Expected |
| --- | --- | --- |
| V1 | Register a new email | `201`, token + user; no `passwordHash` in the response; one `user_settings` row; verification token in the backend log |
| V2 | Register the same email with different casing | `409 EMAIL_TAKEN` |
| V3 | Register with a short password, a bad email, or a missing `displayName` | `400 VALIDATION_ERROR` |
| V4 | Login: wrong password, unknown email | Both `401 INVALID_CREDENTIALS` with the same message |
| V5 | `GET /users/me` without a token, with a garbage token, with an expired token | `401` |
| V6 | Public `GET /api/courses` with a garbage bearer token | `200` (authenticate never rejects) |
| V7 | Malformed JSON body; unknown `/api/xyz` | `400` JSON; `404` JSON |
| V8 | Two logins → session list → revoke the other session → its token is rejected | `current` flag correct; the revoked token returns `401` |
| V9 | Revoke another user's session ID | `404` |
| V10 | Change password: wrong current, then correct | `401`; then `200`, other sessions revoked, current one kept |
| V11 | `PATCH /users/me` with an unknown field, an empty body, and a valid partial update | `400`, `400`, `200` with only those fields changed |
| V12 | `PATCH /settings` partial update; a GET afterwards keeps the omitted fields; an invalid enum or time is rejected with nothing written | as described |
| V13 | Repeat the onboarding PATCH and `onboardingCompleted:true` twice | Still one settings row; `onboardingCompletedAt` unchanged after the first time |
| V14 | `DELETE /settings` | Defaults restored; course language, level, and onboarding state kept (per Q5) |
| V15 | Placement questions response | No answer keys |
| V16 | Placement attempt anonymous / authenticated / invalid option / duplicate question | `200 attemptId:null` / `201` stored / `400` / `400`; `startingLevel` unchanged |
| V17 | Verify email with a valid token, the same token again, an expired token, a random token | `200`, `410`, `410`, `400` |
| V18 | Forgot password for an unknown and a known email | Both `200 {accepted:true}`; a token is logged only for the known email |
| V19 | Reset password | `200`; old password rejected; **all** previous sessions `401`; token reuse → `410` |
| V20 | Google without `GOOGLE_CLIENT_IDS` | `503 GOOGLE_SIGN_IN_UNAVAILABLE` |
| V21 | Delete account with the wrong email, then the correct one | `400 CONFIRMATION_MISMATCH`; then `200`, the user's sessions, settings, attempts (and #33/#39 rows when merged) are gone, while courses and another test user are untouched |
| V22 | Search the database and API responses | No raw token or password stored or logged except the intended one-time token log line |

## 10. Acceptance-criteria traceability (issue #3)

| Issue criterion | Covered by |
| --- | --- |
| Prisma schema/migrations support account, session, settings, and placement | §4, PR 1–2 |
| Validate data, session identity, and ownership; consistent errors | §5, §6 (`http/*`), V3–V11 |
| Passwords hashed; credentials, tokens, and secrets never returned or committed | §3 scrypt/SHA-256, §4 rules, §7, V1, V22 |
| Account deletion confirmed; removes only that learner's records | §5.2, §4 cascade rule, V21 |
| Preference read/update/reset covers every listed field; omitted fields kept; defaults restorable | §5.3, V12, V14 |
| Onboarding resumes without duplicates; placement validated and returns level + baseline | §5.3 upsert/resume, §5.4, V13, V16 |
| Privacy and save-history choices affect responses and persistence | Stored and exposed through `getPrivacySettings` (§5.3); enforced by #35/#32 against that helper |
| Docs, schema, and runtime synchronized; typecheck/build and focused checks pass | §8 per-PR doc updates, CI, §9 |

## 11. Open questions (answer before the PR noted)

| # | Question | Default if unanswered | Needed by |
| --- | --- | --- | --- |
| Q1 | Do Figma frames 07 (Verify email) and 08 (Forgot password) show a typed code or a link? A short code would need `{email, code}` instead of `{token}`. | Keep the long `{token}` contract; mobile pastes it from the log | PR 3 |
| Q2 | Does frame 07 have a "Resend" control? | Add `POST /api/auth/verify-email/resend` | PR 3 |
| Q3 | Is the daily goal (frame 03) measured in minutes or XP, and how does it differ from the daily time budget (103)? | Both stored as minutes | PR 2 |
| Q4 | Final option lists for motivation, Flo companion, and app languages (frames 01, 51) | Backend validates slug/language-code format only; mobile owns the lists | PR 2 |
| Q5 | Should "reset settings" also clear course language, level, and onboarding state? | No (see §5.3) | PR 2 |
| Q6 | Does the team have Google OAuth client IDs for Expo? | Endpoint returns 503; mobile shows an unavailable state | PR 3 |
| Q7 | Can unverified accounts use the app? | Yes, with a verification prompt | PR 1 |
| Q8 | Which skills appear on the skill-baseline radar and confidence matrix (frames 58–59)? | vocabulary, grammar, reading, listening | PR 2 |

## 12. Risks and known limitations

- **No rate limiting** on login or password-forgot. This is acceptable for a local demo and should be noted in `docs/STATUS.md`.
- **Log-based tokens** mean verification and recovery only work for someone who can read the backend logs. That is fine for the demo, but the demo script should say so.
- **Google `tokeninfo`** makes a network call and Google describes it as a debugging endpoint. Switch to `google-auth-library` if it becomes unreliable.
- **Expo web/CORS** is not covered. Native Android/iOS don't need CORS. Add `cors` only if the team demos on web.
- **Schema contention** with #44/#45: follow the merge-order note in §8.
