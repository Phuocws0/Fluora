import { Router } from "express";
import * as controller from "./practice.controller.js";

const practiceRouter = Router();
practiceRouter.get("/vocabulary/sets", controller.requireUser, controller.sets);
practiceRouter.post("/vocabulary/sets", controller.requireUser, controller.createSet);
practiceRouter.get("/vocabulary/sets/:setId", controller.requireUser, controller.getSet);
practiceRouter.patch("/vocabulary/sets/:setId", controller.requireUser, controller.updateSet);
practiceRouter.delete("/vocabulary/sets/:setId", controller.requireUser, controller.deleteSet);
practiceRouter.get("/vocabulary/sets/:setId/cards", controller.requireUser, controller.cards);
practiceRouter.post("/vocabulary/sets/:setId/cards", controller.requireUser, controller.createCard);
practiceRouter.get("/vocabulary/cards/:cardId", controller.requireUser, controller.getCard);
practiceRouter.patch("/vocabulary/cards/:cardId", controller.requireUser, controller.updateCard);
practiceRouter.delete("/vocabulary/cards/:cardId", controller.requireUser, controller.deleteCard);
practiceRouter.get("/stories", controller.stories);
practiceRouter.get("/stories/:storyId", controller.getStory);
practiceRouter.get("/stories/:storyId/progress", controller.requireUser, controller.getProgress);
practiceRouter.put("/stories/:storyId/progress", controller.requireUser, controller.saveProgress);
practiceRouter.delete("/stories/:storyId/progress", controller.requireUser, controller.resetProgress);
practiceRouter.get("/bookmarks", controller.requireUser, controller.bookmarks);
practiceRouter.post("/bookmarks", controller.requireUser, controller.createBookmark);
practiceRouter.patch("/bookmarks/:bookmarkId", controller.requireUser, controller.updateBookmark);
practiceRouter.delete("/bookmarks/:bookmarkId", controller.requireUser, controller.deleteBookmark);

export { practiceRouter };
