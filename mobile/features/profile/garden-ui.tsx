import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode, RefObject } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";

export const garden = {
  ink: "#20352B",
  forest: "#236C19",
  green: "#58CC02",
  mint: "#EAF8DE",
  muted: "#65766C",
  line: "#DEE8D9",
  blue: "#EAF4FF",
};

export const font = {
  body: "Nunito_400Regular",
  bold: "Nunito_700Bold",
  heavy: "Nunito_800ExtraBold",
};

type Action = { label: string; onPress: () => void; disabled?: boolean };
export type GardenTab = "Learn" | "Practice" | "Tutor" | "League" | "Profile";

export function GardenButton({ label, onPress, disabled = false }: Action) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.primary, disabled && { opacity: 0.45 }]}>
    <Text style={styles.primaryText}>{label}</Text>
  </Pressable>;
}

export function ProfileAuthGate({ children, inTab = false }: { children: ReactNode; inTab?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SafeAreaView style={styles.loading}><ActivityIndicator color={garden.forest} /></SafeAreaView>;
  if (!isAuthenticated) return <Page title="Welcome back" back={false} showFooter={!inTab} action={inTab ? undefined : { label: "Sign in", onPress: () => router.push("/(auth)/login") }}>
    <GardenSubtitle>Sign in to open your profile and settings.</GardenSubtitle>
    {inTab && <GardenButton label="Sign in" onPress={() => router.push("/(auth)/login")} />}
  </Page>;
  return <>{children}</>;
}

export function GardenFooter({ activeTab }: { activeTab: GardenTab }) {
  const tabs = [
    { name: "Learn", icon: "home-outline", route: "/(tabs)/learn" },
    { name: "Practice", icon: "book-outline", route: "/(tabs)/practice" },
    { name: "Tutor", icon: "chatbubble-ellipses-outline", route: "/(tabs)/tutor" },
    { name: "League", icon: "trophy-outline", route: "/(tabs)/league" },
    { name: "Profile", icon: "person-outline", route: "/(tabs)/profile" },
  ] as const;
  return <View style={styles.footer}>
    {tabs.map(tab => <Pressable key={tab.name} accessibilityRole="tab" accessibilityState={{ selected: tab.name === activeTab }} onPress={() => router.replace(tab.route)} style={[styles.tab, tab.name === activeTab && styles.activeTab]}>
      <Ionicons name={tab.icon} size={20} color={tab.name === activeTab ? garden.forest : garden.muted} />
      <Text style={[styles.tabText, tab.name === activeTab && { color: garden.forest }]}>{tab.name}</Text>
    </Pressable>)}
  </View>;
}

export function Page({ title, children, back = true, onBack, eyebrow = "YOUR PERSONAL SPACE", action, showFooter = true, activeTab = "Profile", scrollRef }: {
  title: string;
  children: ReactNode;
  back?: boolean;
  onBack?: () => void;
  eyebrow?: string;
  action?: Action;
  showFooter?: boolean;
  activeTab?: GardenTab;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  return <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.breadcrumb}>
          {back && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack ?? (() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}><Text style={styles.back}>‹</Text></Pressable>}
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
      {action && <View style={[styles.action, !showFooter && styles.actionAboveExternalTabs]}><GardenButton {...action} /></View>}
      {showFooter && <GardenFooter activeTab={activeTab} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function GardenCard({ children, tint = "white" }: { children: ReactNode; tint?: string }) {
  return <View style={[styles.card, { backgroundColor: tint }]}>{children}</View>;
}

export function GardenCaption({ children }: { children: ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

export function GardenSubtitle({ children, numberOfLines, compact = false }: { children: ReactNode; numberOfLines?: number; compact?: boolean }) {
  return <Text numberOfLines={numberOfLines} style={[styles.subtitle, compact && styles.subtitleCompact]}>{children}</Text>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  safe: { flex: 1, backgroundColor: "white" },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 8, height: 32, marginBottom: 16 },
  back: { color: garden.forest, fontFamily: font.heavy, fontSize: 28, lineHeight: 32, width: 28 },
  eyebrow: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  title: { color: garden.ink, fontFamily: font.heavy, fontSize: 24, lineHeight: 32, marginBottom: 8 },
  subtitle: { color: garden.muted, fontFamily: font.body, fontSize: 16, lineHeight: 24, marginBottom: 18 },
  subtitleCompact: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  caption: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 16, marginBottom: 12 },
  card: { borderColor: garden.line, borderWidth: 1, borderRadius: 20, padding: 16, marginVertical: 6 },
  primary: { height: 56, backgroundColor: garden.green, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: garden.forest, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 0, elevation: 3 },
  primaryText: { color: garden.ink, fontFamily: font.bold, fontSize: 16, lineHeight: 24 },
  action: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 10, backgroundColor: "white" },
  actionAboveExternalTabs: { paddingBottom: 58 },
  footer: { height: 54, marginHorizontal: 24, marginBottom: 4, borderRadius: 20, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: garden.forest, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tab: { width: 62, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2 },
  activeTab: { backgroundColor: garden.mint },
  tabText: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16 },
});
