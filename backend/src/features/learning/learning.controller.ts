import type { Request, Response } from "express";
import * as learningService from "./learning.service.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } });
}

function sendNotFound(response: Response) {
  sendError(response, 404, "NOT_FOUND", "The requested learning content was not found.");
}

function getRouteId(value: unknown, response: Response): string | null {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    sendError(response, 400, "VALIDATION_ERROR", "The resource ID must be a valid UUID.");
    return null;
  }

  return value;
}

function readOptionalText(value: unknown, maxLength: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (normalized.length > maxLength) return null;
  return normalized || undefined;
}

async function run(response: Response, operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.error("Learning API request failed:", error);
    sendError(response, 500, "INTERNAL_SERVER_ERROR", "Could not load learning content.");
  }
}

export function listCourses(_request: Request, response: Response): Promise<void> {
  return run(response, async () => {
    response.json(await learningService.listCourses());
  });
}

export function getCourse(request: Request, response: Response): Promise<void> {
  const courseId = getRouteId(request.params.courseId, response);
  if (!courseId) return Promise.resolve();

  return run(response, async () => {
    const course = await learningService.getCourse(courseId);
    if (!course) {
      sendNotFound(response);
      return;
    }

    response.json({ course });
  });
}

export function getCourseUnits(request: Request, response: Response): Promise<void> {
  const courseId = getRouteId(request.params.courseId, response);
  if (!courseId) return Promise.resolve();

  return run(response, async () => {
    const result = await learningService.getCourseUnits(courseId);
    if (!result) {
      sendNotFound(response);
      return;
    }

    response.json(result);
  });
}

export function getUnit(request: Request, response: Response): Promise<void> {
  const unitId = getRouteId(request.params.unitId, response);
  if (!unitId) return Promise.resolve();

  return run(response, async () => {
    const unit = await learningService.getUnit(unitId);
    if (!unit) {
      sendNotFound(response);
      return;
    }

    response.json({ unit });
  });
}

export function getLesson(request: Request, response: Response): Promise<void> {
  const lessonId = getRouteId(request.params.lessonId, response);
  if (!lessonId) return Promise.resolve();

  return run(response, async () => {
    const lesson = await learningService.getLesson(lessonId);
    if (!lesson) {
      sendNotFound(response);
      return;
    }

    response.json({ lesson });
  });
}

export function searchLessons(request: Request, response: Response): Promise<void> {
  const query = readOptionalText(request.query.query, 100);
  const level = readOptionalText(request.query.level, 40);
  const skill = readOptionalText(request.query.skill, 40);
  const rawMinutes = readOptionalText(request.query.minutes, 10);

  if (query === null || level === null || skill === null || rawMinutes === null) {
    sendError(response, 400, "VALIDATION_ERROR", "Search filters must be single strings within the allowed length.");
    return Promise.resolve();
  }

  let minutes: number | undefined;
  if (rawMinutes !== undefined) {
    minutes = Number(rawMinutes);
    if (!Number.isSafeInteger(minutes) || minutes <= 0) {
      sendError(response, 400, "VALIDATION_ERROR", "The minutes filter must be a positive whole number.");
      return Promise.resolve();
    }
  }

  return run(response, async () => {
    response.json(await learningService.searchLessons({ query, level, skill, minutes }));
  });
}

export function listLearningPaths(_request: Request, response: Response): Promise<void> {
  return run(response, async () => {
    response.json(await learningService.listLearningPaths());
  });
}

export function compareLearningPaths(request: Request, response: Response): Promise<void> {
  const rawIds = readOptionalText(request.query.ids, 500);
  if (!rawIds) {
    sendError(response, 400, "VALIDATION_ERROR", "Provide at least two learning path IDs in the ids query parameter.");
    return Promise.resolve();
  }

  const ids = rawIds.split(",").map((id) => id.trim());
  if (ids.length < 2 || ids.some((id) => !uuidPattern.test(id)) || new Set(ids).size !== ids.length) {
    sendError(response, 400, "VALIDATION_ERROR", "Provide at least two distinct valid learning path IDs.");
    return Promise.resolve();
  }

  return run(response, async () => {
    const paths = await learningService.compareLearningPaths(ids);
    if (paths.length !== ids.length) {
      sendNotFound(response);
      return;
    }

    response.json({ paths });
  });
}
