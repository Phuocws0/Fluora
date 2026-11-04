import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { ResourceState, useResource } from "../../features/shared/feature-ui";
import { getHomeSummary, getWeeklyLearningAnalytics } from "../../features/learning/activity.service";
import { profileService } from "../../features/profile/service";
import { font, GardenButton, ProfileAuthGate } from "../../features/profile/garden-ui";
import { useAuth } from "../../features/auth/AuthContext";

const green = "#265E32";
const ink = "#20352B";

function go(section: string) { router.push({ pathname: "/settings/[section]", params: { section } }); }

function ProfileLink({ title, subtitle, onPress, featured = false, last = false }: { title: string; subtitle: string; onPress: () => void; featured?: boolean; last?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.profileLink, featured && styles.profileLinkFeatured, last && styles.profileLinkLast]}>
    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.sub}>{subtitle}</Text></View>
    <Ionicons name="chevron-forward" size={18} color="#236C19" />
  </Pressable>;
}

function Home() {
  const { user } = useAuth();
  const resource = useResource(profileService.profile);
  const progress = useResource(profileService.progress);
  const home = useResource(getHomeSummary);
  const weekly = useResource(getWeeklyLearningAnalytics);
  const learnerName = resource.data?.displayName || user?.displayName || "My profile";
  const weeklyXp = weekly.data?.summary.xp;
  const learningLanguage = home.data?.course?.language;
  const learningLevel = home.data?.course?.level;
  const openLearnerProfile = () => {
    if (user?.id) router.push({ pathname: "/community/users/[userId]", params: { userId: user.id } });
  };

  return <ScreenContainer contentTopPadding={25} fixedFooterBottom={82} fixedFooter={<View style={styles.fixedAction}><GardenButton label="Edit profile" onPress={() => go("edit-profile")} /></View>}>
    <View style={styles.eyebrowRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/learn")} style={styles.backButton}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>YOUR PERSONAL SPACE</Text>
    </View>
    <Text style={styles.profileName}>{learnerName}</Text>
    <Text style={styles.profileMeta}>{learningLanguage ? `Learning ${learningLanguage}` : "Your learning plan"}{learningLevel ? ` · ${learningLevel}` : ""}</Text>
    <ResourceState resource={resource} />
    <ResourceState resource={home} />
    <ResourceState resource={progress} />
    <ResourceState resource={weekly} />
    {resource.data && <>
      <View style={styles.hero}>
        <Image source={require("../../assets/profile-sprout.png")} style={styles.mascot} resizeMode="contain" accessibilityLabel="Flo, the Fluora garden mascot" />
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{progress.data ? `${progress.data.currentStreak} days` : "—"}</Text><Text style={styles.statLabel}>Current streak</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{weeklyXp?.toLocaleString() ?? "—"}</Text><Text style={styles.statLabel}>Weekly XP</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{learningLevel ?? "—"}</Text><Text style={styles.statLabel}>Your level</Text></View>
      </View>
      <ProfileLink featured title="View learner profile" subtitle="Email, learning plan and achievements" onPress={openLearnerProfile} />
      <ProfileLink title="Learning progress" subtitle="Explore your XP and weekly goals" onPress={() => go("analytics")} last />
      <Pressable accessibilityRole="button" onPress={() => go("general")} style={styles.settingsLink}><Text style={styles.settingsLinkText}>Account settings</Text><Text style={styles.settingsChevron}>›</Text></Pressable>
    </>}
  </ScreenContainer>;
}

export default function ProfileScreen() {
  return <ProfileAuthGate inTab><Home /></ProfileAuthGate>;
}

const styles = StyleSheet.create({
  eyebrowRow: { height: 32, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  backButton: { width: 28, height: 32, justifyContent: "center" },
  backText: { color: "#236C19", fontFamily: font.heavy, fontSize: 28, lineHeight: 32 },
  eyebrow: { color: "#65766C", fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  profileName: { color: ink, fontFamily: font.heavy, fontSize: 24, lineHeight: 32 },
  profileMeta: { color: "#6B7F70", fontFamily: font.body, fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 17 },
  hero: { height: 145, backgroundColor: "#EAF8DE", borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mascot: { width: 128, height: 122 },
  sub: { color: "#6B7F70", fontFamily: font.body, fontSize: 12, lineHeight: 18 },
  stats: { flexDirection: "row", gap: 8, marginTop: 13, marginBottom: 13 },
  stat: { flex: 1, height: 82, backgroundColor: "#EAF8DE", borderRadius: 18, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  statValue: { color: green, fontFamily: font.heavy, fontSize: 22, lineHeight: 28 },
  statLabel: { color: "#64766A", fontFamily: font.bold, fontSize: 9, lineHeight: 14, marginTop: 3 },
  profileLink: { minHeight: 100, backgroundColor: "white", borderColor: "#DEE8D9", borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 13 },
  profileLinkFeatured: { backgroundColor: "#EAF8DE" },
  profileLinkLast: { marginBottom: 5 },
  rowTitle: { color: ink, fontFamily: font.bold, fontSize: 15, lineHeight: 22, marginBottom: 3 },
  settingsLink: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingsLinkText: { color: green, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  settingsChevron: { color: green, fontFamily: font.body, fontSize: 24, lineHeight: 28 },
  fixedAction: { paddingBottom: 0 },
});
