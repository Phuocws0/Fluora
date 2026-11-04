import { LearningText as Text } from "../../../components/LearningText";
import { LearningTextInput as TextInput } from "../../../components/LearningText";
import { PreferenceModal as Modal } from "../../../components/PreferenceModal";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentState } from "../../../components/ContentState";
import { useAuth } from "../../auth/AuthContext";
import {
  createPlannerEntry,
  deletePlannerEntry,
  getPlannerEntries,
  updatePlannerEntry,
} from "../activity.service";
import type { PlannerEntry, PlannerInput } from "../../../types/learning";

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function StudyPlannerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlannerEntry | null>(null);
  const [formDate, setFormDate] = useState(getTodayString());
  const [formTime, setFormTime] = useState("18:00");
  const [formDuration, setFormDuration] = useState("30");
  const [formLabel, setFormLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPlannerEntries();
      setEntries(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load planner entries.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { void loadEntries(); }, [loadEntries]));

  const openAddModal = () => {
    setEditingEntry(null);
    setFormDate(getTodayString());
    setFormTime("18:00");
    setFormDuration("30");
    setFormLabel("");
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (entry: PlannerEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormTime(entry.time);
    setFormDuration(String(entry.durationMinutes));
    setFormLabel(entry.label ?? "");
    setFormError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const durationNum = Number(formDuration);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      setFormError("Date must be formatted as YYYY-MM-DD.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(formTime)) {
      setFormError("Time must be formatted as HH:mm (24-hour).");
      return;
    }
    if (!Number.isInteger(durationNum) || durationNum < 1 || durationNum > 480) {
      setFormError("Duration must be between 1 and 480 minutes.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload: PlannerInput = {
        date: formDate,
        time: formTime,
        durationMinutes: durationNum,
        label: formLabel.trim() ? formLabel.trim() : null,
      };

      if (editingEntry) {
        await updatePlannerEntry(editingEntry.id, payload);
      } else {
        await createPlannerEntry(payload);
      }
      setModalVisible(false);
      await loadEntries();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to save planned session.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Remove session?",
      "Are you sure you want to remove this scheduled study session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePlannerEntry(id);
              await loadEntries();
            } catch (cause) {
              Alert.alert(
                "Error",
                cause instanceof Error ? cause.message : "Could not delete session.",
              );
            }
          },
        },
      ],
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.navBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#236c19" />
          </Pressable>
          <Text style={styles.navTitle}>Weekly Study Planner</Text>
        </View>
        <View style={styles.authGateContainer}>
          <ContentState
            title="Sign in required"
            message="Sign in to schedule your learning sessions, set study reminders, and organize your weekly routine."
            actionLabel="Sign in"
            onAction={() => router.push("/(auth)/login")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const totalMinutes = entries.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.navBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#236c19" />
        </Pressable>
        <Text style={styles.navTitle}>Weekly Study Planner</Text>
        <Pressable accessibilityRole="button" onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>PLANNED TIME</Text>
          <Text style={styles.summaryValue}>
            {totalMinutes} min <Text style={styles.summarySub}>({Math.round((totalMinutes / 60) * 10) / 10} hours)</Text>
          </Text>
          <Text style={styles.summaryDesc}>
            {entries.length} study session{entries.length === 1 ? "" : "s"} scheduled in your routine.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#58cc02" size="large" />
            <Text style={styles.loadingText}>Loading study schedule…</Text>
          </View>
        ) : error ? (
          <ContentState
            title="Planner unavailable"
            message={error}
            actionLabel="Try again"
            onAction={() => void loadEntries()}
          />
        ) : entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#c5d6bf" />
            <Text style={styles.emptyTitle}>No sessions scheduled</Text>
            <Text style={styles.emptyDesc}>
              Set a regular time for language practice to build a long-lasting learning habit.
            </Text>
            <Pressable accessibilityRole="button" onPress={openAddModal} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>+ Add First Session</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((item) => (
              <View key={item.id} style={styles.entryCard}>
                <View style={styles.entryMain}>
                  <View style={styles.entryTimeRow}>
                    <Ionicons name="time-outline" size={16} color="#236c19" />
                    <Text style={styles.entryDate}>{item.date}</Text>
                    <Text style={styles.entryTime}>at {item.time}</Text>
                  </View>
                  <Text style={styles.entryTitle}>
                    {item.label || "Language Study Session"}
                  </Text>
                  <Text style={styles.entryDuration}>
                    Duration: {item.durationMinutes} minutes
                  </Text>
                </View>

                <View style={styles.entryActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit session"
                    onPress={() => openEditModal(item)}
                    style={styles.actionIconBtn}
                  >
                    <Ionicons name="pencil-outline" size={18} color="#236c19" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete session"
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionIconBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#c62828" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEntry ? "Edit Study Session" : "Schedule Study Session"}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#65766c" />
              </Pressable>
            </View>

            {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

            <Text style={styles.formLabel}>DATE (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.input}
              value={formDate}
              onChangeText={setFormDate}
              placeholder="e.g. 2026-11-03"
              placeholderTextColor="#8d9d94"
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>START TIME (HH:mm, 24-HOUR):</Text>
            <TextInput
              style={styles.input}
              value={formTime}
              onChangeText={setFormTime}
              placeholder="e.g. 19:30"
              placeholderTextColor="#8d9d94"
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>DURATION (MINUTES, 1-480):</Text>
            <TextInput
              style={styles.input}
              value={formDuration}
              onChangeText={setFormDuration}
              keyboardType="numeric"
              placeholder="e.g. 30"
              placeholderTextColor="#8d9d94"
            />

            <Text style={styles.formLabel}>LABEL / GOAL (OPTIONAL):</Text>
            <TextInput
              style={styles.input}
              value={formLabel}
              onChangeText={setFormLabel}
              placeholder="e.g. Unit 1 Grammar & Speaking"
              placeholderTextColor="#8d9d94"
            />

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void handleSave()}
              style={[styles.saveButton, saving && styles.disabledButton]}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingEntry ? "Save Changes" : "Schedule Session"}
                </Text>
              )}
            </Pressable>
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
  navTitle: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 18, fontWeight: "900" },
  addButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  authGateContainer: { flex: 1, justifyContent: "center", padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: "#eaf8de",
    borderColor: "#d2ebd0",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
  },
  summaryEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  summarySub: { fontFamily: "Nunito_700Bold", color: "#65766c", fontSize: 16, fontWeight: "700" },
  summaryDesc: { fontFamily: "Nunito_400Regular", color: "#52625d", fontSize: 13, marginTop: 4 },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, marginTop: 12 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderRadius: 20,
    padding: 32,
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyDesc: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: "#236c19",
    borderRadius: 14,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: { fontFamily: "Nunito_800ExtraBold", color: "#ffffff", fontSize: 14, fontWeight: "800" },
  entriesList: { gap: 12 },
  entryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  entryMain: { flex: 1 },
  entryTimeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  entryDate: { fontFamily: "Nunito_800ExtraBold", color: "#236c19", fontSize: 12, fontWeight: "800" },
  entryTime: { fontFamily: "Nunito_700Bold", color: "#65766c", fontSize: 12, fontWeight: "700" },
  entryTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  entryDuration: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 13, marginTop: 4 },
  entryActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12 },
  actionIconBtn: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  modalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 20, fontWeight: "900" },
  modalError: {
    fontFamily: "Nunito_700Bold",
    backgroundColor: "#fff0ed",
    borderRadius: 10,
    color: "#a82c20",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
    padding: 10,
  },
  formLabel: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#65766c",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    fontFamily: "Nunito_700Bold",
    backgroundColor: "#ffffff",
    borderColor: "#c5d6bf",
    borderRadius: 12,
    borderWidth: 1.5,
    color: "#20352b",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    marginTop: 8,
  },
  saveButtonText: { fontFamily: "Nunito_800ExtraBold", color: "#ffffff", fontSize: 15, fontWeight: "900" },
  disabledButton: { opacity: 0.6 },
});
