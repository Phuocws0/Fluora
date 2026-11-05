import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Image, Keyboard, ScrollView, StyleSheet, Switch, View } from "react-native";
import { tutorApi } from "./tutor.service";
import { createTutorPreview } from "./tutor.preview";
import { useAuth } from "../auth/AuthContext";
import type {
  ChatDetail,
  RoleChoice,
  TutorMessage,
  TutorNote,
  TutorService,
} from "./tutor.types";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Editor,
  Empty,
  Heading,
  ResourceState,
  SessionGate,
  confirmAction,
  ui,
  useAction,
  useResource,
  type EditorSpec,
} from "../shared/feature-ui";
import { font, garden, GardenSubtitle, Page } from "../profile/garden-ui";
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n/i18n";

export default function TutorScreen() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"api" | "preview" | null>(null);
  const startTutor = () => setMode(isAuthenticated ? "api" : "preview");
  if (mode === "api")
    return (
      <SessionGate onCancel={() => setMode(null)}>
        {(user) => (
          <TutorWorkspace
            key={user.id}
            service={tutorApi}
            preview={false}
            exit={() => setMode(null)}
          />
        )}
      </SessionGate>
    );
  if (mode === "preview") return <TutorPreview exit={() => setMode(null)} />;
  return <Page title="Meet your AI tutor" back={false} eyebrow="YOUR PERSONAL SPACE" activeTab="Tutor" showFooter={false}
    action={{ label: "Chat with Flo", onPress: startTutor }}>
    <GardenSubtitle>Ask questions, practice conversations and learn from mistakes.</GardenSubtitle>
    <Image source={require("../../assets/fluora-flo-sprout.png")} style={styles.homeMascot} resizeMode="contain" accessibilityLabel="Flo, the Fluora garden mascot" />
    <Text style={styles.promptTitle}>What shall we grow today?</Text>
    <Pressable accessibilityRole="button" onPress={startTutor} style={styles.askCard}>
      <Text style={styles.askTitle}>Ask Flo anything…</Text>
      <Text style={styles.askDetail}>Grammar, words or a tricky sentence</Text>
    </Pressable>
    <View style={styles.quickActions}>
      <Pressable accessibilityRole="button" onPress={startTutor} style={[styles.quickCard, styles.quickBlue]}>
        <Text style={styles.quickTitle}>Practice a scene</Text><Text style={styles.quickDetail}>A café · A new friend</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={startTutor} style={styles.quickCard}>
        <Text style={styles.quickTitle}>Build a prompt</Text><Text style={styles.quickDetail}>Get a specific answer</Text>
      </Pressable>
    </View>
  </Page>;
}

