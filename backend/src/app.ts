import express from "express";
import { prisma } from "./db/prisma.js";
import { identityRouter } from "./features/identity/identity.routes.js";
import { learningRouter } from "./features/learning/learning.routes.js";
import { supportRouter } from "./features/support/support.routes.js";
import { practiceRouter } from "./features/practice/practice.routes.js";
import { activityRouter } from "./features/activity/activity.routes.js";
import { communityRouter } from "./features/community/community.routes.js";
import { groupsRouter } from "./features/groups/groups.routes.js";
import { leagueRouter } from "./features/league/league.routes.js";
import { roomsRouter } from "./features/rooms/rooms.routes.js";
import { authenticate } from "./http/auth.js";
import { apiNotFound, jsonErrorHandler } from "./http/errors.js";

const app = express();

app.use(express.json());
app.use("/api", authenticate);
app.use("/api", identityRouter);
app.use("/api", learningRouter);
app.use("/api", supportRouter);
app.use("/api", practiceRouter);
app.use("/api", activityRouter);
app.use("/api", communityRouter);
app.use("/api", groupsRouter);
app.use("/api", roomsRouter);
app.use("/api", leagueRouter);
app.use("/api", apiNotFound);

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use(jsonErrorHandler);

export { app };
