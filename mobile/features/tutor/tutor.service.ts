import { deleteJson, getJson, patchJson, postJson } from "../../services/api";
import type {
  Chat,
  ChatDetail,
  Feedback,
  Scenario,
  SendResult,
  TutorMessage,
  TutorNote,
  TutorService,
  Turn,
} from "./tutor.types";

type ApiTurn = {
  key: string;
  tutorLine: string;
  choices: Array<{ key: string; label: string }>;
};

type ApiChat = {
  id: string;
  title: string;
  saved: boolean;
  status: "active" | "completed";
  scenario: { id: string } | null;
  currentTurn: ApiTurn | null;
};

type ApiFeedback = {
  verdict: "correct" | "almost" | "try_again";
  correction: string | null;
  explanation: string;
};

type ApiMessage = {
  id: string;
  role: "learner" | "tutor";
  body: string;
  replyToId: string | null;
  feedback: ApiFeedback | null;
  createdAt: string;
};

type ApiNote = {
  id: string;
  chatId: string | null;
  messageId: string | null;
  phrase: string;
  pattern: string;
  personalExample: string | null;
};

type ApiChatDetail = { chat: ApiChat; messages: ApiMessage[] };

type ApiSendResult = {
  chat: ApiChat;
  userMessage: ApiMessage;
  tutorMessage: ApiMessage;
  feedback: ApiFeedback | null;
};

const id = encodeURIComponent;

function mapTurn(turn: ApiTurn): Turn {
  return {
    id: turn.key,
    branchId: turn.key,
    prompt: turn.tutorLine,
    choices: turn.choices.map((choice) => ({
      id: choice.key,
      label: choice.label,
      branchId: choice.key,
    })),
  };
}

function mapChat(chat: ApiChat): Chat {
  const scenarioId = chat.scenario?.id;
  const nextTurn = chat.currentTurn
    ? mapTurn(chat.currentTurn)
    : scenarioId && chat.status === "completed"
      ? { id: "completed", branchId: "completed", prompt: "", choices: [], completed: true }
      : undefined;
  return {
    id: chat.id,
    title: chat.title,
    ...(scenarioId ? { scenarioId } : {}),
    saveHistory: chat.saved,
    ...(nextTurn ? { nextTurn } : {}),
  };
}

function mapFeedback(feedback: ApiFeedback | null): Feedback | undefined {
  if (!feedback) return undefined;
  const summary =
    feedback.verdict === "correct"
      ? "That's correct."
      : feedback.verdict === "almost"
        ? "Almost there."
        : "Try again.";
  return {
    summary: feedback.correction ? `${summary} ${feedback.correction}` : summary,
    explanation: feedback.explanation,
  };
}

function mapMessage(message: ApiMessage): TutorMessage {
  return {
    id: message.id,
    role: message.role === "learner" ? "user" : "tutor",
    content: message.body,
    createdAt: message.createdAt,
    ...(message.replyToId ? { replyToId: message.replyToId } : {}),
    ...(message.feedback ? { feedback: mapFeedback(message.feedback) } : {}),
  };
}

function mapChatDetail(result: ApiChatDetail): ChatDetail {
  const chat = mapChat(result.chat);
  const messages = result.messages.map(mapMessage).reverse();
  const latestLearnerMessageId = [...messages].reverse().find((message) => message.role === "user")?.id;
  return {
    chat,
    messages: messages.map((message) =>
      message.role === "user" && chat.scenarioId
        ? { ...message, canEdit: message.id === latestLearnerMessageId, canDelete: message.id === latestLearnerMessageId }
        : message,
    ),
  };
}

function mapNote(note: ApiNote): TutorNote {
  return {
    id: note.id,
    chatId: note.chatId,
    messageId: note.messageId,
    phrase: note.phrase,
    pattern: note.pattern,
    personalExample: note.personalExample ?? undefined,
  };
}

function mapSendResult(result: ApiSendResult): SendResult {
  const turn = result.chat.currentTurn
    ? mapTurn(result.chat.currentTurn)
    : result.chat.scenario && result.chat.status === "completed"
      ? { id: "completed", branchId: "completed", prompt: "", choices: [], completed: true }
      : null;
  return {
    userMessage: mapMessage(result.userMessage),
    tutorMessage: mapMessage(result.tutorMessage),
    feedback: mapFeedback(result.feedback),
    nextTurn: turn,
    chat: mapChat(result.chat),
  };
}

export const tutorApi: TutorService = {
  scenarios: async () => {
    const result = await getJson<{ scenarios: Scenario[] }>("/tutor/role-plays");
    return result;
  },
  chats: async () => {
    const result = await getJson<{ chats: ApiChat[] }>("/tutor/chats?limit=50");
    return { chats: result.chats.map(mapChat) };
  },
  createChat: async (scenarioId) => {
    const result = await postJson<{ chat: ApiChat }>("/tutor/chats", scenarioId ? { scenarioId } : {});
    return { chat: mapChat(result.chat) };
  },
  chat: async (chatId): Promise<ChatDetail> => {
    const result = await getJson<ApiChatDetail>(`/tutor/chats/${id(chatId)}?limit=50`);
    return mapChatDetail(result);
  },
  rename: (chatId, title) => patchJson(`/tutor/chats/${id(chatId)}`, { title }),
  setChatSaving: (chatId, saveHistory) =>
    patchJson(`/tutor/chats/${id(chatId)}`, { saved: saveHistory }),
  hint: (chatId, step) =>
    getJson<{ step: number; text: string; lastStep: boolean }>(
      `/tutor/chats/${id(chatId)}/hints?step=${step}`,
    ),
  send: async (chatId, message, context) => {
    const topic = context?.topic?.trim();
    const prefixLength = "Context: \n\n".length;
    const availableTopicLength = Math.max(0, 1000 - message.length - prefixLength);
    const content = topic && !context?.turnId && availableTopicLength > 0
      ? `Context: ${topic.slice(0, availableTopicLength)}\n\n${message}`
      : message;
    const result = await postJson<ApiSendResult>(`/tutor/chats/${id(chatId)}/messages`, { message: content });
    return mapSendResult(result);
  },
  editMessage: async (chatId, messageId, message) => {
    const result = await patchJson<ApiSendResult>(
      `/tutor/chats/${id(chatId)}/messages/${id(messageId)}`,
      { message },
    );
    return mapSendResult(result);
  },
  deleteMessage: (chatId, messageId) =>
    deleteJson(`/tutor/chats/${id(chatId)}/messages/${id(messageId)}`),
  deleteChat: (chatId) => deleteJson(`/tutor/chats/${id(chatId)}`),
  clearHistory: () => deleteJson("/tutor/chats", { confirm: true }),
  notes: async () => {
    const result = await getJson<{ notes: ApiNote[] }>("/tutor/notes?limit=50");
    return { notes: result.notes.map(mapNote) };
  },
  saveNote: (note) => postJson("/tutor/notes", note),
  editNote: (noteId, note) => {
    const { phrase, pattern, personalExample } = note;
    return patchJson(`/tutor/notes/${id(noteId)}`, { phrase, pattern, personalExample });
  },
  deleteNote: (noteId) => deleteJson(`/tutor/notes/${id(noteId)}`),
  privacy: async () =>
    (await getJson<{ settings: { saveTutorHistory: boolean } }>("/users/me/settings")).settings.saveTutorHistory,
  setPrivacy: (saveTutorHistory) => patchJson("/users/me/settings", { saveTutorHistory }),
};
