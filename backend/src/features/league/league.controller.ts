import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import { readQueryText, readUuidParam, validationError } from "../../http/validation.js";
import * as achievements from "./achievements.service.js";
import * as league from "./league.service.js";
import * as quests from "./quests.service.js";
import * as wallet from "./wallet.service.js";

export async function leaderboard(request: Request, response: Response): Promise<void> {
  const scope = readQueryText(request.query, "scope", { max: 10 }) ?? "league";
  if (scope !== "league" && scope !== "friends") throw validationError("scope must be league or friends.");
  response.json(await league.leaderboard(currentUserId(response), scope));
}

export async function currentLeague(_request: Request, response: Response): Promise<void> {
  response.json(await league.currentLeague(currentUserId(response)));
}

export async function listQuests(_request: Request, response: Response): Promise<void> {
  response.json(await quests.listQuests(currentUserId(response)));
}

export async function claimQuest(request: Request, response: Response): Promise<void> {
  const questId = readUuidParam(request.params.questId, "questId");
  response.json(await quests.claimQuest(currentUserId(response), questId));
}

export async function listAchievements(_request: Request, response: Response): Promise<void> {
  response.json(await achievements.listAchievements(currentUserId(response)));
}

export async function getAchievement(request: Request, response: Response): Promise<void> {
  const achievementId = readUuidParam(request.params.achievementId, "achievementId");
  response.json(await achievements.getAchievement(currentUserId(response), achievementId));
}

export async function getWallet(_request: Request, response: Response): Promise<void> {
  response.json(await wallet.getWallet(currentUserId(response)));
}

export async function listRewards(_request: Request, response: Response): Promise<void> {
  response.json(await wallet.listRewards(currentUserId(response)));
}

export async function redeemReward(request: Request, response: Response): Promise<void> {
  const rewardId = readUuidParam(request.params.rewardId, "rewardId");
  response.status(201).json(await wallet.redeem(currentUserId(response), rewardId));
}

export async function listRedemptions(_request: Request, response: Response): Promise<void> {
  response.json(await wallet.listRedemptions(currentUserId(response)));
}

export async function cancelRedemption(request: Request, response: Response): Promise<void> {
  const redemptionId = readUuidParam(request.params.redemptionId, "redemptionId");
  response.json(await wallet.cancelRedemption(currentUserId(response), redemptionId));
}
