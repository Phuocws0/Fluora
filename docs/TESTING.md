# Testing and Verification

Keep verification proportional to a local demo. Prefer tools already present in the project; this document does not require adding a testing framework. The repository currently has no application code or runnable checks, so commands should be documented after the project setup exists.

## 1. Static verification

Where available, check that:

- TypeScript type checking passes.
- There are no unresolved imports.
- Existing linting reports no obvious errors.
- There is no unjustified `any` or obvious dead import.
- Frontend and backend types/contracts do not obviously disagree.

## 2. Backend verification

For implemented endpoints, verify:

- A valid expected request works.
- Basic request validation behaves as expected.
- The success response has the documented shape.
- A relevant error path returns a useful status and response.
- The database operation works against the local database.
- The endpoint remains consistent with [API.md](API.md).

## 3. Mobile verification

For implemented screens and flows, verify:

- The screen renders and navigation works.
- Relevant loading and error states do not crash the app.
- API integration works.
- Important interaction states behave correctly.
- The Android demo flow works.

iOS verification is desirable, but not required for every local task unless the change concerns iOS behavior.

## Demo smoke flow

Once these features exist, use this as a minimum end-to-end sanity check:

```text
Launch app
↓
Login
↓
Learning Home
↓
Open Course
↓
Open Unit
↓
Open Lesson
↓
Complete Exercise
↓
Show Result
↓
Update Progress
```
