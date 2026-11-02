import { prisma } from "../../db/prisma.js";
import { isMissingRecord } from "../../db/prisma-errors.js";
import { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import {
  DEFAULT_CHAT_TITLE,
  chatNotFound,
  chatSelect,
  loadChat,
  messageSelect,
  purgeExpiredChats,
  toChat,
  toMessage,
  type ChatRow,
} from "./chats.service.js";
import { assertContextAllowed, parseStoredContext, resolveContext, type ContextInput } from "./context.js";
import { askTutor, type TutorReply } from "./provider/provider.js";
import { findTurn, parseTurns, toPublicTurn, type RolePlayTurn } from "./role-play.js";

const HISTORY_LIMIT = 10;
const TITLE_LENGTH = 60;

function completedError(): HttpError {
  return new HttpError(409, "ROLE_PLAY_COMPLETED", "This role-play is finished. Start a new one to practise again.");
}

function turnChangedError(): HttpError {
  return new HttpError(409, "TURN_CHANGED", "The conversation moved on. Refresh the chat and try again.");
}

function chatTurns(chat: ChatRow): RolePlayTurn[] | null {
  return chat.scenario ? parseTurns(chat.scenario.turns) : null;
}

/** The previous messages of a chat, oldest first, for the provider. */
async function recentHistory(conversationId: string, before?: Date) {
  const rows = await prisma.tutorMessage.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, body: true },
  });
  return rows.reverse().map((row) => ({ role: row.role === "tutor" ? ("tutor" as const) : ("learner" as const), body: row.body }));
}

type TurnPlan = { turn: RolePlayTurn; nextTurnKey: string | null; completed: boolean };

/** Applies a provider's suggested choice. An unknown choice keeps the chat on the same turn. */
function planTurn(turn: RolePlayTurn, reply: TutorReply): TurnPlan {
  const choice = reply.choiceKey ? turn.choices.find((item) => item.key === reply.choiceKey) : undefined;
  if (!choice) return { turn, nextTurnKey: turn.key, completed: false };
  return { turn, nextTurnKey: choice.next, completed: choice.next === null };
}

function feedbackJson(reply: TutorReply) {
  return reply.feedback ? (reply.feedback as Prisma.InputJsonObject) : Prisma.DbNull;
}

function contextJson(context: ContextInput | null) {
  return context ? (context as Prisma.InputJsonObject) : Prisma.DbNull;
}

/** Runs a write transaction and turns "the chat disappeared meanwhile" into `404`. */
async function writeOrNotFound<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isMissingRecord(error)) throw chatNotFound();
    throw error;
  }
}

async function askForChat(chat: ChatRow, userId: string, message: string, context: ContextInput | null, before?: Date, answeredTurnKey?: string | null) {
  const turns = chatTurns(chat);
  const isTurnReply = chat.kind === "role_play" && !context;
  const turnKey = answeredTurnKey ?? chat.currentTurnKey;
  const turn = isTurnReply && turns && turnKey ? findTurn(turns, turnKey) : null;

  const [resolved, history] = await Promise.all([
    resolveContext(userId, { id: chat.id, turns }, context),
    recentHistory(chat.id, before),
  ]);
  const reply = await askTutor({
    mode: turn ? "role_play" : context?.kind === "explain" ? "explain" : "chat",
    message,
    history,
    context: resolved,
    rolePlay: turn && turns && chat.scenario ? { turn, turns, closingLine: chat.scenario.closingLine } : null,
  });
  return { reply, plan: turn ? planTurn(turn, reply) : null, turns };
}

function nextTurnOf(plan: TurnPlan | null, turns: RolePlayTurn[] | null) {
  if (!plan || plan.completed || !plan.nextTurnKey || !turns) return null;
  return toPublicTurn(findTurn(turns, plan.nextTurnKey));
}

/** Data written to the chat row after a role-play turn is graded. */
function turnUpdate(plan: TurnPlan) {
  return plan.completed ? { currentTurnKey: null, status: "completed" } : { currentTurnKey: plan.nextTurnKey, status: "active" };
}

export async function sendMessage(userId: string, chatId: string, input: { message: string; context: ContextInput | null }) {
  await purgeExpiredChats(userId);
  const chat = await loadChat(userId, chatId);
  assertContextAllowed(chat.kind, input.context);
  if (chat.kind === "role_play" && !input.context && chat.status !== "active") throw completedError();

  // The provider is called before any write, so a failure stores nothing.
  const { reply, plan, turns } = await askForChat(chat, userId, input.message, input.context);

  const now = Date.now();
  const result = await writeOrNotFound(() =>
    prisma.$transaction(async (tx) => {
      const isFirstMessage = chat.kind === "chat" && chat._count.messages === 0 && chat.title === DEFAULT_CHAT_TITLE;
      const updated = await tx.tutorConversation.updateMany({
        where: plan ? { id: chat.id, userId, currentTurnKey: plan.turn.key, status: "active" } : { id: chat.id, userId },
        data: {
          lastActivityAt: new Date(now),
          ...(plan ? turnUpdate(plan) : {}),
          ...(isFirstMessage ? { title: input.message.slice(0, TITLE_LENGTH) } : {}),
        },
      });
      if (updated.count === 0) throw plan ? turnChangedError() : chatNotFound();

      // Explicit, increasing timestamps keep the learner message before its reply in every list.
      const userMessage = await tx.tutorMessage.create({
        data: {
          conversationId: chat.id,
          role: "learner",
          body: input.message,
          context: contextJson(input.context),
          turnKey: plan?.turn.key ?? null,
          createdAt: new Date(now),
        },
        select: messageSelect,
      });
      const tutorMessage = await tx.tutorMessage.create({
        data: {
          conversationId: chat.id,
          role: "tutor",
          body: reply.body,
          feedback: feedbackJson(reply),
          turnKey: plan ? (plan.nextTurnKey ?? plan.turn.key) : null,
          replyToId: userMessage.id,
          createdAt: new Date(now + 1),
        },
        select: messageSelect,
      });
      const chatRow = await tx.tutorConversation.findUniqueOrThrow({ where: { id: chat.id }, select: chatSelect });
      return { userMessage, tutorMessage, chatRow };
    }),
  );

  return {
    userMessage: toMessage(result.userMessage),
    tutorMessage: toMessage(result.tutorMessage),
    feedback: reply.feedback,
    nextTurn: nextTurnOf(plan, turns),
    chat: toChat(result.chatRow),
  };
}

