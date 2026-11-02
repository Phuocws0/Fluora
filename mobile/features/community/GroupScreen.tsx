import { useCallback, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { community } from "./community.service";
import { ApiError } from "../../services/api";
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
import type { Challenge, Group } from "./community.types";
export default function GroupScreen({ groupId }: { groupId: string }) {
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const a = useAction();
  const r = useResource(
    useCallback(async () => {
      const { group } = await community.group(groupId);
      if (!group.myRole) return { group, members: [], challenge: null };
      const [members, challenge] = await Promise.all([
        community.members(groupId),
        community.challenge(groupId).catch((e) => {
          if (e instanceof ApiError && e.status === 404)
            return { challenge: null };
          throw e;
        }),
      ]);
      return { group, ...members, ...challenge };
    }, [groupId]),
  );
  const g = r.data?.group;
  const c = r.data?.challenge;
  const owner = g?.myRole === "owner";
  const editGroup = (group: Group) =>
    setEditor({
      title: "Edit group",
      fields: [
        {
          key: "name",
          label: "Name",
          value: group.name,
          required: true,
          min: 3,
          max: 60,
        },
        { key: "goal", label: "Goal", value: group.goal, max: 200 },
        {
          key: "topic",
          label: "Topic slug",
          value: group.topic,
          required: true,
          max: 50,
        },
        {
          key: "visibility",
          label: "Visibility",
          value: group.visibility,
          choices: ["public", "private"],
        },
        {
          key: "meetupAt",
          label: "Meetup ISO date (blank to clear)",
          value: group.meetupAt ?? "",
        },
        {
          key: "meetupNote",
          label: "Meetup note",
          value: group.meetupNote ?? "",
          max: 300,
        },
      ],
      save: async (v) => {
        await community.updateGroup(groupId, {
          ...v,
          meetupAt: v.meetupAt || null,
          meetupNote: v.meetupNote || null,
        });
        await r.refresh();
      },
    });
  const editChallenge = (challenge?: Challenge | null) =>
    setEditor({
      title: challenge ? "Edit challenge" : "Create challenge",
      fields: [
        {
          key: "title",
          label: "Title",
          value: challenge?.title,
          required: true,
          min: 3,
          max: 80,
        },
        {
          key: "metric",
          label: "Metric",
          value: challenge?.metric,
          choices: ["xp", "lessons"],
        },
        {
          key: "target",
          label: "Target (1–100000)",
          value: String(challenge?.target ?? 10),
          numeric: true,
          required: true,
        },
        {
          key: "startsAt",
          label: "Start ISO date",
          value: challenge?.startsAt ?? new Date().toISOString(),
          required: true,
        },
        {
          key: "endsAt",
          label: "End ISO date (max 31 days)",
          value:
            challenge?.endsAt ??
            new Date(Date.now() + 7 * 86400000).toISOString(),
          required: true,
        },
      ],
      save: async (v) => {
        const body = { ...v, target: Number(v.target) };
        if (challenge) await community.updateChallenge(groupId, body);
        else await community.createChallenge(groupId, body);
        await r.refresh();
      },
    });
  return (
    <Page title={g?.name ?? "Study group"} back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {g && (
        <>
          <Copy>{g.goal}</Copy>
          <Copy>
            {g.topic} · {g.memberCount} members · {g.visibility}
          </Copy>
          {g.meetupAt && (
            <Copy>Meetup: {new Date(g.meetupAt).toLocaleString()}</Copy>
          )}
          {g.meetupNote && <Copy>{g.meetupNote}</Copy>}
          <View style={ui.row}>
            <Button
              label="Refresh"
              disabled={r.loading || a.busy}
              onPress={() => void r.refresh()}
            />
            {!g.myRole ? (
              g.visibility === "public" && (
                <Button
                  label="Join group"
                  disabled={a.busy}
                  onPress={() =>
                    void a.run(async () => {
                      await community.joinGroup(groupId);
                      await r.refresh();
                    }, "Joined group.")
                  }
                />
              )
            ) : (
              <>
                <Button
                  label="Discussion"
                  onPress={() =>
                    router.push({
                      pathname: "/community/groups/[groupId]/discussion",
                      params: { groupId },
                    })
                  }
                />
                <Button
                  label="Plan & whiteboard"
                  onPress={() =>
                    router.push({
                      pathname: "/community/groups/[groupId]/plan",
                      params: { groupId },
                    })
                  }
                />
                <Button
                  label="Leave group"
                  danger
                  disabled={a.busy}
                  onPress={() =>
                    confirmAction(
                      "Leave group?",
                      owner
                        ? "If other members remain, transfer ownership first. Leaving as the only member deletes the group."
                        : "Your authored content stays in the group.",
                      () =>
                        void a.run(async () => {
                          await community.leaveGroup(groupId);
                          router.replace("/community/groups");
                        }, "Left group."),
                    )
                  }
                />
              </>
            )}
            {owner && (
              <>
                <Button label="Edit group" onPress={() => editGroup(g)} />
                <Button
                  label="Delete group"
                  danger
                  disabled={a.busy}
                  onPress={() =>
                    confirmAction(
                      "Delete group?",
                      "All discussions, rooms, tasks and notes in this group will be removed.",
                      () =>
                        void a.run(async () => {
                          await community.deleteGroup(groupId);
                          router.replace("/community/groups");
                        }),
                    )
                  }
                />
              </>
            )}
          </View>
          {g.myRole && (
            <>
              <Heading>Members</Heading>
              {r.data?.members.map((m) => (
                <Card key={m.id}>
                  <Copy>
                    {m.displayName ?? "Learner"} · {m.role}
                  </Copy>
                  {owner && m.role !== "owner" && (
                    <Button
                      label="Transfer ownership"
                      disabled={a.busy}
                      onPress={() =>
                        confirmAction(
                          "Transfer ownership?",
                          `${m.displayName ?? "This learner"} will become owner and you will become a member.`,
                          () =>
                            void a.run(async () => {
                              await community.updateGroup(groupId, {
                                ownerId: m.id,
                              });
                              await r.refresh();
                            }, "Ownership transferred."),
                        )
                      }
                    />
                  )}
                </Card>
              ))}
              <Heading>Group challenge</Heading>
              {c ? (
                <Card>
                  <Heading>{c.title}</Heading>
                  <Copy>
                    {c.status} · {c.groupProgress}/{c.target} {c.metric}
                  </Copy>
                  <Copy>
                    {new Date(c.startsAt).toLocaleString()} →{" "}
                    {new Date(c.endsAt).toLocaleString()}
                  </Copy>
                  <Copy>Your progress: {c.myProgress ?? "not joined"}</Copy>
                  {c.participants.map((p) => (
                    <Copy key={p.id}>
                      {p.displayName ?? "Learner"}: {p.progress}
                    </Copy>
                  ))}
                  <View style={ui.row}>
                    {c.joined ? (
                      <Button
                        label="Leave challenge"
                        danger
                        disabled={a.busy}
                        onPress={() =>
                          confirmAction(
                            "Leave challenge?",
                            "You will stop participating in this challenge.",
                            () =>
                              void a.run(async () => {
                                await community.leaveChallenge(groupId);
                                await r.refresh();
                              }),
                          )
                        }
                      />
                    ) : (
                      <Button
                        label="Join challenge"
                        disabled={a.busy || c.status === "ended"}
                        onPress={() =>
                          void a.run(async () => {
                            await community.joinChallenge(groupId);
                            await r.refresh();
                          }, "Joined challenge.")
                        }
                      />
                    )}
                    {owner && (
                      <>
                        <Button label="Edit" onPress={() => editChallenge(c)} />
                        <Button
                          label="Delete"
                          danger
                          disabled={a.busy}
                          onPress={() =>
                            confirmAction(
                              "Delete challenge?",
                              "This removes the group challenge.",
                              () =>
                                void a.run(async () => {
                                  await community.deleteChallenge(groupId);
                                  await r.refresh();
                                }),
                            )
                          }
                        />
                      </>
                    )}
                  </View>
                </Card>
              ) : (
                <>
                  <Empty text="No group challenge yet." />
                  {owner && (
                    <Button
                      label="Create challenge"
                      onPress={() => editChallenge()}
                    />
                  )}
                </>
              )}
              <Heading>Study rooms</Heading>
              {!g.rooms?.length && <Empty />}
              {g.rooms?.map((room) => (
                <Card key={room.id}>
                  <Copy>
                    {room.name} · {room.closedAt ? "Closed" : "Open"}
                  </Copy>
                  <Copy>{room.focus}</Copy>
                  <Button
                    label="Open room"
                    onPress={() =>
                      router.push({
                        pathname: "/community/rooms/[roomId]",
                        params: { roomId: room.id },
                      })
                    }
                  />
                </Card>
              ))}
              {owner && (
                <Button
                  label="Create room"
                  onPress={() =>
                    setEditor({
                      title: "Create room",
                      fields: [
                        {
                          key: "name",
                          label: "Room name",
                          required: true,
                          max: 80,
                        },
                        { key: "focus", label: "Focus", max: 200 },
                      ],
                      save: async (v) => {
                        const { room } = await community.createRoom(groupId, v);
                        setEditor(null);
                        router.push({
                          pathname: "/community/rooms/[roomId]",
                          params: { roomId: room.id },
                        });
                      },
                    })
                  }
                />
              )}
            </>
          )}
        </>
      )}
      <Editor spec={editor} close={() => setEditor(null)} />
    </Page>
  );
}
