import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { practiceApi } from "./practice.service";
import { Button, GardenCard, GardenSubtitle, LinkCard, PracticePage, ResourceState, Section, s, useResource } from "./practice-ui";
import { font, garden } from "../profile/garden-ui";
import { LocalizedPressable as Pressable, LocalizedText as Text } from "../i18n/i18n";

const practiceModes = [
  { title: "Listen", id: "listening", detail: "3 min", blue: false },
  { title: "Speak", id: "pronunciation", detail: "4 min", blue: true },
  { title: "Read", id: "stories", detail: "5 min", blue: false },
  { title: "Write", id: "writing", detail: "6 min", blue: true },
];

export function PracticeHubScreen() {
  const { user } = useAuth();
  return <Hub key={user?.id ?? "guest"} />;
}

function Hub() {
  const { isAuthenticated, sessionNotice, refreshSession } = useAuth();
  const resource = useResource(useCallback(() => isAuthenticated ? practiceApi.summary() : Promise.resolve(null), [isAuthenticated]));
  const section = (name: string) => router.push({ pathname: "/practice/[section]", params: { section: name } });
  const tool = (id: string) => router.push({ pathname: "/practice/tools/[toolId]", params: { toolId: id } });
  const openMode = (id: string) => id === "stories" ? section("stories") : tool(id);

  return <PracticePage title="A little practice. Lasting progress." tab action={{ label: "Review vocabulary", onPress: () => section("review") }}>
    <GardenSubtitle>Take five minutes to strengthen what you’ve learned.</GardenSubtitle>

    <View style={styles.warmupCard}>
      <Text style={styles.warmupTitle}>YOUR SMART WARM-UP</Text>
      <Text style={styles.warmupCopy}>{resource.data ? `${resource.data.reviewDueCount} words are ready for a quick recall.` : isAuthenticated ? "Loading your due review…" : "Your saved words will be ready for a quick recall."}</Text>
    </View>

    {sessionNotice && <GardenCard tint={garden.blue}><Text style={s.caption}>{sessionNotice}</Text><Button label="Reconnect account" onPress={() => void refreshSession()} /></GardenCard>}
    {isAuthenticated && <ResourceState resource={resource} />}

    <View style={styles.modeGrid}>
      {practiceModes.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => openMode(item.id)} style={[styles.modeCard, item.blue && styles.modeCardBlue]}>
        <Text style={styles.modeTitle}>{item.title}</Text>
        <Text style={styles.modeDetail}>{item.detail}</Text>
      </Pressable>)}
    </View>

    <Pressable accessibilityRole="button" onPress={() => section("tools")} style={styles.browsePill}>
      <Text style={styles.browseText}>Browse all study tools</Text>
    </Pressable>

    <Section>YOUR LEARNING TOOLS</Section>
    <LinkCard title="My vocabulary" detail="Manage decks and cards · import or export" onPress={() => section("vocabulary")} />
    <LinkCard title="Offline downloads" detail="Save lessons for practice on this device" onPress={() => section("downloads")} />
    <LinkCard title="Bookmark shelf" onPress={() => section("bookmarks")} />
    <LinkCard title="Learning calendar" detail="Plan sessions and view your activity" onPress={() => router.push("/planner")} />
    <LinkCard title="Weekly activity" onPress={() => router.push("/learning/insights")} />
    {!!resource.data?.suggestions.length && <Section>FOR YOUR NEXT LITTLE STEP</Section>}
    {resource.data?.suggestions.map(item => <LinkCard key={`${item.kind}-${item.id}`} title={item.title} detail={item.kind} onPress={() => item.kind === "story" ? router.push({ pathname: "/stories/[storyId]", params: { storyId: item.id } }) : section("review")} />)}
  </PracticePage>;
}

const styles = StyleSheet.create({
  warmupTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  warmupCopy: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginTop: 6 },
  warmupCard: { backgroundColor: garden.mint, borderRadius: 20, justifyContent: "center", marginTop: -3, marginBottom: 6, minHeight: 110, paddingHorizontal: 14, paddingVertical: 16 },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginTop: 10, marginBottom: 20 },
  modeCard: { backgroundColor: "#ffffff", borderRadius: 18, height: 103, justifyContent: "flex-start", paddingHorizontal: 14, paddingTop: 14, width: "48%" },
  modeCardBlue: { backgroundColor: garden.blue },
  modeTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  modeDetail: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginTop: 6 },
  browsePill: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 16, height: 36, justifyContent: "center", marginBottom: 68 },
  browseText: { color: garden.forest, fontFamily: font.bold, fontSize: 11, lineHeight: 16 },
});
