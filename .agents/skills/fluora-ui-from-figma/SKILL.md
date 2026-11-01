---
name: fluora-ui-from-figma
description: Implement Fluora React Native UI from the approved Figma prototype while mapping frames to logical routes, components, and UI states.
---

# Fluora UI from Figma

1. Read `docs/FIGMA.md`, `docs/ROUTES.md`, and `docs/PRODUCT.md`, then inspect the relevant existing mobile source.
2. Use **Page 09 · Prototype Demo — Garden UI** (`node-id: 76:66`) as the primary flow/UI reference and its 100-screen inventory as the baseline. The product owner has also promoted 17 concepts from **Page 10 · Interface Diversity Draft — Fluora** (`node-id: 262:2032`) into scope; their visuals remain draft. Other unselected drafts remain out of scope. Pages 02–07 group the same domains. See `docs/FIGMA.md` for the list and links.
3. If Figma access is available, inspect the relevant design before implementing. If it is unavailable or ambiguous, use the documented references, existing UI, and user-provided screenshots/specifications; do not invent visual details.
4. Classify each frame as a route, screen, reusable component, UI state, modal, or overlay. Do not map frames one-to-one to routes. Correct/wrong/selected answers, loading, and completion are usually states within a lesson or exercise flow. Implement the approved CRUD controls from `docs/API.md` even when the prototype omits the control.
5. Preserve logical navigation and the approved five tabs: Learn, Practice, Tutor, League, Profile. Prefer reusable UI. Check layout, navigation, major interactions, loading/error states, and Android demo behavior.
6. Update `docs/STATUS.md` after meaningful UI implementation. Report changed files, verification, and known limitations.
