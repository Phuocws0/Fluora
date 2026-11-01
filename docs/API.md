# API Contract

This is an initial proposal for a small local demo API. No endpoints are implemented in the current repository. Shapes below are concise starting points and should be checked against the implemented UI and data model before coding. Every endpoint has an explicit status.

Unless an endpoint is public, the proposed request uses `Authorization: Bearer <token>`. The token mechanism is an implementation decision; this document does not prescribe JWT or a larger auth system.

## Shared error shape

Proposed error response:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request could not be processed." } }
```

Use an appropriate HTTP status such as `400` for invalid input, `401` for missing/invalid authentication, `404` for missing resources, `409` for conflicts, and `500` for unexpected server errors. Keep details safe and useful for the client.

## Auth

### `POST /api/auth/register` — Planned

- **Purpose:** Create an account.
- **Request:** `{ "email": "learner@example.com", "password": "…", "displayName": "Learner" }`
- **Response:** `{ "token": "…", "user": { "id": "…", "email": "…", "displayName": "…" } }`
- **Errors:** `400` invalid input; `409` account already exists.

### `POST /api/auth/login` — Planned

- **Purpose:** Start an authenticated session.
- **Request:** `{ "email": "learner@example.com", "password": "…" }`
- **Response:** `{ "token": "…", "user": { "id": "…", "email": "…", "displayName": "…" } }`
- **Errors:** `400` invalid input; `401` credentials rejected.

### `GET /api/auth/me` — Planned

- **Purpose:** Return the current account.
- **Response:** `{ "user": { "id": "…", "email": "…", "displayName": "…" } }`
- **Errors:** `401` missing or invalid session.

## Courses

### `GET /api/courses` — Planned

- **Purpose:** List available courses.
- **Response:** `{ "courses": [{ "id": "…", "title": "…", "description": "…" }] }`
- **Errors:** `500` unexpected server error.

### `GET /api/courses/:courseId` — Planned

- **Purpose:** Return a course and its units.
- **Response:** `{ "course": { "id": "…", "title": "…", "units": [{ "id": "…", "title": "…" }] } }`
- **Errors:** `404` course not found.

## Units and lessons

### `GET /api/units/:unitId` — Planned

- **Purpose:** Return a unit and its lessons.
- **Response:** `{ "unit": { "id": "…", "title": "…", "lessons": [{ "id": "…", "title": "…" }] } }`
- **Errors:** `404` unit not found.

### `GET /api/lessons/:lessonId` — Planned

- **Purpose:** Return lesson content and its exercises.
- **Response:** `{ "lesson": { "id": "…", "title": "…", "exercises": [{ "id": "…", "type": "…", "prompt": "…", "options": [] }] } }`
- **Errors:** `404` lesson not found.

## Exercises

### `POST /api/exercises/:exerciseId/answer` — Planned

- **Purpose:** Check an exercise answer and return feedback.
- **Request:** `{ "answer": { "optionId": "…" } }` (the answer shape may vary by exercise type).
- **Response:** `{ "isCorrect": true, "feedback": "…", "correctAnswer": "…" }`
- **Errors:** `400` invalid answer; `404` exercise not found.

## Progress

### `GET /api/progress` — Planned

- **Purpose:** Return the current learner's progress summary.
- **Response:** `{ "completedLessons": 0, "currentStreak": 0, "xp": 0 }`
- **Errors:** `401` missing or invalid session.

### `POST /api/lessons/:lessonId/complete` — Planned

- **Purpose:** Record lesson completion and return its result.
- **Response:** `{ "lessonId": "…", "completedAt": "…", "xpEarned": 0 }`
- **Errors:** `401` missing or invalid session; `404` lesson not found.

## Rewards and achievements

### `GET /api/achievements` — Planned

- **Purpose:** List achievements and the current learner's earned status.
- **Response:** `{ "achievements": [{ "id": "…", "title": "…", "earned": false }] }`
- **Errors:** `401` missing or invalid session.

## Flo AI Tutor

### `POST /api/tutor/chat` — Planned

- **Purpose:** Send a learner message to Flo and return a reply.
- **Request:** `{ "message": "…" }`
- **Response:** `{ "reply": "…" }`
- **Errors:** `400` empty/invalid message; `500` tutor request failed.

Keep this API small. Add or change contracts only when the product flow requires it, and keep this document aligned with the actual route/controller behavior.
