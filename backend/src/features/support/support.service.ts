import { prisma } from "../../db/prisma.js";

export type DeviceDetails = Record<string, string>;

export class SupportConflictError extends Error {}

const articles = [
  { id: "getting-started", category: "learning", title: "Getting started", body: "Choose a course, open a unit, and complete its lessons in order." },
  { id: "offline", category: "practice", title: "Offline lessons", body: "Downloaded lessons are stored on your device. Open Downloads in Practice to manage them." },
  { id: "account", category: "account", title: "Account help", body: "Open Profile to update your settings or contact support." },
];

export function listArticles(category?: string) {
  return { articles: category ? articles.filter((article) => article.category === category) : articles };
}

export async function listRequests(userId: string) {
  return { requests: await prisma.supportRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) };
}

export async function createRequest(userId: string, input: { message: string; screenshot?: string; deviceDetails: DeviceDetails }) {
  return { request: await prisma.supportRequest.create({ data: { userId, ...input } }) };
}

export async function updateRequest(userId: string, id: string, input: { message?: string; screenshot?: string | null; deviceDetails?: DeviceDetails }) {
  const existing = await prisma.supportRequest.findFirst({ where: { id, userId } });
  if (!existing) return null;
  if (existing.status !== "open") throw new SupportConflictError("Only open requests can be edited.");
  return { request: await prisma.supportRequest.update({ where: { id }, data: input }) };
}

export async function deleteRequest(userId: string, id: string) {
  const existing = await prisma.supportRequest.findFirst({ where: { id, userId } });
  if (!existing) return null;
  if (existing.status !== "open") throw new SupportConflictError("Only open requests can be cancelled.");
  await prisma.supportRequest.delete({ where: { id } });
  return { deleted: true };
}

export async function createExport(userId: string) {
  const job = await prisma.dataExportRequest.create({ data: { userId } });
  return { exportId: job.id, status: job.status };
}

export async function listExports(userId: string) {
  return { exports: await prisma.dataExportRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) };
}

export async function getExport(userId: string, id: string) {
  const job = await prisma.dataExportRequest.findFirst({ where: { id, userId } });
  return job ? { export: job } : null;
}

export async function deleteExport(userId: string, id: string) {
  const result = await prisma.dataExportRequest.deleteMany({ where: { id, userId } });
  return result.count ? { deleted: true } : null;
}

export async function downloadExport(userId: string, id: string) {
  const job = await prisma.dataExportRequest.findFirst({ where: { id, userId } });
  if (!job) return null;
  if (job.status !== "ready") throw new SupportConflictError("The export is not ready.");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      settings: true,
      placementAttempts: { orderBy: { createdAt: "asc" } },
      supportRequests: { orderBy: { createdAt: "asc" } },
      vocabularySets: {
        orderBy: { createdAt: "asc" },
        include: { cards: { orderBy: { createdAt: "asc" } } },
      },
      bookmarks: { orderBy: { createdAt: "asc" } },
      readingProgress: { orderBy: { createdAt: "asc" } },
      reviewItems: {
        orderBy: { createdAt: "asc" },
        include: { outcomes: { orderBy: { createdAt: "asc" } } },
      },
      answers: { orderBy: { createdAt: "asc" } },
      lessonCompletions: { orderBy: { completedAt: "asc" } },
      plannerEntries: { orderBy: { createdAt: "asc" } },
      learningEvidence: {
        orderBy: { createdAt: "asc" },
        include: { goal: { select: { slug: true, title: true, skill: true, description: true } } },
      },
      missionCompletions: {
        orderBy: { completedAt: "asc" },
        include: { mission: { select: { slug: true, title: true, description: true } } },
      },
      misconceptionStates: true,
      sentFriendRequests: { orderBy: { createdAt: "asc" } },
      receivedFriendRequests: { orderBy: { createdAt: "asc" } },
      notifications: { orderBy: { createdAt: "asc" } },
      groupMemberships: {
        orderBy: { joinedAt: "asc" },
        include: { group: { select: { id: true, name: true, goal: true, topic: true, visibility: true, createdAt: true } } },
      },
      groupPosts: {
        orderBy: { createdAt: "asc" },
        include: { group: { select: { id: true, name: true } } },
      },
      groupComments: { orderBy: { createdAt: "asc" } },
      challengeParticipations: {
        orderBy: { joinedAt: "asc" },
        include: { challenge: { select: { id: true, title: true, metric: true, target: true, startsAt: true, endsAt: true } } },
      },
      hostedRooms: {
        orderBy: { createdAt: "asc" },
        include: {
          group: { select: { id: true, name: true } },
          polls: {
            orderBy: { createdAt: "asc" },
            include: { choices: { orderBy: { order: "asc" } } },
          },
        },
      },
      roomParticipations: { orderBy: { joinedAt: "asc" } },
      roomMessages: { orderBy: { createdAt: "asc" } },
      pollVotes: {
        orderBy: { createdAt: "asc" },
        include: {
          poll: { select: { id: true, question: true } },
          choice: { select: { id: true, label: true, order: true } },
        },
      },
      peerReviewComments: {
        orderBy: { createdAt: "asc" },
        include: { submission: { select: { id: true, slug: true, title: true } } },
      },
      planTasks: {
        orderBy: { createdAt: "asc" },
        include: { group: { select: { id: true, name: true } } },
      },
      whiteboardNotes: {
        orderBy: { createdAt: "asc" },
        include: { group: { select: { id: true, name: true } } },
      },
      questClaims: {
        orderBy: { claimedAt: "asc" },
        include: { quest: { select: { slug: true, title: true, metric: true, target: true, rewardGems: true } } },
      },
      achievements: {
        orderBy: { earnedAt: "asc" },
        include: { achievement: { select: { slug: true, title: true, description: true, metric: true, target: true } } },
      },
      redemptions: {
        orderBy: { createdAt: "asc" },
        include: { reward: { select: { slug: true, name: true, description: true, kind: true, fulfillment: true } } },
      },
      walletTransactions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!user) return null;
  return { version: 2, generatedAt: new Date().toISOString(), user };
}
