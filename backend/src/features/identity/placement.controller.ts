import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import { readBody, validationError } from "../../http/validation.js";
import { PLACEMENT_QUESTIONS } from "./placement.questions.js";
import * as placement from "./placement.service.js";

function readAnswers(value: unknown): placement.PlacementAnswer[] {
  const body = readBody(value, ["answers"]);
  const answers = body.answers;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > PLACEMENT_QUESTIONS.length) {
    throw validationError(`answers must list 1 to ${PLACEMENT_QUESTIONS.length} answers.`);
  }

  const seen = new Set<string>();
  return answers.map((item, index) => {
    const answer = readBody(item, ["questionId", "optionId"]);
    if (typeof answer.questionId !== "string" || typeof answer.optionId !== "string") {
      throw validationError(`answers[${index}] needs questionId and optionId strings.`);
    }

    const parsed = { questionId: answer.questionId, optionId: answer.optionId };
    const check = placement.isKnownAnswer(parsed);
    if (check === "unknown_question") throw validationError(`answers[${index}] has an unknown questionId.`);
    if (check === "unknown_option") throw validationError(`answers[${index}] has an option that does not belong to its question.`);
    if (seen.has(parsed.questionId)) throw validationError(`answers[${index}] repeats question ${parsed.questionId}.`);
    seen.add(parsed.questionId);
    return parsed;
  });
}

export function getQuestions(_request: Request, response: Response): void {
  response.json(placement.listQuestions());
}

/** Session is optional: placement can run before registration and is then not stored. */
export async function submitAttempt(request: Request, response: Response): Promise<void> {
  const answers = readAnswers(request.body);
  const userId = response.locals.userId;
  const result = await placement.submitAttempt(userId, answers);
  response.status(userId ? 201 : 200).json(result);
}

export async function listAttempts(_request: Request, response: Response): Promise<void> {
  response.json(await placement.listAttempts(currentUserId(response)));
}
