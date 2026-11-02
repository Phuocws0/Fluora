import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { createdBefore, toPage, type PageQuery } from "../../http/pagination.js";
import { loadChat, purgeExpiredChats } from "./chats.service.js";

export type NoteInput = { chatId?: string; messageId?: string; phrase: string; pattern: string; personalExample?: string | null };
export type NoteUpdate = { phrase?: string; pattern?: string; personalExample?: string | null };

const noteSelect = {
  id: true,
  phrase: true,
  pattern: true,
  personalExample: true,
  conversationId: true,
  messageId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TutorNoteSelect;

type NoteRow = Prisma.TutorNoteGetPayload<{ select: typeof noteSelect }>;

function toNote({ conversationId, ...note }: NoteRow) {
  return { ...note, chatId: conversationId };
}

function noteNotFound(): HttpError {
  return new HttpError(404, "NOT_FOUND", "Note not found.");
}

async function loadNote(userId: string, noteId: string): Promise<NoteRow> {
  const note = await prisma.tutorNote.findFirst({ where: { id: noteId, userId }, select: noteSelect });
  if (!note) throw noteNotFound();
  return note;
}

export async function listNotes(userId: string, page: PageQuery) {
  await purgeExpiredChats(userId);
  const rows = await prisma.tutorNote.findMany({
    where: { userId, ...createdBefore(page) },
    orderBy: { createdAt: "desc" },
    take: page.limit + 1,
    select: noteSelect,
  });
  const result = toPage(rows, page);
  return { notes: result.items.map(toNote), nextBefore: result.nextBefore };
}

export async function createNote(userId: string, input: NoteInput) {
  await purgeExpiredChats(userId);
  const { chatId, messageId, ...fields } = input;
  if (messageId && !chatId) throw new HttpError(400, "VALIDATION_ERROR", "chatId is required when messageId is given.");
  if (chatId) await loadChat(userId, chatId);
  if (chatId && messageId) {
    const message = await prisma.tutorMessage.findFirst({ where: { id: messageId, conversationId: chatId }, select: { id: true } });
    if (!message) throw new HttpError(404, "NOT_FOUND", "Message not found.");
  }

  const note = await prisma.tutorNote.create({
    data: { userId, ...fields, conversationId: chatId ?? null, messageId: messageId ?? null },
    select: noteSelect,
  });
  return { note: toNote(note) };
}

export async function getNote(userId: string, noteId: string) {
  return { note: toNote(await loadNote(userId, noteId)) };
}

export async function updateNote(userId: string, noteId: string, input: NoteUpdate) {
  await loadNote(userId, noteId);
  const note = await prisma.tutorNote.update({ where: { id: noteId }, data: input, select: noteSelect });
  return { note: toNote(note) };
}

export async function deleteNote(userId: string, noteId: string) {
  const result = await prisma.tutorNote.deleteMany({ where: { id: noteId, userId } });
  if (result.count === 0) throw noteNotFound();
  return { deleted: true };
}
