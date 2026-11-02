import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { notify } from "../community/notifications.service.js";

type Db = Prisma.TransactionClient | typeof prisma;

/** The balance is derived from the append-only ledger. */
export async function getWalletBalance(userId: string, db: Db = prisma): Promise<number> {
  const result = await db.walletTransaction.aggregate({ where: { userId }, _sum: { amount: true } });
  return result._sum.amount ?? 0;
}

/** Serializes gem spends and refunds per learner for the rest of the transaction. */
export async function lockWallet(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}

export async function getWallet(userId: string) {
  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amount: true,
        reason: true,
        createdAt: true,
        questClaim: { select: { quest: { select: { title: true } } } },
        redemption: { select: { reward: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    balance,
    transactions: transactions.map(({ questClaim, redemption, ...transaction }) => ({
      ...transaction,
      quest: questClaim ? { title: questClaim.quest.title } : null,
      reward: redemption ? { name: redemption.reward.name } : null,
    })),
  };
}

export async function listRewards(userId: string) {
  const [balance, rewards] = await Promise.all([
    getWalletBalance(userId),
    prisma.reward.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, description: true, costGems: true, kind: true, fulfillment: true },
    }),
  ]);
  return { balance, rewards: rewards.map((reward) => ({ ...reward, affordable: reward.costGems <= balance })) };
}

const redemptionSelect = {
  id: true,
  costGems: true,
  status: true,
  createdAt: true,
  cancelledAt: true,
  reward: { select: { id: true, name: true, kind: true } },
} satisfies Prisma.RewardRedemptionSelect;

type RedemptionRow = Prisma.RewardRedemptionGetPayload<{ select: typeof redemptionSelect }>;

function toRedemption(row: RedemptionRow) {
  return { ...row, cancellable: row.status === "pending" };
}

export async function redeem(userId: string, rewardId: string) {
  const reward = await prisma.reward.findFirst({ where: { id: rewardId, isActive: true } });
  if (!reward) throw new HttpError(404, "NOT_FOUND", "Reward not found.");

  const result = await prisma.$transaction(async (tx) => {
    await lockWallet(tx, userId);
    const balance = await getWalletBalance(userId, tx);
    if (balance < reward.costGems) {
      throw new HttpError(409, "INSUFFICIENT_GEMS", `This reward costs ${reward.costGems} gems; you have ${balance}.`);
    }

    const redemption = await tx.rewardRedemption.create({
      data: { userId, rewardId, costGems: reward.costGems, status: reward.fulfillment === "instant" ? "fulfilled" : "pending" },
      select: redemptionSelect,
    });
    await tx.walletTransaction.create({ data: { userId, amount: -reward.costGems, reason: "redemption", redemptionId: redemption.id } });
    return { redemption: toRedemption(redemption), balance: balance - reward.costGems };
  });

  await notify({
    userId,
    type: "reward_redeemed",
    title: "Reward redeemed",
    body: `You redeemed ${reward.name} for ${reward.costGems} gems.`,
    data: { rewardId, redemptionId: result.redemption.id },
    dedupeKey: `redemption:${result.redemption.id}`,
  });
  return result;
}

export async function listRedemptions(userId: string) {
  const rows = await prisma.rewardRedemption.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: redemptionSelect });
  return { redemptions: rows.map(toRedemption) };
}

/** Cancels a pending (unfulfilled) redemption once and appends the refund. */
export async function cancelRedemption(userId: string, redemptionId: string) {
  return prisma.$transaction(async (tx) => {
    await lockWallet(tx, userId);
    const redemption = await tx.rewardRedemption.findFirst({ where: { id: redemptionId, userId } });
    if (!redemption) throw new HttpError(404, "NOT_FOUND", "Redemption not found.");

    const cancelled = await tx.rewardRedemption.updateMany({
      where: { id: redemptionId, status: "pending" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    if (cancelled.count === 0) throw new HttpError(409, "NOT_CANCELLABLE", "Only pending redemptions can be cancelled.");

    await tx.walletTransaction.create({ data: { userId, amount: redemption.costGems, reason: "refund", redemptionId } });
    return { cancelled: true, balance: await getWalletBalance(userId, tx) };
  });
}
