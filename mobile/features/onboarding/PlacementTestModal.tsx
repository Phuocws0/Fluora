import { PreferenceModal as Modal } from "../../components/PreferenceModal";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../services/api";
import {
  getPlacementQuestions,
  submitPlacementAttempt,
} from "./onboarding.service";
import type {
  PlacementAttemptResult,
  PlacementQuestion,
  SkillScore,
} from "./onboarding.types";
import { LocalizedPressable as Pressable, LocalizedText as Text } from "../i18n/i18n";

export type PlacementTestModalProps = {
  visible: boolean;
  onClose: () => void;
  onAcceptLevel: (
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    result: PlacementAttemptResult,
    answers: Array<{ questionId: string; optionId: string }>,
  ) => void;
};

const SKILL_CONFIG: Record<
  string,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
  }
> = {
  vocabulary: {
    label: "Vocabulary",
    icon: "book-outline",
    badgeBg: "#eaf8de",
    badgeText: "#236c19",
    borderColor: "#c4e6b1",
  },
  grammar: {
    label: "Grammar",
    icon: "construct-outline",
    badgeBg: "#e8f1fc",
    badgeText: "#185fb8",
    borderColor: "#b6d4f8",
  },
  reading: {
    label: "Reading",
    icon: "document-text-outline",
    badgeBg: "#fef3e2",
    badgeText: "#a15c00",
    borderColor: "#f8d7a6",
  },
  listening: {
    label: "Listening",
    icon: "headset-outline",
    badgeBg: "#f4ecfb",
    badgeText: "#6929c4",
    borderColor: "#dab8f6",
  },
};

const LEVEL_DESCRIPTIONS: Record<string, { title: string; subtitle: string }> = {
  A1: { title: "Beginner", subtitle: "Basic vocabulary and everyday greetings" },
  A2: { title: "Elementary", subtitle: "Simple expressions and routine communication" },
  B1: { title: "Intermediate", subtitle: "Familiar topics, work, and travel conversations" },
  B2: { title: "Upper Intermediate", subtitle: "Complex discussions and spontaneous expression" },
  C1: { title: "Advanced", subtitle: "Professional and academic fluency" },
  C2: { title: "Mastery", subtitle: "Effortless, native-like command of language" },
};

