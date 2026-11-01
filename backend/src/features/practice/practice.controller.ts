import type { NextFunction, Request, Response } from "express";
import * as service from "./practice.service.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function error(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } });
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, max: number, optional = false): string | null | undefined {
  if (optional && value === undefined) return undefined;
  if (value === null && optional) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function id(value: unknown, response: Response): string | null {
  if (typeof value !== "string" || !uuid.test(value)) {
    error(response, 400, "VALIDATION_ERROR", "A valid resource ID is required.");
    return null;
  }
  return value;
}

function userId(response: Response): string { return response.locals.userId as string; }

export function requireUser(_request: Request, response: Response, next: NextFunction) {
  const current: unknown = response.locals.userId;
  if (typeof current !== "string" || !uuid.test(current)) {
    error(response, 401, "UNAUTHORIZED", "A valid session is required.");
    return;
  }
  next();
}

async function run(response: Response, operation: () => Promise<unknown>, status = 200) {
  try {
    const result = await operation();
    if (!result) { error(response, 404, "NOT_FOUND", "Resource not found."); return; }
    response.status(status).json(result);
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "P2002") {
      error(response, 409, "CONFLICT", "This item already exists.");
      return;
    }
    console.error("Practice API request failed:", cause);
    error(response, 500, "INTERNAL_SERVER_ERROR", "Could not complete the request.");
  }
}

function cardInput(value: unknown, partial = false) {
  const body = object(value);
  if (!body || Object.keys(body).some((key) => !["front", "back", "tag", "example"].includes(key))) return null;
  if (partial && Object.keys(body).length === 0) return null;
  const front = text(body.front, 300, partial);
  const back = text(body.back, 1000, partial);
  const tag = text(body.tag, 100, true);
  const example = text(body.example, 1000, true);
  if (front === null || back === null || (body.tag !== undefined && tag === null && body.tag !== null) || (body.example !== undefined && example === null && body.example !== null)) return null;
  if (!partial && (front === undefined || back === undefined)) return null;
  return {
    ...(front !== undefined ? { front } : {}),
    ...(back !== undefined ? { back } : {}),
    ...(tag !== undefined ? { tag } : {}),
    ...(example !== undefined ? { example } : {}),
  };
}

export function sets(_request: Request, response: Response) { return run(response, () => service.listSets(userId(response))); }
export function createSet(request: Request, response: Response) {
  const name = text(object(request.body)?.name, 120);
  if (!name) { error(response, 400, "VALIDATION_ERROR", "A deck name is required."); return; }
  return run(response, () => service.createSet(userId(response), name), 201);
}
export function getSet(request: Request, response: Response) {
  const setId = id(request.params.setId, response);
  return setId ? run(response, () => service.getSet(userId(response), setId)) : undefined;
}
export function updateSet(request: Request, response: Response) {
  const setId = id(request.params.setId, response);
  if (!setId) return;
  const name = text(object(request.body)?.name, 120);
  if (!name) { error(response, 400, "VALIDATION_ERROR", "A deck name is required."); return; }
  return run(response, () => service.updateSet(userId(response), setId, name));
}
export function deleteSet(request: Request, response: Response) {
  const setId = id(request.params.setId, response);
  return setId ? run(response, () => service.deleteSet(userId(response), setId)) : undefined;
}
export function cards(request: Request, response: Response) {
  const setId = id(request.params.setId, response);
  return setId ? run(response, () => service.listCards(userId(response), setId)) : undefined;
}
export function createCard(request: Request, response: Response) {
  const setId = id(request.params.setId, response);
  if (!setId) return;
  const input = cardInput(request.body);
  if (!input || typeof input.front !== "string" || typeof input.back !== "string") {
    error(response, 400, "VALIDATION_ERROR", "Card front and back are required."); return;
  }
  return run(response, () => service.createCard(userId(response), setId, {
    front: input.front as string,
    back: input.back as string,
    ...(typeof input.tag === "string" ? { tag: input.tag } : {}),
    ...(typeof input.example === "string" ? { example: input.example } : {}),
  }), 201);
}
export function getCard(request: Request, response: Response) {
  const cardId = id(request.params.cardId, response);
  return cardId ? run(response, () => service.getCard(userId(response), cardId)) : undefined;
}
export function updateCard(request: Request, response: Response) {
  const cardId = id(request.params.cardId, response);
  if (!cardId) return;
  const input = cardInput(request.body, true);
  if (!input) { error(response, 400, "VALIDATION_ERROR", "Provide valid card fields."); return; }
  return run(response, () => service.updateCard(userId(response), cardId, input));
}
export function deleteCard(request: Request, response: Response) {
  const cardId = id(request.params.cardId, response);
  return cardId ? run(response, () => service.deleteCard(userId(response), cardId)) : undefined;
}
export function stories(_request: Request, response: Response) { return run(response, service.listStories); }
export function getStory(request: Request, response: Response) {
  const storyId = id(request.params.storyId, response);
  return storyId ? run(response, () => service.getStory(storyId)) : undefined;
}
export function getProgress(request: Request, response: Response) {
  const storyId = id(request.params.storyId, response);
  return storyId ? run(response, () => service.getReadingProgress(userId(response), storyId)) : undefined;
}
export function saveProgress(request: Request, response: Response) {
  const storyId = id(request.params.storyId, response);
  if (!storyId) return;
  const body = object(request.body);
  if (!body || !Number.isSafeInteger(body.position) || (body.position as number) < 0 || (body.completed !== undefined && typeof body.completed !== "boolean")) {
    error(response, 400, "VALIDATION_ERROR", "Provide a nonnegative position and optional completion flag."); return;
  }
  return run(response, () => service.saveReadingProgress(userId(response), storyId, body.position as number, body.completed === true));
}
export function resetProgress(request: Request, response: Response) {
  const storyId = id(request.params.storyId, response);
  return storyId ? run(response, () => service.resetReadingProgress(userId(response), storyId)) : undefined;
}
export function bookmarks(_request: Request, response: Response) { return run(response, () => service.listBookmarks(userId(response))); }
export function createBookmark(request: Request, response: Response) {
  const body = object(request.body);
  if (body?.targetType !== "story") { error(response, 400, "VALIDATION_ERROR", "Only story bookmarks are available currently."); return; }
  const storyId = id(body.targetId, response);
  return storyId ? run(response, () => service.createBookmark(userId(response), storyId), 201) : undefined;
}
export function updateBookmark(request: Request, response: Response) {
  const bookmarkId = id(request.params.bookmarkId, response);
  if (!bookmarkId) return;
  const body = object(request.body);
  if (!body || Object.keys(body).length === 0 || Object.keys(body).some((key) => !["note", "tag"].includes(key))) {
    error(response, 400, "VALIDATION_ERROR", "Provide a note or tag."); return;
  }
  const note = text(body.note, 1000, true);
  const tag = text(body.tag, 100, true);
  if ((body.note !== undefined && note === null && body.note !== null) || (body.tag !== undefined && tag === null && body.tag !== null)) {
    error(response, 400, "VALIDATION_ERROR", "Invalid bookmark fields."); return;
  }
  return run(response, () => service.updateBookmark(userId(response), bookmarkId, { ...(note !== undefined ? { note } : {}), ...(tag !== undefined ? { tag } : {}) }));
}
export function deleteBookmark(request: Request, response: Response) {
  const bookmarkId = id(request.params.bookmarkId, response);
  return bookmarkId ? run(response, () => service.deleteBookmark(userId(response), bookmarkId)) : undefined;
}
