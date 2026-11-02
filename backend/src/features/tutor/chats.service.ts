import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { createdBefore, toPage, type PageQuery } from "../../http/pagination.js";
import { getPrivacySettings } from "../identity/settings.service.js";
import { parseFeedback, parseStoredContext } from "./context.js";
import { findTurn, parseTurns, toPublicTurn } from "./role-play.js";

/** Unsaved chats are temporary: they are deleted this long after their last activity. */
export const UNSAVED_CHAT_TTL_MS = 60 * 60 * 1000;
export const DEFAULT_CHAT_TITLE = "New chat";

export const chatSelect = {
  id: true,
  kind: true,
  title: true,
  saved: true,
  status: true,
  currentTurnKey: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
  scenario: { select: { id: true, slug: true, title: true, level: true, turns: true, closingLine: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.TutorConversationSelect;

export type ChatRow = Prisma.TutorConversationGetPayload<{ select: typeof chatSelect }>;

export function toChat(row: ChatRow) {
  const turns = row.scenario ? parseTurns(row.scenario.turns) : null;
  const currentTurn = turns && row.currentTurnKey && row.status === "active" ? toPublicTurn(findTurn(turns, row.currentTurnKey)) : null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    saved: row.saved,
    expiresAt: row.saved ? null : new Date(row.lastActivityAt.getTime() + UNSAVED_CHAT_TTL_MS),
    status: row.status,
    scenario: row.scenario ? { id: row.scenario.id, slug: row.scenario.slug, title: row.scenario.title, level: row.scenario.level } : null,
    currentTurn,
    messageCount: row._count.messages,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const messageSelect = {
  id: true,
  role: true,
  body: true,
  context: true,
  feedback: true,
  turnKey: true,
  replyToId: true,
  editedAt: true,
  createdAt: true,
  notes: { select: { id: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.TutorMessageSelect;

type MessageRow = Prisma.TutorMessageGetPayload<{ select: typeof messageSelect }>;

export function toMessage({ notes, context, feedback, ...row }: MessageRow) {
  return { ...row, context: parseStoredContext(context), feedback: parseFeedback(feedback), noteIds: notes.map((note) => note.id) };
}

export function chatNotFound(): HttpError {
  return new HttpError(404, "NOT_FOUND", "Chat not found.");
}

/** Deletes the learner's temporary chats whose time ran out. Called lazily; there is no scheduler. */
export async function purgeExpiredChats(userId: string): Promise<void> {
  await prisma.tutorConversation.deleteMany({
    where: { userId, saved: false, lastActivityAt: { lt: new Date(Date.now() - UNSAVED_CHAT_TTL_MS) } },
  });
}

export async function loadChat(userId: string, chatId: string): Promise<ChatRow> {
  const chat = await prisma.tutorConversation.findFirst({ where: { id: chatId, userId }, select: chatSelect });
  if (!chat) throw chatNotFound();
  return chat;
}

async function savesHistory(userId: string): Promise<boolean> {
  return (await getPrivacySettings([userId])).get(userId)?.saveTutorHistory ?? true;
}

export async function listScenarios() {
  const rows = await prisma.tutorScenario.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, description: true, level: true, turns: true },
  });
  return { scenarios: rows.map(({ turns, ...row }) => ({ ...row, turnCount: parseTurns(turns).length })) };
}

export async function createChat(userId: string, input: { scenarioId?: string; title?: string }) {
  await purgeExpiredChats(userId);
  const saved = await savesHistory(userId);

  if (!input.scenarioId) {
    const chat = await prisma.tutorConversation.create({
      data: { userId, kind: "chat", title: input.title ?? DEFAULT_CHAT_TITLE, saved },
      select: chatSelect,
    });
    return { chat: toChat(chat) };
  }

  const scenario = await prisma.tutorScenario.findUnique({ where: { id: input.scenarioId } });
  if (!scenario) throw new HttpError(404, "NOT_FOUND", "Role-play scenario not found.");
  const start = findTurn(parseTurns(scenario.turns), scenario.startTurnKey);
  const chat = await prisma.tutorConversation.create({
    data: {
      userId,
      scenarioId: scenario.id,
      kind: "role_play",
      title: input.title ?? scenario.title,
      saved,
      currentTurnKey: start.key,
      messages: { create: { role: "tutor", body: start.tutorLine, turnKey: start.key } },
    },
    select: chatSelect,
  });
  return { chat: toChat(chat) };
}

export async function listChats(userId: string, page: PageQuery) {
  await purgeExpiredChats(userId);
  const rows = await prisma.tutorConversation.findMany({
    where: { userId, ...createdBefore(page) },
    orderBy: { createdAt: "desc" },
    take: page.limit + 1,
    select: chatSelect,
  });
  const result = toPage(rows, page);
  return { chats: result.items.map(toChat), nextBefore: result.nextBefore };
}

export async function getChat(userId: string, chatId: string, page: PageQuery) {
  await purgeExpiredChats(userId);
  const chat = await loadChat(userId, chatId);
  const rows = await prisma.tutorMessage.findMany({
    where: { conversationId: chat.id, ...createdBefore(page) },
    orderBy: { createdAt: "desc" },
    take: page.limit + 1,
    select: messageSelect,
  });
  const result = toPage(rows, page);
  return { chat: toChat(chat), messages: result.items.map(toMessage), nextBefore: result.nextBefore };
}

export async function updateChat(userId: string, chatId: string, input: { title?: string; saved?: boolean }) {
  await purgeExpiredChats(userId);
  const chat = await loadChat(userId, chatId);
  if (input.saved === true && !chat.saved && !(await savesHistory(userId))) {
    throw new HttpError(409, "HISTORY_SAVING_OFF", "Turn on “Save tutor history” in privacy settings to save this chat.");
  }

  const becomesTemporary = input.saved === false && chat.saved;
  const updated = await prisma.tutorConversation.update({
    where: { id: chat.id },
    // A chat that becomes temporary gets the full 60 minutes from now.
    data: { ...input, ...(becomesTemporary ? { lastActivityAt: new Date() } : {}) },
    select: chatSelect,
  });
  return { chat: toChat(updated) };
}

export async function deleteChat(userId: string, chatId: string) {
  await purgeExpiredChats(userId);
  const result = await prisma.tutorConversation.deleteMany({ where: { id: chatId, userId } });
  if (result.count === 0) throw chatNotFound();
  return { deleted: true };
}

/** Clears all of the learner's chats (saved and temporary). Notes are kept with their links cleared. */
export async function clearChats(userId: string) {
  const result = await prisma.tutorConversation.deleteMany({ where: { userId } });
  return { deletedCount: result.count };
}
