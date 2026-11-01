# Navigation Routes

There is no navigation implementation in the repository yet. The following is an initial logical model, not a list of existing routes. Adapt it to the navigation library and structure that are actually introduced.

```text
/
├── (auth)/
│   ├── welcome
│   ├── login
│   ├── register
│   └── onboarding
│
├── (tabs)/
│   ├── home
│   ├── learn
│   ├── practice
│   ├── community
│   └── profile
│
├── course/[courseId]
├── unit/[unitId]
├── lesson/[lessonId]
├── tutor
├── rewards
└── settings
```

## Route, screen, component, state, and overlay

- **Route:** A navigable location in the app.
- **Screen:** The main view presented for a route; a route commonly maps to a screen.
- **Component:** Reusable UI or behavior embedded in one or more screens.
- **UI state:** A visual/interaction condition within a screen or component.
- **Modal:** A focused temporary view presented over the current screen.
- **Overlay:** Supporting UI drawn over content, such as a tooltip.

Examples:

| Item | Likely representation |
| --- | --- |
| Learning Home | Route / Screen |
| Course Detail | Route / Screen |
| Lesson | Route / Screen |
| Flo AI Tutor | Route / Screen |
| Settings | Route / Screen |
| Correct answer | UI state |
| Wrong answer | UI state |
| Loading | UI state |
| Lesson completed | UI state or modal |
| Confirm dialog | Modal |
| Tooltip | Overlay |

Do not create routes just because separate Figma frames exist. Multiple frames can represent states of one screen. Keep navigation tied to logical user flows and reuse lesson, exercise, card, modal, and state components where appropriate. See [FIGMA.md](FIGMA.md) for the design reference guidance.
