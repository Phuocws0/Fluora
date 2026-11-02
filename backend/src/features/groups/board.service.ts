import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { userSummarySelect } from "../community/user-summary.js";
import { loadGroupForMember, type GroupAccess } from "./access.js";

export const TASK_LANES = ["todo", "doing", "done"] as const;
export const NOTE_COLORS = ["yellow", "green", "blue", "pink"] as const;

export type TaskLane = (typeof TASK_LANES)[number];
export type TaskUpdate = { title?: string; lane?: TaskLane; order?: number };
export type NoteInput = { text: string; x?: number; y?: number; color?: (typeof NOTE_COLORS)[number] };

const taskSelect = {
  id: true,
  title: true,
  lane: true,
  order: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: userSummarySelect },
} satisfies Prisma.GroupPlanTaskSelect;

const noteSelect = {
  id: true,
  text: true,
  x: true,
  y: true,
  color: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: userSummarySelect },
} satisfies Prisma.WhiteboardNoteSelect;

type TaskRow = Prisma.GroupPlanTaskGetPayload<{ select: typeof taskSelect }>;
type NoteRow = Prisma.WhiteboardNoteGetPayload<{ select: typeof noteSelect }>;

function toTask({ createdById, ...task }: TaskRow, userId: string, access: GroupAccess) {
  const canEdit = createdById === userId || access.isOwner;
  return { ...task, canEdit, canDelete: canEdit };
}

function toNote({ authorId, ...note }: NoteRow, userId: string, access: GroupAccess) {
  return { ...note, canEdit: authorId === userId, canDelete: authorId === userId || access.isOwner };
}

async function findTask(groupId: string, taskId: string) {
  const task = await prisma.groupPlanTask.findFirst({ where: { id: taskId, groupId }, select: { id: true, createdById: true, lane: true } });
  if (!task) throw new HttpError(404, "NOT_FOUND", "Task not found.");
  return task;
}

async function findNote(groupId: string, noteId: string) {
  const note = await prisma.whiteboardNote.findFirst({ where: { id: noteId, groupId }, select: { id: true, authorId: true } });
  if (!note) throw new HttpError(404, "NOT_FOUND", "Note not found.");
  return note;
}

async function nextOrder(groupId: string, lane: string): Promise<number> {
  const last = await prisma.groupPlanTask.aggregate({ where: { groupId, lane }, _max: { order: true } });
  return (last._max.order ?? -1) + 1;
}

export async function listTasks(userId: string, groupId: string) {
  const access = await loadGroupForMember(groupId, userId);
  const rows = await prisma.groupPlanTask.findMany({ where: { groupId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: taskSelect });
  const laneIndex = (lane: string) => TASK_LANES.indexOf(lane as TaskLane);
  rows.sort((a, b) => laneIndex(a.lane) - laneIndex(b.lane));
  return { tasks: rows.map((row) => toTask(row, userId, access)) };
}

export async function createTask(userId: string, groupId: string, input: { title: string; lane: TaskLane }) {
  const access = await loadGroupForMember(groupId, userId);
  const task = await prisma.groupPlanTask.create({
    data: { groupId, createdById: userId, title: input.title, lane: input.lane, order: await nextOrder(groupId, input.lane) },
    select: taskSelect,
  });
  return { task: toTask(task, userId, access) };
}

/** Any member may move a task between lanes; renaming needs its creator or the group owner. */
export async function updateTask(userId: string, groupId: string, taskId: string, input: TaskUpdate) {
  const access = await loadGroupForMember(groupId, userId);
  const task = await findTask(groupId, taskId);
  if (input.title !== undefined && task.createdById !== userId && !access.isOwner) {
    throw new HttpError(403, "AUTHOR_ONLY", "Only the task creator or the group owner can rename it.");
  }

  const order = input.order ?? (input.lane && input.lane !== task.lane ? await nextOrder(groupId, input.lane) : undefined);
  const updated = await prisma.groupPlanTask.update({
    where: { id: taskId },
    data: { ...input, ...(order !== undefined ? { order } : {}) },
    select: taskSelect,
  });
  return { task: toTask(updated, userId, access) };
}

export async function deleteTask(userId: string, groupId: string, taskId: string) {
  const access = await loadGroupForMember(groupId, userId);
  const task = await findTask(groupId, taskId);
  if (task.createdById !== userId && !access.isOwner) throw new HttpError(403, "AUTHOR_ONLY", "Only the task creator or the group owner can delete it.");
  await prisma.groupPlanTask.delete({ where: { id: taskId } });
  return { deleted: true };
}

export async function listNotes(userId: string, groupId: string) {
  const access = await loadGroupForMember(groupId, userId);
  const rows = await prisma.whiteboardNote.findMany({ where: { groupId }, orderBy: { createdAt: "asc" }, select: noteSelect });
  return { notes: rows.map((row) => toNote(row, userId, access)) };
}

export async function createNote(userId: string, groupId: string, input: NoteInput) {
  const access = await loadGroupForMember(groupId, userId);
  const note = await prisma.whiteboardNote.create({ data: { ...input, groupId, authorId: userId }, select: noteSelect });
  return { note: toNote(note, userId, access) };
}

/** Text, position, and color belong to the note's author ("edit/move own note"). */
export async function updateNote(userId: string, groupId: string, noteId: string, input: Partial<NoteInput>) {
  const access = await loadGroupForMember(groupId, userId);
  const note = await findNote(groupId, noteId);
  if (note.authorId !== userId) throw new HttpError(403, "AUTHOR_ONLY", "Only the author can edit or move this note.");
  const updated = await prisma.whiteboardNote.update({ where: { id: noteId }, data: input, select: noteSelect });
  return { note: toNote(updated, userId, access) };
}

export async function deleteNote(userId: string, groupId: string, noteId: string) {
  const access = await loadGroupForMember(groupId, userId);
  const note = await findNote(groupId, noteId);
  if (note.authorId !== userId && !access.isOwner) throw new HttpError(403, "AUTHOR_ONLY", "Only the author or the group owner can delete this note.");
  await prisma.whiteboardNote.delete({ where: { id: noteId } });
  return { deleted: true };
}
