import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import { HttpError } from "../../http/errors.js";
import { notify } from "../community/notifications.service.js";
import { lessonsBetween, reviewAnswersBetween, storiesCompletedBetween, xpBetween } from "./activity.js";
import { currentDay, type Period } from "./periods.js";
import { getWalletBalance, lockWallet } from "./wallet.service.js";

export const QUEST_METRICS = ["lessons_completed", "xp_earned", "review_answers", "stories_completed"] as const;

/** Daily progress derived from activity; nothing is stored until the learner claims. */
async function questProgress(userId: string, metric: string, period: Period): Promise<number> {
  switch (metric) {
    case "lessons_completed":
      return (await lessonsBetween([userId], period.startsAt, period.endsAt)).get(userId) ?? 0;
    case "xp_earned":
      return (await xpBetween([userId], period.startsAt, period.endsAt)).get(userId) ?? 0;
    case "review_answers":
      return reviewAnswersBetween(userId, period.startsAt, period.endsAt);
    case "stories_completed":
      return storiesCompletedBetween(userId, period.startsAt, period.endsAt);
    default:
      return 0;
  }
}

export async function listQuests(userId: string) {
  const period = currentDay();
  const [quests, claims] = await Promise.all([
    prisma.quest.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.questClaim.findMany({ where: { userId, periodKey: period.key }, select: { questId: true } }),
  ]);
  const claimed = new Set(claims.map((claim) => claim.questId));

  const items = await Promise.all(
    quests.map(async (quest) => {
      const progress = await questProgress(userId, quest.metric, period);
      const status = claimed.has(quest.id) ? "claimed" : progress >= quest.target ? "claimable" : "in_progress";
      return {
        id: quest.id,
        slug: quest.slug,
        title: quest.title,
        metric: quest.metric,
        target: quest.target,
        progress: Math.min(progress, quest.target),
        rewardGems: quest.rewardGems,
        status,
      };
    }),
  );
  return { period: { key: period.key, endsAt: period.endsAt }, quests: items };
}

/** One claim per quest per UTC day; the reward is appended to the wallet ledger in the same transaction. */
export async function claimQuest(userId: string, questId: string) {
  const quest = await prisma.quest.findFirst({ where: { id: questId, isActive: true } });
  if (!quest) throw new HttpError(404, "NOT_FOUND", "Quest not found.");
  const period = currentDay();

  const balance = await prisma.$transaction(async (tx) => {
    await lockWallet(tx, userId);
    const existing = await tx.questClaim.findUnique({ where: { userId_questId_periodKey: { userId, questId, periodKey: period.key } } });
    if (existing) throw new HttpError(409, "ALREADY_CLAIMED", "You already claimed this quest today.");
    if ((await questProgress(userId, quest.metric, period)) < quest.target) {
      throw new HttpError(409, "QUEST_NOT_COMPLETE", "Complete the quest before claiming it.");
    }

    try {
      const claim = await tx.questClaim.create({ data: { userId, questId, periodKey: period.key, rewardGems: quest.rewardGems } });
      await tx.walletTransaction.create({ data: { userId, amount: quest.rewardGems, reason: "quest_reward", questClaimId: claim.id } });
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "ALREADY_CLAIMED", "You already claimed this quest today.");
      throw error;
    }
    return getWalletBalance(userId, tx);
  });

  await notify({
    userId,
    type: "reward_earned",
    title: "Quest complete",
    body: `You earned ${quest.rewardGems} gems for "${quest.title}".`,
    data: { questId, gems: quest.rewardGems },
    dedupeKey: `quest:${questId}:${period.key}`,
  });
  return { reward: { gems: quest.rewardGems, balance } };
}
