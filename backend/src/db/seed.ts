import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

type OptionSeed = { label: string; value: string; isCorrect: boolean };
type ExerciseSeed = {
  type: string;
  prompt: string;
  instruction?: string;
  content: Prisma.InputJsonObject;
  answerKey: Prisma.InputJsonObject;
  explanation?: string;
  options?: OptionSeed[];
};
type LessonSeed = {
  slug: string;
  title: string;
  description: string;
  skill: string;
  level: string;
  durationMinutes: number;
  exercises: ExerciseSeed[];
};
type UnitSeed = {
  slug: string;
  title: string;
  description: string;
  lessons: LessonSeed[];
};

const courseSeed = {
  slug: "english-foundations",
  title: "English Foundations",
  description: "Build confidence with short, practical English conversations.",
  language: "English",
  level: "A1",
  estimatedMinutes: 48,
  order: 1,
  isPublished: true,
};

const unitSeeds: UnitSeed[] = [
  {
    slug: "first-conversations",
    title: "First conversations",
    description: "Practice greetings, introductions, and simple questions.",
    lessons: [
      {
        slug: "greetings-and-introductions",
        title: "Greetings and introductions",
        description: "Choose a greeting and introduce yourself.",
        skill: "speaking",
        level: "A1",
        durationMinutes: 8,
        exercises: [
          {
            type: "multiple_choice",
            prompt: "Which greeting would you use in the morning?",
            content: { mode: "single_choice" },
            answerKey: { optionValue: "good-morning" },
            explanation: "“Good morning” is used as a greeting in the morning.",
            options: [
              { label: "Good morning", value: "good-morning", isCorrect: true },
              { label: "Good night", value: "good-night", isCorrect: false },
              { label: "Goodbye", value: "goodbye", isCorrect: false },
            ],
          },
          {
            type: "sentence_tiles",
            prompt: "Build a short introduction.",
            instruction: "Arrange the words to say your name.",
            content: { tiles: ["is", "My", "Mia.", "name"] },
            answerKey: { tokens: ["My", "name", "is", "Mia."] },
            explanation: "Use “My name is…” to introduce yourself.",
          },
        ],
      },
      {
        slug: "asking-a-simple-question",
        title: "Asking a simple question",
        description: "Complete and practice a common conversation question.",
        skill: "listening",
        level: "A1",
        durationMinutes: 10,
        exercises: [
          {
            type: "transcript_gap",
            prompt: "Complete the question.",
            content: { transcript: "Hello! How ___ you?", gaps: [1] },
            answerKey: { accepted: ["are"] },
            explanation: "The phrase is “How are you?”",
          },
          {
            type: "speaking",
            prompt: "Say: “I am fine, thank you.”",
            instruction: "Practice aloud. Your recording stays on your device.",
            content: { suggestedPhrase: "I am fine, thank you." },
            answerKey: { scoring: "self_assessed" },
          },
        ],
      },
    ],
  },
  {
    slug: "everyday-english",
    title: "Everyday English",
    description: "Use simple English in cafés and around town.",
    lessons: [
      {
        slug: "ordering-at-a-cafe",
        title: "Ordering at a café",
        description: "Recognize a polite way to order a drink.",
        skill: "speaking",
        level: "A1",
        durationMinutes: 12,
        exercises: [
          {
            type: "multiple_choice",
            prompt: "Which phrase politely asks for a coffee?",
            content: { mode: "single_choice" },
            answerKey: { optionValue: "could-i-have" },
            explanation: "“Could I have…?” is a polite way to order.",
            options: [
              { label: "Could I have a coffee, please?", value: "could-i-have", isCorrect: true },
              { label: "Coffee now!", value: "coffee-now", isCorrect: false },
              { label: "Where coffee?", value: "where-coffee", isCorrect: false },
            ],
          },
        ],
      },
      {
        slug: "understanding-directions",
        title: "Understanding directions",
        description: "Match common direction words with their meaning.",
        skill: "reading",
        level: "A1",
        durationMinutes: 8,
        exercises: [
          {
            type: "matching",
            prompt: "Match each direction with its meaning.",
            content: {
              leftItems: ["turn left", "go straight"],
              rightItems: ["continue forward", "change direction to the left"],
            },
            answerKey: {
              pairs: [
                { left: "turn left", right: "change direction to the left" },
                { left: "go straight", right: "continue forward" },
              ],
            },
            explanation: "These phrases are commonly used to give directions.",
          },
        ],
      },
    ],
  },
];

