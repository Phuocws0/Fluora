# Product Overview

Fluora is a mobile language-learning application for practicing a language through a guided sequence of courses, units, lessons, and exercises. The current scope is a local demonstration; details should follow the repository and the referenced designs rather than assume a larger commercial product.

## Product areas

- **Authentication:** Welcome, login, and registration entry points.
- **Onboarding:** Initial setup that leads a learner into the app.
- **Learning Home:** The learner's starting point for resuming or choosing learning activities.
- **Courses and units:** Organized learning content, with units grouping lessons.
- **Lessons:** Guided learning sessions made up of exercises.
- **Exercises / Practice:** Answering learning questions and receiving a result or feedback.
- **Progress tracking:** A view of lesson completion and learning progress.
- **Streaks, rewards, and achievements:** Lightweight motivation and recognition during the demo.
- **Community:** A supporting area for community-oriented content or interaction represented in the design.
- **Profile and settings:** Personal account and app preferences.
- **Flo AI Tutor:** A supporting tutor experience shown in the design; behavior depends on the implemented demo scope.

These are product areas, not a statement that corresponding screens or features already exist.

## Core user journey

```text
Welcome
↓
Login / Register
↓
Onboarding
↓
Learning Home
↓
Course
↓
Unit
↓
Lesson
↓
Exercise
↓
Result / Feedback
↓
Progress
```

Secondary flows branch from the main learning experience:

```text
Learning Home
├── Practice
├── Community
├── Rewards
├── Profile
├── Settings
└── Flo AI Tutor
```

See [FIGMA.md](FIGMA.md) for design references and [ROUTES.md](ROUTES.md) for the proposed logical navigation model.
