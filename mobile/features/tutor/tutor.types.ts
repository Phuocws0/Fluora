// Provisional UI response types for planned backend #32. See docs/TIEN_HANDOFF.md.
export type RoleChoice = { id: string; label: string; branchId: string };
export type Turn = {
  id: string;
  branchId: string;
  prompt: string;
  choices: RoleChoice[];
  completed?: boolean;
};
export type Scenario = { id: string; title: string; description: string };
export type Feedback = {
  summary: string;
  explanation?: string;
  hints?: string[];
};
export type TutorMessage = {
  id: string;
  role: "user" | "tutor";
  content: string;
  createdAt: string;
  replyToId?: string;
  feedback?: Feedback;
};
export type Chat = {
  id: string;
  title: string;
  scenarioId?: string;
  saveHistory: boolean;
  nextTurn?: Turn | null;
};
export type TutorNote = {
  id: string;
  chatId?: string;
  phrase: string;
  pattern: string;
  personalExample?: string;
};
export type MessageContext = {
  topic?: string;
  turnId?: string;
  branchId?: string;
  choiceId?: string;
};
export type ChatDetail = { chat: Chat; messages: TutorMessage[] };
export type SendResult = {
  userMessage: TutorMessage;
  tutorMessage: TutorMessage;
  feedback?: Feedback;
  nextTurn?: Turn | null;
};
export interface TutorService {
  scenarios(): Promise<{ scenarios: Scenario[] }>;
  chats(): Promise<{ chats: Chat[] }>;
  createChat(scenarioId?: string): Promise<{ chat: Chat }>;
  chat(chatId: string): Promise<ChatDetail>;
  rename(chatId: string, title: string): Promise<unknown>;
  setChatSaving(chatId: string, saveHistory: boolean): Promise<unknown>;
  send(
    chatId: string,
    message: string,
    context?: MessageContext,
  ): Promise<SendResult>;
  editMessage(
    chatId: string,
    messageId: string,
    message: string,
  ): Promise<SendResult>;
  deleteMessage(chatId: string, messageId: string): Promise<unknown>;
  deleteChat(chatId: string): Promise<unknown>;
  clearHistory(): Promise<unknown>;
  notes(): Promise<{ notes: TutorNote[] }>;
  saveNote(note: Omit<TutorNote, "id">): Promise<unknown>;
  editNote(noteId: string, note: Omit<TutorNote, "id">): Promise<unknown>;
  deleteNote(noteId: string): Promise<unknown>;
  privacy(): Promise<boolean>;
  setPrivacy(saveTutorHistory: boolean): Promise<unknown>;
}
