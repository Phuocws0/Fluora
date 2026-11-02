import { Router } from "express";
import { requireUser } from "../../http/auth.js";
import * as controller from "./tutor.controller.js";

const tutorRouter = Router();
const chat = "/tutor/chats/:chatId";
const note = "/tutor/notes/:noteId";

tutorRouter.get("/tutor/status", requireUser, controller.getStatus);
tutorRouter.get("/tutor/role-plays", requireUser, controller.listRolePlays);

tutorRouter.get("/tutor/chats", requireUser, controller.listChats);
tutorRouter.post("/tutor/chats", requireUser, controller.createChat);
tutorRouter.delete("/tutor/chats", requireUser, controller.clearChats);
tutorRouter.get(chat, requireUser, controller.getChat);
tutorRouter.patch(chat, requireUser, controller.updateChat);
tutorRouter.delete(chat, requireUser, controller.deleteChat);

tutorRouter.post(`${chat}/messages`, requireUser, controller.sendMessage);
tutorRouter.patch(`${chat}/messages/:messageId`, requireUser, controller.updateMessage);
tutorRouter.delete(`${chat}/messages/:messageId`, requireUser, controller.deleteMessage);
tutorRouter.get(`${chat}/hints`, requireUser, controller.getHint);

tutorRouter.get("/tutor/notes", requireUser, controller.listNotes);
tutorRouter.post("/tutor/notes", requireUser, controller.createNote);
tutorRouter.get(note, requireUser, controller.getNote);
tutorRouter.patch(note, requireUser, controller.updateNote);
tutorRouter.delete(note, requireUser, controller.deleteNote);

export { tutorRouter };
