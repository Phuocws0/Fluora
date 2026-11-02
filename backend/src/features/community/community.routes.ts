import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as controller from "./community.controller.js";

const communityRouter = Router();

communityRouter.get("/users/search", requireUser, controller.searchUsers);
communityRouter.get("/users/:userId", requireUser, controller.getUser);

communityRouter.get("/friends", requireUser, controller.listFriends);
communityRouter.delete("/friends/:userId", requireUser, controller.removeFriend);
communityRouter.get("/friend-requests", requireUser, controller.listRequests);
communityRouter.post("/friend-requests", requireUser, controller.sendRequest);
communityRouter.patch("/friend-requests/:requestId", requireUser, controller.respondToRequest);
communityRouter.delete("/friend-requests/:requestId", requireUser, controller.deleteRequest);

communityRouter.get("/notifications", requireUser, controller.listNotifications);
communityRouter.delete("/notifications", requireUser, controller.clearNotifications);
communityRouter.patch("/notifications/read-all", requireUser, controller.markAllRead);
communityRouter.patch("/notifications/:notificationId", requireUser, controller.setRead);
communityRouter.delete("/notifications/:notificationId", requireUser, controller.deleteNotification);

export { communityRouter };
