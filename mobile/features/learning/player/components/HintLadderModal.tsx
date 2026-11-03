import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getExerciseHint } from "../../activity.service";
import type { ExerciseHintResult } from "../../../../types/learning";

type Props = {
  visible: boolean;
  exerciseId: string;
  onClose: () => void;
};

export function HintLadderModal({ visible, exerciseId, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [hints, setHints] = useState<ExerciseHintResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHint = async (step: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExerciseHint(exerciseId, step);
      setHints((prev) => [...prev.filter((h) => h.step !== step), res]);
      setCurrentStep(step);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not fetch hint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && exerciseId) {
      setCurrentStep(1);
      setHints([]);
      void fetchHint(1);
    }
  }, [visible, exerciseId]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="bulb-outline" size={22} color="#236c19" />
              <Text style={styles.title}>Hint Ladder</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#65766c" />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Stuck on this activity? Use progressive hints to guide your answer:
          </Text>

          <View style={styles.hintsList}>
            {hints.map((hint) => (
              <View key={hint.step} style={styles.hintCard}>
                <Text style={styles.stepBadge}>STEP {hint.step} OF 3</Text>
                <Text style={styles.hintText}>{hint.text}</Text>
              </View>
            ))}

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#58cc02" />
                <Text style={styles.loadingText}>Fetching next hint…</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.actions}>
            {currentStep < 3 && !loading ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void fetchHint(currentStep + 1)}
                style={styles.moreButton}
              >
                <Text style={styles.moreButtonText}>Need more help? (Step {currentStep + 1})</Text>
              </Pressable>
            ) : null}

            <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Got it, thanks!</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    padding: 22,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: {
    color: "#20352b",
    fontSize: 20,
    fontWeight: "900",
  },
  closeButton: { padding: 4 },
  subtitle: {
    color: "#65766c",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  hintsList: {
    gap: 10,
    marginBottom: 20,
  },
  hintCard: {
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  stepBadge: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hintText: {
    color: "#20352b",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: "#65766c",
    fontSize: 13,
  },
  errorText: {
    color: "#a82c20",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  actions: {
    gap: 10,
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 14,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  moreButtonText: {
    color: "#236c19",
    fontSize: 14,
    fontWeight: "800",
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
