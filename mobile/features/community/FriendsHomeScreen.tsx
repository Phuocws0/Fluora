import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { community } from "./community.service";
import { Empty, ResourceState, SessionGate, useResource } from "../shared/feature-ui";
import { font, garden, GardenSubtitle, Page } from "../profile/garden-ui";
import { LocalizedPressable as Pressable, LocalizedText as Text } from "../i18n/i18n";

export default function FriendsHomeScreen() {
  return <SessionGate feature="Friends">{() => <FriendsHome />}</SessionGate>;
}

function FriendsHome() {
  const resource = useResource(useCallback(() => community.friends(), []));
  const friends = resource.data?.friends ?? [];

  return <Page title="Learn with friends" eyebrow="GROW TOGETHER" activeTab="League" action={{ label: "Find more friends", onPress: () => router.push("/community/friends/find") }}>
    <GardenSubtitle>A little encouragement can make a big difference.</GardenSubtitle>
    <Text style={styles.section}>THIS WEEK, TOGETHER</Text>
    <ResourceState resource={resource} />
    {resource.data && friends.length === 0 && <Empty text="Your next study partner is a search away." />}
    {friends.map(friend => {
      const detail = friend.progress?.currentStreak
        ? `Kept a ${friend.progress.currentStreak}-day streak`
        : friend.progress?.weeklyXp
          ? `Earned ${friend.progress.weeklyXp.toLocaleString()} XP this week`
          : "Learning alongside you";
      return <View key={friend.id} style={styles.friendRow}>
        <View style={styles.avatar}><Text style={styles.avatarText} translate={false}>{(friend.displayName ?? "L").trim().charAt(0).toLocaleUpperCase()}</Text></View>
        <View style={styles.friendCopy}>
          <Text numberOfLines={1} style={styles.friendName} translate={!friend.displayName}>{friend.displayName ?? "Learner"}</Text>
          <Text numberOfLines={1} style={styles.friendDetail}>{detail}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/community/users/[userId]", params: { userId: friend.id } })} style={styles.profileAction}>
            <Text style={styles.profileActionText}>View profile</Text>
          </Pressable>
        </View>
      </View>;
    })}
  </Page>;
}

const styles = StyleSheet.create({
  section: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginBottom: 18, marginTop: 0 },
  friendRow: { alignItems: "flex-start", flexDirection: "row", gap: 16, marginBottom: 24 },
  avatar: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  avatarText: { color: garden.forest, fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
  friendCopy: { flex: 1, gap: 6 },
  friendName: { color: garden.ink, fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
  friendDetail: { color: garden.muted, fontFamily: font.bold, fontSize: 13, lineHeight: 19 },
  profileAction: { alignItems: "center", alignSelf: "flex-start", backgroundColor: garden.mint, borderRadius: 18, height: 34, justifyContent: "center", marginTop: 4, paddingHorizontal: 16 },
  profileActionText: { color: garden.forest, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
});
