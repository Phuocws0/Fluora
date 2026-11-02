import { HttpError } from "../../../http/errors.js";
import type { RolePlayTurn } from "../role-play.js";
import { localProvider } from "./local.provider.js";

export const VERDICTS = ["correct", "almost", "try_again"] as const;

export type TutorFeedback = { verdict: (typeof VERDICTS)[number]; correction: string | null; explanation: string };

/** Learning data the tutor may use. Only IDs are stored on messages; this is resolved per request. */
export type ResolvedContext =
  | { kind: "exercise"; prompt: string; instruction: string | null; firstHint: string }
  | { kind: "mistake"; prompt: string; learnerAnswer: string; expectedAnswer: string | null; isCorrect: boolean; explanation: string | null }
  | { kind: "explain"; feedback: TutorFeedback | null; detail: string | null };

export type RolePlayInput = { turn: RolePlayTurn; turns: RolePlayTurn[]; closingLine: string };

/** Everything a provider receives. It never includes the learner's identity, settings, or other learners' data. */
export type TutorTurnInput = {
  mode: "chat" | "role_play" | "explain";
  message: string;
  history: Array<{ role: "learner" | "tutor"; body: string }>;
  context: ResolvedContext | null;
  rolePlay: RolePlayInput | null;
};

/** `choiceKey` is a suggestion; the service accepts it only if it belongs to the current turn. */
export type TutorReply = { body: string; feedback: TutorFeedback | null; choiceKey: string | null };

export type ProviderName = "local" | "off";

export interface TutorProvider {
  readonly name: ProviderName;
  readonly available: boolean;
  reply(input: TutorTurnInput): Promise<TutorReply>;
}

const offProvider: TutorProvider = {
  name: "off",
  available: false,
  reply: async () => {
    throw tutorUnavailable();
  },
};

function selectProvider(): TutorProvider {
  const configured = (process.env.TUTOR_PROVIDER ?? "").trim() || "local";
  if (configured === "local") return localProvider;
  if (configured === "off") return offProvider;
  console.warn(`Unknown TUTOR_PROVIDER "${configured}"; the tutor is unavailable. Use "local" or "off".`);
  return offProvider;
}

const provider = selectProvider();

export function tutorUnavailable(): HttpError {
  return new HttpError(503, "TUTOR_UNAVAILABLE", "Flo is unavailable right now. Your lessons still work; try again later.");
}

export function tutorStatus(): { available: boolean; provider: ProviderName } {
  return { available: provider.available, provider: provider.name };
}

/** Calls the configured provider. Any provider failure becomes `503`; the message text is never logged. */
export async function askTutor(input: TutorTurnInput): Promise<TutorReply> {
  if (!provider.available) throw tutorUnavailable();
  try {
    return await provider.reply(input);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error(`Tutor provider "${provider.name}" failed:`, error instanceof Error ? error.name : "unknown error");
    throw tutorUnavailable();
  }
}
