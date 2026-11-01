import type { NextFunction, Request, Response } from "express";
import * as service from "./support.service.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function error(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } });
}

export function requireUser(_request: Request, response: Response, next: NextFunction) {
  const userId: unknown = response.locals.userId;
  if (typeof userId !== "string" || !uuid.test(userId)) {
    error(response, 401, "UNAUTHORIZED", "A valid session is required.");
    return;
  }
  next();
}

function userId(response: Response): string {
  return response.locals.userId as string;
}

function routeId(value: unknown, response: Response): string | null {
  if (typeof value !== "string" || !uuid.test(value)) {
    error(response, 400, "VALIDATION_ERROR", "A valid resource ID is required.");
    return null;
  }
  return value;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function message(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 5000 ? normalized : null;
}

function screenshot(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  return typeof value === "string" && value.length <= 500 ? value : undefined;
}

function deviceDetails(value: unknown): service.DeviceDetails | null {
  const data = object(value);
  if (!data || Object.keys(data).length > 20) return null;
  if (Object.entries(data).some(([key, field]) => key.length > 50 || typeof field !== "string" || field.length > 256)) return null;
  return data as service.DeviceDetails;
}

async function run(response: Response, work: () => Promise<void>) {
  try {
    await work();
  } catch (cause) {
    if (cause instanceof service.SupportConflictError) {
      error(response, 409, "CONFLICT", cause.message);
      return;
    }
    console.error("Support API request failed:", cause);
    error(response, 500, "INTERNAL_SERVER_ERROR", "Could not complete the request.");
  }
}

export function articles(request: Request, response: Response) {
  const category = request.query.category;
  if (category !== undefined && (typeof category !== "string" || category.length > 50)) {
    error(response, 400, "VALIDATION_ERROR", "Category must be a short string.");
    return;
  }
  response.json(service.listArticles(category));
}

export function requests(_request: Request, response: Response) {
  return run(response, async () => { response.json(await service.listRequests(userId(response))); });
}

export function createRequest(request: Request, response: Response) {
  const body = object(request.body);
  const text = message(body?.message);
  const details = deviceDetails(body?.deviceDetails);
  const image = screenshot(body?.screenshot);
  if (!body || !text || !details || (body.screenshot !== undefined && image === undefined)) {
    error(response, 400, "VALIDATION_ERROR", "Provide a message and valid device details.");
    return Promise.resolve();
  }
  return run(response, async () => { response.status(201).json(await service.createRequest(userId(response), { message: text, deviceDetails: details, ...(image ? { screenshot: image } : {}) })); });
}

export function updateRequest(request: Request, response: Response) {
  const id = routeId(request.params.requestId, response);
  if (!id) return Promise.resolve();
  const body = object(request.body);
  if (!body || Object.keys(body).length === 0 || Object.keys(body).some((key) => !["message", "screenshot", "deviceDetails"].includes(key))) {
    error(response, 400, "VALIDATION_ERROR", "Provide supported fields to update.");
    return Promise.resolve();
  }
  const text = body.message === undefined ? undefined : message(body.message);
  const image = screenshot(body.screenshot);
  const details = body.deviceDetails === undefined ? undefined : deviceDetails(body.deviceDetails);
  if (text === null || (body.screenshot !== undefined && image === undefined) || details === null) {
    error(response, 400, "VALIDATION_ERROR", "Invalid support request fields.");
    return Promise.resolve();
  }
  return run(response, async () => {
    const result = await service.updateRequest(userId(response), id, {
      ...(text !== undefined ? { message: text } : {}),
      ...(body.screenshot !== undefined ? { screenshot: image } : {}),
      ...(details !== undefined ? { deviceDetails: details } : {}),
    });
    if (!result) { error(response, 404, "NOT_FOUND", "Support request not found."); return; }
    response.json(result);
  });
}

export function deleteRequest(request: Request, response: Response) {
  const id = routeId(request.params.requestId, response);
  if (!id) return Promise.resolve();
  return run(response, async () => {
    const result = await service.deleteRequest(userId(response), id);
    if (!result) { error(response, 404, "NOT_FOUND", "Support request not found."); return; }
    response.json(result);
  });
}

export function createExport(_request: Request, response: Response) {
  return run(response, async () => { response.status(201).json(await service.createExport(userId(response))); });
}

export function exports(_request: Request, response: Response) {
  return run(response, async () => { response.json(await service.listExports(userId(response))); });
}

export function getExport(request: Request, response: Response) {
  const id = routeId(request.params.exportId, response);
  if (!id) return Promise.resolve();
  return run(response, async () => {
    const result = await service.getExport(userId(response), id);
    if (!result) { error(response, 404, "NOT_FOUND", "Export not found."); return; }
    response.json(result);
  });
}

export function downloadExport(request: Request, response: Response) {
  const id = routeId(request.params.exportId, response);
  if (!id) return Promise.resolve();
  return run(response, async () => {
    const data = await service.downloadExport(userId(response), id);
    if (!data) { error(response, 404, "NOT_FOUND", "Export not found."); return; }
    response.setHeader("Content-Disposition", `attachment; filename="fluora-export-${id}.json"`);
    response.json(data);
  });
}

export function deleteExport(request: Request, response: Response) {
  const id = routeId(request.params.exportId, response);
  if (!id) return Promise.resolve();
  return run(response, async () => {
    const result = await service.deleteExport(userId(response), id);
    if (!result) { error(response, 404, "NOT_FOUND", "Export not found."); return; }
    response.json(result);
  });
}
