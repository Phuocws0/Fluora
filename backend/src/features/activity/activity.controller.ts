import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import * as activity from "./activity.service.js";
import * as insights from "./insights.service.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function error(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } });
}
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function id(value: unknown, response: Response): string | null {
  if (typeof value === "string" && uuid.test(value)) return value;
  error(response, 400, "VALIDATION_ERROR", "A valid resource ID is required.");
  return null;
}
function text(value: unknown, max: number, optional = false): string | null | undefined {
  if (optional && value === undefined) return undefined;
  if (optional && value === null) return null;
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= max ? result : null;
}
async function run(response: Response, operation: () => Promise<unknown>, status = 200) {
  try {
    response.status(status).json(await operation());
  } catch (cause) {
    if (cause instanceof activity.ActivityError) { error(response, cause.status, cause.code, cause.message); return; }
    console.error("Learning activity request failed:", cause);
    error(response, 500, "INTERNAL_SERVER_ERROR", "Could not complete the learning request.");
  }
}

export function home(_request: Request, response: Response) { return run(response, () => activity.home(currentUserId(response))); }
export function progress(_request: Request, response: Response) { return run(response, () => activity.progress(currentUserId(response))); }
export function weekly(_request: Request, response: Response) { return run(response, () => activity.weeklyAnalytics(currentUserId(response))); }
export function baseline(_request: Request, response: Response) { return run(response, () => activity.skillBaseline(currentUserId(response))); }

export function answer(request: Request, response: Response) {
  const exerciseId = id(request.params.exerciseId, response);
  if (!exerciseId) return;
  const body = object(request.body);
  const parsed = body && Object.keys(body).length === 1 ? activity.parseAnswer(body.answer) : null;
  if (!parsed) { error(response, 400, "VALIDATION_ERROR", "Provide an answer matching the exercise mode; raw audio is not accepted."); return; }
  return run(response, () => activity.submitAnswer(currentUserId(response), exerciseId, parsed), 201);
}
export function answers(request: Request, response: Response) {
  const lessonId = id(request.params.lessonId, response);
  return lessonId ? run(response, () => activity.lessonAnswers(currentUserId(response), lessonId)) : undefined;
}
export function hints(request: Request, response: Response) {
  const exerciseId = id(request.params.exerciseId, response);
  if (!exerciseId) return;
  const step = Number(request.query.step ?? 1);
  if (!Number.isInteger(step) || step < 1 || step > 3) { error(response, 400, "VALIDATION_ERROR", "Hint step must be 1, 2, or 3."); return; }
  return run(response, () => activity.hint(exerciseId, step));
}
export function completeLesson(request: Request, response: Response) {
  const lessonId = id(request.params.lessonId, response);
  return lessonId ? run(response, () => activity.completeLesson(currentUserId(response), lessonId)) : undefined;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validTime(value: unknown): value is string { return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function plannerInput(value: unknown, partial = false): Partial<insights.PlannerInput> | null {
  const body = object(value);
  if (!body || (partial && Object.keys(body).length === 0) || Object.keys(body).some((key) => !["date", "time", "durationMinutes", "label"].includes(key))) return null;
  if ((!partial || body.date !== undefined) && !validDate(body.date)) return null;
  if ((!partial || body.time !== undefined) && !validTime(body.time)) return null;
  if ((!partial || body.durationMinutes !== undefined) && (!Number.isInteger(body.durationMinutes) || (body.durationMinutes as number) < 1 || (body.durationMinutes as number) > 480)) return null;
  const label = body.label === undefined ? undefined : body.label === null ? null : text(body.label, 120);
  if (body.label !== undefined && body.label !== null && label === null) return null;
  return {
    ...(body.date !== undefined ? { date: body.date as string } : {}),
    ...(body.time !== undefined ? { time: body.time as string } : {}),
    ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes as number } : {}),
    ...(body.label !== undefined ? { label } : {}),
  };
}
export function planner(_request: Request, response: Response) { return run(response, () => insights.listPlanner(currentUserId(response))); }
export function createPlanner(request: Request, response: Response) {
  const input = plannerInput(request.body);
  if (!input || !input.date || !input.time || !input.durationMinutes) { error(response, 400, "VALIDATION_ERROR", "Provide date, time, and durationMinutes."); return; }
  return run(response, () => insights.createPlanner(currentUserId(response), input as insights.PlannerInput), 201);
}
export function getPlanner(request: Request, response: Response) {
  const entryId = id(request.params.entryId, response);
  return entryId ? run(response, () => insights.getPlanner(currentUserId(response), entryId)) : undefined;
}
export function updatePlanner(request: Request, response: Response) {
  const entryId = id(request.params.entryId, response);
  if (!entryId) return;
  const input = plannerInput(request.body, true);
  if (!input) { error(response, 400, "VALIDATION_ERROR", "Invalid planner fields."); return; }
  return run(response, () => insights.updatePlanner(currentUserId(response), entryId, input));
}
export function deletePlanner(request: Request, response: Response) {
  const entryId = id(request.params.entryId, response);
  return entryId ? run(response, () => insights.deletePlanner(currentUserId(response), entryId)) : undefined;
}

