import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { community } from "./community.service";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Empty,
  Heading,
  Page,
  ResourceState,
  SessionGate,
  ui,
  useAction,
  useResource,
} from "../shared/feature-ui";

export default function LeagueScreen() {
  return <SessionGate>{() => <LeagueHome />}</SessionGate>;
}
function LeagueHome() {
  const [scope, setScope] = useState<"league" | "friends">("league");
  const action = useAction();
  const resource = useResource(
    useCallback(async () => {
      const [league, board, quests, achievements] = await Promise.all([
        community.league(),
        community.leaderboard(scope),
        community.quests(),
        community.achievements(),
      ]);
      return { ...league, ...board, ...quests, ...achievements };
    }, [scope]),
  );
  const d = resource.data;
  return (
    <Page title="Grow together">
      <Copy>A little practice. A stronger community.</Copy>
      <View style={ui.row}>
        <Button
          label="Friends"
          onPress={() => router.push("/community/friends")}
        />
        <Button
          label="Study groups"
          onPress={() => router.push("/community/groups")}
        />
        <Button
          label="Rewards"
          onPress={() => router.push("/community/rewards")}
        />
        <Button
          label="Notifications"
          onPress={() => router.push("/community/notifications")}
        />
        <Button
          label="Peer review"
          onPress={() => router.push("/community/peer-review")}
        />
      </View>
      <Button
        label="Refresh"
        disabled={resource.loading || action.busy}
        onPress={() => void resource.refresh()}
      />
      <ActionState action={action} />
      <ResourceState resource={resource} />
      {d && (
        <>
          <Card>
            <Text style={ui.heading}>🌱 {d.league.tier.name} League</Text>
            <Copy>
              #{d.league.rank ?? "—"} · {d.league.weeklyXp} XP this week
            </Copy>
            <Copy>
              {d.league.nextTier
                ? `${d.league.xpToNextTier} XP to ${d.league.nextTier.name}`
                : "You reached Forest. Keep growing!"}
            </Copy>
            <Text style={ui.small}>
              Weekly standings reset{" "}
              {new Date(d.league.period.endsAt).toLocaleDateString()}
            </Text>
          </Card>
          <Heading>Weekly leaderboard</Heading>
          <View style={ui.row}>
            {(["league", "friends"] as const).map((value) => (
              <Button
                key={value}
                disabled={resource.loading}
                label={`${scope === value ? "✓ " : ""}${value}`}
                onPress={() => setScope(value)}
              />
            ))}
          </View>
          {!d.entries.length && <Empty text="No visible standings yet." />}
          {d.entries.map((row) => (
            <Card key={row.user.id}>
              <Copy>
                #{row.rank} · {row.user.displayName ?? "Learner"}
                {row.isCurrentUser ? " · You" : ""}
              </Copy>
              <Copy>{row.weeklyXp} XP</Copy>
              {!row.isCurrentUser && (
                <Button
                  label="View profile"
                  onPress={() =>
                    router.push({
                      pathname: "/community/users/[userId]",
                      params: { userId: row.user.id },
                    })
                  }
                />
              )}
            </Card>
          ))}
          <Heading>Daily quests · UTC</Heading>
          {!d.quests.length && <Empty />}
          {d.quests.map((q) => (
            <Card key={q.id}>
              <Heading>{q.title}</Heading>
              <Copy>
                {q.progress}/{q.target} · {q.rewardGems} gems
              </Copy>
              <Button
                label={
                  q.status === "claimed"
                    ? "Claimed ✓"
                    : q.status === "claimable"
                      ? "Claim reward"
                      : "Keep practicing"
                }
                disabled={action.busy || q.status !== "claimable"}
                onPress={() =>
                  void action.run(async () => {
                    await community.claim(q.id);
                    await resource.refresh();
                  }, "Quest reward claimed.")
                }
              />
            </Card>
          ))}
          <Heading>Achievement garden</Heading>
          {!d.achievements.length && <Empty />}
          {d.achievements.map((a) => (
            <Card key={a.id}>
              <Copy>
                {a.earned ? "🏅" : "🌱"} {a.title}
              </Copy>
              <Copy>{a.description}</Copy>
              <Text style={ui.small}>
                {a.progress}/{a.target}
                {a.earnedAt
                  ? ` · Earned ${new Date(a.earnedAt).toLocaleDateString()}`
                  : ""}
              </Text>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
