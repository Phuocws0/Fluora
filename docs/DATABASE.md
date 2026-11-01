# Database Model

The repository currently has no database schema. This is a conceptual starting model for the local demo, not a Prisma schema or a claim about implemented tables. When a `schema.prisma` exists, that schema is the implementation source of truth; keep this document focused on concepts and relationships.

## Learning content

```text
Course
  └── Unit
       └── Lesson
            └── Exercise
                 └── ExerciseOption
```

- **courses:** Learning courses available in the app.
- **units:** Ordered groups of lessons within a course.
- **lessons:** Learning sessions within a unit.
- **exercises:** Prompts or activities within a lesson.
- **exercise_options:** Selectable answer options when an exercise uses choices.

## Learner data

```text
User
 ├── Enrollment
 ├── UserProgress
 ├── UserAnswer
 ├── Streak
 └── UserAchievement
```

- **users:** Learner accounts.
- **enrollments:** The relationship between a learner and a course they are taking.
- **user_progress:** Learner completion/progress for lessons or other learning units.
- **user_answers:** Submitted answers and their outcome when needed for the demo.
- **streaks:** A learner's current or recorded practice streak.
- **achievements:** Achievement definitions available in the app.
- **user_achievements:** The relationship recording achievements earned by a learner.

An exercise belongs to a lesson; each option belongs to an exercise. A unit belongs to a course and a lesson belongs to a unit. Learner-specific records refer to a user and the relevant course, lesson, exercise, or achievement. Exact keys, fields, constraints, and deletion behavior should be chosen when implementing the real schema, based on the needed flows.

If the existing Prisma schema differs from this starting model, document and use the actual schema rather than forcing this draft onto it.
