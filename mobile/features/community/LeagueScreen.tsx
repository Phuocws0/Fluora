import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { community } from "./community.service";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Empty,
  Heading,
  ResourceState,
  SessionGate,
  useAction,
  useResource,
} from "../shared/feature-ui";
import { font, garden, GardenCard, Page } from "../profile/garden-ui";

export default function LeagueScreen() {
  return <SessionGate>{() => <LeagueHome />}</SessionGate>;
}

function LeagueHome() {
  const [scope, setScope] = useState<"league" | "friends">("league");
  const [detailsVisible, setDetailsVisible] = useState(false);
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
  const daysLeft = d ? Math.max(0, Math.ceil((new Date(d.league.period.endsAt).getTime() - Date.now()) / 86_400_000)) : null;
  const currentRank = d?.entries.find((entry) => entry.isCurrentUser)?.rank ?? d?.league.rank;

  return <Page title="Grow with your community" back={false} eyebrow="GROW TOGETHER" activeTab="League" showFooter={false}
    action={d ? { label: detailsVisible ? "Hide league details" : "View league details", onPress: () => setDetailsVisible((visible) => !visible) } : undefined}>
    {d ? <>
      <Text style={styles.leagueSubtitle}>{d.league.tier.name.toLocaleUpperCase()} LEAGUE · {daysLeft} {daysLeft === 1 ? "DAY" : "DAYS"} LEFT</Text>
      <View style={styles.rankPill}><Text style={styles.rankPillText}>{currentRank ? `TOP 10 ADVANCE · YOUR RANK: ${currentRank}` : "TOP 10 ADVANCE · KEEP PRACTICING"}</Text></View>

      <View style={styles.board}>
        {!d.entries.length && <Empty text="No visible standings yet." />}
        {d.entries.slice(0, detailsVisible ? d.entries.length : 5).map((row) => <View key={row.user.id} style={[styles.entryRow, row.isCurrentUser && styles.entryCurrent]}>
          <Text style={styles.entryRank}>{String(row.rank).padStart(2, "0")}</Text>
          <Pressable accessibilityRole="button" disabled={row.isCurrentUser} onPress={() => router.push({ pathname: "/community/users/[userId]", params: { userId: row.user.id } })} style={styles.entryNameButton}>
            <Text numberOfLines={1} style={styles.entryName}>{row.user.displayName ?? "Learner"}{row.isCurrentUser ? " · You" : ""}</Text>
          </Pressable>
          <Text style={styles.entryXp}>{row.weeklyXp.toLocaleString()} XP</Text>
        </View>)}
      </View>

      {detailsVisible && <View style={styles.details}>
        <View style={styles.detailControls}>
          <Button label={scope === "league" ? "✓ League" : "League"} onPress={() => setScope("league")} disabled={resource.loading} />
          <Button label={scope === "friends" ? "✓ Friends" : "Friends"} onPress={() => setScope("friends")} disabled={resource.loading} />
          <Button label="Refresh" onPress={() => void resource.refresh()} disabled={resource.loading || action.busy} />
        </View>
        <ActionState action={action} />
        <ResourceState resource={resource} />

        <Heading>More ways to grow together</Heading>
        <View style={styles.detailControls}>
          <Button label="Friends" onPress={() => router.push("/community/friends")} />
          <Button label="Study groups" onPress={() => router.push("/community/groups")} />
          <Button label="Rewards" onPress={() => router.push("/community/rewards")} />
          <Button label="Notifications" onPress={() => router.push("/community/notifications")} />
          <Button label="Peer review" onPress={() => router.push("/community/peer-review")} />
        </View>

        <GardenCard tint={garden.mint}>
          <Heading>{d.league.tier.name} League</Heading>
          <Copy>#{d.league.rank ?? "—"} · {d.league.weeklyXp.toLocaleString()} XP this week</Copy>
          <Copy>{d.league.nextTier ? `${d.league.xpToNextTier} XP to ${d.league.nextTier.name}` : "You reached the highest league. Keep growing!"}</Copy>
        </GardenCard>

        <Heading>Daily quests</Heading>
        {!d.quests.length && <Empty />}
        {d.quests.map((quest) => <Card key={quest.id}>
          <Heading>{quest.title}</Heading>
          <Copy>{quest.progress}/{quest.target} · {quest.rewardGems} gems</Copy>
          <Button label={quest.status === "claimed" ? "Claimed ✓" : quest.status === "claimable" ? "Claim reward" : "Keep practicing"} disabled={action.busy || quest.status !== "claimable"} onPress={() => void action.run(async () => { await community.claim(quest.id); await resource.refresh(); }, "Quest reward claimed.")} />
        </Card>)}

        <Heading>Achievement garden</Heading>
        {!d.achievements.length && <Empty />}
        {d.achievements.map((achievement) => <Card key={achievement.id}>
          <Copy>{achievement.earned ? "🏅" : "🌱"} {achievement.title}</Copy>
          <Copy>{achievement.description}</Copy>
          <Text style={styles.achievementMeta}>{achievement.progress}/{achievement.target}{achievement.earnedAt ? ` · Earned ${new Date(achievement.earnedAt).toLocaleDateString()}` : ""}</Text>
        </Card>)}

      </View>}
    </> : <ResourceState resource={resource} />}
  </Page>;
}

const styles = StyleSheet.create({
  leagueSubtitle: { color: garden.muted, fontFamily: font.body, fontSize: 15, lineHeight: 22, marginTop: 12 },
  rankPill: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 16, height: 30, justifyContent: "center", marginTop: 19 },
  rankPillText: { color: garden.forest, fontFamily: font.bold, fontSize: 10, lineHeight: 15 },
  board: { gap: 12, marginTop: 26 },
  entryRow: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 14, minHeight: 52, paddingHorizontal: 16 },
  entryCurrent: { backgroundColor: garden.mint, minHeight: 66 },
  entryRank: { color: garden.muted, fontFamily: font.bold, fontSize: 15, lineHeight: 22, width: 24 },
  entryNameButton: { flex: 1 },
  entryName: { color: garden.ink, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  entryXp: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  details: { marginTop: 16, paddingBottom: 20 },
  detailControls: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  achievementMeta: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
});