/** Loads a learner message for edit/delete and enforces the linked-reply and role-play rules. */
async function loadEditableMessage(chat: ChatRow, messageId: string) {
  const message = await prisma.tutorMessage.findFirst({
    where: { id: messageId, conversationId: chat.id },
    select: { id: true, role: true, context: true, turnKey: true, createdAt: true, reply: { select: { id: true } } },
  });
  if (!message) throw new HttpError(404, "NOT_FOUND", "Message not found.");
  if (message.role !== "learner") {
    throw new HttpError(403, "LEARNER_MESSAGES_ONLY", "Only your own messages can be edited or deleted; Flo's replies follow them.");
  }

  if (chat.kind === "role_play") {
    const latest = await prisma.tutorMessage.findFirst({
      where: { conversationId: chat.id, role: "learner" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest?.id !== message.id) {
      throw new HttpError(409, "NOT_LATEST_TURN", "In a role-play, only your latest reply can be changed.");
    }
  }
  return message;
}

export async function updateMessage(userId: string, chatId: string, messageId: string, input: { message: string }) {
  await purgeExpiredChats(userId);
  const chat = await loadChat(userId, chatId);
  const message = await loadEditableMessage(chat, messageId);
  const context = parseStoredContext(message.context);

  const { reply, plan, turns } = await askForChat(chat, userId, input.message, context, message.createdAt, message.turnKey);

  const now = new Date();
  const result = await writeOrNotFound(() =>
    prisma.$transaction(async (tx) => {
      // The chat must still be where this latest reply left it.
      const updated = await tx.tutorConversation.updateMany({
        where: plan ? { id: chat.id, userId, currentTurnKey: chat.currentTurnKey, status: chat.status } : { id: chat.id, userId },
        data: { lastActivityAt: now, ...(plan ? turnUpdate(plan) : {}) },
      });
      if (updated.count === 0) throw plan ? turnChangedError() : chatNotFound();

      const userMessage = await tx.tutorMessage.update({
        where: { id: message.id },
        data: { body: input.message, editedAt: now },
        select: messageSelect,
      });
      const replyData = {
        body: reply.body,
        feedback: feedbackJson(reply),
        turnKey: plan ? (plan.nextTurnKey ?? plan.turn.key) : null,
      };
      const tutorMessage = message.reply
        ? await tx.tutorMessage.update({ where: { id: message.reply.id }, data: replyData, select: messageSelect })
        : await tx.tutorMessage.create({
            data: { ...replyData, conversationId: chat.id, role: "tutor", replyToId: message.id, createdAt: new Date(message.createdAt.getTime() + 1) },
            select: messageSelect,
          });
      const chatRow = await tx.tutorConversation.findUniqueOrThrow({ where: { id: chat.id }, select: chatSelect });
      return { userMessage, tutorMessage, chatRow };
    }),
  );

  return {
    userMessage: toMessage(result.userMessage),
    tutorMessage: toMessage(result.tutorMessage),
    feedback: reply.feedback,
    nextTurn: nextTurnOf(plan, turns),
    chat: toChat(result.chatRow),
  };
}

export async function deleteMessage(userId: string, chatId: string, messageId: string) {
  await purgeExpiredChats(userId);
  const chat = await loadChat(userId, chatId);
  const message = await loadEditableMessage(chat, messageId);

  await writeOrNotFound(() =>
    prisma.$transaction(async (tx) => {
      // Deleting the learner message cascades to its linked tutor reply.
      await tx.tutorMessage.delete({ where: { id: message.id } });
      const rewind = chat.kind === "role_play" && message.turnKey;
      const updated = await tx.tutorConversation.updateMany({
        where: rewind ? { id: chat.id, userId, currentTurnKey: chat.currentTurnKey, status: chat.status } : { id: chat.id, userId },
        data: { lastActivityAt: new Date(), ...(rewind ? { currentTurnKey: message.turnKey, status: "active" } : {}) },
      });
      if (updated.count === 0) throw rewind ? turnChangedError() : chatNotFound();
    }),
  );
  return { deleted: true };
}

export async function getHint(userId: string, chatId: string, step: number) {
  await purgeExpiredChats(userId);
  const chat = await loadChat(userId, chatId);
  const turns = chatTurns(chat);
  if (chat.kind !== "role_play" || !turns) {
    throw new HttpError(409, "NOT_ROLE_PLAY", "Hints here are for role-plays. Use the lesson hint button for exercises.");
  }
  if (chat.status !== "active" || !chat.currentTurnKey) throw completedError();
  const turn = findTurn(turns, chat.currentTurnKey);
  return { step, text: turn.hints[step - 1], lastStep: step === turn.hints.length };
}
