/**
 * Curated League tiers derived from lifetime XP. Thresholds are calibrated to the demo seed,
 * where all four lessons together give 52 XP; scale them when more content is seeded.
 */
export type Tier = { key: string; name: string; minXp: number };

export const TIERS: readonly Tier[] = [
  { key: "seedling", name: "Seedling", minXp: 0 },
  { key: "sprout", name: "Sprout", minXp: 15 },
  { key: "bloom", name: "Bloom", minXp: 30 },
  { key: "grove", name: "Grove", minXp: 45 },
  { key: "forest", name: "Forest", minXp: 52 },
];

export function tierFor(totalXp: number): { tier: Tier; nextTier: Tier | null } {
  let index = 0;
  for (const [position, tier] of TIERS.entries()) {
    if (totalXp >= tier.minXp) index = position;
  }
  return { tier: TIERS[index] as Tier, nextTier: TIERS[index + 1] ?? null };
}