function evidenceInput(value: unknown, partial = false): Partial<insights.EvidenceInput> | null {
  const body = object(value);
  if (!body || (partial && Object.keys(body).length === 0) || Object.keys(body).some((key) => !["goalId", "kind", "summary", "reference"].includes(key))) return null;
  const kind = body.kind === undefined && partial ? undefined : text(body.kind, 40);
  const summary = body.summary === undefined && partial ? undefined : text(body.summary, 2000);
  const reference = body.reference === undefined ? undefined : body.reference === null ? null : text(body.reference, 500);
  if (kind === null || summary === null || (body.reference !== undefined && body.reference !== null && reference === null)) return null;
  return { ...(kind !== undefined ? { kind } : {}), ...(summary !== undefined ? { summary } : {}), ...(body.reference !== undefined ? { reference } : {}) };
}
export function evidence(_request: Request, response: Response) { return run(response, () => insights.listEvidence(currentUserId(response))); }
export function createEvidence(request: Request, response: Response) {
  const body = object(request.body);
  const goalId = id(body?.goalId, response);
  if (!goalId) return;
  const input = evidenceInput(body);
  if (!input || !input.kind || !input.summary) { error(response, 400, "VALIDATION_ERROR", "Provide kind and summary."); return; }
  return run(response, () => insights.createEvidence(currentUserId(response), goalId, input as insights.EvidenceInput), 201);
}
export function updateEvidence(request: Request, response: Response) {
  const evidenceId = id(request.params.evidenceId, response);
  if (!evidenceId) return;
  const input = evidenceInput(request.body, true);
  if (!input || "goalId" in (object(request.body) ?? {})) { error(response, 400, "VALIDATION_ERROR", "Invalid evidence fields."); return; }
  return run(response, () => insights.updateEvidence(currentUserId(response), evidenceId, input));
}
export function deleteEvidence(request: Request, response: Response) {
  const evidenceId = id(request.params.evidenceId, response);
  return evidenceId ? run(response, () => insights.deleteEvidence(currentUserId(response), evidenceId)) : undefined;
}

export function passport(_request: Request, response: Response) { return run(response, () => insights.passport(currentUserId(response))); }
export function mission(request: Request, response: Response) {
  const missionId = id(request.params.missionId, response);
  return missionId ? run(response, () => insights.mission(missionId)) : undefined;
}
export function completeMission(request: Request, response: Response) {
  const missionId = id(request.params.missionId, response);
  return missionId ? run(response, () => insights.completeMission(currentUserId(response), missionId), 201) : undefined;
}
export function misconceptions(_request: Request, response: Response) { return run(response, () => insights.misconceptions(currentUserId(response))); }
export function dismissMisconception(request: Request, response: Response) {
  const itemId = id(request.params.itemId, response);
  if (!itemId) return;
  const body = object(request.body);
  if (typeof body?.dismissed !== "boolean") { error(response, 400, "VALIDATION_ERROR", "Provide dismissed as a boolean."); return; }
  return run(response, () => insights.setMisconceptionDismissed(currentUserId(response), itemId, body.dismissed as boolean));
}
