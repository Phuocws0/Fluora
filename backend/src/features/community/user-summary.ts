import type { Prisma } from "../../generated/prisma/client.js";

/** The public identity shown next to learner-authored content. */
export const userSummarySelect = { id: true, displayName: true, avatarUrl: true } satisfies Prisma.UserSelect;

export type UserSummary = { id: string; displayName: string | null; avatarUrl: string | null };
