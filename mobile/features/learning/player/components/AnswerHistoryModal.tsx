import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getLessonAnswers } from "../../activity.service";
import type { UserAnswerHistoryItem } from "../../../../types/learning";

type Props = {
  visible: boolean;
  lessonId: string;
  onClose: () => void;
};

export function AnswerHistoryModal({ visible, lessonId, onClose }: Props) {
  const [answers, setAnswers] = useState<UserAnswerHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && lessonId) {
      setLoading(true);
      setError(null);
      void getLessonAnswers(lessonId)
        .then((res) => setAnswers(res.answers))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Could not load answers."),
        )
        .finally(() => setLoading(false));
    }
  }, [visible, lessonId]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Answer History</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#65766c" />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Verified responses recorded for this lesson session:
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#58cc02" />
              <Text style={styles.loadingText}>Loading answers…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : answers.length === 0 ? (
            <Text style={styles.emptyText}>No answers recorded yet.</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {answers.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.answerCard, item.isCorrect ? styles.correctCard : styles.incorrectCard]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardIndex}>ATTEMPT {index + 1}</Text>
                    <View style={styles.statusRow}>
                      <Ionicons
                        name={item.isCorrect ? "checkmark-circle" : "close-circle"}
                        size={16}
                        color={item.isCorrect ? "#236c19" : "#c62828"}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          item.isCorrect ? styles.statusCorrect : styles.statusIncorrect,
                        ]}
                      >
                        {item.isCorrect ? "Correct" : "Incorrect"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackText}>{item.feedback}</Text>
                  <Text style={styles.scoreText}>Score: {item.score}/100</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneText}>Close</Text>
          </Pressable>
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
    marginBottom: 6,
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
    marginBottom: 16,
  },
  list: {
    maxHeight: 380,
    marginBottom: 16,
  },
  answerCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  correctCard: {
    backgroundColor: "#f7fcf5",
    borderColor: "#d2ebd0",
  },
  incorrectCard: {
    backgroundColor: "#fff8f7",
    borderColor: "#f5d0cc",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardIndex: {
    color: "#65766c",
    fontSize: 10,
    fontWeight: "800",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusCorrect: { color: "#236c19" },
  statusIncorrect: { color: "#c62828" },
  feedbackText: {
    color: "#20352b",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  scoreText: {
    color: "#65766c",
    fontSize: 12,
    marginTop: 4,
  },
  loadingBox: {
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#65766c",
    fontSize: 13,
    marginTop: 8,
  },
  errorBox: {
    padding: 16,
  },
  errorText: {
    color: "#a82c20",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: "#65766c",
    fontSize: 14,
    fontStyle: "italic",
    padding: 16,
    textAlign: "center",
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: "#20352b",
    borderRadius: 14,
    minHeight: 46,
    justifyContent: "center",
  },
  doneText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
