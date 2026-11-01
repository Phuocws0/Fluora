import { prisma } from "../../db/prisma.js";

export async function listSets(userId: string) {
  return { sets: await prisma.vocabularySet.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { cards: true } } } }) };
}

export async function createSet(userId: string, name: string) {
  return { set: await prisma.vocabularySet.create({ data: { userId, name } }) };
}

export async function getSet(userId: string, id: string) {
  const set = await prisma.vocabularySet.findFirst({ where: { id, userId }, include: { cards: { orderBy: { createdAt: "asc" } } } });
  if (!set) return null;
  const { cards, ...details } = set;
  return { set: details, cards };
}

export async function updateSet(userId: string, id: string, name: string) {
  const result = await prisma.vocabularySet.updateMany({ where: { id, userId }, data: { name } });
  return result.count ? { set: await prisma.vocabularySet.findUniqueOrThrow({ where: { id } }) } : null;
}

export async function deleteSet(userId: string, id: string) {
  const result = await prisma.vocabularySet.deleteMany({ where: { id, userId } });
  return result.count ? { deleted: true } : null;
}

export async function listCards(userId: string, setId: string) {
  const set = await prisma.vocabularySet.findFirst({ where: { id: setId, userId } });
  if (!set) return null;
  return { cards: await prisma.vocabularyCard.findMany({ where: { setId }, orderBy: { createdAt: "asc" } }) };
}

export async function createCard(userId: string, setId: string, input: { front: string; back: string; tag?: string; example?: string }) {
  const set = await prisma.vocabularySet.findFirst({ where: { id: setId, userId } });
  return set ? { card: await prisma.vocabularyCard.create({ data: { setId, ...input } }) } : null;
}

export async function getCard(userId: string, id: string) {
  const card = await prisma.vocabularyCard.findFirst({ where: { id, set: { is: { userId } } } });
  return card ? { card } : null;
}

export async function updateCard(userId: string, id: string, input: { front?: string; back?: string; tag?: string | null; example?: string | null }) {
  const result = await prisma.vocabularyCard.updateMany({ where: { id, set: { is: { userId } } }, data: input });
  return result.count ? { card: await prisma.vocabularyCard.findUniqueOrThrow({ where: { id } }) } : null;
}

export async function deleteCard(userId: string, id: string) {
  const result = await prisma.vocabularyCard.deleteMany({ where: { id, set: { is: { userId } } } });
  return result.count ? { deleted: true } : null;
}

export async function listStories() {
  return { stories: await prisma.story.findMany({ where: { isPublished: true }, orderBy: { title: "asc" }, select: { id: true, slug: true, title: true, kind: true } }) };
}

export async function getStory(id: string) {
  const story = await prisma.story.findFirst({ where: { id, isPublished: true }, select: { id: true, slug: true, title: true, kind: true, content: true } });
  return story ? { story } : null;
}

export async function getReadingProgress(userId: string, storyId: string) {
  const story = await prisma.story.findFirst({ where: { id: storyId, isPublished: true }, select: { id: true } });
  if (!story) return null;
  return { progress: await prisma.readingProgress.findUnique({ where: { userId_storyId: { userId, storyId } } }) };
}

export async function saveReadingProgress(userId: string, storyId: string, position: number, completed?: boolean) {
  const story = await prisma.story.findFirst({ where: { id: storyId, isPublished: true }, select: { id: true } });
  if (!story) return null;
  const progress = await prisma.readingProgress.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId, position, completed: completed ?? false },
    update: { position, ...(completed !== undefined ? { completed } : {}) },
  });
  return { progress };
}

export async function resetReadingProgress(userId: string, storyId: string) {
  const story = await prisma.story.findFirst({ where: { id: storyId, isPublished: true }, select: { id: true } });
  if (!story) return null;
  await prisma.readingProgress.deleteMany({ where: { userId, storyId } });
  return { deleted: true };
}

export async function listBookmarks(userId: string) {
  return { bookmarks: await prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) };
}

export async function createBookmark(userId: string, storyId: string) {
  const story = await prisma.story.findFirst({ where: { id: storyId, isPublished: true }, select: { id: true } });
  if (!story) return null;
  const bookmark = await prisma.bookmark.create({ data: { userId, targetType: "story", targetId: storyId } });
  return { bookmark };
}

