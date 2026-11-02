import type {
  ChatDetail,
  MessageContext,
  SendResult,
  TutorNote,
  TutorService,
  Turn,
} from "./tutor.types";
// Explicit, in-memory UI preview. No network, no AI, no device persistence, no account data.
export function createTutorPreview(): TutorService {
  let serial = 0;
  let saveHistory = true;
  const turnSnapshots = new Map<string, Turn | null>();
  const chats = new Map<string, ChatDetail>();
  const notes = new Map<string, TutorNote>();
  const uid = () => `preview-${++serial}`;
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const find = (chatId: string) => {
    const chat = chats.get(chatId);
    if (!chat) throw new Error("Preview chat no longer exists.");
    return chat;
  };
  const turn = (step: number, branchId = "start"): Turn =>
    step === 0
      ? {
          id: "order",
          branchId,
          prompt: "Welcome! What would you like to order?",
          choices: [
            {
              id: "coffee",
              label: "I'd like a coffee, please.",
              branchId: "coffee",
            },
            {
              id: "tea",
              label: "Could I have a tea, please?",
              branchId: "tea",
            },
          ],
        }
      : step === 1
        ? {
            id: "size",
            branchId,
            prompt: `A ${branchId}, of course. Which size would you like?`,
            choices: [
              { id: "small", label: "A small one, please.", branchId },
              { id: "large", label: "A large one, please.", branchId },
            ],
          }
        : {
            id: "done",
            branchId,
            prompt: "Thank you! Your order is ready.",
            choices: [],
            completed: true,
          };
  const send = async (
    chatId: string,
    content: string,
    context?: MessageContext,
  ): Promise<SendResult> => {
    const d = find(chatId);
    const active = d.chat.nextTurn;
    if (d.chat.scenarioId && active?.completed)
      throw new Error(
        "This preview role-play is complete. Start a new conversation.",
      );
    if (
      active &&
      (context?.turnId !== active.id || context?.branchId !== active.branchId)
    )
      throw new Error("This turn changed. Reopen the chat and try again.");
    const choice = active?.choices.find((c) => c.id === context?.choiceId);
    if (context?.choiceId && !choice)
      throw new Error("Choose an available response.");
    const nextTurn = active
      ? turn(
          active.id === "order" ? 1 : 2,
          choice?.branchId ??
            (active.id === "order"
              ? content.toLowerCase().includes("tea")
                ? "tea"
                : "coffee"
              : active.branchId),
        )
      : null;
    const userMessage = {
      id: uid(),
      role: "user" as const,
      content,
      createdAt: new Date().toISOString(),
    };
    const feedback = {
      summary:
        "Preview feedback: a polite request is a useful conversation pattern.",
      explanation:
        "This is a fixed UI example, not an assessment of your answer. 'I'd like…' and 'Could I have…' are sample polite requests.",
      hints: [
        "Start with a polite request.",
        "Try: I'd like…",
        "Example: I'd like a coffee, please.",
      ],
    };
    const tutorMessage = {
      id: uid(),
      role: "tutor" as const,
      content:
        nextTurn?.prompt ??
        "Preview response: try using 'I'd like…' in your own example. Live answers require the Tutor backend.",
      createdAt: new Date().toISOString(),
      replyToId: userMessage.id,
      feedback,
    };
    turnSnapshots.set(userMessage.id, active ? clone(active) : null);
    d.messages.push(userMessage, tutorMessage);
    d.chat.nextTurn = nextTurn;
    return clone({ userMessage, tutorMessage, feedback, nextTurn });
  };
  return {
    scenarios: async () => ({
      scenarios: [
        {
          id: "cafe",
          title: "At the café",
          description: "A short branching role-play with coffee and tea paths.",
        },
      ],
    }),
    chats: async () => ({
      chats: clone(
        [...chats.values()]
          .filter((d) => d.chat.saveHistory)
          .map((d) => d.chat),
      ),
    }),
    createChat: async (scenarioId) => {
      const chat = {
        id: uid(),
        title: scenarioId ? "At the café" : "A conversation with Flo",
        saveHistory,
        ...(scenarioId ? { scenarioId, nextTurn: turn(0) } : {}),
      };
      chats.set(chat.id, { chat, messages: [] });
      return { chat: clone(chat) };
    },
    chat: async (chatId) => clone(find(chatId)),
    rename: async (chatId, title) => {
      find(chatId).chat.title = title;
    },
    setChatSaving: async (chatId, value) => {
      if (value && !saveHistory)
        throw new Error(
          "Enable future chat history before saving this conversation.",
        );
      find(chatId).chat.saveHistory = value;
    },
    send,
    editMessage: async (chatId, messageId, content) => {
      const d = find(chatId);
      const index = d.messages.findIndex(
        (m) => m.id === messageId && m.role === "user",
      );
      if (index < 0) throw new Error("Only your messages can be edited.");
      // Invalidate later turns and responses together; never retain a stale branch after an edit.
      const previousTurn = turnSnapshots.get(messageId);
      d.messages.splice(index);
      if (d.chat.scenarioId)
        d.chat.nextTurn = previousTurn ? clone(previousTurn) : turn(0);
      const current = d.chat.nextTurn;
      return send(
        chatId,
        content,
        current
          ? { turnId: current.id, branchId: current.branchId }
          : undefined,
      );
    },
    deleteMessage: async (chatId, messageId) => {
      const d = find(chatId);
      const index = d.messages.findIndex(
        (m) => m.id === messageId && m.role === "user",
      );
      if (index < 0) throw new Error("Only your messages can be deleted.");
      const previousTurn = turnSnapshots.get(messageId);
      d.messages.splice(index);
      if (d.chat.scenarioId)
        d.chat.nextTurn = previousTurn ? clone(previousTurn) : turn(0);
    },
    deleteChat: async (chatId) => {
      chats.delete(chatId);
    },
    clearHistory: async () => {
      chats.clear();
    },
    notes: async () => ({ notes: clone([...notes.values()]) }),
    saveNote: async (note) => {
      const noteId = uid();
      notes.set(noteId, { ...note, id: noteId });
    },
    editNote: async (noteId, note) => {
      if (!notes.has(noteId)) throw new Error("Note not found.");
      notes.set(noteId, { ...note, id: noteId });
    },
    deleteNote: async (noteId) => {
      notes.delete(noteId);
    },
    privacy: async () => saveHistory,
    setPrivacy: async (value) => {
      saveHistory = value;
    },
  };
}
