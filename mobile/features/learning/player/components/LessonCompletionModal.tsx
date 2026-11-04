import { LearningText as Text } from "../../../../components/LearningText";
import { PreferenceModal as Modal } from "../../../../components/PreferenceModal";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import type { LessonCompletionResult } from "../../../../types/learning";

type Props = {
  visible: boolean;
  lessonTitle: string;
  completionResult: LessonCompletionResult | null;
  onReviewAnswers: () => void;
  onFinish: () => void;
};

export function LessonCompletionModal({
  visible,
  lessonTitle,
  completionResult,
  onReviewAnswers,
  onFinish,
}: Props) {
  if (!completionResult) return null;

  const xpEarned = completionResult.xpEarned;
  const isRepeat = completionResult.alreadyCompleted;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onFinish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
          </View>

          <Text style={styles.title}>Lesson Complete!</Text>
          <Text style={styles.subtitle}>{lessonTitle}</Text>

          <View style={styles.statBox}>
            <Text style={styles.statEyebrow}>XP REWARD</Text>
            <View style={styles.xpRow}>
              <Ionicons name="flash" size={24} color="#e67700" />
              <Text style={styles.xpValue}>+{xpEarned} XP</Text>
            </View>
            {isRepeat ? (
              <View style={styles.repeatBadge}>
                <Ionicons name="information-circle-outline" size={16} color="#65766c" />
                <Text style={styles.repeatText}>
                  Lesson repeated! Practicing reinforces memory (+0 additional XP).
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onReviewAnswers}
              style={styles.reviewButton}
            >
              <Ionicons name="document-text-outline" size={18} color="#236c19" />
              <Text style={styles.reviewText}>Review my answers</Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={onFinish} style={styles.finishButton}>
              <Text style={styles.finishText}>Continue learning</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    maxWidth: 400,
    padding: 24,
    width: "100%",
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    marginBottom: 16,
    width: 80,
  },
  celebrationEmoji: {
    fontFamily: "Nunito_400Regular",
    fontSize: 40,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: "center",
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 18,
    padding: 16,
    width: "100%",
  },
  statEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  xpRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  xpValue: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 28,
    fontWeight: "900",
  },
  repeatBadge: {
    alignItems: "center",
    backgroundColor: "#eaf4ff",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  repeatText: {
    fontFamily: "Nunito_700Bold",
    color: "#1967d2",
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  actions: {
    gap: 10,
    width: "100%",
  },
  reviewButton: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
  },
  reviewText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 14,
    fontWeight: "800",
  },
  finishButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  finishText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});
