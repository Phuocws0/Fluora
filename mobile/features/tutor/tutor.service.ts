import { deleteJson, getJson, patchJson, postJson } from "../../services/api";
import type {
  ChatDetail,
  Scenario,
  TutorNote,
  TutorService,
  Chat,
} from "./tutor.types";
const id = encodeURIComponent;
export const tutorApi: TutorService = {
  scenarios: () => getJson<{ scenarios: Scenario[] }>("/tutor/role-plays"),
  chats: () => getJson<{ chats: Chat[] }>("/tutor/chats"),
  createChat: (scenarioId) =>
    postJson<{ chat: Chat }>("/tutor/chats", scenarioId ? { scenarioId } : {}),
  chat: (chatId) => getJson<ChatDetail>(`/tutor/chats/${id(chatId)}`),
  rename: (chatId, title) => patchJson(`/tutor/chats/${id(chatId)}`, { title }),
  setChatSaving: (chatId, saveHistory) =>
    patchJson(`/tutor/chats/${id(chatId)}`, { saveHistory }),
  send: (chatId, message, context) =>
    postJson(`/tutor/chats/${id(chatId)}/messages`, {
      message,
      ...(context ? { context } : {}),
    }),
  editMessage: (chatId, messageId, message) =>
    patchJson(`/tutor/chats/${id(chatId)}/messages/${id(messageId)}`, {
      message,
    }),
  deleteMessage: (chatId, messageId) =>
    deleteJson(`/tutor/chats/${id(chatId)}/messages/${id(messageId)}`),
  deleteChat: (chatId) => deleteJson(`/tutor/chats/${id(chatId)}`),
  clearHistory: () => deleteJson("/tutor/chats"),
  notes: () => getJson<{ notes: TutorNote[] }>("/tutor/notes"),
  saveNote: (note) => postJson("/tutor/notes", note),
  editNote: (noteId, note) => patchJson(`/tutor/notes/${id(noteId)}`, note),
  deleteNote: (noteId) => deleteJson(`/tutor/notes/${id(noteId)}`),
  privacy: async () =>
    (
      await getJson<{ settings: { saveTutorHistory: boolean } }>(
        "/users/me/settings",
      )
    ).settings.saveTutorHistory,
  setPrivacy: (saveTutorHistory) =>
    patchJson("/users/me/settings", { saveTutorHistory }),
};