const learningPathSeeds = [
  {
    slug: "everyday-english-path",
    title: "Everyday English",
    summary: "Build confidence in introductions and common daily conversations.",
    careerGoal: "Everyday communication",
    targetLanguage: "English",
    level: "A1",
    estimatedMinutes: 48,
    estimatedWeeks: 2,
    outcomes: ["Introduce yourself", "Ask and answer simple questions", "Order politely at a café"],
    order: 1,
    isPublished: true,
  },
  {
    slug: "travel-english-path",
    title: "Travel English",
    summary: "Practice useful phrases for getting around and asking for help.",
    careerGoal: "Travel and local navigation",
    targetLanguage: "English",
    level: "A1",
    estimatedMinutes: 36,
    estimatedWeeks: 2,
    outcomes: ["Understand simple directions", "Ask for help politely", "Use greetings while travelling"],
    order: 2,
    isPublished: true,
  },
];

async function seedLearningContent() {
  const course = await prisma.course.upsert({
    where: { slug: courseSeed.slug },
    create: courseSeed,
    update: courseSeed,
  });

  for (const [unitIndex, unitSeed] of unitSeeds.entries()) {
    const unit = await prisma.unit.upsert({
      where: { courseId_slug: { courseId: course.id, slug: unitSeed.slug } },
      create: {
        courseId: course.id,
        slug: unitSeed.slug,
        title: unitSeed.title,
        description: unitSeed.description,
        order: unitIndex + 1,
      },
      update: {
        title: unitSeed.title,
        description: unitSeed.description,
        order: unitIndex + 1,
      },
    });

    for (const [lessonIndex, lessonSeed] of unitSeed.lessons.entries()) {
      const lesson = await prisma.lesson.upsert({
        where: { unitId_slug: { unitId: unit.id, slug: lessonSeed.slug } },
        create: {
          unitId: unit.id,
          slug: lessonSeed.slug,
          title: lessonSeed.title,
          description: lessonSeed.description,
          skill: lessonSeed.skill,
          level: lessonSeed.level,
          durationMinutes: lessonSeed.durationMinutes,
          order: lessonIndex + 1,
        },
        update: {
          title: lessonSeed.title,
          description: lessonSeed.description,
          skill: lessonSeed.skill,
          level: lessonSeed.level,
          durationMinutes: lessonSeed.durationMinutes,
          order: lessonIndex + 1,
        },
      });

      for (const [exerciseIndex, exerciseSeed] of lessonSeed.exercises.entries()) {
        const exercise = await prisma.exercise.upsert({
          where: { lessonId_order: { lessonId: lesson.id, order: exerciseIndex + 1 } },
          create: {
            lessonId: lesson.id,
            type: exerciseSeed.type,
            prompt: exerciseSeed.prompt,
            instruction: exerciseSeed.instruction,
            content: exerciseSeed.content,
            answerKey: exerciseSeed.answerKey,
            explanation: exerciseSeed.explanation,
            order: exerciseIndex + 1,
          },
          update: {
            type: exerciseSeed.type,
            prompt: exerciseSeed.prompt,
            instruction: exerciseSeed.instruction,
            content: exerciseSeed.content,
            answerKey: exerciseSeed.answerKey,
            explanation: exerciseSeed.explanation,
          },
        });

        for (const [optionIndex, optionSeed] of (exerciseSeed.options ?? []).entries()) {
          await prisma.exerciseOption.upsert({
            where: { exerciseId_order: { exerciseId: exercise.id, order: optionIndex + 1 } },
            create: {
              exerciseId: exercise.id,
              label: optionSeed.label,
              value: optionSeed.value,
              isCorrect: optionSeed.isCorrect,
              order: optionIndex + 1,
            },
            update: {
              label: optionSeed.label,
              value: optionSeed.value,
              isCorrect: optionSeed.isCorrect,
            },
          });
        }
      }
    }
  }

  for (const pathSeed of learningPathSeeds) {
    await prisma.learningPath.upsert({
      where: { slug: pathSeed.slug },
      create: { ...pathSeed, courseId: course.id },
      update: { ...pathSeed, courseId: course.id },
    });
  }

  const storyContent = {
    paragraphs: [
      { speaker: "Mia", text: "Good morning! My name is Mia." },
      { speaker: "Leo", text: "Good morning, Mia. I am Leo." },
      { speaker: "Mia", text: "Nice to meet you, Leo." },
    ],
    comprehension: [{ question: "When do Mia and Leo meet?", options: ["Morning", "Evening"] }],
  };

  await prisma.story.upsert({
    where: { slug: "first-conversation" },
    create: {
      slug: "first-conversation",
      title: "A first conversation",
      kind: "dialogue",
      content: storyContent,
    },
    update: {
      title: "A first conversation",
      kind: "dialogue",
      content: storyContent,
    },
  });

  for (const goal of [
    { slug: "introduce-yourself", title: "Introduce yourself", skill: "speaking", description: "Say your name and greet another learner." },
    { slug: "ask-for-directions", title: "Ask for directions", skill: "reading", description: "Understand and use simple direction words." },
  ]) {
    await prisma.canDoGoal.upsert({ where: { slug: goal.slug }, create: goal, update: goal });
  }

  const firstLesson = await prisma.lesson.findFirst({ where: { slug: "greetings-and-introductions", unit: { courseId: course.id } }, select: { id: true } });
  if (!firstLesson) throw new Error("Seeded first lesson was not found.");
  await prisma.mission.upsert({
    where: { slug: "first-conversation" },
    create: { slug: "first-conversation", title: "First conversation", description: "Complete the greetings lesson to earn your first passport stamp.", requiredLessonId: firstLesson.id },
    update: { title: "First conversation", description: "Complete the greetings lesson to earn your first passport stamp.", requiredLessonId: firstLesson.id },
  });

  console.log("Seeded the English Foundations course, learning paths, story, goals, and mission.");
}