export function PlacementTestModal({
  visible,
  onClose,
  onAcceptLevel,
}: PlacementTestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PlacementAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (questions.length === 0) {
      loadQuestions();
    }
  }, [visible]);

  async function loadQuestions() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPlacementQuestions();
      setQuestions(response.questions);
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Could not load placement test questions. Please check your connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectOption(optionId: string) {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  async function handleSubmit() {
    const payload = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));

    if (payload.length === 0) {
      setError("Please select an answer to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const attemptResult = await submitPlacementAttempt(payload);
      setResult(attemptResult);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to score placement test. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAccept() {
    if (!result) return;
    const submittedAnswers = questions.flatMap((question) => {
      const optionId = answers[question.id];
      return optionId ? [{ questionId: question.id, optionId }] : [];
    });
    onAcceptLevel(
      result.level,
      result,
      result.attemptId === null ? submittedAnswers : [],
    );
    handleResetAndClose();
  }

  function handleResetAndClose() {
    setResult(null);
    setCurrentIndex(0);
    setAnswers({});
    setError(null);
    onClose();
  }

  function handleRetake() {
    setResult(null);
    setCurrentIndex(0);
    setAnswers({});
    setError(null);
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;
  const progressPercent =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const currentSkillConfig = currentQuestion
    ? SKILL_CONFIG[currentQuestion.skill] ?? SKILL_CONFIG.vocabulary
    : SKILL_CONFIG.vocabulary;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleResetAndClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close placement test"
            onPress={handleResetAndClose}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
          >
            <Ionicons name="close" size={22} color="#20352b" />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Placement Test</Text>
            {!result && questions.length > 0 && (
              <Text style={styles.headerSubtitle}>
                Question {currentIndex + 1} of {questions.length}
              </Text>
            )}
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Top Progress Bar (during quiz) */}
        {!result && questions.length > 0 && !isLoading && (
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        )}

        {/* Body Content */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#236c19" />
            <Text style={styles.loadingText}>Loading placement questions...</Text>
          </View>
        ) : error && !result && questions.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={44} color="#b42318" />
            <Text style={styles.errorTitle}>Could not load test</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading questions"
              onPress={loadQuestions}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : result ? (
          /* Results View */
          <ScrollView
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.trophyCircle}>
              <Ionicons name="sparkles" size={36} color="#236c19" />
            </View>

            <Text style={styles.resultsTitle}>Placement Complete!</Text>
            <Text style={styles.resultsSubtitle}>
              Based on your answers, here is your CEFR baseline recommendation.
            </Text>

            {/* Suggested Level Card */}
            <View style={styles.levelCard}>
              <Text style={styles.levelCardHeader}>Suggested Starting Level</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{result.level}</Text>
              </View>
              <Text style={styles.levelName}>
                {LEVEL_DESCRIPTIONS[result.level]?.title ?? result.level}
              </Text>
              <Text style={styles.levelExplanation}>
                {LEVEL_DESCRIPTIONS[result.level]?.subtitle ??
                  "Recommended baseline for your personalized learning plan."}
              </Text>
            </View>

            {/* Skill Baseline Breakdown Scorecards */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownHeader}>Skill Breakdown</Text>
              <Text style={styles.breakdownSubheader}>
                Performance across core language proficiencies
              </Text>

              <View style={styles.scorecardsGrid}>
                {result.skillBaseline.map((item: SkillScore) => {
                  const config =
                    SKILL_CONFIG[item.skill] ?? SKILL_CONFIG.vocabulary;
                  return (
                    <View key={item.skill} style={styles.scorecard}>
                      <View style={styles.scorecardTopRow}>
                        <View
                          style={[
                            styles.scorecardIconCircle,
                            { backgroundColor: config.badgeBg },
                          ]}
                        >
                          <Ionicons
                            name={config.icon}
                            size={18}
                            color={config.badgeText}
                          />
                        </View>
                        <Text style={styles.scorecardSkillName}>
                          {config.label}
                        </Text>
                        <Text style={styles.scorecardPercent}>
                          {item.score}%
                        </Text>
                      </View>

                      <View style={styles.scorecardBarTrack}>
                        <View
                          style={[
                            styles.scorecardBarFill,
                            {
                              width: `${Math.max(5, item.score)}%`,
                              backgroundColor: config.badgeText,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.scorecardCount}>
                        {item.correct} of {item.total} correct
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.resultsActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Accept suggested level ${result.level}`}
                onPress={handleAccept}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Accept Suggested Level ({result.level})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retake placement test"
                onPress={handleRetake}
                style={({ pressed }) => [
                  styles.outlineButton,
                  pressed && styles.outlineButtonPressed,
                ]}
              >
                <Text style={styles.outlineButtonText}>Retake Test</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : currentQuestion ? (
          /* Question Runner View */
          <ScrollView
            contentContainerStyle={styles.questionContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Skill Badge */}
            <View style={styles.skillBadgeRow}>
              <View
                style={[
                  styles.skillBadge,
                  {
                    backgroundColor: currentSkillConfig.badgeBg,
                    borderColor: currentSkillConfig.borderColor,
                  },
                ]}
              >
                <Ionicons
                  name={currentSkillConfig.icon}
                  size={14}
                  color={currentSkillConfig.badgeText}
                />
                <Text
                  style={[
                    styles.skillBadgeText,
                    { color: currentSkillConfig.badgeText },
                  ]}
                >
                  {currentSkillConfig.label}
                </Text>
              </View>
            </View>

            {/* Question Prompt */}
            <View style={styles.promptCard}>
              <Text style={styles.promptText} translate={false}>{currentQuestion.prompt}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsList}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOptionId === option.id;
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D

                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Option ${optionLetter}: ${option.label}`}
                    onPress={() => handleSelectOption(option.id)}
                    style={({ pressed }) => [
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      pressed && styles.optionCardPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.optionLetterBadge,
                        isSelected && styles.optionLetterBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          isSelected && styles.optionLetterTextSelected,
                        ]}
                      >
                        {optionLetter}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                     translate={false}>
                      {option.label}
                    </Text>

                    <Ionicons
                      name={
                        isSelected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={20}
                      color={isSelected ? "#236c19" : "#a1b1a7"}
                    />
                  </Pressable>
                );
              })}
            </View>

            {error && (
              <View style={styles.errorInline}>
                <Ionicons name="alert-circle" size={16} color="#b42318" />
                <Text style={styles.errorInlineText}>{error}</Text>
              </View>
            )}

            {/* Bottom Navigation */}
            <View style={styles.quizFooter}>
              {currentIndex > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous question"
                  onPress={handlePrevious}
                  style={({ pressed }) => [
                    styles.backNavButton,
                    pressed && styles.outlineButtonPressed,
                  ]}
                >
                  <Ionicons name="arrow-back" size={18} color="#20352b" />
                  <Text style={styles.backNavText}>Back</Text>
                </Pressable>
              ) : (
                <View style={styles.footerSpacing} />
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isLastQuestion ? "Submit test" : "Next question"
                }
                disabled={!selectedOptionId || isSubmitting}
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.nextButtonFlex,
                  (!selectedOptionId || isSubmitting) && styles.disabledButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {isLastQuestion ? "Submit & View Results" : "Next"}
                    </Text>
                    <Ionicons
                      name={isLastQuestion ? "checkmark-done" : "arrow-forward"}
                      size={18}
                      color="#ffffff"
                    />
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f1",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f8f4",
  },
  iconButtonPressed: {
    backgroundColor: "#e8efe6",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
  },
  headerSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#65766c",
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#eaf1ea",
    width: "100%",
  },
  progressBarFill: {
    height: 4,
    backgroundColor: "#236c19",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: "Nunito_400Regular",
    marginTop: 14,
    fontSize: 15,
    color: "#65766c",
  },
  errorTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    fontWeight: "700",
    color: "#20352b",
    marginTop: 12,
  },
  errorMessage: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#65766c",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#236c19",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  skillBadgeRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  skillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillBadgeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    fontWeight: "700",
  },
  promptCard: {
    backgroundColor: "#f7f9f6",
    borderColor: "#e3ece0",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  promptText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    color: "#20352b",
  },
  optionsList: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dce6db",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  optionCardSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  optionCardPressed: {
    opacity: 0.85,
  },
  optionLetterBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#edf2ee",
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterBadgeSelected: {
    backgroundColor: "#236c19",
  },
  optionLetterText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    fontWeight: "700",
    color: "#526759",
  },
  optionLetterTextSelected: {
    color: "#ffffff",
  },
  optionLabel: {
    fontFamily: "Nunito_700Bold",
    flex: 1,
    fontSize: 15,
    color: "#20352b",
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: "#184b11",
    fontWeight: "700",
  },
  errorInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3f2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorInlineText: {
    fontFamily: "Nunito_400Regular",
    color: "#b42318",
    fontSize: 13,
    flex: 1,
  },
  quizFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  backNavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#f5f8f4",
    borderWidth: 1,
    borderColor: "#d8dfda",
  },
  backNavText: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontWeight: "600",
    fontSize: 15,
  },
  footerSpacing: {
    width: 0,
  },
  nextButtonFlex: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#236c19",
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonPressed: {
    backgroundColor: "#1c5714",
  },
  primaryButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  outlineButton: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  outlineButtonPressed: {
    backgroundColor: "#f5f8f4",
  },
  outlineButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 15,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
  trophyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#eaf8de",
    borderWidth: 2,
    borderColor: "#c2e6b0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultsTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 24,
    fontWeight: "800",
    color: "#20352b",
    textAlign: "center",
  },
  resultsSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#65766c",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  levelCard: {
    width: "100%",
    backgroundColor: "#f5f8f4",
    borderColor: "#d8dfda",
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  levelCardHeader: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    fontWeight: "600",
    color: "#65766c",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  levelBadge: {
    backgroundColor: "#236c19",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 8,
    marginVertical: 12,
  },
  levelBadgeText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1,
  },
  levelName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 4,
  },
  levelExplanation: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#65766c",
    textAlign: "center",
    lineHeight: 18,
  },
  breakdownSection: {
    width: "100%",
    marginBottom: 28,
  },
  breakdownHeader: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 4,
  },
  breakdownSubheader: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#65766c",
    marginBottom: 16,
  },
  scorecardsGrid: {
    gap: 12,
  },
  scorecard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 14,
  },
  scorecardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  scorecardIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  scorecardSkillName: {
    fontFamily: "Nunito_700Bold",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#20352b",
  },
  scorecardPercent: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    fontWeight: "800",
    color: "#20352b",
  },
  scorecardBarTrack: {
    height: 6,
    backgroundColor: "#eff3ee",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  scorecardBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scorecardCount: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#65766c",
  },
  resultsActions: {
    width: "100%",
    gap: 12,
  },
});
