import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../services/api";
import { getDeviceTimeZone } from "./onboarding.service";
import { loadOnboardingDraft, saveOnboardingDraft } from "./onboarding.storage";
import type {
  OnboardingDraft,
  PlacementAttemptResult,
} from "./onboarding.types";
import { PlacementTestModal } from "./PlacementTestModal";

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TOTAL_STEPS = 8;

const COURSE_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "fr", label: "French" },
];

const APP_LANGUAGES = [
  { id: "en", label: "English", sublabel: "Default" },
  { id: "vi", label: "Tiếng Việt", sublabel: "Vietnamese" },
  { id: "es", label: "Español", sublabel: "Spanish" },
  { id: "fr", label: "Français", sublabel: "French" },
];

const MOTIVATIONS = [
  {
    id: "people",
    label: "People",
    icon: "people-outline" as const,
    desc: "Everyday conversations",
    color: "#236c19",
    backgroundColor: "#eaf8de",
  },
  {
    id: "career",
    label: "Career",
    icon: "briefcase-outline" as const,
    desc: "Study and work",
    color: "#2876bd",
    backgroundColor: "#f7faf6",
  },
  {
    id: "explore",
    label: "Explore",
    icon: "compass-outline" as const,
    desc: "Travel and discovery",
    color: "#236c19",
    backgroundColor: "#f7faf6",
  },
  {
    id: "curiosity",
    label: "Curiosity",
    icon: "leaf-outline" as const,
    desc: "A love of languages",
    color: "#2876bd",
    backgroundColor: "#f7faf6",
  },
];

const STARTING_LEVELS: Array<{
  id: "A1" | "A2" | "B1" | "B2";
  label: "A0" | "A1" | "A2" | "B1";
  desc: string;
}> = [
  { id: "A1", label: "A0", desc: "New" },
  { id: "A2", label: "A1", desc: "Words" },
  { id: "B1", label: "A2", desc: "Talks" },
  { id: "B2", label: "B1", desc: "Ideas" },
];
const LEVEL_STEP_HEIGHTS = [110, 158, 206, 254];

const DAILY_GOALS = [
  { minutes: 5, label: "5 min" },
  { minutes: 10, label: "10 min" },
  { minutes: 15, label: "15 min" },
  { minutes: 20, label: "20 min" },
];

const DAILY_TIME_BUDGETS = [5, 10, 15, 20, 30];

const STUDY_TIME_OPTIONS = [
  { label: "Morning", time: "08:00" },
  { label: "Lunch", time: "12:30" },
  { label: "Evening", time: "20:00" },
];

const REMINDER_TIME_PRESETS = ["07:30", "08:30", "12:30", "18:00", "20:00", "21:30"];

const DAYS_OF_WEEK = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

const COMPANIONS = [
  {
    id: "flo-sprout",
    name: "Sprout Flo",
    role: "Gentle & Encouraging",
    icon: "leaf" as const,
    desc: "Celebrates every win and keeps daily practice cheerful and light.",
    color: "#236c19",
    bgColor: "#eaf8de",
  },
  {
    id: "flo-classic",
    name: "Classic Flo",
    role: "Balanced Guide",
    icon: "flower" as const,
    desc: "Steady companion providing clear direction and friendly guidance.",
    color: "#185fb8",
    bgColor: "#e8f1fc",
  },
  {
    id: "flo-mentor",
    name: "Mentor Flo",
    role: "Focused & Analytical",
    icon: "ribbon" as const,
    desc: "Challenges you to stretch your skills and conquer complex nuances.",
    color: "#6929c4",
    bgColor: "#f4ecfb",
  },
];

const PROMISE_PRESETS = [
  "I promise to spend a few minutes each day cultivating my skills.",
  "I commit to practicing consistently and embracing mistakes as learning moments.",
  "I will nurture my language garden one day at a time with patience.",
  "I pledge to make language learning an inspiring daily habit.",
];

const DEFAULT_DRAFT: OnboardingDraft = {
  appLanguage: "en",
  courseLanguage: "en",
  motivation: "people",
  startingLevel: "A1",
  placementAttempt: null,
  placementAnswers: null,
  dailyGoalMinutes: 15,
  dailyTimeBudgetMinutes: 15,
  reminderEnabled: true,
  reminderTime: "20:00",
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  timezone: getDeviceTimeZone(),
  learningPromise: "I promise to spend a few minutes each day cultivating my skills.",
  floCompanion: "flo-sprout",
};

