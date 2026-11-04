import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";

const courseCatalogSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  language: true,
  level: true,
  estimatedMinutes: true,
  units: {
    select: {
      _count: { select: { lessons: true } },
    },
  },
  learningPaths: {
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: { id: true, slug: true, title: true },
  },
} satisfies Prisma.CourseSelect;

const learningPathSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  careerGoal: true,
  targetLanguage: true,
  level: true,
  estimatedMinutes: true,
  estimatedWeeks: true,
  outcomes: true,
  course: { select: { id: true, slug: true, title: true } },
} satisfies Prisma.LearningPathSelect;

export async function listCourses() {
  const rows = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: courseCatalogSelect,
  });

  return {
    courses: rows.map(({ units, learningPaths, ...course }) => ({
      ...course,
      unitCount: units.length,
      lessonCount: units.reduce((count, unit) => count + unit._count.lessons, 0),
      learningPaths,
    })),
  };
}

export async function getCourse(courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      language: true,
      level: true,
      estimatedMinutes: true,
      units: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              skill: true,
              level: true,
              durationMinutes: true,
              order: true,
            },
          },
        },
      },
      learningPaths: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: learningPathSelect,
      },
    },
  });
}

export async function getCourseUnits(courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: {
      units: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          order: true,
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  if (!course) return null;

  return {
    units: course.units.map(({ _count, ...unit }) => ({
      ...unit,
      lessonCount: _count.lessons,
    })),
  };
}

export async function getUnit(unitId: string) {
  return prisma.unit.findFirst({
    where: { id: unitId, course: { is: { isPublished: true } } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      order: true,
      course: { select: { id: true, slug: true, title: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          skill: true,
          level: true,
          durationMinutes: true,
          order: true,
        },
      },
    },
  });
}

export async function getLesson(lessonId: string) {
  return prisma.lesson.findFirst({
    where: {
      id: lessonId,
      unit: { is: { course: { is: { isPublished: true } } } },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      skill: true,
      level: true,
      durationMinutes: true,
      order: true,
      unit: {
        select: {
          id: true,
          slug: true,
          title: true,
          course: { select: { id: true, slug: true, title: true } },
        },
      },
      exercises: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          instruction: true,
          content: true,
          order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, label: true, value: true, order: true },
          },
        },
      },
    },
  });
}

export async function searchLessons(filters: {
  query?: string;
  level?: string;
  skill?: string;
  minutes?: number;
}) {
  const query = normalizeSearchText(filters.query ?? "");
  const lessons = await prisma.lesson.findMany({
    where: {
      unit: { is: { course: { is: { isPublished: true } } } },
      ...(filters.level ? { level: { equals: filters.level, mode: "insensitive" as const } } : {}),
      ...(filters.skill ? { skill: { equals: filters.skill, mode: "insensitive" as const } } : {}),
      ...(filters.minutes ? { durationMinutes: { lte: filters.minutes } } : {}),
    },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      skill: true,
      level: true,
      durationMinutes: true,
      order: true,
      unit: {
        select: {
          id: true,
          slug: true,
          title: true,
          course: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });

  return {
    lessons: query
      ? lessons.filter((lesson) => normalizeSearchText(`${lesson.title} ${lesson.description ?? ""}`).includes(query))
      : lessons,
  };
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

export async function listLearningPaths() {
  const paths = await prisma.learningPath.findMany({
    where: { isPublished: true, course: { is: { isPublished: true } } },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: learningPathSelect,
  });

  return { paths };
}

export async function compareLearningPaths(ids: string[]) {
  const paths = await prisma.learningPath.findMany({
    where: { id: { in: ids }, isPublished: true, course: { is: { isPublished: true } } },
    select: learningPathSelect,
  });
  const pathsById = new Map(paths.map((path) => [path.id, path]));

  return ids.map((id) => pathsById.get(id)).filter((path) => path !== undefined);
}
