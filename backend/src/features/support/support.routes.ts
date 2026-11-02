import { Router } from "express";
import * as controller from "./support.controller.js";
import { requireUser } from "../../http/auth.js";

const supportRouter = Router();

supportRouter.get("/help/articles", controller.articles);
supportRouter.get("/support/requests", requireUser, controller.requests);
supportRouter.post("/support/requests", requireUser, controller.createRequest);
supportRouter.patch("/support/requests/:requestId", requireUser, controller.updateRequest);
supportRouter.delete("/support/requests/:requestId", requireUser, controller.deleteRequest);
supportRouter.post("/users/me/data-exports", requireUser, controller.createExport);
supportRouter.get("/users/me/data-exports", requireUser, controller.exports);
supportRouter.get("/users/me/data-exports/:exportId", requireUser, controller.getExport);
supportRouter.get("/users/me/data-exports/:exportId/download", requireUser, controller.downloadExport);
supportRouter.delete("/users/me/data-exports/:exportId", requireUser, controller.deleteExport);

export { supportRouter };
