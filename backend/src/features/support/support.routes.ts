import { Router } from "express";
import * as controller from "./support.controller.js";

const supportRouter = Router();

supportRouter.get("/help/articles", controller.articles);
supportRouter.get("/support/requests", controller.requireUser, controller.requests);
supportRouter.post("/support/requests", controller.requireUser, controller.createRequest);
supportRouter.patch("/support/requests/:requestId", controller.requireUser, controller.updateRequest);
supportRouter.delete("/support/requests/:requestId", controller.requireUser, controller.deleteRequest);
supportRouter.post("/users/me/data-exports", controller.requireUser, controller.createExport);
supportRouter.get("/users/me/data-exports", controller.requireUser, controller.exports);
supportRouter.get("/users/me/data-exports/:exportId", controller.requireUser, controller.getExport);
supportRouter.get("/users/me/data-exports/:exportId/download", controller.requireUser, controller.downloadExport);
supportRouter.delete("/users/me/data-exports/:exportId", controller.requireUser, controller.deleteExport);

export { supportRouter };
