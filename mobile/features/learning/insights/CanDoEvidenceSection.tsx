import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ContentState } from "../../../components/ContentState";
import {
  createEvidence,
  deleteEvidence,
  getEvidenceList,
  updateEvidence,
} from "../activity.service";
import type { CanDoGoal, EvidenceInput, LearningEvidence } from "../../../types/learning";

export function CanDoEvidenceSection() {
  const [goals, setGoals] = useState<CanDoGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<LearningEvidence | null>(null);
  const [formKind, setFormKind] = useState("speaking_sample");
  const [formSummary, setFormSummary] = useState("");
  const [formReference, setFormReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvidenceList();
      setGoals(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load learning goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGoals();
  }, []);

  const openAddModal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setEditingEvidence(null);
    setFormKind("speaking_sample");
    setFormSummary("");
    setFormReference("");
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (evidence: LearningEvidence) => {
    setSelectedGoalId(evidence.goalId);
    setEditingEvidence(evidence);
    setFormKind(evidence.kind);
    setFormSummary(evidence.summary);
    setFormReference(evidence.reference ?? "");
    setFormError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formKind.trim()) {
      setFormError("Evidence kind is required.");
      return;
    }
    if (!formSummary.trim()) {
      setFormError("Summary of your demonstrated skill is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload: EvidenceInput = {
        kind: formKind.trim(),
        summary: formSummary.trim(),
        reference: formReference.trim() ? formReference.trim() : null,
      };

      if (editingEvidence) {
        await updateEvidence(editingEvidence.id, payload);
      } else if (selectedGoalId) {
        await createEvidence(selectedGoalId, payload);
      }
      setModalVisible(false);
      await fetchGoals();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not save evidence sample.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (evidenceId: string) => {
    Alert.alert(
      "Delete sample?",
      "Are you sure you want to remove this attached evidence sample?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvidence(evidenceId);
              await fetchGoals();
            } catch (cause) {
              Alert.alert(
                "Error",
                cause instanceof Error ? cause.message : "Could not delete evidence.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#58cc02" size="large" />
        <Text style={styles.loadingText}>Loading can-do goals & evidence…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ContentState
        title="Could not load goals"
        message={error}
        actionLabel="Try again"
        onAction={() => void fetchGoals()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Attach verified learning samples (voice notes, written answers, quiz results) to demonstrate mastery of CEFR communicative can-do goals.
      </Text>

      <View style={styles.goalsList}>
        {goals.map((goal) => {
          const sampleCount = goal.evidence.length;
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.badgeRow}>
                  <Text style={styles.codeBadge}>{goal.code}</Text>
                  <Text style={styles.levelSkill}>
                    {goal.level} · {goal.skill.toUpperCase()}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openAddModal(goal.id)}
                  style={styles.addSampleButton}
                >
                  <Ionicons name="add" size={16} color="#236c19" />
                  <Text style={styles.addSampleText}>Attach sample</Text>
                </Pressable>
              </View>

              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDesc}>{goal.description}</Text>

              {sampleCount > 0 ? (
                <View style={styles.samplesArea}>
                  <Text style={styles.samplesHeader}>ATTACHED EVIDENCE ({sampleCount}):</Text>
                  {goal.evidence.map((ev) => (
                    <View key={ev.id} style={styles.evidenceItem}>
                      <View style={styles.evidenceMain}>
                        <Text style={styles.evidenceKind}>
                          {ev.kind.replace(/_/g, " ").toLocaleUpperCase()}
                        </Text>
                        <Text style={styles.evidenceSummary}>{ev.summary}</Text>
                        {ev.reference ? (
                          <Text style={styles.evidenceRef}>Ref: {ev.reference}</Text>
                        ) : null}
                      </View>

                      <View style={styles.evidenceActions}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => openEditModal(ev)}
                          style={styles.iconButton}
                        >
                          <Ionicons name="pencil-outline" size={16} color="#236c19" />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => handleDelete(ev.id)}
                          style={styles.iconButton}
                        >
                          <Ionicons name="trash-outline" size={16} color="#c62828" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Add / Edit Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvidence ? "Edit Evidence Sample" : "Attach Learning Sample"}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#65766c" />
              </Pressable>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <Text style={styles.formLabel}>EVIDENCE KIND:</Text>
            <View style={styles.kindSelector}>
              {[
                { label: "Speaking", val: "speaking_sample" },
                { label: "Writing", val: "written_text" },
                { label: "Lesson Quiz", val: "quiz_result" },
              ].map((item) => (
                <Pressable
                  key={item.val}
                  accessibilityRole="button"
                  onPress={() => setFormKind(item.val)}
                  style={[
                    styles.kindPill,
                    formKind === item.val && styles.kindPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.kindPillText,
                      formKind === item.val && styles.kindPillTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>SAMPLE SUMMARY / NOTES:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formSummary}
              onChangeText={setFormSummary}
              multiline
              placeholder="Describe your demonstrated skill or paste excerpt…"
              placeholderTextColor="#8d9d94"
            />

            <Text style={styles.formLabel}>REFERENCE OR LESSON LINK (OPTIONAL):</Text>
            <TextInput
              style={styles.input}
              value={formReference}
              onChangeText={setFormReference}
              placeholder="e.g. Unit 1 Lesson 2"
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
                  {editingEvidence ? "Update Sample" : "Save Evidence"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 12 },
  subtitle: { color: "#52625d", fontSize: 13, lineHeight: 19 },
  goalsList: { gap: 14 },
  goalCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  goalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeBadge: {
    backgroundColor: "#eaf8de",
    borderRadius: 8,
    color: "#236c19",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelSkill: { color: "#65766c", fontSize: 11, fontWeight: "700" },
  addSampleButton: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addSampleText: { color: "#236c19", fontSize: 11, fontWeight: "800" },
  goalTitle: { color: "#20352b", fontSize: 16, fontWeight: "900", marginTop: 2 },
  goalDesc: { color: "#65766c", fontSize: 13, lineHeight: 18, marginTop: 4 },
  samplesArea: {
    borderTopColor: "#f0f4ee",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  samplesHeader: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  evidenceItem: {
    backgroundColor: "#f7fcf5",
    borderColor: "#dee8d9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    padding: 10,
  },
  evidenceMain: { flex: 1 },
  evidenceKind: { color: "#236c19", fontSize: 10, fontWeight: "800" },
  evidenceSummary: { color: "#20352b", fontSize: 13, fontWeight: "700", marginTop: 2 },
  evidenceRef: { color: "#65766c", fontSize: 11, marginTop: 2 },
  evidenceActions: { flexDirection: "row", gap: 4, paddingLeft: 8 },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
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
    marginBottom: 14,
  },
  modalTitle: { color: "#20352b", fontSize: 20, fontWeight: "900" },
  errorText: {
    backgroundColor: "#fff0ed",
    borderRadius: 10,
    color: "#a82c20",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    padding: 10,
  },
  formLabel: {
    color: "#65766c",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kindSelector: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kindPill: {
    backgroundColor: "#f5f8f4",
    borderRadius: 10,
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  kindPillActive: { backgroundColor: "#236c19" },
  kindPillText: { color: "#65766c", fontSize: 12, fontWeight: "700" },
  kindPillTextActive: { color: "#ffffff", fontWeight: "800" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#c5d6bf",
    borderRadius: 12,
    borderWidth: 1.5,
    color: "#20352b",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: { height: 76, textAlignVertical: "top" },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    marginTop: 6,
  },
  saveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  disabledButton: { opacity: 0.6 },
});
