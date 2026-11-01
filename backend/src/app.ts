import express from "express";
import { prisma } from "./db/prisma.js";
import { learningRouter } from "./features/learning/learning.routes.js";
import { supportRouter } from "./features/support/support.routes.js";
import { practiceRouter } from "./features/practice/practice.routes.js";
import { activityRouter } from "./features/activity/activity.routes.js";

const app = express();

app.use(express.json());
app.use("/api", learningRouter);
app.use("/api", supportRouter);
app.use("/api", practiceRouter);
app.use("/api", activityRouter);

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});

export { app };
