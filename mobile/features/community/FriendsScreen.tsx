import { useCallback, useState } from "react";
import { router } from "expo-router";
import { TextInput, View } from "react-native";
import { community } from "./community.service";
import type { Person, Relationship } from "./community.types";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Empty,
  Heading,
  Page,
  ResourceState,
  confirmAction,
  ui,
  useAction,
  useResource,
} from "../shared/feature-ui";
export default function FriendsScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<
    (Person & { relationship: Relationship })[] | null
  >(null);
  const r = useResource(
    useCallback(
      async () => ({
        ...(await community.friends()),
        ...(await community.requests()),
      }),
      [],
    ),
  );
  const a = useAction();
  const refresh = async () => {
    await r.refresh();
    if (users !== null && query.trim().length >= 2)
      setUsers((await community.searchUsers(query.trim())).users);
  };
  const profile = (userId: string) =>
    router.push({ pathname: "/community/users/[userId]", params: { userId } });
  return (
    <Page title="Friends" back>
      <Copy>Find someone to grow with.</Copy>
      <TextInput
        accessibilityLabel="Find friends"
        placeholder="Name or exact email"
        value={query}
        maxLength={50}
        onChangeText={(text) => {
          setQuery(text);
          setUsers(null);
        }}
        style={ui.input}
      />
      <View style={ui.row}>
        <Button
          label="Search"
          disabled={a.busy || query.trim().length < 2}
          onPress={() =>
            void a.run(
              async () =>
                setUsers((await community.searchUsers(query.trim())).users),
              "",
            )
          }
        />
        <Button
          label="Refresh"
          disabled={a.busy}
          onPress={() => void a.run(refresh, "")}
        />
      </View>
      <ActionState action={a} />
      <ResourceState resource={r} />
      {users && (
        <>
          <Heading>Search results</Heading>
          {!users.length && <Empty text="No discoverable learners matched." />}
          {users.map((u) => (
            <Card key={u.id}>
              <Copy>
                {u.displayName ?? "Learner"} · {u.relationship}
              </Copy>
              <View style={ui.row}>
                <Button label="Profile" onPress={() => profile(u.id)} />
                {u.relationship === "none" && (
                  <Button
                    label="Add friend"
                    disabled={a.busy}
                    onPress={() =>
                      void a.run(async () => {
                        await community.request(u.id);
                        await refresh();
                      }, "Friend request sent.")
                    }
                  />
                )}
              </View>
            </Card>
          ))}
        </>
      )}
      {r.data && (
        <>
          <Heading>Friend requests</Heading>
          {!r.data.requests.length && (
            <Empty text="No pending friend requests." />
          )}
          {r.data.requests.map((item) => (
            <Card key={item.id}>
              <Copy>
                {item.user.displayName ?? "Learner"} · {item.direction} ·{" "}
                {item.status}
              </Copy>
              <View style={ui.row}>
                <Button label="Profile" onPress={() => profile(item.user.id)} />
                {item.direction === "incoming" && item.status === "pending" ? (
                  <>
                    {(["accept", "decline"] as const).map((action) => (
                      <Button
                        key={action}
                        label={action}
                        disabled={a.busy}
                        onPress={() =>
                          void a.run(
                            async () => {
                              await community.respond(item.id, action);
                              await refresh();
                            },
                            `Request ${action === "accept" ? "accepted" : "declined"}.`,
                          )
                        }
                      />
                    ))}
                  </>
                ) : (
                  <Button
                    label={
                      item.status === "declined"
                        ? "Clear request"
                        : "Cancel request"
                    }
                    disabled={a.busy}
                    danger
                    onPress={() =>
                      confirmAction(
                        "Remove request?",
                        "This request will be removed.",
                        () =>
                          void a.run(async () => {
                            await community.cancelRequest(item.id);
                            await refresh();
                          }),
                      )
                    }
                  />
                )}
              </View>
            </Card>
          ))}
          <Heading>Your friends</Heading>
          {!r.data.friends.length && (
            <Empty text="Your next study partner is a search away." />
          )}
          {r.data.friends.map((friend) => (
            <Card key={friend.id}>
              <Copy>{friend.displayName ?? "Learner"}</Copy>
              <Copy>
                {friend.progress
                  ? `${friend.progress.totalXp} XP · ${friend.progress.currentStreak} day streak`
                  : "Progress is private."}
              </Copy>
              <View style={ui.row}>
                <Button
                  label="View profile"
                  onPress={() => profile(friend.id)}
                />
                <Button
                  label="Remove friend"
                  danger
                  disabled={a.busy}
                  onPress={() =>
                    confirmAction(
                      "Remove friend?",
                      "You will no longer be connected.",
                      () =>
                        void a.run(async () => {
                          await community.removeFriend(friend.id);
                          await refresh();
                        }, "Connection removed."),
                    )
                  }
                />
              </View>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
export function FriendProfileScreen({ userId }: { userId: string }) {
  const r = useResource(useCallback(() => community.profile(userId), [userId]));
  const a = useAction();
  const u = r.data?.user;
  return (
    <Page title="Learner profile" back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {u && (
        <>
          <Heading>{u.displayName ?? "Learner"}</Heading>
          <Copy>{u.bio ?? "No bio yet."}</Copy>
          <Copy>Connection: {u.relationship}</Copy>
          <Card>
            <Copy>
              {u.progress
                ? `${u.progress.totalXp} XP · ${u.progress.weeklyXp} weekly XP · ${u.progress.currentStreak} day streak`
                : "Progress is private."}
            </Copy>
          </Card>
          {u.relationship === "none" && (
            <Button
              label="Add friend"
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  await community.request(u.id);
                  await r.refresh();
                }, "Friend request sent.")
              }
            />
          )}
          <Heading>Achievements</Heading>
          {u.achievements === null ? (
            <Copy>Achievements are private.</Copy>
          ) : u.achievements.length ? (
            u.achievements.map((item) => (
              <Card key={item.id}>
                <Copy>{item.title}</Copy>
              </Card>
            ))
          ) : (
            <Empty />
          )}
        </>
      )}
    </Page>
  );
}
