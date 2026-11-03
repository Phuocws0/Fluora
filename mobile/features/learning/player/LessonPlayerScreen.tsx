import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentState } from "../../../components/ContentState";
import { useAuth } from "../../auth/AuthContext";
import { getLesson } from "../learning.service";
import { submitExerciseAnswer } from "../activity.service";
import { useLearningResource } from "../useLearningResource";
import { ChoiceExercise } from "./components/ChoiceExercise";
import { SentenceTilesExercise } from "./components/SentenceTilesExercise";
import { TranscriptGapExercise } from "./components/TranscriptGapExercise";
import { MatchingExercise } from "./components/MatchingExercise";
import { SpeakingExercise } from "./components/SpeakingExercise";
import type {
  ExerciseAnswerPayload,
  ExerciseAnswerResult,
  LessonOverview,
} from "../../../types/learning";

export function LessonPlayerScreen() {
  const { lessonId = "" } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: lesson, loading, error, refresh } = useLearningResource(lessonId, getLesson);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Exercise input state per exercise id
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});
  const [tileAnswers, setTileAnswers] = useState<Record<string, string[]>>({});
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<
    Record<string, Array<{ left: string; right: string }>>
  >({});
  const [speakingAnswers, setSpeakingAnswers] = useState<
    Record<string, { transcript: string; score: number }>
  >({});

  // Submission & feedback state
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ExerciseAnswerResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleExit = () => {
    Alert.alert(
      "Exit lesson?",
      "Your progress in this session will not be completed until all exercises are answered.",
      [
        { text: "Keep practicing", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.loadingContainer}>
        <ActivityIndicator color="#58cc02" size="large" />
        <Text style={styles.loadingText}>Loading lesson activities…</Text>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView edges={["top"]} style={styles.errorContainer}>
        <ContentState
          title="Lesson is unavailable"
          message={error ?? "Could not find this lesson."}
          actionLabel="Try again"
          onAction={() => void refresh()}
        />
      </SafeAreaView>
    );
  }

  const exercises = lesson.exercises;
  const currentExercise = exercises[currentIndex];

  if (!currentExercise) {
    return (
      <SafeAreaView edges={["top"]} style={styles.errorContainer}>
        <ContentState
          title="No exercises found"
          message="This lesson does not currently contain any exercises."
          actionLabel="Return"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const exType = currentExercise.type;
  const exId = currentExercise.id;

  // Determine if user has provided an answer to enable "Check Answer"
  let hasProvidedAnswer = false;
  if (exType === "multiple_choice" || exType === "listening_choice") {
    hasProvidedAnswer = Boolean(choiceAnswers[exId]);
  } else if (exType === "sentence_tiles") {
    hasProvidedAnswer = (tileAnswers[exId] ?? []).length > 0;
  } else if (exType === "transcript_gap" || exType === "dictation") {
    hasProvidedAnswer = (gapAnswers[exId] ?? "").trim().length > 0;
  } else if (exType === "matching") {
    hasProvidedAnswer = (matchingAnswers[exId] ?? []).length > 0;
  } else if (exType === "speaking") {
    hasProvidedAnswer = Boolean(speakingAnswers[exId]?.transcript);
  }

  const buildPayload = (): ExerciseAnswerPayload | null => {
    if (exType === "multiple_choice" || exType === "listening_choice") {
      const optionId = choiceAnswers[exId];
      return optionId ? { kind: "choice", optionId } : null;
    }
    if (exType === "sentence_tiles") {
      const tokens = tileAnswers[exId] ?? [];
      return { kind: "sentence_tiles", tokens };
    }
    if (exType === "transcript_gap") {
      return { kind: "transcript_gap", text: gapAnswers[exId] ?? "" };
    }
    if (exType === "dictation") {
      return { kind: "dictation", text: gapAnswers[exId] ?? "" };
    }
    if (exType === "matching") {
      return { kind: "matching", pairs: matchingAnswers[exId] ?? [] };
    }
    if (exType === "speaking") {
      const sp = speakingAnswers[exId] ?? { transcript: currentExercise.prompt, score: 85 };
      return { kind: "speaking", transcript: sp.transcript, score: sp.score };
    }
    return null;
  };

  const handleCheckAnswer = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign in required",
        "Sign in to submit your answer, track progress, and earn XP.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign in", onPress: () => router.push("/(auth)/login") },
        ],
      );
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitExerciseAnswer(exId, payload);
      setFeedback(result);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Could not submit your answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    setFeedback(null);
    setSubmitError(null);
    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed last exercise! We'll integrate full completion modal in Task 4
      Alert.alert("Lesson Complete!", "You answered all activities in this lesson.", [
        { text: "Finish", onPress: () => router.back() },
      ]);
    }
  };

  const handleTryAgain = () => {
    setFeedback(null);
    setSubmitError(null);
  };

  const progressPercent = Math.round(((currentIndex + 1) / exercises.length) * 100);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Exit lesson"
            onPress={handleExit}
            style={styles.exitButton}
          >
            <Ionicons name="close" size={24} color="#65766c" />
          </Pressable>

          <View style={styles.progressBarWrapper}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.stepBadge}>
            {currentIndex + 1}/{exercises.length}
          </Text>
        </View>

        {/* Content Scroll View */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.metaRow}>
            <Text style={styles.lessonBreadcrumb}>
              {lesson.unit.title} › {lesson.title}
            </Text>
          </View>

          <Text style={styles.activityEyebrow}>
            ACTIVITY {currentIndex + 1} · {exType.toLocaleUpperCase().replace(/_/g, " ")}
          </Text>
          <Text style={styles.prompt}>{currentExercise.prompt}</Text>
          {currentExercise.instruction ? (
            <Text style={styles.instruction}>{currentExercise.instruction}</Text>
          ) : null}

          {/* Exercise Mode Renderers */}
          {(exType === "multiple_choice" || exType === "listening_choice") && (
            <ChoiceExercise
              options={currentExercise.options}
              selectedOptionId={choiceAnswers[exId] ?? null}
              onSelect={(optionId) =>
                setChoiceAnswers((prev) => ({ ...prev, [exId]: optionId }))
              }
              disabled={Boolean(feedback) || submitting}
            />
          )}

          {exType === "sentence_tiles" && (
            <SentenceTilesExercise
              content={currentExercise.content}
              tokens={tileAnswers[exId] ?? []}
              onChange={(tokens) => setTileAnswers((prev) => ({ ...prev, [exId]: tokens }))}
              disabled={Boolean(feedback) || submitting}
            />
          )}

          {(exType === "transcript_gap" || exType === "dictation") && (
            <TranscriptGapExercise
              content={currentExercise.content}
              prompt={currentExercise.prompt}
              text={gapAnswers[exId] ?? ""}
              onChange={(text) => setGapAnswers((prev) => ({ ...prev, [exId]: text }))}
              disabled={Boolean(feedback) || submitting}
            />
          )}

          {exType === "matching" && (
            <MatchingExercise
              content={currentExercise.content}
              pairs={matchingAnswers[exId] ?? []}
              onChange={(pairs) => setMatchingAnswers((prev) => ({ ...prev, [exId]: pairs }))}
              disabled={Boolean(feedback) || submitting}
            />
          )}

          {exType === "speaking" && (
            <SpeakingExercise
              content={currentExercise.content}
              prompt={currentExercise.prompt}
              transcript={speakingAnswers[exId]?.transcript ?? ""}
              score={speakingAnswers[exId]?.score ?? 0}
              onChange={(data) => setSpeakingAnswers((prev) => ({ ...prev, [exId]: data }))}
              disabled={Boolean(feedback) || submitting}
            />
          )}

          {submitError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#a82c20" />
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Feedback / Action Bar */}
        <View style={styles.bottomBar}>
          {feedback ? (
            <View
              style={[
                styles.feedbackSheet,
                feedback.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
              ]}
            >
              <View style={styles.feedbackHeader}>
                <Ionicons
                  name={feedback.isCorrect ? "checkmark-circle" : "close-circle"}
                  size={24}
                  color={feedback.isCorrect ? "#236c19" : "#c62828"}
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    feedback.isCorrect
                      ? styles.feedbackTitleCorrect
                      : styles.feedbackTitleIncorrect,
                  ]}
                >
                  {feedback.isCorrect ? "Good work!" : "Not quite"}
                </Text>
              </View>

              {feedback.explanation ? (
                <Text style={styles.feedbackExplanation}>{feedback.explanation}</Text>
              ) : null}

              <View style={styles.feedbackButtons}>
                {!feedback.isCorrect ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleTryAgain}
                    style={styles.tryAgainButton}
                  >
                    <Text style={styles.tryAgainText}>Try again</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={handleContinue}
                  style={[
                    styles.continueButton,
                    feedback.isCorrect
                      ? styles.continueButtonCorrect
                      : styles.continueButtonNeutral,
                  ]}
                >
                  <Text style={styles.continueButtonText}>
                    {currentIndex + 1 < exercises.length ? "Continue" : "Complete Lesson"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasProvidedAnswer || submitting }}
              disabled={!hasProvidedAnswer || submitting}
              onPress={() => void handleCheckAnswer()}
              style={[
                styles.checkButton,
                (!hasProvidedAnswer || submitting) && styles.checkButtonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.checkButtonText}>Check answer</Text>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  keyboardContainer: { flex: 1 },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 12 },
  errorContainer: {
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exitButton: { padding: 4 },
  progressBarWrapper: {
    backgroundColor: "#e5ece2",
    borderRadius: 8,
    flex: 1,
    height: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    backgroundColor: "#58cc02",
    borderRadius: 8,
    height: "100%",
  },
  stepBadge: {
    color: "#65766c",
    fontSize: 12,
    fontWeight: "800",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 20,
  },
  metaRow: { marginBottom: 6 },
  lessonBreadcrumb: {
    color: "#65766c",
    fontSize: 12,
    fontWeight: "700",
  },
  activityEyebrow: {
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  prompt: {
    color: "#20352b",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 6,
  },
  instruction: {
    color: "#52625d",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: "#fff0ed",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    color: "#a82c20",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  bottomBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "#dee8d9",
    borderTopWidth: 1,
    padding: 16,
  },
  checkButton: {
    alignItems: "center",
    backgroundColor: "#58cc02",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
  },
  checkButtonDisabled: {
    backgroundColor: "#e5ece2",
  },
  checkButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  feedbackSheet: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  feedbackCorrect: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  feedbackIncorrect: {
    backgroundColor: "#fff0ed",
    borderColor: "#c62828",
  },
  feedbackHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  feedbackTitleCorrect: {
    color: "#236c19",
  },
  feedbackTitleIncorrect: {
    color: "#c62828",
  },
  feedbackExplanation: {
    color: "#20352b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  tryAgainButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  tryAgainText: {
    color: "#20352b",
    fontSize: 14,
    fontWeight: "800",
  },
  continueButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 2,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
  },
  continueButtonCorrect: {
    backgroundColor: "#236c19",
  },
  continueButtonNeutral: {
    backgroundColor: "#20352b",
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
});
