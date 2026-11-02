import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as account from "./account.controller.js";
import * as auth from "./auth.controller.js";

const identityRouter = Router();

identityRouter.post("/auth/register", auth.register);
identityRouter.post("/auth/login", auth.login);
identityRouter.post("/auth/logout", requireUser, auth.logout);

identityRouter.get("/users/me", requireUser, account.getMe);
identityRouter.patch("/users/me", requireUser, account.updateMe);
identityRouter.patch("/users/me/password", requireUser, account.changePassword);
identityRouter.get("/users/me/sessions", requireUser, account.getSessions);
identityRouter.delete("/users/me/sessions/:sessionId", requireUser, account.deleteSession);

export { identityRouter };
