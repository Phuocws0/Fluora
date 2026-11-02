import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import { readPageQuery } from "../../http/pagination.js";
import {
  readBody,
  readInt,
  readNullableDate,
  readNullableText,
  readOptionalDate,
  readOptionalEnum,
  readOptionalInt,
  readOptionalText,
  readQueryText,
  readText,
  readUuidParam,
  requireSomeField,
  validationError,
  type JsonBody,
} from "../../http/validation.js";
import * as board from "./board.service.js";
import * as challenges from "./challenge.service.js";
import * as discussion from "./discussion.service.js";
import * as groups from "./groups.service.js";

const TOPIC = /^[a-z0-9_-]{1,40}$/;

function groupId(request: Request): string {
  return readUuidParam(request.params.groupId, "groupId");
}

function readTopic(body: JsonBody): string | undefined {
  const topic = readOptionalText(body, "topic", { max: 40 })?.toLowerCase();
  if (topic !== undefined && !TOPIC.test(topic)) throw validationError("topic must be a short slug such as travel or business-english.");
  return topic;
}

function required<T>(value: T | undefined, key: string): T {
  if (value === undefined) throw validationError(`${key} is required.`);
  return value;
}

// ---------- Groups and membership ----------

export async function listGroups(request: Request, response: Response): Promise<void> {
  const query = readQueryText(request.query, "query", { max: 60 });
  const topic = readQueryText(request.query, "topic", { max: 40 })?.toLowerCase();
  const mine = readQueryText(request.query, "mine", { max: 5 });
  if (mine !== undefined && mine !== "true" && mine !== "false") throw validationError("mine must be true or false.");
  response.json(
    await groups.listGroups(currentUserId(response), { ...(query ? { query } : {}), ...(topic ? { topic } : {}), mine: mine === "true" }),
  );
}

export async function createGroup(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["name", "goal", "topic", "visibility"]);
  const input = {
    name: readText(body, "name", { min: 3, max: 60 }),
    goal: readText(body, "goal", { max: 200 }),
    topic: required(readTopic(body), "topic"),
    visibility: readOptionalEnum(body, "visibility", groups.GROUP_VISIBILITY) ?? "public",
  };
  response.status(201).json(await groups.createGroup(currentUserId(response), input));
}

export async function getGroup(request: Request, response: Response): Promise<void> {
  response.json(await groups.getGroup(currentUserId(response), groupId(request)));
}

export async function updateGroup(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["name", "goal", "topic", "visibility", "meetupAt", "meetupNote", "ownerId"]);
  requireSomeField(body);
  const name = readOptionalText(body, "name", { min: 3, max: 60 });
  const goal = readOptionalText(body, "goal", { max: 200 });
  const topic = readTopic(body);
  const visibility = readOptionalEnum(body, "visibility", groups.GROUP_VISIBILITY);
  const meetupAt = readNullableDate(body, "meetupAt");
  const meetupNote = readNullableText(body, "meetupNote", 200);
  const ownerId = body.ownerId === undefined ? undefined : readUuidParam(body.ownerId, "ownerId");
  const input: groups.GroupUpdate = {
    ...(name !== undefined ? { name } : {}),
    ...(goal !== undefined ? { goal } : {}),
    ...(topic !== undefined ? { topic } : {}),
    ...(visibility !== undefined ? { visibility } : {}),
    ...(meetupAt !== undefined ? { meetupAt } : {}),
    ...(meetupNote !== undefined ? { meetupNote } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
  };
  response.json(await groups.updateGroup(currentUserId(response), groupId(request), input));
}

export async function deleteGroup(request: Request, response: Response): Promise<void> {
  response.json(await groups.deleteGroup(currentUserId(response), groupId(request)));
}

export async function listMembers(request: Request, response: Response): Promise<void> {
  response.json(await groups.listMembers(currentUserId(response), groupId(request)));
}

export async function joinGroup(request: Request, response: Response): Promise<void> {
  response.status(201).json(await groups.joinGroup(currentUserId(response), groupId(request)));
}

export async function leaveGroup(request: Request, response: Response): Promise<void> {
  response.json(await groups.leaveGroup(currentUserId(response), groupId(request)));
}

// ---------- Discussion ----------

function readPostBody(request: Request, max: number): string {
  return readText(readBody(request.body, ["body"]), "body", { max });
}

export async function listPosts(request: Request, response: Response): Promise<void> {
  response.json(await discussion.listPosts(currentUserId(response), groupId(request), readPageQuery(request.query)));
}

export async function createPost(request: Request, response: Response): Promise<void> {
  response.status(201).json(await discussion.createPost(currentUserId(response), groupId(request), readPostBody(request, 2000)));
}

export async function updatePost(request: Request, response: Response): Promise<void> {
  const postId = readUuidParam(request.params.postId, "postId");
  response.json(await discussion.updatePost(currentUserId(response), groupId(request), postId, readPostBody(request, 2000)));
}

export async function deletePost(request: Request, response: Response): Promise<void> {
  const postId = readUuidParam(request.params.postId, "postId");
  response.json(await discussion.deletePost(currentUserId(response), groupId(request), postId));
}

export async function listComments(request: Request, response: Response): Promise<void> {
  const postId = readUuidParam(request.params.postId, "postId");
  response.json(await discussion.listComments(currentUserId(response), groupId(request), postId, readPageQuery(request.query)));
}

export async function createComment(request: Request, response: Response): Promise<void> {
  const postId = readUuidParam(request.params.postId, "postId");
  response.status(201).json(await discussion.createComment(currentUserId(response), groupId(request), postId, readPostBody(request, 1000)));
}

