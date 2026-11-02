function prismaCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

/** True when Prisma rejected a write because of a unique constraint (`P2002`). */
export function isUniqueViolation(error: unknown): boolean {
  return prismaCode(error) === "P2002";
}

/** True when a write targeted a row that no longer exists (`P2025`) or a deleted parent (`P2003`). */
export function isMissingRecord(error: unknown): boolean {
  const code = prismaCode(error);
  return code === "P2025" || code === "P2003";
}
