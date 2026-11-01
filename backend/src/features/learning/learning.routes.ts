import { Router } from "express";
import * as learningController from "./learning.controller.js";

const learningRouter = Router();

learningRouter.get("/courses", learningController.listCourses);
learningRouter.get("/courses/:courseId", learningController.getCourse);
learningRouter.get("/courses/:courseId/units", learningController.getCourseUnits);
learningRouter.get("/units/:unitId", learningController.getUnit);
learningRouter.get("/lessons/search", learningController.searchLessons);
learningRouter.get("/lessons/:lessonId", learningController.getLesson);
learningRouter.get("/learning-paths/compare", learningController.compareLearningPaths);
learningRouter.get("/learning-paths", learningController.listLearningPaths);

export { learningRouter };
