import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as controller from "./groups.controller.js";

const groupsRouter = Router();
const base = "/study-groups/:groupId";

groupsRouter.get("/study-groups", requireUser, controller.listGroups);
groupsRouter.post("/study-groups", requireUser, controller.createGroup);
groupsRouter.get(base, requireUser, controller.getGroup);
groupsRouter.patch(base, requireUser, controller.updateGroup);
groupsRouter.delete(base, requireUser, controller.deleteGroup);
groupsRouter.get(`${base}/members`, requireUser, controller.listMembers);
groupsRouter.post(`${base}/membership`, requireUser, controller.joinGroup);
groupsRouter.delete(`${base}/membership`, requireUser, controller.leaveGroup);

groupsRouter.get(`${base}/discussion`, requireUser, controller.listPosts);
groupsRouter.post(`${base}/discussion`, requireUser, controller.createPost);
groupsRouter.patch(`${base}/discussion/:postId`, requireUser, controller.updatePost);
groupsRouter.delete(`${base}/discussion/:postId`, requireUser, controller.deletePost);
groupsRouter.get(`${base}/discussion/:postId/comments`, requireUser, controller.listComments);
groupsRouter.post(`${base}/discussion/:postId/comments`, requireUser, controller.createComment);
groupsRouter.patch(`${base}/discussion/:postId/comments/:commentId`, requireUser, controller.updateComment);
groupsRouter.delete(`${base}/discussion/:postId/comments/:commentId`, requireUser, controller.deleteComment);

groupsRouter.get(`${base}/challenge`, requireUser, controller.getChallenge);
groupsRouter.post(`${base}/challenge`, requireUser, controller.createChallenge);
groupsRouter.patch(`${base}/challenge`, requireUser, controller.updateChallenge);
groupsRouter.delete(`${base}/challenge`, requireUser, controller.deleteChallenge);
groupsRouter.post(`${base}/challenge/join`, requireUser, controller.joinChallenge);
groupsRouter.delete(`${base}/challenge/join`, requireUser, controller.leaveChallenge);

groupsRouter.get(`${base}/plan/tasks`, requireUser, controller.listTasks);
groupsRouter.post(`${base}/plan/tasks`, requireUser, controller.createTask);
groupsRouter.patch(`${base}/plan/tasks/:taskId`, requireUser, controller.updateTask);
groupsRouter.delete(`${base}/plan/tasks/:taskId`, requireUser, controller.deleteTask);

groupsRouter.get(`${base}/whiteboard/notes`, requireUser, controller.listNotes);
groupsRouter.post(`${base}/whiteboard/notes`, requireUser, controller.createNote);
groupsRouter.patch(`${base}/whiteboard/notes/:noteId`, requireUser, controller.updateNote);
groupsRouter.delete(`${base}/whiteboard/notes/:noteId`, requireUser, controller.deleteNote);

export { groupsRouter };