const questSeeds = [
  { slug: "daily-lesson", title: "Complete 1 lesson", metric: "lessons_completed", target: 1, rewardGems: 10, order: 1 },
  { slug: "daily-xp", title: "Earn 20 XP", metric: "xp_earned", target: 20, rewardGems: 15, order: 2 },
  { slug: "daily-review", title: "Answer 3 review cards", metric: "review_answers", target: 3, rewardGems: 10, order: 3 },
  { slug: "daily-story", title: "Finish 1 story", metric: "stories_completed", target: 1, rewardGems: 10, order: 4 },
];

const achievementSeeds = [
  { slug: "first-lesson", title: "First steps", description: "Complete your first lesson.", metric: "lessons_completed_total", target: 1, order: 1 },
  { slug: "course-finisher", title: "Course finisher", description: "Complete all four starter lessons.", metric: "lessons_completed_total", target: 4, order: 2 },
  { slug: "xp-50", title: "Growing garden", description: "Earn 50 XP in total.", metric: "xp_total", target: 50, order: 3 },
  { slug: "streak-2", title: "Two-day streak", description: "Learn on two days in a row.", metric: "streak_days", target: 2, order: 4 },
  { slug: "first-friend", title: "Study buddy", description: "Make your first friend.", metric: "friends_count", target: 1, order: 5 },
  { slug: "first-claim", title: "Quest seeker", description: "Claim your first daily quest.", metric: "quests_claimed_total", target: 1, order: 6 },
];

