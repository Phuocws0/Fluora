import { findTurn } from "../role-play.js";
import { LOCAL_FALLBACK, LOCAL_TOPICS } from "./local-topics.js";
import type { ResolvedContext, RolePlayInput, TutorProvider, TutorReply } from "./provider.js";

/** Lowercases, unifies apostrophes, and turns punctuation into spaces. */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-word or whole-phrase match on normalized text. */
function containsPhrase(normalized: string, phrase: string): boolean {
  const target = normalizeText(phrase);
  return target.length > 0 && ` ${normalized} `.includes(` ${target} `);
}

function rolePlayReply(message: string, rolePlay: RolePlayInput): TutorReply {
  const { turn, turns, closingLine } = rolePlay;
  const text = normalizeText(message);
  const scored = turn.choices.map((choice) => ({
    choice,
    exact: text === normalizeText(choice.label),
    score: choice.accept.filter((keyword) => containsPhrase(text, keyword)).length,
  }));
  const best = scored.find((item) => item.exact) ?? [...scored].filter((item) => item.score > 0).sort((a, b) => b.score - a.score)[0];

  if (!best) {
    const suggestion = turn.choices[0];
    return {
      body: `Let's try that again. ${turn.tutorLine}`,
      feedback: { verdict: "try_again", correction: suggestion.label, explanation: `You could say: “${suggestion.label}”` },
      choiceKey: null,
    };
  }

  const nextLine = best.choice.next ? findTurn(turns, best.choice.next).tutorLine : closingLine;
  return {
    body: `${best.exact ? "Great!" : "Good try!"} ${nextLine}`,
    feedback: {
      verdict: best.exact ? "correct" : "almost",
      correction: best.exact ? null : best.choice.label,
      explanation: best.choice.explanation,
    },
    choiceKey: best.choice.key,
  };
}

function contextReply(context: ResolvedContext): TutorReply {
  if (context.kind === "exercise") {
    const instruction = context.instruction ? `${context.instruction} ` : "";
    return { body: `Let's work through it. The task is: “${context.prompt}” ${instruction}Hint: ${context.firstHint}`, feedback: null, choiceKey: null };
  }

  if (context.kind === "mistake") {
    const explanation = context.explanation ?? "Review the lesson and try again.";
    if (context.isCorrect) {
      return {
        body: `Your answer “${context.learnerAnswer}” is correct. ${explanation}`,
        feedback: { verdict: "correct", correction: null, explanation },
        choiceKey: null,
      };
    }
    const expected = context.expectedAnswer ? ` The expected answer is “${context.expectedAnswer}”.` : "";
    return {
      body: `You answered “${context.learnerAnswer}”.${expected} ${explanation}`,
      feedback: { verdict: "try_again", correction: context.expectedAnswer, explanation },
      choiceKey: null,
    };
  }

  const parts = [context.feedback?.explanation, context.detail].filter((part): part is string => Boolean(part));
  return { body: `Here's more detail. ${parts.join(" ") || "Read the sentence aloud and compare it with the model answer."}`, feedback: null, choiceKey: null };
}

function topicReply(message: string): TutorReply {
  const text = normalizeText(message);
  const ranked = LOCAL_TOPICS.map((topic) => ({ topic, score: topic.keywords.filter((keyword) => containsPhrase(text, keyword)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.topic;
  return { body: best ? `${best.answer} Example: ${best.example}` : LOCAL_FALLBACK, feedback: null, choiceKey: null };
}

/** A deterministic, offline demo tutor. It needs no key and gives the same reply for the same input. */
export const localProvider: TutorProvider = {
  name: "local",
  available: true,
  reply: async (input) => {
    if (input.context) return contextReply(input.context);
    if (input.mode === "role_play" && input.rolePlay) return rolePlayReply(input.message, input.rolePlay);
    return topicReply(input.message);
  },
};
