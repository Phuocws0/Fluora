import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentState } from "../../../components/ContentState";
import { useAuth } from "../../auth/AuthContext";
import { SkillBaselineSection } from "./SkillBaselineSection";
import { MisconceptionMapSection } from "./MisconceptionMapSection";
import { CanDoEvidenceSection } from "./CanDoEvidenceSection";
import { WeeklyAnalyticsSection } from "./WeeklyAnalyticsSection";

type TabKey = "baseline" | "misconceptions" | "evidence" | "analytics";

export function LearningInsightsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("baseline");

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.navBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#236c19" />
          </Pressable>
          <Text style={styles.navTitle}>Learning Insights</Text>
        </View>
        <View style={styles.authGateContainer}>
          <ContentState
            title="Sign in required"
            message="Sign in to view your skill baseline radar, recurring error patterns, can-do evidence, and activity analytics."
            actionLabel="Sign in"
            onAction={() => router.push("/(auth)/login")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: "baseline", label: "Baseline", icon: "speedometer-outline" },
    { key: "misconceptions", label: "Errors", icon: "alert-circle-outline" },
    { key: "evidence", label: "Can-Do", icon: "checkbox-outline" },
    { key: "analytics", label: "Analytics", icon: "bar-chart-outline" },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.navBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#236c19" />
        </Pressable>
        <Text style={styles.navTitle}>Learning Insights</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Segmented Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? "#236c19" : "#65766c"}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "baseline" && <SkillBaselineSection />}
        {activeTab === "misconceptions" && <MisconceptionMapSection />}
        {activeTab === "evidence" && <CanDoEvidenceSection />}
        {activeTab === "analytics" && <WeeklyAnalyticsSection />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  navBar: {
    alignItems: "center",
    borderBottomColor: "#dee8d9",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: { padding: 4 },
  navTitle: { color: "#20352b", fontSize: 18, fontWeight: "900" },
  authGateContainer: { flex: 1, justifyContent: "center", padding: 24 },
  tabBar: {
    backgroundColor: "#f5f8f4",
    borderBottomColor: "#dee8d9",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabText: { color: "#65766c", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#236c19", fontWeight: "900" },
  content: { padding: 20, paddingBottom: 40 },
});
