import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
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

function userId(response: Response): string { return currentUserId(response); }

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
  return run(response, () => service.saveReadingProgress(userId(response), storyId, body.position as number, body.completed as boolean | undefined));
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

export function practice(_request: Request, response: Response) { return run(response, () => service.getPractice(userId(response))); }
export function tools(_request: Request, response: Response) { response.json(service.listTools()); }
export function tool(request: Request, response: Response) {
  const toolId = request.params.toolId;
  return run(response, async () => typeof toolId === "string" ? service.getTool(toolId) : null);
}
export function dictionary(request: Request, response: Response) {
  const query = text(request.query.query, 100);
  if (!query) { error(response, 400, "VALIDATION_ERROR", "A word is required."); return; }
  return run(response, async () => service.lookupWord(query));
}

export function reviewItems(request: Request, response: Response) {
  const kind = request.query.kind;
  if (kind !== undefined && (typeof kind !== "string" || kind.length > 40)) {
    error(response, 400, "VALIDATION_ERROR", "Invalid review kind."); return;
  }
  return run(response, () => service.listReviewItems(userId(response), kind));
}
export function reviewItem(request: Request, response: Response) {
  const itemId = id(request.params.itemId, response);
  return itemId ? run(response, () => service.getReviewItem(userId(response), itemId)) : undefined;
}
export function createReviewItem(request: Request, response: Response) {
  const body = object(request.body);
  const front = text(body?.front, 300);
  const back = text(body?.back, 1000);
  if (!front || !back || (body?.kind !== undefined && body.kind !== "custom")) {
    error(response, 400, "VALIDATION_ERROR", "Provide a custom review item with front and back."); return;
  }
  return run(response, () => service.createReviewItem(userId(response), { front, back, kind: "custom" }), 201);
}
export function updateReviewItem(request: Request, response: Response) {
  const itemId = id(request.params.itemId, response);
  if (!itemId) return;
  const body = object(request.body);
  if (!body || Object.keys(body).length === 0 || Object.keys(body).some((key) => !["front", "back"].includes(key))) {
    error(response, 400, "VALIDATION_ERROR", "Provide front or back to update."); return;
  }
  const front = body.front === undefined ? undefined : text(body.front, 300);
  const back = body.back === undefined ? undefined : text(body.back, 1000);
  if (front === null || back === null) { error(response, 400, "VALIDATION_ERROR", "Invalid review item fields."); return; }
  return run(response, () => service.updateReviewItem(userId(response), itemId, { ...(front !== undefined ? { front } : {}), ...(back !== undefined ? { back } : {}) }));
}
export function deleteReviewItem(request: Request, response: Response) {
  const itemId = id(request.params.itemId, response);
  return itemId ? run(response, () => service.deleteReviewItem(userId(response), itemId)) : undefined;
}
export function answerReviewItem(request: Request, response: Response) {
  const itemId = id(request.params.itemId, response);
  if (!itemId) return;
  const body = object(request.body);
  if (typeof body?.correct !== "boolean") { error(response, 400, "VALIDATION_ERROR", "A correct boolean is required."); return; }
  return run(response, () => service.answerReviewItem(userId(response), itemId, body.correct as boolean), 201);
}

function importPreview(value: unknown) {
  const body = object(value);
  const mapping = object(body?.mapping);
  if (!body || !mapping || typeof mapping.front !== "string" || typeof mapping.back !== "string" ||
      !Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 500 ||
      ["tag", "example"].some((key) => mapping[key] !== undefined && typeof mapping[key] !== "string")) return null;
  const validRows: Array<{ front: string; back: string; tag?: string; example?: string }> = [];
  const errors: Array<{ row: number; message: string }> = [];
  for (const [index, raw] of body.rows.entries()) {
    const record = object(raw);
    const front = record ? text(record[mapping.front], 300) : null;
    const back = record ? text(record[mapping.back], 1000) : null;
    const rawTag = record && typeof mapping.tag === "string" ? record[mapping.tag] : undefined;
    const rawExample = record && typeof mapping.example === "string" ? record[mapping.example] : undefined;
    const tag = rawTag === "" || rawTag === null ? undefined : text(rawTag, 100, true);
    const example = rawExample === "" || rawExample === null ? undefined : text(rawExample, 1000, true);
    if (!front || !back || tag === null || example === null) {
      errors.push({ row: index + 1, message: "Missing or invalid mapped card fields." });
    } else {
      validRows.push({ front, back, ...(typeof tag === "string" ? { tag } : {}), ...(typeof example === "string" ? { example } : {}) });
    }
  }
  return { validRows, errors };
}

export function previewImport(request: Request, response: Response) {
  const body = object(request.body);
  if (typeof body?.filename !== "string" || body.filename.length === 0 || body.filename.length > 200) {
    error(response, 400, "VALIDATION_ERROR", "A filename is required for preview."); return;
  }
  const preview = importPreview(request.body);
  if (!preview) { error(response, 400, "VALIDATION_ERROR", "Provide rows and a front/back column mapping."); return; }
  response.json(preview);
}
export function importCards(request: Request, response: Response) {
  const body = object(request.body);
  const setId = id(body?.destinationSetId, response);
  if (!setId) return;
  const preview = importPreview(body);
  if (!preview || preview.errors.length > 0) { error(response, 400, "VALIDATION_ERROR", "Import rows must pass preview validation."); return; }
  return run(response, () => service.importCards(userId(response), setId, preview.validRows), 201);
}