export async function updateBookmark(userId: string, id: string, input: { note?: string | null; tag?: string | null }) {
  const result = await prisma.bookmark.updateMany({ where: { id, userId }, data: input });
  return result.count ? { bookmark: await prisma.bookmark.findUniqueOrThrow({ where: { id } }) } : null;
}

export async function deleteBookmark(userId: string, id: string) {
  const result = await prisma.bookmark.deleteMany({ where: { id, userId } });
  return result.count ? { deleted: true } : null;
}

const tools = [
  { id: "listening", title: "Listening practice", kind: "audio" },
  { id: "pronunciation", title: "Pronunciation practice", kind: "speaking" },
  { id: "writing", title: "Writing practice", kind: "writing" },
  { id: "grammar", title: "Grammar reference", kind: "reference" },
  { id: "word-map", title: "Word map", kind: "vocabulary" },
  { id: "city", title: "City directions", kind: "mission" },
  { id: "cafe", title: "Café ordering", kind: "mission" },
  { id: "transit", title: "Transit planning", kind: "mission" },
];

const dictionary = [
  { word: "hello", definition: "A greeting.", example: "Hello, my name is Mia." },
  { word: "morning", definition: "The early part of the day.", example: "Good morning!" },
  { word: "name", definition: "A word used to identify a person or thing.", example: "My name is Mia." },
];

export function listTools() { return { tools }; }
export function getTool(toolId: string) {
  const tool = tools.find((entry) => entry.id === toolId);
  return tool ? { tool } : null;
}
export function lookupWord(query: string) {
  const entry = dictionary.find((item) => item.word === query.toLowerCase());
  return entry ? { entry } : null;
}

export async function getPractice(userId: string) {
  const [reviewDueCount, story] = await Promise.all([
    prisma.reviewItem.count({ where: { userId, nextReviewAt: { lte: new Date() } } }),
    prisma.story.findFirst({ where: { isPublished: true }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return { reviewDueCount, suggestions: story ? [{ kind: "story", id: story.id, title: story.title }] : [] };
}

export async function listReviewItems(userId: string, kind?: string) {
  return { items: await prisma.reviewItem.findMany({ where: { userId, nextReviewAt: { lte: new Date() }, ...(kind ? { kind } : {}) }, orderBy: { nextReviewAt: "asc" } }) };
}
export async function getReviewItem(userId: string, id: string) {
  const item = await prisma.reviewItem.findFirst({ where: { id, userId } });
  return item ? { item } : null;
}
export async function createReviewItem(userId: string, input: { front: string; back: string; kind: string }) {
  return { item: await prisma.reviewItem.create({ data: { userId, ...input } }) };
}
export async function updateReviewItem(userId: string, id: string, input: { front?: string; back?: string }) {
  const result = await prisma.reviewItem.updateMany({ where: { id, userId, kind: "custom" }, data: input });
  return result.count ? { item: await prisma.reviewItem.findUniqueOrThrow({ where: { id } }) } : null;
}
export async function deleteReviewItem(userId: string, id: string) {
  const result = await prisma.reviewItem.deleteMany({ where: { id, userId, kind: "custom" } });
  return result.count ? { deleted: true } : null;
}
export async function answerReviewItem(userId: string, id: string, correct: boolean) {
  const item = await prisma.reviewItem.findFirst({ where: { id, userId } });
  if (!item) return null;
  const nextReviewAt = new Date(Date.now() + (correct ? 24 * 60 : 10) * 60 * 1000);
  await prisma.$transaction([
    prisma.reviewOutcome.create({ data: { itemId: id, correct } }),
    prisma.reviewItem.update({ where: { id }, data: { nextReviewAt } }),
  ]);
  return { result: { correct }, nextReviewAt };
}

export async function importCards(userId: string, setId: string, rows: Array<{ front: string; back: string; tag?: string; example?: string }>) {
  const set = await prisma.vocabularySet.findFirst({ where: { id: setId, userId } });
  if (!set) return null;
  const cards = await prisma.$transaction(rows.map((row) => prisma.vocabularyCard.create({ data: { setId, ...row } })));
  return { importedCount: cards.length, cards };
}
