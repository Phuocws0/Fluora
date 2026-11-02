import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../http/errors.js";
import { parseAnswer } from "../activity/activity.service.js";
import { VERDICTS, type ResolvedContext, type TutorFeedback } from "./provider/provider.js";
import type { RolePlayTurn } from "./role-play.js";

export const CONTEXT_KINDS = ["question", "grammar", "exercise", "mistake", "explain"] as const;

export type ContextKind = (typeof CONTEXT_KINDS)[number];

/** The context stored on a learner message: a kind plus IDs only, never copied content. */
export type ContextInput = { kind: ContextKind; exerciseId?: string; answerId?: string; messageId?: string };

const FALLBACK_HINT = "Read the prompt carefully.";

function notFound(what: string): HttpError {
  return new HttpError(404, "NOT_FOUND", `${what} not found.`);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Reads a stored message context back. Unknown shapes are treated as no context. */
export function parseStoredContext(value: unknown): ContextInput | null {
  const data = record(value);
  if (!data || typeof data.kind !== "string" || !(CONTEXT_KINDS as readonly string[]).includes(data.kind)) return null;
  const text = (key: string) => (typeof data[key] === "string" ? { [key]: data[key] as string } : {});
  return { kind: data.kind as ContextKind, ...text("exerciseId"), ...text("answerId"), ...text("messageId") };
}

export function parseFeedback(value: unknown): TutorFeedback | null {
  const data = record(value);
  if (!data || typeof data.explanation !== "string") return null;
  if (typeof data.verdict !== "string" || !(VERDICTS as readonly string[]).includes(data.verdict)) return null;
  const correction = typeof data.correction === "string" ? data.correction : null;
  return { verdict: data.verdict as TutorFeedback["verdict"], correction, explanation: data.explanation };
}

type OptionRow = { id: string; label: string; value: string };

function learnerAnswerText(value: unknown, options: OptionRow[]): string {
  const answer = parseAnswer(value);
  if (!answer) return "your answer";
  switch (answer.kind) {
    case "choice":
      return options.find((option) => option.id === answer.optionId)?.label ?? "your choice";
    case "sentence_tiles":
      return answer.tokens.join(" ");
    case "transcript_gap":
    case "dictation":
      return answer.text;
    case "matching":
      return answer.pairs.map((pair) => `${pair.left} → ${pair.right}`).join("; ");
    case "speaking":
      return answer.transcript;
  }
}

/** The expected answer, shown only after the learner has submitted an answer to that exercise. */
function expectedAnswerText(answerKey: unknown, options: OptionRow[]): string | null {
  const key = record(answerKey);
  if (!key) return null;
  if (typeof key.optionValue === "string") return options.find((option) => option.value === key.optionValue)?.label ?? null;
  if (Array.isArray(key.tokens)) return key.tokens.filter((token): token is string => typeof token === "string").join(" ");
  if (Array.isArray(key.accepted) && typeof key.accepted[0] === "string") return key.accepted[0];
  if (Array.isArray(key.pairs)) {
    return key.pairs
      .map(record)
      .filter((pair): pair is Record<string, unknown> => pair !== null)
      .map((pair) => `${String(pair.left)} → ${String(pair.right)}`)
      .join("; ");
  }
  return null;
}

/** Throws `400` when a context kind is missing its reference or is not allowed in this chat. */
export function assertContextAllowed(chatKind: string, context: ContextInput | null): void {
  if (!context) return;
  const invalid = (message: string) => new HttpError(400, "VALIDATION_ERROR", message);
  if (chatKind === "role_play" && context.kind !== "explain") {
    throw invalid("In a role-play, send a plain reply or context.kind \"explain\".");
  }
  if (context.kind === "exercise" && !context.exerciseId) throw invalid("context.exerciseId is required for kind \"exercise\".");
  if (context.kind === "mistake" && !context.answerId) throw invalid("context.answerId is required for kind \"mistake\".");
  if (context.kind === "explain" && !context.messageId) throw invalid("context.messageId is required for kind \"explain\".");
}

/** Loads the learning data a context points at, checking that the learner owns it. */
export async function resolveContext(
  userId: string,
  chat: { id: string; turns: RolePlayTurn[] | null },
  context: ContextInput | null,
): Promise<ResolvedContext | null> {
  if (!context) return null;

  if (context.kind === "exercise" && context.exerciseId) {
    const exercise = await prisma.exercise.findFirst({
      where: { id: context.exerciseId, lesson: { is: { unit: { is: { course: { isPublished: true } } } } } },
      select: { prompt: true, instruction: true, content: true },
    });
    if (!exercise) throw notFound("Exercise");
    const hints = record(exercise.content)?.hints;
    const firstHint = Array.isArray(hints) && typeof hints[0] === "string" ? hints[0] : FALLBACK_HINT;
    return { kind: "exercise", prompt: exercise.prompt, instruction: exercise.instruction, firstHint };
  }

  if (context.kind === "mistake" && context.answerId) {
    const answer = await prisma.userAnswer.findFirst({
      where: { id: context.answerId, userId },
      select: {
        answer: true,
        isCorrect: true,
        exercise: { select: { prompt: true, explanation: true, answerKey: true, options: { select: { id: true, label: true, value: true } } } },
      },
    });
    if (!answer) throw notFound("Answer");
    const { options } = answer.exercise;
    return {
      kind: "mistake",
      prompt: answer.exercise.prompt,
      learnerAnswer: learnerAnswerText(answer.answer, options),
      expectedAnswer: expectedAnswerText(answer.exercise.answerKey, options),
      isCorrect: answer.isCorrect,
      explanation: answer.exercise.explanation,
    };
  }

  if (context.kind === "explain" && context.messageId) {
    const message = await prisma.tutorMessage.findFirst({
      where: { id: context.messageId, conversationId: chat.id, role: "tutor" },
      select: { feedback: true, replyTo: { select: { turnKey: true } } },
    });
    if (!message) throw notFound("Tutor message");
    const feedback = parseFeedback(message.feedback);
    if (!feedback) throw new HttpError(400, "VALIDATION_ERROR", "context.messageId must point to a tutor reply with feedback.");

    const answeredTurn = message.replyTo?.turnKey ? chat.turns?.find((turn) => turn.key === message.replyTo?.turnKey) : undefined;
    const detail = answeredTurn
      ? `Ways to answer “${answeredTurn.tutorLine}”: ${answeredTurn.choices.map((choice) => `“${choice.label}”`).join(" or ")}.`
      : null;
    return { kind: "explain", feedback, detail };
  }

  return null;
}
