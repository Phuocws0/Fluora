import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as account from "./account.controller.js";
import * as auth from "./auth.controller.js";
import * as placement from "./placement.controller.js";
import * as settings from "./settings.controller.js";

const identityRouter = Router();

identityRouter.post("/auth/register", auth.register);
identityRouter.post("/auth/login", auth.login);
identityRouter.post("/auth/google", auth.google);
identityRouter.post("/auth/logout", requireUser, auth.logout);
identityRouter.post("/auth/verify-email", auth.verifyEmail);
identityRouter.post("/auth/verify-email/resend", requireUser, auth.resendVerification);
identityRouter.post("/auth/password/forgot", auth.forgotPassword);
identityRouter.post("/auth/password/reset", auth.resetPassword);

identityRouter.get("/users/me", requireUser, account.getMe);
identityRouter.patch("/users/me", requireUser, account.updateMe);
identityRouter.delete("/users/me", requireUser, account.deleteMe);
identityRouter.patch("/users/me/password", requireUser, account.changePassword);
identityRouter.get("/users/me/sessions", requireUser, account.getSessions);
identityRouter.delete("/users/me/sessions/:sessionId", requireUser, account.deleteSession);
identityRouter.get("/users/me/settings", requireUser, settings.getSettings);
identityRouter.patch("/users/me/settings", requireUser, settings.updateSettings);
identityRouter.delete("/users/me/settings", requireUser, settings.resetSettings);

identityRouter.get("/placement/questions", placement.getQuestions);
identityRouter.post("/placement/attempts", placement.submitAttempt);
identityRouter.get("/placement/attempts", requireUser, placement.listAttempts);

export { identityRouter };
