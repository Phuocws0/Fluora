import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentState } from "../../../components/ContentState";
import { useAuth } from "../../auth/AuthContext";
import { completeMission, getMissionPassport } from "../activity.service";
import type { MissionPassportItem } from "../../../types/learning";

export function MissionPassportScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [missions, setMissions] = useState<MissionPassportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedMission, setSelectedMission] = useState<MissionPassportItem | null>(null);
  const [claiming, setClaiming] = useState(false);

  const loadPassport = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getMissionPassport();
      setMissions(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load mission passport.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { void loadPassport(); }, [loadPassport]));

  const handleClaim = async (missionId: string) => {
    setClaiming(true);
    try {
      await completeMission(missionId);
      Alert.alert("Stamp Claimed! 🎉", "You have officially earned this mission passport stamp!");
      setSelectedMission(null);
      await loadPassport();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not complete mission.";
      Alert.alert("Mission Prerequisite", msg);
    } finally {
      setClaiming(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.navBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#236c19" />
          </Pressable>
          <Text style={styles.navTitle}>Mission Passport</Text>
        </View>
        <View style={styles.authGateContainer}>
          <ContentState
            title="Sign in required"
            message="Sign in to view your earned passport stamps and unlock language missions around town."
            actionLabel="Sign in"
            onAction={() => router.push("/(auth)/login")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = missions.filter((m) => m.completedAt).length;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.navBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#236c19" />
        </Pressable>
        <Text style={styles.navTitle}>Mission Passport</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Passport Hero Banner */}
        <View style={styles.passportHero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroEmoji}>🛂</Text>
          </View>
          <Text style={styles.heroTitle}>Your Fluora Passport</Text>
          <Text style={styles.heroSubtitle}>
            Complete real-world applied language missions to collect official stamps for your passport.
          </Text>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {completedCount} of {missions.length} stamps collected
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#58cc02" size="large" />
            <Text style={styles.loadingText}>Verifying passport stamps…</Text>
          </View>
        ) : error ? (
          <ContentState
            title="Passport unavailable"
            message={error}
            actionLabel="Try again"
            onAction={() => void loadPassport()}
          />
        ) : missions.length === 0 ? (
          <ContentState
            title="No missions available"
            message="Curated missions will appear here when published."
          />
        ) : (
          <View style={styles.missionsGrid}>
            {missions.map((mission) => {
              const isEarned = Boolean(mission.completedAt);
              return (
                <Pressable
                  key={mission.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedMission(mission)}
                  style={[styles.stampCard, isEarned && styles.stampCardEarned]}
                >
                  <View style={[styles.stampIconCircle, isEarned && styles.stampIconEarned]}>
                    <Text style={styles.stampEmoji}>{isEarned ? "🏅" : "🔒"}</Text>
                  </View>
                  <View style={styles.stampInfo}>
                    <Text style={styles.stampCategory}>{mission.category.toLocaleUpperCase()}</Text>
                    <Text style={styles.stampTitle}>{mission.title}</Text>
                    <Text style={styles.stampDesc} numberOfLines={2}>
                      {mission.description}
                    </Text>
                    {isEarned ? (
                      <View style={styles.earnedRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#236c19" />
                        <Text style={styles.earnedDateText}>
                          Earned on {mission.completedAt?.slice(0, 10)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.tapToView}>Tap for instructions ›</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Mission Detail Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selectedMission)}
        onRequestClose={() => setSelectedMission(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedMission ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalCategoryRow}>
                    <Text style={styles.modalCategory}>
                      {selectedMission.category.toLocaleUpperCase()}
                    </Text>
                    {selectedMission.completedAt ? (
                      <View style={styles.modalEarnedBadge}>
                        <Text style={styles.modalEarnedText}>STAMP EARNED</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => setSelectedMission(null)}>
                    <Ionicons name="close" size={24} color="#65766c" />
                  </Pressable>
                </View>

                <Text style={styles.modalTitle}>{selectedMission.title}</Text>
                <Text style={styles.modalDesc}>{selectedMission.description}</Text>

                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsEyebrow}>MISSION INSTRUCTIONS:</Text>
                  <Text style={styles.instructionsText}>{selectedMission.instructions}</Text>
                </View>

                {selectedMission.requiredLessonId && !selectedMission.completedAt ? (
                  <View style={styles.prereqBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#1967d2" />
                    <Text style={styles.prereqText}>
                      Prerequisite: You must complete the linked lesson first before claiming this stamp.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  {!selectedMission.completedAt ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={claiming}
                      onPress={() => void handleClaim(selectedMission.id)}
                      style={[styles.claimButton, claiming && styles.disabledButton]}
                    >
                      {claiming ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.claimButtonText}>Claim Passport Stamp</Text>
                      )}
                    </Pressable>
                  ) : (
                    <View style={styles.completedNotice}>
                      <Ionicons name="checkmark-done" size={20} color="#236c19" />
                      <Text style={styles.completedNoticeText}>
                        Already earned on {selectedMission.completedAt?.slice(0, 10)}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  content: { padding: 20, paddingBottom: 40 },
  passportHero: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    padding: 24,
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    marginBottom: 12,
    width: 60,
  },
  heroEmoji: { fontSize: 30 },
  heroTitle: { color: "#20352b", fontSize: 22, fontWeight: "900" },
  heroSubtitle: {
    color: "#65766c",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  progressPill: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressPillText: { color: "#236c19", fontSize: 12, fontWeight: "800" },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 12 },
  missionsGrid: { gap: 12 },
  stampCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  stampCardEarned: {
    backgroundColor: "#f7fcf5",
    borderColor: "#236c19",
  },
  stampIconCircle: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  stampIconEarned: {
    backgroundColor: "#eaf8de",
  },
  stampEmoji: { fontSize: 24 },
  stampInfo: { flex: 1 },
  stampCategory: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  stampTitle: {
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 2,
  },
  stampDesc: {
    color: "#65766c",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  earnedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  earnedDateText: {
    color: "#236c19",
    fontSize: 11,
    fontWeight: "700",
  },
  tapToView: {
    color: "#236c19",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  modalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalCategoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalCategory: {
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  modalEarnedBadge: {
    backgroundColor: "#eaf8de",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  modalEarnedText: { color: "#236c19", fontSize: 10, fontWeight: "800" },
  modalTitle: { color: "#20352b", fontSize: 22, fontWeight: "900" },
  modalDesc: { color: "#52625d", fontSize: 14, lineHeight: 20, marginTop: 6 },
  instructionsBox: {
    backgroundColor: "#f5f8f4",
    borderRadius: 14,
    marginVertical: 16,
    padding: 14,
  },
  instructionsEyebrow: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  instructionsText: { color: "#20352b", fontSize: 14, lineHeight: 21 },
  prereqBox: {
    alignItems: "center",
    backgroundColor: "#eaf4ff",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  prereqText: {
    color: "#1967d2",
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  modalActions: { marginTop: 4 },
  claimButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
  },
  claimButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  completedNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
  completedNoticeText: { color: "#236c19", fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.6 },
});
