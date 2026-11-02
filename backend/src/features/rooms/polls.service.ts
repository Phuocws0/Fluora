import { prisma } from "../../db/prisma.js";
import { isUniqueViolation } from "../../db/prisma-errors.js";
import { HttpError } from "../../http/errors.js";
import { assertRoomOpen, loadRoomForMember, requireHost } from "../groups/access.js";

export type PollInput = { question: string; choices: string[] };
export type PollUpdate = { question?: string; choices?: string[]; closed?: true };

async function pollViews(roomId: string, userId: string, pollId?: string) {
  const polls = await prisma.poll.findMany({
    where: { roomId, ...(pollId ? { id: pollId } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      question: true,
      closedAt: true,
      createdAt: true,
      choices: { orderBy: { order: "asc" }, select: { id: true, label: true, _count: { select: { votes: true } } } },
      votes: { where: { userId }, select: { choiceId: true } },
    },
  });
  return polls.map(({ choices, votes, closedAt, ...poll }) => {
    const counted = choices.map(({ _count, ...choice }) => ({ ...choice, voteCount: _count.votes }));
    return {
      ...poll,
      closed: closedAt !== null,
      closedAt,
      choices: counted,
      totalVotes: counted.reduce((sum, choice) => sum + choice.voteCount, 0),
      myChoiceId: votes[0]?.choiceId ?? null,
    };
  });
}

async function findPoll(roomId: string, pollId: string) {
  const poll = await prisma.poll.findFirst({ where: { id: pollId, roomId }, select: { id: true, closedAt: true, _count: { select: { votes: true } } } });
  if (!poll) throw new HttpError(404, "NOT_FOUND", "Poll not found.");
  return poll;
}

function assertChoicesUnique(choices: string[]): void {
  const normalized = choices.map((choice) => choice.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new HttpError(400, "VALIDATION_ERROR", "Poll choices must be unique.");
}

export async function listPolls(userId: string, roomId: string) {
  await loadRoomForMember(roomId, userId);
  return { polls: await pollViews(roomId, userId) };
}

export async function createPoll(userId: string, roomId: string, input: PollInput) {
  const access = await loadRoomForMember(roomId, userId);
  requireHost(access);
  assertRoomOpen(access.room);
  assertChoicesUnique(input.choices);
  const poll = await prisma.poll.create({
    data: { roomId, question: input.question, choices: { create: input.choices.map((label, order) => ({ label, order })) } },
    select: { id: true },
  });
  const [view] = await pollViews(roomId, userId, poll.id);
  return { poll: view };
}

/** Choices can be replaced only while the poll has no votes; closing is one-way. */
export async function updatePoll(userId: string, roomId: string, pollId: string, input: PollUpdate) {
  requireHost(await loadRoomForMember(roomId, userId));
  const poll = await findPoll(roomId, pollId);
  if (input.choices) {
    if (poll._count.votes > 0) throw new HttpError(409, "POLL_HAS_VOTES", "Choices can't change after votes are cast.");
    assertChoicesUnique(input.choices);
  }

  await prisma.$transaction(async (tx) => {
    if (input.choices) {
      await tx.pollChoice.deleteMany({ where: { pollId } });
      await tx.pollChoice.createMany({ data: input.choices.map((label, order) => ({ pollId, label, order })) });
    }
    await tx.poll.update({
      where: { id: pollId },
      data: { ...(input.question ? { question: input.question } : {}), ...(input.closed && !poll.closedAt ? { closedAt: new Date() } : {}) },
    });
  });
  const [view] = await pollViews(roomId, userId, pollId);
  return { poll: view };
}

export async function deletePoll(userId: string, roomId: string, pollId: string) {
  requireHost(await loadRoomForMember(roomId, userId));
  await findPoll(roomId, pollId);
  await prisma.poll.delete({ where: { id: pollId } });
  return { deleted: true };
}

async function openPollForVoting(userId: string, roomId: string, pollId: string) {
  const access = await loadRoomForMember(roomId, userId);
  const poll = await findPoll(roomId, pollId);
  if (poll.closedAt || access.room.closedAt) throw new HttpError(409, "POLL_CLOSED", "This poll is closed.");
}

async function assertChoice(pollId: string, choiceId: string) {
  const choice = await prisma.pollChoice.findFirst({ where: { id: choiceId, pollId }, select: { id: true } });
  if (!choice) throw new HttpError(400, "VALIDATION_ERROR", "choiceId must be one of this poll's choices.");
}

async function voteResult(roomId: string, userId: string, pollId: string) {
  const [view] = await pollViews(roomId, userId, pollId);
  const selected = view?.choices.find((choice) => choice.id === view.myChoiceId) ?? null;
  return { voteCount: view?.totalVotes ?? 0, selectedChoice: selected ? { id: selected.id, label: selected.label } : null };
}

export async function vote(userId: string, roomId: string, pollId: string, choiceId: string) {
  await openPollForVoting(userId, roomId, pollId);
  await assertChoice(pollId, choiceId);
  try {
    await prisma.pollVote.create({ data: { pollId, choiceId, userId } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "ALREADY_VOTED", "You already voted; change your vote instead.");
    throw error;
  }
  return voteResult(roomId, userId, pollId);
}

export async function changeVote(userId: string, roomId: string, pollId: string, choiceId: string) {
  await openPollForVoting(userId, roomId, pollId);
  await assertChoice(pollId, choiceId);
  const result = await prisma.pollVote.updateMany({ where: { pollId, userId }, data: { choiceId } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "You haven't voted in this poll.");
  return voteResult(roomId, userId, pollId);
}

export async function withdrawVote(userId: string, roomId: string, pollId: string) {
  await openPollForVoting(userId, roomId, pollId);
  const result = await prisma.pollVote.deleteMany({ where: { pollId, userId } });
  if (result.count === 0) throw new HttpError(404, "NOT_FOUND", "You haven't voted in this poll.");
  return { deleted: true };
}
