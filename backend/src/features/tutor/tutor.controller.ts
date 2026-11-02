import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import { HttpError } from "../../http/errors.js";
import { readPageQuery } from "../../http/pagination.js";
import {
  readBody,
  readNullableText,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalText,
  readQueryText,
  readText,
  readUuidParam,
  requireSomeField,
  validationError,
  type JsonBody,
} from "../../http/validation.js";
import * as chats from "./chats.service.js";
import { CONTEXT_KINDS, type ContextInput } from "./context.js";
import * as messages from "./messages.service.js";
import * as notes from "./notes.service.js";
import { tutorStatus } from "./provider/provider.js";

const MESSAGE_RULE = { max: 1000 };
const TITLE_RULE = { max: 60 };

/** Which reference field each context kind uses. Other references are rejected. */
const CONTEXT_REFERENCE = { exercise: "exerciseId", mistake: "answerId", explain: "messageId" } as const;

function chatId(request: Request): string {
  return readUuidParam(request.params.chatId, "chatId");
}

function optionalUuid(body: JsonBody, key: string, label = key): string | undefined {
  const value = body[key];
  return value === undefined || value === null ? undefined : readUuidParam(value, label);
}

function readContext(body: JsonBody): ContextInput | null {
  const value = body.context;
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw validationError("context must be an object.");

  const fields = ["kind", "exerciseId", "answerId", "messageId"] as const;
  const unknownKey = Object.keys(value).find((key) => !(fields as readonly string[]).includes(key));
  if (unknownKey !== undefined) throw validationError(`Unknown field: context.${unknownKey}.`);

  const data = value as JsonBody;
  const kind = readOptionalEnum(data, "kind", CONTEXT_KINDS) ?? "question";
  const context: ContextInput = { kind };
  for (const key of ["exerciseId", "answerId", "messageId"] as const) {
    const id = optionalUuid(data, key, `context.${key}`);
    if (id === undefined) continue;
    const expected = kind in CONTEXT_REFERENCE ? CONTEXT_REFERENCE[kind as keyof typeof CONTEXT_REFERENCE] : null;
    if (expected !== key) throw validationError(`context.${key} can't be used with kind "${kind}".`);
    context[key] = id;
  }
  return context;
}

function readStep(query: unknown): number {
  const raw = readQueryText(query, "step", { max: 1 }) ?? "1";
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > 3) throw validationError("step must be 1, 2, or 3.");
  return step;
}

// ---------- Status and scenarios ----------

export function getStatus(_request: Request, response: Response): void {
  response.json(tutorStatus());
}

export async function listRolePlays(_request: Request, response: Response): Promise<void> {
  response.json(await chats.listScenarios());
}

// ---------- Chats ----------

export async function listChats(request: Request, response: Response): Promise<void> {
  response.json(await chats.listChats(currentUserId(response), readPageQuery(request.query)));
}

export async function createChat(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body ?? {}, ["scenarioId", "title"]);
  const scenarioId = optionalUuid(body, "scenarioId");
  const title = readOptionalText(body, "title", TITLE_RULE);
  const input = { ...(scenarioId ? { scenarioId } : {}), ...(title !== undefined ? { title } : {}) };
  response.status(201).json(await chats.createChat(currentUserId(response), input));
}

export async function getChat(request: Request, response: Response): Promise<void> {
  response.json(await chats.getChat(currentUserId(response), chatId(request), readPageQuery(request.query)));
}

export async function updateChat(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["title", "saved"]);
  requireSomeField(body);
  const title = readOptionalText(body, "title", TITLE_RULE);
  const saved = readOptionalBoolean(body, "saved");
  const input = { ...(title !== undefined ? { title } : {}), ...(saved !== undefined ? { saved } : {}) };
  response.json(await chats.updateChat(currentUserId(response), chatId(request), input));
}

export async function deleteChat(request: Request, response: Response): Promise<void> {
  response.json(await chats.deleteChat(currentUserId(response), chatId(request)));
}

export async function clearChats(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body ?? {}, ["confirm"]);
  if (body.confirm !== true) {
    throw new HttpError(400, "CONFIRMATION_REQUIRED", "Send {\"confirm\":true} to clear all tutor history.");
  }
  response.json(await chats.clearChats(currentUserId(response)));
}

// ---------- Messages and hints ----------

export async function sendMessage(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["message", "context"]);
  const message = readText(body, "message", MESSAGE_RULE);
  const context = readContext(body);
  response.status(201).json(await messages.sendMessage(currentUserId(response), chatId(request), { message, context }));
}

export async function updateMessage(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["message"]);
  const message = readText(body, "message", MESSAGE_RULE);
  const messageId = readUuidParam(request.params.messageId, "messageId");
  response.json(await messages.updateMessage(currentUserId(response), chatId(request), messageId, { message }));
}

export async function deleteMessage(request: Request, response: Response): Promise<void> {
  const messageId = readUuidParam(request.params.messageId, "messageId");
  response.json(await messages.deleteMessage(currentUserId(response), chatId(request), messageId));
}

export async function getHint(request: Request, response: Response): Promise<void> {
  response.json(await messages.getHint(currentUserId(response), chatId(request), readStep(request.query)));
}

// ---------- Notes ----------

function noteId(request: Request): string {
  return readUuidParam(request.params.noteId, "noteId");
}

export async function listNotes(request: Request, response: Response): Promise<void> {
  response.json(await notes.listNotes(currentUserId(response), readPageQuery(request.query)));
}

export async function createNote(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["chatId", "messageId", "phrase", "pattern", "personalExample"]);
  const chat = optionalUuid(body, "chatId");
  const message = optionalUuid(body, "messageId");
  const personalExample = readNullableText(body, "personalExample", 300);
  const input: notes.NoteInput = {
    phrase: readText(body, "phrase", { max: 120 }),
    pattern: readText(body, "pattern", { max: 200 }),
    ...(chat ? { chatId: chat } : {}),
    ...(message ? { messageId: message } : {}),
    ...(personalExample !== undefined ? { personalExample } : {}),
  };
  response.status(201).json(await notes.createNote(currentUserId(response), input));
}

export async function getNote(request: Request, response: Response): Promise<void> {
  response.json(await notes.getNote(currentUserId(response), noteId(request)));
}

export async function updateNote(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["phrase", "pattern", "personalExample"]);
  requireSomeField(body);
  const phrase = readOptionalText(body, "phrase", { max: 120 });
  const pattern = readOptionalText(body, "pattern", { max: 200 });
  const personalExample = readNullableText(body, "personalExample", 300);
  const input: notes.NoteUpdate = {
    ...(phrase !== undefined ? { phrase } : {}),
    ...(pattern !== undefined ? { pattern } : {}),
    ...(personalExample !== undefined ? { personalExample } : {}),
  };
  response.json(await notes.updateNote(currentUserId(response), noteId(request), input));
}

export async function deleteNote(request: Request, response: Response): Promise<void> {
  response.json(await notes.deleteNote(currentUserId(response), noteId(request)));
}