export async function updateComment(request: Request, response: Response): Promise<void> {
  const postId = readUuidParam(request.params.postId, "postId");
  const commentId = readUuidParam(request.params.commentId, "commentId");
  response.json(await discussion.updateComment(currentUserId(response), groupId(request), postId, commentId, readPostBody(request, 1000)));
}

export async function deleteComment(request: Request, response: Response): Promise<void> {
  const postId = readUuidParam(request.params.postId, "postId");
  const commentId = readUuidParam(request.params.commentId, "commentId");
  response.json(await discussion.deleteComment(currentUserId(response), groupId(request), postId, commentId));
}

// ---------- Challenge ----------

const CHALLENGE_FIELDS = ["title", "metric", "target", "startsAt", "endsAt"] as const;

function readChallengeFields(body: JsonBody): Partial<challenges.ChallengeInput> {
  const title = readOptionalText(body, "title", { min: 3, max: 80 });
  const metric = readOptionalEnum(body, "metric", challenges.CHALLENGE_METRICS);
  const target = readOptionalInt(body, "target", { min: 1, max: 100000 });
  const startsAt = readOptionalDate(body, "startsAt");
  const endsAt = readOptionalDate(body, "endsAt");
  return {
    ...(title !== undefined ? { title } : {}),
    ...(metric !== undefined ? { metric } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(startsAt !== undefined ? { startsAt } : {}),
    ...(endsAt !== undefined ? { endsAt } : {}),
  };
}

export async function getChallenge(request: Request, response: Response): Promise<void> {
  response.json(await challenges.getChallenge(currentUserId(response), groupId(request)));
}

export async function createChallenge(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, CHALLENGE_FIELDS);
  const fields = readChallengeFields(body);
  const input: challenges.ChallengeInput = {
    title: required(fields.title, "title"),
    metric: required(fields.metric, "metric"),
    target: readInt(body, "target", { min: 1, max: 100000 }),
    startsAt: required(fields.startsAt, "startsAt"),
    endsAt: required(fields.endsAt, "endsAt"),
  };
  response.status(201).json(await challenges.createChallenge(currentUserId(response), groupId(request), input));
}

export async function updateChallenge(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, CHALLENGE_FIELDS);
  requireSomeField(body);
  response.json(await challenges.updateChallenge(currentUserId(response), groupId(request), readChallengeFields(body)));
}

export async function deleteChallenge(request: Request, response: Response): Promise<void> {
  response.json(await challenges.deleteChallenge(currentUserId(response), groupId(request)));
}

export async function joinChallenge(request: Request, response: Response): Promise<void> {
  response.status(201).json(await challenges.joinChallenge(currentUserId(response), groupId(request)));
}

export async function leaveChallenge(request: Request, response: Response): Promise<void> {
  response.json(await challenges.leaveChallenge(currentUserId(response), groupId(request)));
}

// ---------- Group plan and whiteboard ----------

export async function listTasks(request: Request, response: Response): Promise<void> {
  response.json(await board.listTasks(currentUserId(response), groupId(request)));
}

export async function createTask(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["title", "lane"]);
  const input = { title: readText(body, "title", { max: 120 }), lane: readOptionalEnum(body, "lane", board.TASK_LANES) ?? "todo" };
  response.status(201).json(await board.createTask(currentUserId(response), groupId(request), input));
}

export async function updateTask(request: Request, response: Response): Promise<void> {
  const taskId = readUuidParam(request.params.taskId, "taskId");
  const body = readBody(request.body, ["title", "lane", "order"]);
  requireSomeField(body);
  const title = readOptionalText(body, "title", { max: 120 });
  const lane = readOptionalEnum(body, "lane", board.TASK_LANES);
  const order = readOptionalInt(body, "order", { min: 0, max: 10000 });
  const input: board.TaskUpdate = {
    ...(title !== undefined ? { title } : {}),
    ...(lane !== undefined ? { lane } : {}),
    ...(order !== undefined ? { order } : {}),
  };
  response.json(await board.updateTask(currentUserId(response), groupId(request), taskId, input));
}

export async function deleteTask(request: Request, response: Response): Promise<void> {
  const taskId = readUuidParam(request.params.taskId, "taskId");
  response.json(await board.deleteTask(currentUserId(response), groupId(request), taskId));
}

function readNoteFields(body: JsonBody): Partial<board.NoteInput> {
  const text = readOptionalText(body, "text", { max: 280 });
  const x = readOptionalInt(body, "x", { min: 0, max: 4000 });
  const y = readOptionalInt(body, "y", { min: 0, max: 4000 });
  const color = readOptionalEnum(body, "color", board.NOTE_COLORS);
  return {
    ...(text !== undefined ? { text } : {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
    ...(color !== undefined ? { color } : {}),
  };
}

export async function listNotes(request: Request, response: Response): Promise<void> {
  response.json(await board.listNotes(currentUserId(response), groupId(request)));
}

export async function createNote(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["text", "x", "y", "color"]);
  const fields = readNoteFields(body);
  response.status(201).json(await board.createNote(currentUserId(response), groupId(request), { ...fields, text: required(fields.text, "text") }));
}

export async function updateNote(request: Request, response: Response): Promise<void> {
  const noteId = readUuidParam(request.params.noteId, "noteId");
  const body = readBody(request.body, ["text", "x", "y", "color"]);
  requireSomeField(body);
  response.json(await board.updateNote(currentUserId(response), groupId(request), noteId, readNoteFields(body)));
}

export async function deleteNote(request: Request, response: Response): Promise<void> {
  const noteId = readUuidParam(request.params.noteId, "noteId");
  response.json(await board.deleteNote(currentUserId(response), groupId(request), noteId));
}
