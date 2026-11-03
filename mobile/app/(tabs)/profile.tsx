import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Page, ResourceState, SessionGate, useResource } from "../../features/shared/feature-ui";
import { profileService } from "../../features/profile/service";
import { font, GardenButton } from "../../features/profile/garden-ui";

const green = "#265E32";
const ink = "#20352B";

function go(section: string) { router.push({ pathname: "/settings/[section]", params: { section } }); }

function Row({ icon, title, subtitle, section }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; subtitle: string; section: string }) {
  return <Pressable accessibilityRole="button" onPress={() => go(section)} style={styles.row}>
    <View style={styles.icon}><Ionicons name={icon} size={22} color={green} /></View>
    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.sub}>{subtitle}</Text></View>
    <Ionicons name="chevron-forward" size={18} color="#78917E" />
  </Pressable>;
}

function Home() {
  const resource = useResource(profileService.profile);
  const progress = useResource(profileService.progress);

  return <Page title="My profile">
    <Text style={styles.eyebrow}>YOUR PERSONAL SPACE</Text>
    <ResourceState resource={resource} />
    {resource.data && <>
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName}>{resource.data.displayName || "Learner"}</Text>
          <Text style={styles.sub}>Learning with Fluora</Text>
          <Text style={styles.heroCopy}>A little every day adds up. Keep growing with Flo.</Text>
        </View>
        <Image source={require("../../assets/profile-sprout.png")} style={styles.mascot} resizeMode="contain" />
      </View>
      <View style={styles.stats}>
        <Pressable onPress={() => go("analytics")} style={styles.stat}>
          <Text style={styles.statValue}>{progress.data?.currentStreak ?? "—"}</Text>
          <Text style={styles.statLabel}>DAY STREAK</Text>
        </Pressable>
        <Pressable onPress={() => go("analytics")} style={styles.stat}>
          <Text style={styles.statValue}>{progress.data?.xp ?? "—"}</Text>
          <Text style={styles.statLabel}>TOTAL XP</Text>
        </Pressable>
        <Pressable onPress={() => go("analytics")} style={styles.stat}>
          <Text style={styles.statValue}>{progress.data?.completedLessons ?? "—"}</Text>
          <Text style={styles.statLabel}>LESSONS</Text>
        </Pressable>
      </View>
      <Text style={styles.section}>YOUR SPACE</Text>
      <Row icon="person-outline" title="Edit profile" subtitle="Name, bio and photo" section="edit-profile" />
      <Row icon="bar-chart-outline" title="Learning analytics" subtitle="Weekly activity and XP breakdown" section="analytics" />
      <Row icon="settings-outline" title="Account settings" subtitle="Learning, privacy and accessibility" section="general" />
      <Row icon="help-circle-outline" title="Help center" subtitle="Answers and support requests" section="help" />
      <Row icon="download-outline" title="Your data copy" subtitle="Request or download an export" section="exports" />
      <View style={{ marginTop: 18 }}><GardenButton label="Edit profile" onPress={() => go("edit-profile")} /></View>
    </>}
  </Page>;
}

export default function ProfileScreen() {
  return <SessionGate feature="Profile">{() => <Home />}</SessionGate>;
}

const styles = StyleSheet.create({
  eyebrow: { color: green, fontFamily: font.heavy, fontSize: 11, letterSpacing: 2, marginTop: 3, marginBottom: 15 },
  hero: { minHeight: 180, backgroundColor: "#E6F5DF", borderRadius: 28, padding: 22, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  mascot: { width: 135, height: 129, alignSelf: "flex-end" },
  heroName: { color: ink, fontFamily: font.heavy, fontSize: 27, marginBottom: 4 },
  heroCopy: { color: green, fontFamily: font.body, fontSize: 14, lineHeight: 21, marginTop: 16 },
  sub: { color: "#6B7F70", fontFamily: font.body, fontSize: 12, lineHeight: 18 },
  stats: { flexDirection: "row", gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: "#EAF8DE", borderRadius: 18, paddingVertical: 14, alignItems: "center" },
  statValue: { color: green, fontFamily: font.heavy, fontSize: 24 },
  statLabel: { color: green, fontFamily: font.heavy, fontSize: 9, letterSpacing: 0.7 },
  section: { color: "#64766A", fontFamily: font.heavy, fontSize: 11, letterSpacing: 1.5, marginTop: 27, marginBottom: 10 },
  row: { backgroundColor: "#F8FAF6", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 9 },
  rowTitle: { color: ink, fontFamily: font.bold, fontSize: 15, marginBottom: 3 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5F4DC", alignItems: "center", justifyContent: "center" },
});
