import { useCallback } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { practiceApi } from "./practice.service";
import { Button, GardenCard, GardenSubtitle, LinkCard, PracticePage, ResourceState, Section, s, useResource } from "./practice-ui";

export function PracticeHubScreen() {
  const { user } = useAuth();
  return <Hub key={user?.id ?? "guest"} />;
}
function Hub() {
  const { isAuthenticated, sessionNotice, refreshSession } = useAuth();
  const resource = useResource(useCallback(() => isAuthenticated ? practiceApi.summary() : Promise.resolve(null), [isAuthenticated]));
  const section = (name: string) => router.push({ pathname: "/practice/[section]", params: { section: name } });
  const tool = (id: string) => router.push({ pathname: "/practice/tools/[toolId]", params: { toolId: id } });
  return <PracticePage title="A little practice. Lasting progress." tab>
    <GardenSubtitle>Take five minutes to strengthen what you've learned.</GardenSubtitle>
    {sessionNotice && <GardenCard><Text style={s.caption}>{sessionNotice}</Text><Button label="Reconnect account" onPress={() => void refreshSession()} /></GardenCard>}
    <GardenCard tint="#EAF8DE"><Text style={s.cardTitle}>YOUR SMART WARM-UP</Text><Text style={s.caption}>{resource.data ? `${resource.data.reviewDueCount} items are ready for quick recall.` : isAuthenticated ? "Loading your due review…" : "Sign in to build a personal review schedule."}</Text></GardenCard>
    {!isAuthenticated && <Button label="Sign in to save practice" onPress={() => router.push("/(auth)/login")} />}
    {isAuthenticated && <ResourceState resource={resource} />}
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginVertical: 12 }}>
      {[{ title: "Listen", id: "listening", detail: "Audio, dictation & playback" }, { title: "Speak", id: "pronunciation", detail: "Phonemes, rhythm & recording" }, { title: "Read", id: "stories", detail: "Stories & vocabulary in context" }, { title: "Write", id: "writing", detail: "Canvas, revision & rubric" }].map((item, i) => <View key={item.id} style={{ width: "48%" }}><LinkCard title={item.title} detail={item.detail} blue={i % 2 === 1} onPress={() => item.id === "stories" ? section("stories") : tool(item.id)} /></View>)}
    </View>
    <Button primary label="Review vocabulary" onPress={() => section("review")} />
    <LinkCard title="My vocabulary" detail="Personal deck and card CRUD · CSV / JSON import" onPress={() => section("vocabulary")} />
    <LinkCard title="Browse all study tools" detail="Grammar, verbs, word maps, city, café & transit" onPress={() => section("tools")} />
    <LinkCard title="Offline downloads" detail="Your classroom on this device" onPress={() => section("downloads")} />
    <LinkCard title="Bookmark shelf" onPress={() => section("bookmarks")} />
    <LinkCard title="Learning calendar" detail="Plan sessions and view your activity" onPress={() => router.push("/planner")} />
    <LinkCard title="Weekly activity" onPress={() => router.push("/learning/insights")} />
    {!!resource.data?.suggestions.length && <Section>FOR YOUR NEXT LITTLE STEP</Section>}
    {resource.data?.suggestions.map(item => <LinkCard key={`${item.kind}-${item.id}`} title={item.title} detail={item.kind} onPress={() => item.kind === "story" ? router.push({ pathname: "/stories/[storyId]", params: { storyId: item.id } }) : section("review")} />)}
  </PracticePage>;
}
