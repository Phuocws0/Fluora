import { HttpError } from "../../http/errors.js";

/** One suggested reply in a role-play turn. `next: null` ends the scenario. */
export type RolePlayChoice = { key: string; label: string; accept: string[]; explanation: string; next: string | null };

/** One curated role-play turn. Hints form a three-step ladder. */
export type RolePlayTurn = { key: string; tutorLine: string; hints: [string, string, string]; choices: RolePlayChoice[] };

/** The turn shape returned to learners. Grading keywords, explanations, and hints stay server-side. */
export type PublicTurn = { key: string; tutorLine: string; choices: Array<{ key: string; label: string }> };

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isChoice(value: unknown): value is RolePlayChoice {
  return (
    isRecord(value) &&
    isText(value.key) &&
    isText(value.label) &&
    isText(value.explanation) &&
    Array.isArray(value.accept) &&
    value.accept.length > 0 &&
    value.accept.every(isText) &&
    (value.next === null || isText(value.next))
  );
}

function isTurn(value: unknown): value is RolePlayTurn {
  return (
    isRecord(value) &&
    isText(value.key) &&
    isText(value.tutorLine) &&
    Array.isArray(value.hints) &&
    value.hints.length === 3 &&
    value.hints.every(isText) &&
    Array.isArray(value.choices) &&
    value.choices.length > 0 &&
    value.choices.every(isChoice)
  );
}

function contentError(): HttpError {
  return new HttpError(500, "CONTENT_ERROR", "Role-play scenario data is invalid.");
}

/** Reads the curated `turns` JSON column. Malformed seed data is a server error, not a client error. */
export function parseTurns(value: unknown): RolePlayTurn[] {
  if (!Array.isArray(value) || !value.every(isTurn)) throw contentError();
  return value;
}

export function findTurn(turns: RolePlayTurn[], key: string): RolePlayTurn {
  const turn = turns.find((item) => item.key === key);
  if (!turn) throw contentError();
  return turn;
}

export function toPublicTurn(turn: RolePlayTurn): PublicTurn {
  return { key: turn.key, tutorLine: turn.tutorLine, choices: turn.choices.map(({ key, label }) => ({ key, label })) };
}

/**
 * Checks a scenario graph before it is seeded: unique turn and choice keys, an existing start turn,
 * existing `next` targets, at least one ending, and every turn reachable from the start.
 */
export function assertScenarioGraph(slug: string, startTurnKey: string, turns: unknown): void {
  const fail = (reason: string): never => {
    throw new Error(`Role-play scenario "${slug}" is invalid: ${reason}`);
  };
  if (!Array.isArray(turns) || !turns.every(isTurn)) fail("every turn needs a key, tutorLine, 3 hints, and valid choices");
  const list = turns as RolePlayTurn[];
  const keys = new Set(list.map((turn) => turn.key));
  if (keys.size !== list.length) fail("turn keys must be unique");
  if (!keys.has(startTurnKey)) fail(`start turn "${startTurnKey}" does not exist`);

  let hasEnding = false;
  for (const turn of list) {
    const choiceKeys = new Set(turn.choices.map((choice) => choice.key));
    if (choiceKeys.size !== turn.choices.length) fail(`choice keys in turn "${turn.key}" must be unique`);
    for (const choice of turn.choices) {
      if (choice.next === null) hasEnding = true;
      else if (choice.next === turn.key) fail(`choice "${choice.key}" must not loop back to its own turn`);
      else if (!keys.has(choice.next)) fail(`choice "${choice.key}" points to missing turn "${choice.next}"`);
    }
  }
  if (!hasEnding) fail("at least one choice must end the scenario");

  const reached = new Set([startTurnKey]);
  const queue = [startTurnKey];
  while (queue.length > 0) {
    const turn = findTurnOrNull(list, queue.shift() ?? "");
    for (const choice of turn?.choices ?? []) {
      if (choice.next && !reached.has(choice.next)) {
        reached.add(choice.next);
        queue.push(choice.next);
      }
    }
  }
  const unreachable = list.find((turn) => !reached.has(turn.key));
  if (unreachable) fail(`turn "${unreachable.key}" is unreachable`);
}

function findTurnOrNull(turns: RolePlayTurn[], key: string): RolePlayTurn | null {
  return turns.find((turn) => turn.key === key) ?? null;
}
