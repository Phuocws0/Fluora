import { useCallback, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { community } from "./community.service";
import { PostFeed } from "./PostFeed";
import type { Poll } from "./community.types";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Editor,
  Empty,
  Heading,
  Page,
  ResourceState,
  confirmAction,
  ui,
  useAction,
  useResource,
  type EditorSpec,
} from "../shared/feature-ui";
import { formatUiDate, useAppLanguage } from "../i18n/i18n";
export default function RoomScreen({ roomId }: { roomId: string }) {
  const { language } = useAppLanguage();
  const r = useResource(
    useCallback(
      async () => ({
        ...(await community.room(roomId)),
        ...(await community.polls(roomId)),
      }),
      [roomId],
    ),
  );
  const a = useAction();
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const room = r.data?.room;
  const editPoll = (poll?: Poll) =>
    setEditor({
      title: poll ? "Edit poll" : "Create poll",
      fields: [
        {
          key: "question",
          label: "Question",
          value: poll?.question,
          min: 3,
          max: 200,
          required: true,
        },
        ...(!poll || poll.totalVotes === 0
          ? [
              {
                key: "choices",
                label: "Choices (2–6, one per line)",
                value: poll?.choices.map((c) => c.label).join("\n"),
                required: true,
                multiline: true,
                max: 600,
              },
            ]
          : []),
      ],
      save: async (v) => {
        const choices = v.choices
          ?.split("\n")
          .map((c) => c.trim())
          .filter(Boolean);
        if (
          choices &&
          (choices.length < 2 ||
            choices.length > 6 ||
            new Set(choices.map((c) => c.toLowerCase())).size !==
              choices.length)
        )
          throw new Error("Enter 2–6 different choices.");
        const body = { question: v.question, ...(choices ? { choices } : {}) };
        if (poll) await community.updatePoll(roomId, poll.id, body);
        else await community.createPoll(roomId, body);
        await r.refresh();
      },
    });
  return (
    <Page title={room?.name ?? "Study room"} translateTitle={!room?.name} back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {room && (
        <>
          <Copy translate={!room.focus}>{room.focus ?? "A shared place to practice."}</Copy>
          <Copy>
            {room.closedAt ? "Closed" : "Open"} · Host:{" "}
            {room.host.displayName ?? "Learner"}
          </Copy>
          {room.startsAt && (
            <Copy>Starts: {formatUiDate(room.startsAt, language, { dateStyle: "medium", timeStyle: "short" })}</Copy>
          )}
          <Copy>
            Participants:{" "}
            {room.participants
              .map((p) => p.displayName ?? "Learner")
              .join(", ") || "None"}
          </Copy>
          <View style={ui.row}>
            <Button
              label="Refresh room"
              disabled={r.loading || a.busy}
              onPress={() => void r.refresh()}
            />
            {!room.joined && !room.closedAt && (
              <Button
                label="Join room"
                disabled={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    await community.joinRoom(roomId);
                    await r.refresh();
                  }, "Joined room.")
                }
              />
            )}
            {room.joined && !room.isHost && (
              <Button
                label="Leave room"
                danger
                disabled={a.busy}
                onPress={() =>
                  confirmAction(
                    "Leave room?",
                    "You can rejoin while the room remains open.",
                    () =>
                      void a.run(async () => {
                        await community.leaveRoom(roomId);
                        await r.refresh();
                      }),
                  )
                }
              />
            )}
            {room.isHost && (
              <>
                <Button
                  label="Edit room"
                  onPress={() =>
                    setEditor({
                      title: "Edit room",
                      fields: [
                        {
                          key: "name",
                          label: "Name",
                          value: room.name,
                          required: true,
                          max: 80,
                        },
                        {
                          key: "focus",
                          label: "Focus",
                          value: room.focus ?? "",
                          max: 200,
                        },
                        {
                          key: "startsAt",
                          label: "Start ISO date (blank to clear)",
                          value: room.startsAt ?? "",
                        },
                      ],
                      save: async (v) => {
                        await community.updateRoom(roomId, {
                          ...v,
                          focus: v.focus || null,
                          startsAt: v.startsAt || null,
                        });
                        await r.refresh();
                      },
                    })
                  }
                />
                {!room.closedAt && (
                  <Button
                    label="Close room"
                    danger
                    disabled={a.busy}
                    onPress={() =>
                      confirmAction(
                        "Close room?",
                        "A closed room cannot be reopened.",
                        () =>
                          void a.run(async () => {
                            await community.updateRoom(roomId, {
                              closed: true,
                            });
                            await r.refresh();
                          }),
                      )
                    }
                  />
                )}
                <Button
                  label="Delete room"
                  danger
                  disabled={a.busy}
                  onPress={() =>
                    confirmAction(
                      "Delete room?",
                      "Messages and polls will be deleted too.",
                      () =>
                        void a.run(async () => {
                          await community.deleteRoom(roomId);
                          router.replace({
                            pathname: "/community/groups/[groupId]",
                            params: { groupId: room.groupId },
                          });
                        }),
                    )
                  }
                />
              </>
            )}
          </View>
          <Heading>Polls</Heading>
          <Copy>Refresh to see new votes and messages.</Copy>
          {!r.data?.polls.length && <Empty text="No polls yet." />}
          {r.data?.polls.map((p) => (
            <Card key={p.id}>
              <Heading translate={false}>{p.question}</Heading>
              <Copy>
                {p.closed ? "Closed" : "Open"} · {p.totalVotes} votes
              </Copy>
              {p.choices.map((choice) => (
                <Button
                  key={choice.id}
                  label={`${choice.id === p.myChoiceId ? "✓ " : ""}${choice.label} · ${choice.voteCount}`}
                  disabled={
                    a.busy ||
                    p.closed ||
                    !!room.closedAt ||
                    choice.id === p.myChoiceId
                  }
                  onPress={() =>
                    void a.run(
                      async () => {
                        await community.vote(roomId, p, choice.id);
                        await r.refresh();
                      },
                      p.myChoiceId ? "Vote changed." : "Vote saved.",
                    )
                  }
                />
              ))}
              <View style={ui.row}>
                {p.myChoiceId && !p.closed && !room.closedAt && (
                  <Button
                    label="Withdraw vote"
                    disabled={a.busy}
                    onPress={() =>
                      void a.run(async () => {
                        await community.withdrawVote(roomId, p.id);
                        await r.refresh();
                      }, "Vote withdrawn.")
                    }
                  />
                )}
                {room.isHost && (
                  <>
                    {!p.closed && !room.closedAt && (
                      <>
                        <Button label="Edit poll" onPress={() => editPoll(p)} />
                        <Button
                          label="Close poll"
                          danger
                          disabled={a.busy}
                          onPress={() =>
                            confirmAction(
                              "Close poll?",
                              "Voting will stop.",
                              () =>
                                void a.run(async () => {
                                  await community.updatePoll(roomId, p.id, {
                                    closed: true,
                                  });
                                  await r.refresh();
                                }),
                            )
                          }
                        />
                      </>
                    )}
                    <Button
                      label="Delete poll"
                      danger
                      disabled={a.busy}
                      onPress={() =>
                        confirmAction(
                          "Delete poll?",
                          "The poll and votes will be removed.",
                          () =>
                            void a.run(async () => {
                              await community.deletePoll(roomId, p.id);
                              await r.refresh();
                            }),
                        )
                      }
                    />
                  </>
                )}
              </View>
            </Card>
          ))}
          {room.isHost && !room.closedAt && (
            <Button label="Create poll" onPress={() => editPoll()} />
          )}
          <Heading>Room messages</Heading>
          <PostFeed
            parentId={roomId}
            kind="messages"
            writable={room.joined && !room.closedAt}
            editable={!room.closedAt}
          />
        </>
      )}
      <Editor spec={editor} close={() => setEditor(null)} />
    </Page>
  );
}
