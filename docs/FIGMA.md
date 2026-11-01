# Figma References

## Design source

Main file: [E-learning platform](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform)

### Primary implementation reference

Page: **09 · Prototype Demo — Garden UI**

[Open Page 09](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=76-66)

Use Page 09 as the primary reference for application flow, prototype behavior, navigation, main UI screens, implementation priority, and the demo flow.

### Extended reference

Page: **10 · Interface Diversity Draft — Fluora**

[Open Page 10](https://www.figma.com/design/ZGJJl1q76qBTQISybYYJDb/E-learning-platform?node-id=262-2032)

Use Page 10 for additional UI states, alternative treatments, draft screens, extended interaction coverage, edge cases, and supporting states not represented in Page 09. Page 09 and Page 10 share essentially the same core application flow. Page 10 is an extended reference, not a separate application.

## Mapping designs to implementation

Do not assume every Figma frame is a React Native route. Frames showing a correct or wrong answer, loading, validation error, an opened modal, lesson completion, selected/unselected content, or different exercise states usually describe UI states, components, modals, or overlays within a logical screen.

Represent the application domain and navigation in code; do not mirror the Figma frame count one-to-one. See [ROUTES.md](ROUTES.md) for the route/screen/state distinction.

If Figma access is available, inspect the relevant design before implementing UI. If it cannot be accessed directly, do not invent visual details. Use this document, existing implemented UI, and screenshots or specifications supplied by the user as fallback references.
