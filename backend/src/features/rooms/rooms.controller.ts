import type { Request, Response } from "express";
import { currentUserId } from "../../http/auth.js";
import { readPageQuery } from "../../http/pagination.js";
import {
  readBody,
  readNullableDate,
  readNullableText,
  readOptionalBoolean,
  readOptionalText,
  readQueryText,
  readText,
  readUuidParam,
  requireSomeField,
  validationError,
  type JsonBody,
} from "../../http/validation.js";
import * as peerReview from "./peer-review.service.js";
import * as polls from "./polls.service.js";
import * as rooms from "./rooms.service.js";

function roomId(request: Request): string {
  return readUuidParam(request.params.roomId, "roomId");
}

function readClosed(body: JsonBody): true | undefined {
  const closed = readOptionalBoolean(body, "closed");
  if (closed === false) throw validationError("closed can only be set to true; closing can't be undone.");
  return closed;
}

function readRoomFields(body: JsonBody): rooms.RoomInput {
  const name = readOptionalText(body, "name", { max: 60 });
  const focus = readNullableText(body, "focus", 120);
  const startsAt = readNullableDate(body, "startsAt");
  return {
    ...(name !== undefined ? { name } : {}),
    ...(focus !== undefined ? { focus } : {}),
    ...(startsAt !== undefined ? { startsAt } : {}),
  };
}

function readChoices(body: JsonBody): string[] | undefined {
  const value = body.choices;
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) throw validationError("choices must list 2 to 6 options.");
  return value.map((choice) => readText({ choice }, "choice", { max: 80 }));
}

// ---------- Rooms ----------

export async function createRoom(request: Request, response: Response): Promise<void> {
  const groupId = readUuidParam(request.params.groupId, "groupId");
  const body = readBody(request.body ?? {}, ["name", "focus", "startsAt"]);
  response.status(201).json(await rooms.createRoom(currentUserId(response), groupId, readRoomFields(body)));
}

export async function getRoom(request: Request, response: Response): Promise<void> {
  response.json(await rooms.getRoom(currentUserId(response), roomId(request)));
}

export async function updateRoom(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["name", "focus", "startsAt", "closed"]);
  requireSomeField(body);
  const closed = readClosed(body);
  response.json(await rooms.updateRoom(currentUserId(response), roomId(request), { ...readRoomFields(body), ...(closed ? { closed } : {}) }));
}

export async function deleteRoom(request: Request, response: Response): Promise<void> {
  response.json(await rooms.deleteRoom(currentUserId(response), roomId(request)));
}

export async function joinRoom(request: Request, response: Response): Promise<void> {
  response.status(201).json(await rooms.joinRoom(currentUserId(response), roomId(request)));
}

export async function leaveRoom(request: Request, response: Response): Promise<void> {
  response.json(await rooms.leaveRoom(currentUserId(response), roomId(request)));
}

export async function listMessages(request: Request, response: Response): Promise<void> {
  response.json(await rooms.listMessages(currentUserId(response), roomId(request), readPageQuery(request.query)));
}

export async function sendMessage(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["body", "replyToId"]);
  const text = readText(body, "body", { max: 1000 });
  const replyToId = body.replyToId === undefined || body.replyToId === null ? undefined : readUuidParam(body.replyToId, "replyToId");
  response.status(201).json(await rooms.sendMessage(currentUserId(response), roomId(request), { body: text, ...(replyToId ? { replyToId } : {}) }));
}

export async function updateMessage(request: Request, response: Response): Promise<void> {
  const messageId = readUuidParam(request.params.messageId, "messageId");
  const text = readText(readBody(request.body, ["body"]), "body", { max: 1000 });
  response.json(await rooms.updateMessage(currentUserId(response), roomId(request), messageId, text));
}

export async function deleteMessage(request: Request, response: Response): Promise<void> {
  const messageId = readUuidParam(request.params.messageId, "messageId");
  response.json(await rooms.deleteMessage(currentUserId(response), roomId(request), messageId));
}

// ---------- Polls ----------

function pollId(request: Request): string {
  return readUuidParam(request.params.pollId, "pollId");
}

function readChoiceId(request: Request): string {
  return readUuidParam(readBody(request.body, ["choiceId"]).choiceId, "choiceId");
}

export async function listPolls(request: Request, response: Response): Promise<void> {
  response.json(await polls.listPolls(currentUserId(response), roomId(request)));
}

export async function createPoll(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["question", "choices"]);
  const question = readText(body, "question", { min: 3, max: 200 });
  const choices = readChoices(body);
  if (!choices) throw validationError("choices is required.");
  response.status(201).json(await polls.createPoll(currentUserId(response), roomId(request), { question, choices }));
}

export async function updatePoll(request: Request, response: Response): Promise<void> {
  const body = readBody(request.body, ["question", "choices", "closed"]);
  requireSomeField(body);
  const question = readOptionalText(body, "question", { min: 3, max: 200 });
  const choices = readChoices(body);
  const closed = readClosed(body);
  const input: polls.PollUpdate = {
    ...(question !== undefined ? { question } : {}),
    ...(choices !== undefined ? { choices } : {}),
    ...(closed ? { closed } : {}),
  };
  response.json(await polls.updatePoll(currentUserId(response), roomId(request), pollId(request), input));
}

export async function deletePoll(request: Request, response: Response): Promise<void> {
  response.json(await polls.deletePoll(currentUserId(response), roomId(request), pollId(request)));
}

export async function vote(request: Request, response: Response): Promise<void> {
  response.status(201).json(await polls.vote(currentUserId(response), roomId(request), pollId(request), readChoiceId(request)));
}

export async function changeVote(request: Request, response: Response): Promise<void> {
  response.json(await polls.changeVote(currentUserId(response), roomId(request), pollId(request), readChoiceId(request)));
}

export async function withdrawVote(request: Request, response: Response): Promise<void> {
  response.json(await polls.withdrawVote(currentUserId(response), roomId(request), pollId(request)));
}

// ---------- Peer review ----------

function submissionId(request: Request): string {
  return readUuidParam(request.params.submissionId, "submissionId");
}

export async function getPeerReview(request: Request, response: Response): Promise<void> {
  const id = readQueryText(request.query, "submissionId", { max: 36 });
  response.json(await peerReview.getSubmission(currentUserId(response), id === undefined ? undefined : readUuidParam(id, "submissionId")));
}

export async function createReviewComment(request: Request, response: Response): Promise<void> {
  const text = readText(readBody(request.body, ["body"]), "body", { max: 1000 });
  response.status(201).json(await peerReview.createComment(currentUserId(response), submissionId(request), text));
}

export async function updateReviewComment(request: Request, response: Response): Promise<void> {
  const commentId = readUuidParam(request.params.commentId, "commentId");
  const text = readText(readBody(request.body, ["body"]), "body", { max: 1000 });
  response.json(await peerReview.updateComment(currentUserId(response), submissionId(request), commentId, text));
}

export async function deleteReviewComment(request: Request, response: Response): Promise<void> {
  const commentId = readUuidParam(request.params.commentId, "commentId");
  response.json(await peerReview.deleteComment(currentUserId(response), submissionId(request), commentId));
}