export function OnboardingWizard() {
  const router = useRouter();
  const { isAuthenticated, completeOnboarding } = useAuth();

  const [step, setStep] = useState<StepNumber>(1);
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);
  const [unavailableLanguage, setUnavailableLanguage] = useState<string | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState("20:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing draft if present
  useEffect(() => {
    let isMounted = true;
    loadOnboardingDraft()
      .then((saved) => {
        if (!isMounted || !saved) return;
        setDraft((prev) => ({
          ...prev,
          ...saved,
          courseLanguage: saved.courseLanguage === "en" ? "en" : prev.courseLanguage,
          appLanguage: saved.appLanguage || prev.appLanguage,
          motivation: MOTIVATIONS.some((item) => item.id === saved.motivation)
            ? saved.motivation
            : prev.motivation,
          startingLevel: saved.startingLevel || prev.startingLevel,
          placementAnswers: saved.placementAnswers ?? null,
          dailyGoalMinutes: saved.dailyGoalMinutes || prev.dailyGoalMinutes,
          dailyTimeBudgetMinutes:
            saved.dailyTimeBudgetMinutes || prev.dailyTimeBudgetMinutes,
          reminderTime: saved.reminderTime || prev.reminderTime,
          reminderDays:
            saved.reminderDays && saved.reminderDays.length > 0
              ? saved.reminderDays
              : prev.reminderDays,
          timezone: saved.timezone || getDeviceTimeZone(),
          learningPromise: saved.learningPromise || prev.learningPromise,
          floCompanion: saved.floCompanion || prev.floCompanion,
        }));
        if (saved.reminderTime) {
          setCustomTimeInput(saved.reminderTime);
        }
      })
      .catch(() => {
        // Continue with defaults
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync draft to persistent storage whenever it changes
  function updateDraft(updater: (prev: OnboardingDraft) => OnboardingDraft) {
    setDraft((prev) => {
      const next = updater(prev);
      saveOnboardingDraft(next).catch(() => {});
      return next;
    });
  }

  function handleBack() {
    if (step > 1) {
      setStep((prev) => (prev - 1) as StepNumber);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(auth)/welcome");
      }
    }
  }

  function handleNext() {
    setError(null);
    if (step === 6) {
      // Validate time format before proceeding
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      const effectiveTime = customTimeInput;
      if (draft.reminderEnabled && !timeRegex.test(effectiveTime)) {
        setError("Please enter a valid reminder time in HH:MM format (e.g. 20:00).");
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as StepNumber);
    }
  }

  function handlePlacementAccepted(
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    attemptResult: PlacementAttemptResult,
    answers: Array<{ questionId: string; optionId: string }>,
  ) {
    updateDraft((prev) => ({
      ...prev,
      startingLevel: level,
      placementAttempt: attemptResult,
      placementAnswers: answers.length > 0 ? answers : null,
    }));
  }

  async function handleCompleteAuthenticated() {
    setIsSubmitting(true);
    setError(null);
    try {
      await saveOnboardingDraft(draft);
      await completeOnboarding(draft);
      router.replace("/(tabs)/learn");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Could not complete onboarding. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGuestContinue() {
    setIsSubmitting(true);
    setError(null);
    try {
      await saveOnboardingDraft(draft);
      router.replace("/(tabs)/learn");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save guest preferences.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGuestRegister() {
    setIsSubmitting(true);
    setError(null);
    try {
      await saveOnboardingDraft(draft);
      router.push("/(auth)/register");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not navigate to registration.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerEyebrow}>YOUR PERSONAL SETUP</Text>
      </View>

      {/* Main Step Container */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, (step === 2 || step === 3) && styles.motivationScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: LANGUAGES */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What would you like to{ "\n" }learn?</Text>
            <Text style={styles.stepSubtitle}>
              Choose your first course. You can change it anytime.
            </Text>
            <View style={styles.courseOptions}>
              {COURSE_LANGUAGES.map((item) => {
                const isSelected = draft.courseLanguage === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Learn ${item.label}`}
                    onPress={() => {
                      if (item.id !== "en") {
                        setUnavailableLanguage(item.label);
                        return;
                      }
                      updateDraft((prev) => ({ ...prev, courseLanguage: item.id }));
                    }}
                    style={({ pressed }) => [
                      styles.courseOption,
                      isSelected && styles.courseOptionSelected,
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <Text style={[styles.courseOptionText, isSelected && styles.courseOptionTextSelected]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.appLanguageNote}>
              App language: {APP_LANGUAGES.find((language) => language.id === draft.appLanguage)?.label ?? "English"} / Tiếng Việt
            </Text>
          </View>
        )}

        {/* STEP 2: MOTIVATION */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, styles.motivationStepTitle]}>What brings you here?</Text>
            <Text style={[styles.stepSubtitle, styles.motivationStepSubtitle]}>
              We'll shape your learning around what matters to you.
            </Text>

            <View style={styles.motivationGrid}>
              {MOTIVATIONS.map((item) => {
                const isSelected = draft.motivation === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={item.label}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        motivation: item.id,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.motivationCard,
                      { backgroundColor: isSelected ? "#eaf8de" : item.backgroundColor },
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <View
                      style={[styles.motivationIconCircle, { backgroundColor: item.color }]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={17}
                        color="#ffffff"
                      />
                    </View>
                    <Text style={styles.motivationTitle}>{item.label}</Text>
                    <Text style={styles.motivationDescription}>{item.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.motivationHint}>
              Choose what you want to do with {COURSE_LANGUAGES.find((language) => language.id === draft.courseLanguage)?.label ?? "English"}.
            </Text>
          </View>
        )}

        {/* STEP 3: STARTING LEVEL & PLACEMENT TEST */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, styles.motivationStepTitle]}>What's your starting point?</Text>
            <Text style={[styles.stepSubtitle, styles.motivationStepSubtitle]}>
              No experience needed. We'll take it one step at a time.
            </Text>

            <View style={styles.levelTask}>
              <Text style={styles.levelRampLabel}>YOUR FIRST CEFR STEP</Text>
              <View style={styles.levelRamp}>
                {STARTING_LEVELS.map((level, index) => {
                  const isSelected = draft.startingLevel === level.id ||
                    (index === STARTING_LEVELS.length - 1 && (draft.startingLevel === "C1" || draft.startingLevel === "C2"));
                return (
                  <Pressable
                    key={level.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Level ${level.label}, ${level.desc}`}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        startingLevel: level.id,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.levelStep,
                      { left: index * 87, height: LEVEL_STEP_HEIGHTS[index] },
                      isSelected && styles.levelStepSelected,
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <Text style={styles.levelStepTitle}>{level.label}</Text>
                    <Text style={styles.levelStepCopy}>{level.desc}</Text>
                  </Pressable>
                );
                })}
              </View>
              <View style={styles.levelReassurance}>
                <Text style={styles.levelReassuranceTitle}>No test pressure</Text>
                <Text style={styles.levelReassuranceCopy}>Choose the highest step you feel comfortable with.</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setIsPlacementModalOpen(true)} style={styles.placementTestLink}>
              <Text style={styles.placementTestLinkText}>{draft.placementAttempt ? "Review placement test" : "Take a 5-minute placement test"}</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 4: DAILY GOAL */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>A little, every day</Text>
            <Text style={styles.stepSubtitle}>Choose a daily goal that fits your schedule.</Text>

            <View style={styles.minuteRing} accessibilityLabel={`${draft.dailyGoalMinutes} minutes per day`}>
              <View style={styles.minuteRingInner}>
                <Text style={styles.minuteRingValue}>{draft.dailyGoalMinutes}</Text>
                <Text style={styles.minuteRingCaption}>minutes / day</Text>
              </View>
            </View>

            <Text style={styles.minuteMotto}>A steady little habit</Text>
            <View style={styles.minutesOptionsRow}>
              {DAILY_GOALS.map((goal) => {
                const selected = draft.dailyGoalMinutes === goal.minutes;
                return (
                  <Pressable
                    key={goal.minutes}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${goal.minutes} minutes per day`}
                    onPress={() => updateDraft((prev) => ({ ...prev, dailyGoalMinutes: goal.minutes }))}
                    style={[styles.minuteOption, selected && styles.minuteOptionSelected]}
                  >
                    <Text style={[styles.minuteOptionText, selected && styles.minuteOptionTextSelected]}>{goal.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.weekPreviewTitle}>YOUR WEEK AT THIS PACE</Text>
            <View style={styles.weekPreview}>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <View key={`${day}-${index}`} style={styles.weekPreviewDay}>
                  <View style={[styles.weekPreviewBar, { height: 42 + (index % 3) * 8 }]} />
                  <Text style={styles.weekPreviewLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 5: DAILY TIME BUDGET */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Daily time budget</Text>
            <Text style={styles.stepSubtitle}>Choose a rhythm you can keep alongside your daily goal.</Text>

            <View style={styles.budgetRing} accessibilityLabel={`${draft.dailyTimeBudgetMinutes} minutes daily time budget`}>
              <View style={styles.budgetRingInner}>
                <Text style={styles.budgetRingValue}>{draft.dailyTimeBudgetMinutes}</Text>
                <Text style={styles.budgetRingCaption}>minutes / day</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Choose your time budget</Text>
            <View style={styles.minutesOptionsRow}>
              {DAILY_TIME_BUDGETS.map((minutes) => {
                const selected = draft.dailyTimeBudgetMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${minutes} minutes daily time budget`}
                    onPress={() => updateDraft((prev) => ({ ...prev, dailyTimeBudgetMinutes: minutes }))}
                    style={[styles.minuteOption, selected && styles.minuteOptionSelected]}
                  >
                    <Text style={[styles.minuteOptionText, selected && styles.minuteOptionTextSelected]}>{minutes} min</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Choose a time of day</Text>
            <View style={styles.cardsColumn}>
              {STUDY_TIME_OPTIONS.map((option) => {
                const selected = draft.reminderTime === option.time;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.label}, ${option.time}`}
                    onPress={() => {
                      setCustomTimeInput(option.time);
                      updateDraft((prev) => ({ ...prev, reminderTime: option.time }));
                    }}
                    style={({ pressed }) => [styles.timeOfDayCard, selected && styles.selectionCardSelected, pressed && styles.selectionCardPressed]}
                  >
                    <View style={styles.cardTextContainer}>
                      <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{option.label}</Text>
                      <Text style={styles.cardDesc}>{selected ? "Selected" : `Tap to choose · ${option.time}`}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color="#236c19" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 6: STUDY REMINDER */}
        {step === 6 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Build Your Study Habit</Text>
            <Text style={styles.stepSubtitle}>
              Smart reminders help protect your learning streak and keep your garden thriving.
            </Text>

            {/* Toggle Card */}
            <View style={styles.reminderToggleCard}>
              <View style={styles.reminderToggleInfo}>
                <Ionicons
                  name={
                    draft.reminderEnabled
                      ? "notifications"
                      : "notifications-off-outline"
                  }
                  size={24}
                  color={draft.reminderEnabled ? "#236c19" : "#65766c"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderToggleTitle}>Daily Reminders</Text>
                  <Text style={styles.reminderToggleDesc}>
                    Receive a friendly nudge when it is time to practice
                  </Text>
                </View>
              </View>
              <Switch
                value={draft.reminderEnabled}
                onValueChange={(val) =>
                  updateDraft((prev) => ({
                    ...prev,
                    reminderEnabled: val,
                  }))
                }
                trackColor={{ false: "#d8dfda", true: "#b1dca5" }}
                thumbColor={draft.reminderEnabled ? "#236c19" : "#f4f6f4"}
              />
            </View>

            {draft.reminderEnabled && (
              <>
                {/* Reminder Time Selection */}
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                  Preferred Reminder Time
                </Text>
                <View style={styles.timePresetsGrid}>
                  {REMINDER_TIME_PRESETS.map((preset) => {
                    const isSelected = draft.reminderTime === preset;
                    return (
                      <Pressable
                        key={preset}
                        accessibilityRole="button"
                        accessibilityLabel={`Set reminder for ${preset}`}
                        onPress={() => {
                          setCustomTimeInput(preset);
                          updateDraft((prev) => ({
                            ...prev,
                            reminderTime: preset,
                          }));
                        }}
                        style={({ pressed }) => [
                          styles.timeChip,
                          isSelected && styles.timeChipSelected,
                          pressed && styles.selectionCardPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            isSelected && styles.timeChipTextSelected,
                          ]}
                        >
                          {preset}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Time Input */}
                <View style={styles.customTimeRow}>
                  <Text style={styles.customTimeLabel}>Or set custom time:</Text>
                  <TextInput
                    value={customTimeInput}
                    placeholder="20:00"
                    placeholderTextColor="#95a49c"
                    maxLength={5}
                    onChangeText={(val) => {
                      setCustomTimeInput(val);
                      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
                        updateDraft((prev) => ({
                          ...prev,
                          reminderTime: val,
                        }));
                      }
                    }}
                    style={styles.timeInput}
                  />
                </View>

                {/* Reminder Days */}
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                  Active Practice Days
                </Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((item) => {
                    const isChecked = draft.reminderDays.includes(item.day);
                    return (
                      <Pressable
                        key={item.day}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isChecked }}
                        accessibilityLabel={`Practice on ${item.label}`}
                        onPress={() =>
                          updateDraft((prev) => {
                            const newDays = isChecked
                              ? prev.reminderDays.filter((d) => d !== item.day)
                              : [...prev.reminderDays, item.day].sort();
                            return { ...prev, reminderDays: newDays };
                          })
                        }
                        style={({ pressed }) => [
                          styles.dayChip,
                          isChecked && styles.dayChipChecked,
                          pressed && styles.selectionCardPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            isChecked && styles.dayChipTextChecked,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* STEP 7: LEARNING PROMISE & FLO COMPANION */}
        {step === 7 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Learning Promise & Companion</Text>
            <Text style={styles.stepSubtitle}>
              Pledge your commitment and choose a Flo companion to guide your pathway.
            </Text>

            {/* Learning Promise */}
            <Text style={styles.sectionLabel}>Your Learning Promise</Text>
            <View style={styles.promiseInputCard}>
              <TextInput
                value={draft.learningPromise}
                multiline
                numberOfLines={3}
                placeholder="Write your personal commitment..."
                placeholderTextColor="#95a49c"
                maxLength={200}
                onChangeText={(val) =>
                  updateDraft((prev) => ({
                    ...prev,
                    learningPromise: val,
                  }))
                }
                style={styles.promiseTextInput}
              />
              <Text style={styles.promiseCharCount}>
                {draft.learningPromise.length}/200
              </Text>
            </View>

            {/* Promise suggestions */}
            <Text style={styles.promisePresetsLabel}>Inspiring suggestions:</Text>
            <View style={styles.promisePresetsList}>
              {PROMISE_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  accessibilityRole="button"
                  accessibilityLabel="Use this promise preset"
                  onPress={() =>
                    updateDraft((prev) => ({
                      ...prev,
                      learningPromise: preset,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.promisePresetChip,
                    draft.learningPromise === preset &&
                      styles.promisePresetChipSelected,
                    pressed && styles.selectionCardPressed,
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={14}
                    color={
                      draft.learningPromise === preset ? "#236c19" : "#65766c"
                    }
                  />
                  <Text
                    style={[
                      styles.promisePresetText,
                      draft.learningPromise === preset &&
                        styles.promisePresetTextSelected,
                    ]}
                  >
                    "{preset}"
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Flo Companion Selection */}
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
              Choose Your Flo Companion
            </Text>
            <View style={styles.cardsColumn}>
              {COMPANIONS.map((companion) => {
                const isSelected = draft.floCompanion === companion.id;
                return (
                  <Pressable
                    key={companion.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={companion.name}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        floCompanion: companion.id,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.selectionCard,
                      isSelected && styles.selectionCardSelected,
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.companionIconCircle,
                        { backgroundColor: companion.bgColor },
                      ]}
                    >
                      <Ionicons
                        name={companion.icon}
                        size={22}
                        color={companion.color}
                      />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <View style={styles.companionTitleRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            isSelected && styles.cardTitleSelected,
                          ]}
                        >
                          {companion.name}
                        </Text>
                        <Text style={styles.companionRoleBadge}>
                          {companion.role}
                        </Text>
                      </View>
                      <Text style={styles.cardDesc}>{companion.desc}</Text>
                    </View>
                    <Ionicons
                      name={
                        isSelected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={22}
                      color={isSelected ? "#236c19" : "#a1b1a7"}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 8: REVIEW & COMPLETION */}
        {step === 8 && (
          <View style={styles.stepContainer}>
            <View style={styles.reviewHeaderBadge}>
              <Ionicons name="sparkles" size={28} color="#236c19" />
            </View>
            <Text style={styles.stepTitle}>You're All Set!</Text>
            <Text style={styles.stepSubtitle}>
              Review your customized learning plan before taking your first step.
            </Text>

            {/* Plan Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your Personalized Plan</Text>

              <View style={styles.summaryItem}>
                <Ionicons name="language" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Target Language:</Text>
                <Text style={styles.summaryValue}>
                  {COURSE_LANGUAGES.find((language) => language.id === draft.courseLanguage)?.label ?? "English"}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="speedometer-outline" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Starting Level:</Text>
                <Text style={styles.summaryValue}>
                  {draft.startingLevel ?? "A1"}
                  {draft.placementAttempt ? " (Placement Verified)" : ""}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="compass-outline" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Primary Goal:</Text>
                <Text style={styles.summaryValue}>
                  {MOTIVATIONS.find((m) => m.id === draft.motivation)?.label ??
                    draft.motivation}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Daily Goal:</Text>
                <Text style={styles.summaryValue}>
                  {draft.dailyGoalMinutes} minutes / day
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="hourglass-outline" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Time Budget:</Text>
                <Text style={styles.summaryValue}>{draft.dailyTimeBudgetMinutes} minutes / day</Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="notifications-outline" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Study Reminder:</Text>
                <Text style={styles.summaryValue}>
                  {draft.reminderEnabled
                    ? `${draft.reminderTime ?? "20:00"} (${
                        draft.reminderDays.length === 7
                          ? "Every day"
                          : `${draft.reminderDays.length} days/week`
                      })`
                    : "Off"}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="flower-outline" size={18} color="#236c19" />
                <Text style={styles.summaryLabel}>Companion:</Text>
                <Text style={styles.summaryValue}>
                  {COMPANIONS.find((c) => c.id === draft.floCompanion)?.name ??
                    "Sprout Flo"}
                </Text>
              </View>

              <View style={styles.summaryPromiseBox}>
                <Text style={styles.summaryPromiseLabel}>Pledge:</Text>
                <Text style={styles.summaryPromiseText}>
                  "{draft.learningPromise}"
                </Text>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#b42318" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Completion Actions */}
            {isAuthenticated ? (
              <View style={styles.completionActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Complete onboarding and start learning"
                  disabled={isSubmitting}
                  onPress={handleCompleteAuthenticated}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isSubmitting && styles.disabledButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Start Learning Now
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.completionActions}>
                <View style={styles.guestNoticeCard}>
                  <Ionicons name="person-add-outline" size={20} color="#236c19" />
                  <Text style={styles.guestNoticeText}>
                    Create a free account to save your streak and progress across devices.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create account to save progress"
                  disabled={isSubmitting}
                  onPress={handleGuestRegister}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isSubmitting && styles.disabledButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Create Account to Save Progress
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue as guest"
                  disabled={isSubmitting}
                  onPress={handleGuestContinue}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    isSubmitting && styles.disabledButton,
                    pressed && styles.outlineButtonPressed,
                  ]}
                >
                  <Text style={styles.outlineButtonText}>
                    Continue as Guest
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation Bar for Steps 1 through 6 */}
      {step < TOTAL_STEPS && (
        <View style={styles.footerNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            onPress={handleNext}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
          <Text style={styles.footerBrand}>FLUORA · GROW AT YOUR OWN PACE</Text>
        </View>
      )}

      {/* Placement Test Modal Runner */}
      <PlacementTestModal
        visible={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        onAcceptLevel={handlePlacementAccepted}
      />
      <Modal
        visible={unavailableLanguage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setUnavailableLanguage(null)}
      >
        <View style={styles.courseUnavailableBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss course preview dialog"
            onPress={() => setUnavailableLanguage(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.courseUnavailableDialog}>
            <Text style={styles.courseUnavailableTitle}>{unavailableLanguage} preview</Text>
            <Text style={styles.courseUnavailableMessage}>
              This demo includes English lessons. {unavailableLanguage} lessons are not available in this demo.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setUnavailableLanguage(null)}
              style={styles.courseUnavailableButton}
            >
              <Text style={styles.courseUnavailableButtonText}>Back to courses</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  backButton: {
    width: 28,
    height: 32,
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.65,
  },
  backChevron: {
    color: "#236c19",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    lineHeight: 32,
  },
  headerEyebrow: {
    color: "#65766c",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 7,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  motivationScrollContent: {
    paddingTop: 12,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 24,
    fontWeight: "800",
    color: "#20352b",
    lineHeight: 32,
    marginBottom: 15,
  },
  motivationStepTitle: {
    marginBottom: 10,
  },
  stepSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#65766c",
    lineHeight: 24,
    marginBottom: 16,
  },
  motivationStepSubtitle: {
    marginBottom: 14,
  },
  courseOptions: {
    gap: 16,
  },
  courseOption: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  courseOptionSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  courseOptionText: {
    color: "#20352b",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    lineHeight: 24,
  },
  courseOptionTextSelected: {
    color: "#236c19",
  },
  appLanguageNote: {
    color: "#65766c",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 12,
  },
  cardsColumn: {
    gap: 12,
  },
  selectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  selectionCardSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  selectionCardPressed: {
    opacity: 0.85,
  },
  flagEmoji: {
    fontFamily: "Nunito_400Regular",
    fontSize: 28,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: "#1a5113",
  },
  cardDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#65766c",
    lineHeight: 18,
  },
  minuteRing: {
    alignSelf: "center",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 14,
    borderColor: "#58cc02",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  minuteRingInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  minuteRingValue: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 34,
    fontWeight: "800",
  },
  minuteRingCaption: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  minuteMotto: {
    fontFamily: "Nunito_700Bold",
    alignSelf: "center",
    color: "#236c19",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 14,
  },
  minutesOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  minuteOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    borderRadius: 20,
    backgroundColor: "#f4f8f1",
  },
  minuteOptionSelected: {
    backgroundColor: "#eaf8de",
  },
  minuteOptionText: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 12,
    fontWeight: "600",
  },
  minuteOptionTextSelected: {
    color: "#236c19",
    fontWeight: "800",
  },
  weekPreviewTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#65766c",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 26,
    marginBottom: 10,
  },
  weekPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    minHeight: 76,
  },
  weekPreviewDay: {
    alignItems: "center",
    gap: 6,
  },
  weekPreviewBar: {
    width: 28,
    borderRadius: 8,
    backgroundColor: "#58cc02",
  },
  weekPreviewLabel: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 11,
    fontWeight: "600",
  },
  timeOfDayCard: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#d8e8d0",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  budgetRing: {
    alignSelf: "center",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#eaf8de",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  budgetRingInner: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  budgetRingValue: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 34,
    fontWeight: "800",
  },
  budgetRingCaption: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  languagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#dee8d9",
  },
  langChipSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  langChipLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    fontWeight: "600",
    color: "#20352b",
  },
  langChipLabelSelected: {
    color: "#236c19",
    fontWeight: "700",
  },
  motivationIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  motivationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  motivationCard: {
    width: "48.25%",
    height: 146,
    borderRadius: 16,
    padding: 14,
    justifyContent: "flex-start",
  },
  motivationTitle: {
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 2,
  },
  motivationDescription: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 4,
  },
  motivationHint: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 35,
  },
  levelTask: {
    height: 442,
    position: "relative",
    width: "100%",
  },
  levelRampLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    color: "#236c19",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 18,
  },
  levelRamp: {
    position: "absolute",
    top: 76,
    left: 0,
    width: "100%",
    height: 254,
  },
  levelStep: {
    position: "absolute",
    bottom: 0,
    width: 78,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#f7faf6",
    alignItems: "flex-start",
  },
  levelStepSelected: {
    backgroundColor: "#eaf8de",
  },
  levelStepTitle: {
    color: "#236c19",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    lineHeight: 22,
  },
  levelStepCopy: {
    color: "#65766c",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  levelReassurance: {
    position: "absolute",
    top: 358,
    left: 0,
    width: "100%",
    height: 84,
    borderRadius: 16,
    backgroundColor: "#eaf8de",
    padding: 14,
    justifyContent: "center",
  },
  levelReassuranceTitle: {
    color: "#236c19",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    lineHeight: 22,
  },
  levelReassuranceCopy: {
    color: "#65766c",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  placementTestLink: {
    alignSelf: "center",
    height: 32,
    justifyContent: "center",
    marginTop: 12,
  },
  placementTestLinkText: {
    color: "#236c19",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 18,
  },
  placementCalloutCard: {
    backgroundColor: "#f2faee",
    borderColor: "#c5e6b7",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  placementCalloutHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sparkleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  placementCalloutTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 2,
  },
  placementCalloutDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#65766c",
    lineHeight: 18,
  },
  placementResultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  placementResultText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#236c19",
  },
  placementTestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderColor: "#236c19",
    borderWidth: 1.5,
    borderRadius: 12,
    height: 44,
  },
  placementTestButtonPressed: {
    backgroundColor: "#eaf8de",
  },
  placementTestButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
  levelPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#edf2ee",
    alignItems: "center",
    justifyContent: "center",
  },
  levelPillSelected: {
    backgroundColor: "#236c19",
  },
  levelPillText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    fontWeight: "800",
    color: "#47594e",
  },
  levelPillTextSelected: {
    color: "#ffffff",
  },
  goalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  goalTimeBadge: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    fontWeight: "700",
    color: "#236c19",
  },
  reminderToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f9f6",
    borderColor: "#dee8d9",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  reminderToggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  reminderToggleTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 2,
  },
  reminderToggleDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#65766c",
  },
  timePresetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#dee8d9",
  },
  timeChipSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  timeChipText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    fontWeight: "600",
    color: "#20352b",
  },
  timeChipTextSelected: {
    color: "#236c19",
    fontWeight: "700",
  },
  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  customTimeLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#65766c",
  },
  timeInput: {
    fontFamily: "Nunito_700Bold",
    width: 80,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#dee8d9",
    backgroundColor: "#ffffff",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#20352b",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#dee8d9",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipChecked: {
    backgroundColor: "#236c19",
    borderColor: "#236c19",
  },
  dayChipText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    fontWeight: "700",
    color: "#47594e",
  },
  dayChipTextChecked: {
    color: "#ffffff",
  },
  promiseInputCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  promiseTextInput: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#20352b",
    lineHeight: 22,
    minHeight: 64,
  },
  promiseCharCount: {
    fontFamily: "Nunito_400Regular",
    textAlign: "right",
    fontSize: 12,
    color: "#8a9a90",
    marginTop: 4,
  },
  promisePresetsLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    fontWeight: "600",
    color: "#65766c",
    marginBottom: 8,
  },
  promisePresetsList: {
    gap: 8,
  },
  promisePresetChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f7f9f6",
    borderColor: "#e3ece0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  promisePresetChipSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  promisePresetText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#47594e",
    lineHeight: 18,
    flex: 1,
  },
  promisePresetTextSelected: {
    color: "#184b11",
    fontWeight: "600",
  },
  companionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  companionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  companionRoleBadge: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    fontWeight: "700",
    color: "#65766c",
    textTransform: "uppercase",
  },
  reviewHeaderBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eaf8de",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#f5f8f4",
    borderColor: "#d8dfda",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    gap: 12,
  },
  summaryTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    fontWeight: "800",
    color: "#20352b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    fontWeight: "600",
    color: "#65766c",
    width: 140,
  },
  summaryValue: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    fontWeight: "700",
    color: "#20352b",
    flex: 1,
  },
  summaryPromiseBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e1e8e3",
  },
  summaryPromiseLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    fontWeight: "700",
    color: "#65766c",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryPromiseText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: "#20352b",
    fontStyle: "italic",
    lineHeight: 18,
  },
  guestNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eaf8de",
    borderRadius: 12,
    padding: 12,
  },
  guestNoticeText: {
    fontFamily: "Nunito_700Bold",
    flex: 1,
    fontSize: 13,
    color: "#236c19",
    fontWeight: "600",
    lineHeight: 18,
  },
  completionActions: {
    gap: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3f2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    fontFamily: "Nunito_400Regular",
    color: "#b42318",
    fontSize: 13,
    flex: 1,
  },
  footerNav: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 0,
    backgroundColor: "#ffffff",
    gap: 12,
    transform: [{ translateY: 7 }],
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#58cc02",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 20,
    shadowColor: "#236c19",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 3,
  },
  primaryButtonPressed: {
    backgroundColor: "#51b902",
  },
  primaryButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  footerBrand: {
    color: "#65766c",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 0,
  },
  courseUnavailableBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,53,43,0.28)",
    paddingHorizontal: 24,
  },
  courseUnavailableDialog: {
    width: "100%",
    maxWidth: 342,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  courseUnavailableTitle: {
    color: "#20352b",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 24,
    lineHeight: 32,
  },
  courseUnavailableMessage: {
    color: "#20352b",
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  courseUnavailableButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf8de",
    borderColor: "#dee8d9",
    borderWidth: 1,
    borderRadius: 16,
  },
  courseUnavailableButtonText: {
    color: "#236c19",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    lineHeight: 24,
  },
  outlineButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 20,
  },
  outlineButtonPressed: {
    backgroundColor: "#f5f8f4",
  },
  outlineButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