const rewardSeeds = [
  { slug: "streak-freeze", name: "Streak freeze", description: "Protect your streak for one missed day.", costGems: 20, kind: "streak_freeze", fulfillment: "deferred", order: 1 },
  { slug: "profile-frame", name: "Leaf profile frame", description: "A leafy frame around your profile photo.", costGems: 30, kind: "profile_frame", fulfillment: "instant", order: 2 },
  { slug: "garden-theme", name: "Garden theme", description: "A calm green app theme.", costGems: 40, kind: "theme", fulfillment: "instant", order: 3 },
  { slug: "flo-outfit", name: "Flo explorer outfit", description: "A travel outfit for your Flo companion.", costGems: 45, kind: "flo_outfit", fulfillment: "instant", order: 4 },
];

const peerReviewSeeds = [
  {
    slug: "weekend-plans",
    title: "My weekend plans",
    prompt: "Write three sentences about your plans for the weekend.",
    body: "On Saturday I go to the market with my sister. In the afternoon we will cooking a big lunch. On Sunday I want relax at home and read a book.",
    authorLabel: "Learner A2",
    order: 1,
  },
  {
    slug: "favourite-place",
    title: "My favourite place",
    prompt: "Describe a place you like to visit and explain why.",
    body: "My favourite place is a small café near my office. The coffee is very good and the people is friendly. I go there every morning before work.",
    authorLabel: "Learner A2",
    order: 2,
  },
];

/** Password-less demo learners (they can't sign in) so search, profiles, and the League have data. */
const demoLearnerSeeds = [
  { email: "demo.linh@fluora.local", displayName: "Linh (demo)", lessonCount: 0 },
  { email: "demo.minh@fluora.local", displayName: "Minh (demo)", lessonCount: 2 },
  { email: "demo.an@fluora.local", displayName: "An (demo)", lessonCount: 4 },
];

async function seedCommunityAndLeague() {
  for (const quest of questSeeds) {
    await prisma.quest.upsert({ where: { slug: quest.slug }, create: quest, update: quest });
  }
  for (const achievement of achievementSeeds) {
    await prisma.achievement.upsert({ where: { slug: achievement.slug }, create: achievement, update: achievement });
  }
  for (const reward of rewardSeeds) {
    await prisma.reward.upsert({ where: { slug: reward.slug }, create: reward, update: reward });
  }
  for (const submission of peerReviewSeeds) {
    await prisma.peerReviewSubmission.upsert({ where: { slug: submission.slug }, create: submission, update: submission });
  }

  const lessons = await prisma.lesson.findMany({
    where: { unit: { course: { slug: courseSeed.slug } } },
    orderBy: [{ unit: { order: "asc" } }, { order: "asc" }],
    select: { id: true, _count: { select: { exercises: true } } },
  });
  const now = new Date();
  for (const demo of demoLearnerSeeds) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      create: { email: demo.email, displayName: demo.displayName, emailVerifiedAt: now },
      update: { displayName: demo.displayName },
    });
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, discoverable: true, progressVisibility: "public" },
      update: { discoverable: true, progressVisibility: "public" },
    });
    // Keep the demo XP inside the current League week so the leaderboard always has data.
    for (const lesson of lessons.slice(0, demo.lessonCount)) {
      await prisma.lessonCompletion.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        create: { userId: user.id, lessonId: lesson.id, xpEarned: 10 + lesson._count.exercises * 2, completedAt: now },
        update: { completedAt: now },
      });
    }
  }

  console.log("Seeded quests, achievements, rewards, peer-review samples, and demo learners.");
}

async function seed() {
  await seedLearningContent();
  await seedCommunityAndLeague();
}

seed()
  .catch((error: unknown) => {
    console.error("Failed to seed demo data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