const styles = StyleSheet.create({
  homeMascot: { alignSelf: "center", height: 122, marginVertical: 8, width: 128 },
  promptTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 17, lineHeight: 24, marginBottom: 22 },
  askCard: { backgroundColor: garden.mint, borderRadius: 18, minHeight: 86, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 12 },
  askTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  askDetail: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginTop: 4 },
  quickActions: { flexDirection: "row", gap: 12, marginTop: 18 },
  quickCard: { backgroundColor: "#ffffff", borderRadius: 18, flex: 1, minHeight: 103, justifyContent: "center", paddingHorizontal: 14 },
  quickBlue: { backgroundColor: garden.blue },
  quickTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  quickDetail: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginTop: 5 },
});
function TutorPreview({ exit }: { exit: () => void }) {
  const service = useMemo(() => createTutorPreview(), []);
  return <TutorWorkspace service={service} preview exit={exit} />;
}
function TutorWorkspace({
  service,
  preview,
  exit,
}: {
  service: TutorService;
  preview: boolean;
  exit: () => void;
}) {
  const chatScrollRef = useRef<ScrollView | null>(null);
  const messageFieldFocused = useRef(false);
  const [tab, setTab] = useState<"chat" | "history" | "notes">("chat");
  const [active, setActive] = useState<ChatDetail | null>(null);
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState("");
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const [hintSteps, setHintSteps] = useState<Record<string, number>>({});
  const [liveHints, setLiveHints] = useState<Record<string, string[]>>({});
  const a = useAction();
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      if (messageFieldFocused.current) {
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    return () => subscription.remove();
  }, []);
  const r = useResource(
    useCallback(async () => {
      const [scenarios, history, notes, privacy] = await Promise.all([
        service.scenarios(),
        service.chats(),
        service.notes(),
        service.privacy(),
      ]);
      return { ...scenarios, ...history, ...notes, privacy };
    }, [service]),
  );
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (a.busy) return true;
          if (active) {
            const close = () => {
              setActive(null);
              setMessage("");
            };
            if (message.trim())
              confirmAction(
                "Leave this draft?",
                "Your unsent text will be discarded.",
                close,
              );
            else close();
            return true;
          }
          return false;
        },
      );
      return () => subscription.remove();
    }, [active, a.busy, message]),
  );
  const start = (scenarioId?: string) =>
    void a.run(async () => {
      const { chat } = await service.createChat(scenarioId);
      setActive({ chat, messages: [] });
      setMessage("");
      setTopic("");
      setHintSteps({});
      setLiveHints({});
      setTab("chat");
      await r.refresh();
    }, "");
  const open = (chatId: string) =>
    void a.run(async () => {
      setActive(await service.chat(chatId));
      setMessage("");
      setTopic("");
      setHintSteps({});
      setLiveHints({});
      setTab("chat");
    }, "");
  const send = (choice?: RoleChoice) => {
    if (!active) return;
    const text = choice?.label ?? message.trim();
    if (!text) return;
    const current = active;
    void a.run(async () => {
      const turn = current.chat.nextTurn;
      const result = await service.send(current.chat.id, text, {
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        ...(turn ? { turnId: turn.id, branchId: turn.branchId } : {}),
        ...(choice ? { choiceId: choice.id } : {}),
      });
      const tutorMessage = {
        ...result.tutorMessage,
        feedback: result.tutorMessage.feedback ?? result.feedback,
      };
      const nextMessages = [...current.messages, result.userMessage, tutorMessage];
      const latestLearnerMessageId = [...nextMessages].reverse().find((item) => item.role === "user")?.id;
      setActive({
        chat: {
          ...current.chat,
          ...(result.chat
            ? {
                title: result.chat.title,
                saveHistory: result.chat.saveHistory,
                scenarioId: result.chat.scenarioId,
              }
            : {}),
          nextTurn: result.nextTurn ?? null,
        },
        messages: nextMessages.map((item) =>
          current.chat.scenarioId && item.role === "user"
            ? {
                ...item,
                canEdit: item.id === latestLearnerMessageId,
                canDelete: item.id === latestLearnerMessageId,
              }
            : item,
        ),
      });
      setHintSteps({});
      setLiveHints({});
      setMessage("");
      await r.refresh();
    }, "Reply received.");
  };
  const noteEditor = (note?: TutorNote, source?: TutorMessage) =>
    setEditor({
      title: note ? "Edit learning note" : "Save a learning note",
      fields: [
        {
          key: "phrase",
          label: "Phrase",
          value: note?.phrase ?? source?.content.slice(0, 120),
          max: 120,
          required: true,
          multiline: true,
        },
        {
          key: "pattern",
          label: "Pattern / meaning",
          value: note?.pattern,
          max: 200,
          required: true,
          multiline: true,
        },
        {
          key: "personalExample",
          label: "Your own example",
          value: note?.personalExample,
          max: 300,
          multiline: true,
        },
      ],
      save: async (v) => {
        const input = {
          phrase: v.phrase,
          pattern: v.pattern,
          personalExample: v.personalExample,
        };
        if (note) await service.editNote(note.id, input);
        else {
          const link = source && active?.chat.saveHistory
            ? { chatId: active.chat.id, messageId: source.id }
            : {};
          await service.saveNote({ ...input, ...link });
        }
        await r.refresh();
      },
    });
  const changeView = (next: typeof tab) => {
    if (message.trim())
      confirmAction(
        "Leave this draft?",
        "Your unsent text will be discarded.",
        () => {
          setMessage("");
          setTab(next);
        },
      );
    else setTab(next);
  };
  const leave = () =>
    confirmAction(
      preview ? "Exit interface preview?" : "Close Tutor?",
      preview
        ? "All preview chats and notes will disappear."
        : "Unsent text will be discarded. Saved chats remain subject to your privacy preference.",
      exit,
    );
  return (
    <Page title="Flo Tutor" back={false} showFooter={false} scrollRef={chatScrollRef}>
      {preview && <Text style={ui.error}>PREVIEW · These example chats are not saved to your account.</Text>}
      <View style={ui.row}>
        <Button label="Exit" disabled={a.busy} onPress={leave} />
        {(["chat", "history", "notes"] as const).map((t) => (
          <Button
            key={t}
            label={`${t === tab ? "✓ " : ""}${t}`}
            disabled={a.busy}
            onPress={() => changeView(t)}
          />
        ))}
        <Button
          label="Refresh"
          disabled={a.busy || r.loading}
          onPress={() =>
            void a.run(async () => {
              if (active) setActive(await service.chat(active.chat.id));
              await r.refresh();
            }, "")
          }
        />
      </View>
      <ActionState action={a} />
      <ResourceState resource={r} />
      {r.error && (
        <Card>
          <Heading>Tutor unavailable</Heading>
          <Copy>
            Flo is unavailable right now. You can continue ordinary lessons from
            Learn. Try again later
            {preview
              ? "."
              : ", or exit and explicitly choose interface preview."}
          </Copy>
        </Card>
      )}
      {r.data && (
        <>
          <View style={ui.row}>
            <Copy>Save future chat history</Copy>
            <Switch
              accessibilityLabel="Save future tutor history"
              value={r.data.privacy}
              disabled={a.busy}
              onValueChange={(value) =>
                void a.run(
                  async () => {
                    await service.setPrivacy(value);
                    await r.refresh();
                  },
                  value
                    ? "Future history saving enabled."
                    : "Future history saving disabled.",
                )
              }
            />
          </View>
          <Text style={ui.small}>
            This preference applies when starting new chats. Turning it off does
            not delete earlier saved chats. Use Clear history to remove them.{" "}
            {preview
              ? "Preview data disappears on exit regardless of this switch."
              : "Voice recordings remain on your device."}
          </Text>
          {tab === "chat" && (
            <>
              {active ? (
                <>
                  <Card>
                    <Heading translate={false}>{active.chat.title}</Heading>
                    <View style={ui.row}>
                      <Copy>Save this conversation</Copy>
                      <Switch
                        accessibilityLabel="Save this conversation"
                        value={active.chat.saveHistory}
                        disabled={
                          a.busy ||
                          (!active.chat.saveHistory && !r.data.privacy)
                        }
                        onValueChange={(value) => {
                          const update = () =>
                            void a.run(
                              async () => {
                                await service.setChatSaving(
                                  active.chat.id,
                                  value,
                                );
                                setActive({
                                  ...active,
                                  chat: { ...active.chat, saveHistory: value },
                                });
                                await r.refresh();
                              },
                              value
                                ? "Conversation saved."
                                : "Conversation removed from saved history.",
                            );
                          if (value) update();
                          else
                            confirmAction(
                              "Stop saving this conversation?",
                              "It will disappear from saved history. You can keep practicing while it remains open.",
                              update,
                            );
                        }}
                      />
                    </View>
                    <Copy>
                      {active.chat.saveHistory
                        ? "Saved history"
                        : "Not saved to history"}
                    </Copy>
                    <View style={ui.row}>
                      <Button
                        label="New conversation"
                        disabled={a.busy}
                        onPress={() =>
                          confirmAction(
                            "Close this conversation?",
                            active.chat.saveHistory
                              ? "You can reopen it from history. Unsent text will be discarded."
                              : "This conversation is not saved to history. Unsent text will be discarded.",
                            () => {
                              setActive(null);
                              setMessage("");
                            },
                          )
                        }
                      />
                      <Button
                        label="Rename"
                        disabled={a.busy}
                        onPress={() =>
                          setEditor({
                            title: "Rename chat",
                            fields: [
                              {
                                key: "title",
                                label: "Title",
                                value: active.chat.title,
                                required: true,
                                      max: 60,
                              },
                            ],
                            save: async (v) => {
                              await service.rename(active.chat.id, v.title);
                              setActive({
                                ...active,
                                chat: { ...active.chat, title: v.title },
                              });
                              await r.refresh();
                            },
                          })
                        }
                      />
                    </View>
                  </Card>
                  {active.messages.map((m) => (
                    <Card key={m.id}>
                      <Text style={ui.small}>
                        {m.role === "user" ? "YOU" : "FLO"}
                      </Text>
                      <Copy translate={false}>{m.content}</Copy>
                      {m.feedback && (
                        <>
                          <Heading>Feedback</Heading>
                          <Copy translate={false}>{m.feedback.summary}</Copy>
                          {m.feedback.explanation && (
                            <Copy translate={false}>{m.feedback.explanation}</Copy>
                          )}
                          {m.feedback.hints
                            ?.slice(0, hintSteps[m.id] ?? 0)
                            .map((hint, i) => (
                              <Copy key={i}>
                                {i + 1}. {hint}
                              </Copy>
                            ))}
                          {!!m.feedback.hints?.length && (
                            <Button
                              label="Next hint"
                              disabled={
                                (hintSteps[m.id] ?? 0) >=
                                m.feedback.hints.length
                              }
                              onPress={() =>
                                setHintSteps((v) => ({
                                  ...v,
                                  [m.id]: (v[m.id] ?? 0) + 1,
                                }))
                              }
                            />
                          )}
                        </>
                      )}
                      <View style={ui.row}>
                        <Button
                          label="Save note"
                          disabled={a.busy}
                          onPress={() => noteEditor(undefined, m)}
                        />
                        {m.role === "user" && m.canEdit !== false && (
                          <>
                            <Button
                              label="Edit"
                              disabled={a.busy}
                              onPress={() =>
                                setEditor({
                                  title: "Edit your message",
                                  fields: [
                                    {
                                      key: "message",
                                      label: "Message",
                                      value: m.content,
                                      required: true,
                                      max: 1000,
                                      multiline: true,
                                    },
                                  ],
                                  save: async (v) => {
                                    await service.editMessage(
                                      active.chat.id,
                                      m.id,
                                      v.message,
                                    );
                                    setActive(
                                      await service.chat(active.chat.id),
                                    );
                                    setHintSteps({});
                                    setLiveHints({});
                                    await r.refresh();
                                  },
                                })
                              }
                            />
                            <Button
                              label="Delete"
                              danger
                              disabled={a.busy}
                              onPress={() =>
                                confirmAction(
                                  "Delete message?",
                                  "Its linked response will also be removed. Later role-play turns may be reset to keep the branch consistent.",
                                  () =>
                                    void a.run(async () => {
                                      await service.deleteMessage(
                                        active.chat.id,
                                        m.id,
                                      );
                                      setActive(
                                        await service.chat(active.chat.id),
                                      );
                                      setHintSteps({});
                                      setLiveHints({});
                                      await r.refresh();
                                    }, "Message and linked response removed."),
                                )
                              }
                            />
                          </>
                        )}
                      </View>
                    </Card>
                  ))}
                  {active.chat.nextTurn && (
                    <Card>
                      <Heading>
                        {active.chat.nextTurn.completed
                          ? "Role-play complete ✓"
                          : "Your next turn"}
                      </Heading>
                      <Copy translate={false}>{active.chat.nextTurn.prompt}</Copy>
                      {active.chat.nextTurn.choices.map((choice) => (
                        <Button
                          key={choice.id}
                          label={choice.label}
                          disabled={a.busy}
                          onPress={() => send(choice)}
                        />
                      ))}
                      {!preview && !active.chat.nextTurn.completed && (
                        <>
                          {(liveHints[active.chat.id] ?? []).map((hint, index) => (
                            <Copy key={`${active.chat.id}-hint-${index}`}>
                              Hint {index + 1}: {hint}
                            </Copy>
                          ))}
                          <Button
                            label="Next hint"
                            disabled={a.busy || !service.hint || (hintSteps[active.chat.id] ?? 0) >= 3}
                            onPress={() =>
                              void a.run(async () => {
                                if (!service.hint) return;
                                const step = (hintSteps[active.chat.id] ?? 0) + 1;
                                const hint = await service.hint(active.chat.id, step);
                                setHintSteps((v) => ({ ...v, [active.chat.id]: hint.step }));
                                setLiveHints((v) => ({
                                  ...v,
                                  [active.chat.id]: [...(v[active.chat.id] ?? []), hint.text],
                                }));
                              }, "Hint ready.")
                            }
                          />
                        </>
                      )}
                    </Card>
                  )}
                  {!active.chat.nextTurn?.completed && (
                    <>
                      <TextInput
                        accessibilityLabel="Prompt context"
                        placeholder="Optional topic to focus your question on"
                        value={topic}
                        onChangeText={setTopic}
                        maxLength={200}
                        style={ui.input}
                        editable={!a.busy}
                      />
                      <TextInput
                        accessibilityLabel="Message to Flo"
                        placeholder="Write to Flo…"
                        multiline
                        value={message}
                        onChangeText={setMessage}
                        onFocus={() => {
                          messageFieldFocused.current = true;
                          setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 350);
                        }}
                        onBlur={() => { messageFieldFocused.current = false; }}
                        maxLength={1000}
                        style={ui.input}
                        editable={!a.busy}
                      />
                      <Button
                        label={a.busy ? "Waiting for Flo…" : "Send"}
                        disabled={a.busy || !message.trim()}
                        onPress={() => send()}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <Card>
                    <Heading>What would you like to practice?</Heading>
                    <Copy>
                      Ask about grammar, vocabulary, or a phrase from your
                      lesson.
                    </Copy>
                    <Button
                      label="Start a chat"
                      disabled={a.busy}
                      onPress={() => start()}
                    />
                  </Card>
                  <Heading>Role-play scenarios</Heading>
                  {!r.data.scenarios.length && (
                    <Empty text="No scenarios are available yet." />
                  )}
                  {r.data.scenarios.map((s) => (
                    <Card key={s.id}>
                      <Heading>{s.title}</Heading>
                      <Copy>{s.description}</Copy>
                      <Button
                        label="Practice this scenario"
                        disabled={a.busy}
                        onPress={() => start(s.id)}
                      />
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
          {tab === "history" && (
            <>
              <Heading>Your conversations</Heading>
              <Button
                label="Clear history"
                danger
                disabled={a.busy || (!r.data.chats.length && !active)}
                onPress={() =>
                  confirmAction(
                    "Clear all tutor history?",
                    "All your chats and messages will be removed. Saved notes follow the backend's documented deletion policy.",
                    () =>
                      void a.run(async () => {
                        await service.clearHistory();
                        setActive(null);
                        setMessage("");
                        await r.refresh();
                      }, "Chat history cleared."),
                  )
                }
              />
              {!r.data.chats.length && (
                <Empty text="No saved chats. Start a conversation with history saving enabled." />
              )}
              {r.data.chats.map((c) => (
                <Card key={c.id}>
                  <Heading translate={false}>{c.title}</Heading>
                  <View style={ui.row}>
                    <Button
                      label="Open"
                      disabled={a.busy}
                      onPress={() => open(c.id)}
                    />
                    <Button
                      label="Rename"
                      disabled={a.busy}
                      onPress={() =>
                        setEditor({
                          title: "Rename chat",
                          fields: [
                            {
                              key: "title",
                              label: "Title",
                              value: c.title,
                              required: true,
                              max: 100,
                            },
                          ],
                          save: async (v) => {
                            await service.rename(c.id, v.title);
                            if (active?.chat.id === c.id)
                              setActive({
                                ...active,
                                chat: { ...active.chat, title: v.title },
                              });
                            await r.refresh();
                          },
                        })
                      }
                    />
                    <Button
                      label="Delete chat"
                      danger
                      disabled={a.busy}
                      onPress={() =>
                        confirmAction(
                          "Delete chat?",
                          c.title,
                          () =>
                            void a.run(async () => {
                              await service.deleteChat(c.id);
                              if (active?.chat.id === c.id) {
                                setActive(null);
                                setMessage("");
                              }
                              await r.refresh();
                            }, "Chat deleted."),
                        )
                      }
                    />
                  </View>
                </Card>
              ))}
            </>
          )}
          {tab === "notes" && (
            <>
              <Heading>Saved learning notes</Heading>
              <Button label="Add a note" onPress={() => noteEditor()} />
              {!r.data.notes.length && (
                <Empty text="Save a useful phrase and add your own example." />
              )}
              {r.data.notes.map((n) => (
                <Card key={n.id}>
                  <Heading translate={false}>{n.phrase}</Heading>
                  <Copy translate={false}>{n.pattern}</Copy>
                  <Copy translate={!n.personalExample}>{n.personalExample || "No personal example yet."}</Copy>
                  <View style={ui.row}>
                    <Button
                      label="Edit"
                      disabled={a.busy}
                      onPress={() => noteEditor(n)}
                    />
                    <Button
                      label="Delete note"
                      danger
                      disabled={a.busy}
                      onPress={() =>
                        confirmAction(
                          "Delete note?",
                          n.phrase,
                          () =>
                            void a.run(async () => {
                              await service.deleteNote(n.id);
                              await r.refresh();
                            }, "Note deleted."),
                        )
                      }
                    />
                  </View>
                </Card>
              ))}
            </>
          )}
        </>
      )}
      <Editor spec={editor} close={() => setEditor(null)} />
    </Page>
  );
}
