import { prisma } from "../../db/prisma.js";
import { getPrivacySettings } from "../identity/settings.service.js";

export type Relationship = "self" | "friends" | "outgoing" | "incoming" | "declined" | "none";

/** One friend-request row per pair: the smaller UUID first. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function relationships(viewerId: string, targetIds: string[]): Promise<Map<string, Relationship>> {
  const others = targetIds.filter((id) => id !== viewerId);
  const rows = others.length
    ? await prisma.friendRequest.findMany({
        where: { pairKey: { in: others.map((id) => pairKey(viewerId, id)) } },
        select: { requesterId: true, addresseeId: true, status: true },
      })
    : [];

  const result = new Map<string, Relationship>(targetIds.map((id) => [id, id === viewerId ? "self" : "none"]));
  for (const row of rows) {
    const otherId = row.requesterId === viewerId ? row.addresseeId : row.requesterId;
    if (row.status === "accepted") result.set(otherId, "friends");
    else if (row.status === "declined") result.set(otherId, "declined");
    else result.set(otherId, row.requesterId === viewerId ? "outgoing" : "incoming");
  }
  return result;
}

/** Target IDs that share at least one study group with the viewer. */
async function sharedGroupMembers(viewerId: string, targetIds: string[]): Promise<Set<string>> {
  if (targetIds.length === 0) return new Set();
  const rows = await prisma.groupMembership.findMany({
    where: { userId: { in: targetIds }, group: { memberships: { some: { userId: viewerId } } } },
    select: { userId: true },
  });
  return new Set(rows.map((row) => row.userId));
}

/** Profile access: self, any friend-request relationship, a shared group, or a discoverable target. */
export async function canViewProfile(viewerId: string, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true;
  const [relationship, privacy, shared] = await Promise.all([
    relationships(viewerId, [targetId]),
    getPrivacySettings([targetId]),
    sharedGroupMembers(viewerId, [targetId]),
  ]);
  return relationship.get(targetId) !== "none" || shared.has(targetId) || privacy.get(targetId)?.discoverable === true;
}

/** Targets whose XP, streak, tier, and achievements the viewer may see (`progressVisibility`). */
export async function progressVisibleTo(viewerId: string, targetIds: string[]): Promise<Set<string>> {
  const [relationship, privacy] = await Promise.all([relationships(viewerId, targetIds), getPrivacySettings(targetIds)]);
  return new Set(
    targetIds.filter((id) => {
      if (id === viewerId) return true;
      const visibility = privacy.get(id)?.progressVisibility ?? "friends";
      return visibility === "public" || (visibility === "friends" && relationship.get(id) === "friends");
    }),
  );
}

/** Accepted friends of a learner. */
export async function friendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendRequest.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
}
