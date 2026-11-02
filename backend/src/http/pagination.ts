import { readQueryText, validationError } from "./validation.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type PageQuery = { before?: Date; limit: number };

/** Reads `?before=<ISO time>&limit=` for newest-first cursor lists. */
export function readPageQuery(query: unknown): PageQuery {
  const rawBefore = readQueryText(query, "before", { max: 40 });
  const rawLimit = readQueryText(query, "limit", { max: 3 });

  let before: Date | undefined;
  if (rawBefore !== undefined) {
    before = new Date(rawBefore);
    if (Number.isNaN(before.getTime())) throw validationError("before must be an ISO 8601 date-time.");
  }

  let limit = DEFAULT_LIMIT;
  if (rawLimit !== undefined) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw validationError(`limit must be a whole number from 1 to ${MAX_LIMIT}.`);
    }
  }

  return { ...(before ? { before } : {}), limit };
}

/** Prisma `where` fragment for the cursor. */
export function createdBefore(page: PageQuery) {
  return page.before ? { createdAt: { lt: page.before } } : {};
}

/** Query `limit + 1` rows, then trim and compute the next cursor. */
export function toPage<T extends { createdAt: Date }>(rows: T[], page: PageQuery): { items: T[]; nextBefore: string | null } {
  const items = rows.slice(0, page.limit);
  const last = items.at(-1);
  return { items, nextBefore: rows.length > page.limit && last ? last.createdAt.toISOString() : null };
}
