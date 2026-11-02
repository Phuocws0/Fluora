import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as controller from "./league.controller.js";

const leagueRouter = Router();

leagueRouter.get("/leaderboard", requireUser, controller.leaderboard);
leagueRouter.get("/leagues/current", requireUser, controller.currentLeague);
leagueRouter.get("/quests", requireUser, controller.listQuests);
leagueRouter.post("/quests/:questId/claim", requireUser, controller.claimQuest);
leagueRouter.get("/achievements", requireUser, controller.listAchievements);
leagueRouter.get("/achievements/:achievementId", requireUser, controller.getAchievement);
leagueRouter.get("/wallet", requireUser, controller.getWallet);
leagueRouter.get("/rewards", requireUser, controller.listRewards);
leagueRouter.post("/rewards/:rewardId/redeem", requireUser, controller.redeemReward);
leagueRouter.get("/redemptions", requireUser, controller.listRedemptions);
leagueRouter.delete("/redemptions/:redemptionId", requireUser, controller.cancelRedemption);

export { leagueRouter };
