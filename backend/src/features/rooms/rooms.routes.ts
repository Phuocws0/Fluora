import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as controller from "./rooms.controller.js";

const roomsRouter = Router();
const room = "/study-rooms/:roomId";
const poll = `${room}/polls/:pollId`;

roomsRouter.post("/study-groups/:groupId/rooms", requireUser, controller.createRoom);
roomsRouter.get(room, requireUser, controller.getRoom);
roomsRouter.patch(room, requireUser, controller.updateRoom);
roomsRouter.delete(room, requireUser, controller.deleteRoom);
roomsRouter.post(`${room}/participants`, requireUser, controller.joinRoom);
roomsRouter.delete(`${room}/participants/me`, requireUser, controller.leaveRoom);

roomsRouter.get(`${room}/messages`, requireUser, controller.listMessages);
roomsRouter.post(`${room}/messages`, requireUser, controller.sendMessage);
roomsRouter.patch(`${room}/messages/:messageId`, requireUser, controller.updateMessage);
roomsRouter.delete(`${room}/messages/:messageId`, requireUser, controller.deleteMessage);

roomsRouter.get(`${room}/polls`, requireUser, controller.listPolls);
roomsRouter.post(`${room}/polls`, requireUser, controller.createPoll);
roomsRouter.patch(poll, requireUser, controller.updatePoll);
roomsRouter.delete(poll, requireUser, controller.deletePoll);
roomsRouter.post(`${poll}/votes`, requireUser, controller.vote);
roomsRouter.patch(`${poll}/votes/me`, requireUser, controller.changeVote);
roomsRouter.delete(`${poll}/votes/me`, requireUser, controller.withdrawVote);

roomsRouter.get("/peer-reviews", requireUser, controller.getPeerReview);
roomsRouter.post("/peer-reviews/:submissionId/comments", requireUser, controller.createReviewComment);
roomsRouter.patch("/peer-reviews/:submissionId/comments/:commentId", requireUser, controller.updateReviewComment);
roomsRouter.delete("/peer-reviews/:submissionId/comments/:commentId", requireUser, controller.deleteReviewComment);

export { roomsRouter };
