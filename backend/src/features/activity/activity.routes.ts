import { Router } from "express";
import { requireUser } from "../../auth/require-user.js";
import * as controller from "./activity.controller.js";

const activityRouter = Router();
activityRouter.get("/home", requireUser, controller.home);
activityRouter.get("/progress", requireUser, controller.progress);
activityRouter.get("/analytics/weekly", requireUser, controller.weekly);
activityRouter.get("/learning/skill-baseline", requireUser, controller.baseline);
activityRouter.get("/lessons/:lessonId/answers", requireUser, controller.answers);
activityRouter.post("/exercises/:exerciseId/answers", requireUser, controller.answer);
activityRouter.get("/exercises/:exerciseId/hints", controller.hints);
activityRouter.post("/lessons/:lessonId/complete", requireUser, controller.completeLesson);
activityRouter.get("/planner/entries", requireUser, controller.planner);
activityRouter.post("/planner/entries", requireUser, controller.createPlanner);
activityRouter.get("/planner/entries/:entryId", requireUser, controller.getPlanner);
activityRouter.patch("/planner/entries/:entryId", requireUser, controller.updatePlanner);
activityRouter.delete("/planner/entries/:entryId", requireUser, controller.deletePlanner);
activityRouter.get("/learning/evidence", requireUser, controller.evidence);
activityRouter.post("/learning/evidence", requireUser, controller.createEvidence);
activityRouter.patch("/learning/evidence/:evidenceId", requireUser, controller.updateEvidence);
activityRouter.delete("/learning/evidence/:evidenceId", requireUser, controller.deleteEvidence);
activityRouter.get("/missions/passport", requireUser, controller.passport);
activityRouter.get("/missions/:missionId", controller.mission);
activityRouter.post("/missions/:missionId/complete", requireUser, controller.completeMission);
activityRouter.get("/learning/misconceptions", requireUser, controller.misconceptions);
activityRouter.patch("/learning/misconceptions/:itemId", requireUser, controller.dismissMisconception);

export { activityRouter };
