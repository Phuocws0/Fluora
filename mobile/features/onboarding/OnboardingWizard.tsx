import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "./onboarding.storage";
import type {
  OnboardingDraft,
  PlacementAttemptResult,
} from "./onboarding.types";
import { PlacementTestModal } from "./PlacementTestModal";

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const TOTAL_STEPS = 7;

const COURSE_LANGUAGES = [
  {
    id: "en",
    label: "English",
    flag: "🇺🇸",
    desc: "Global career, travel, and worldwide communication",
  },
  {
    id: "es",
    label: "Spanish",
    flag: "🇪🇸",
    desc: "Culture, travel, and the Americas & Spain",
  },
];

const APP_LANGUAGES = [
  { id: "en", label: "English", sublabel: "Default" },
  { id: "vi", label: "Tiếng Việt", sublabel: "Vietnamese" },
  { id: "es", label: "Español", sublabel: "Spanish" },
  { id: "fr", label: "Français", sublabel: "French" },
];

const MOTIVATIONS = [
  {
    id: "career",
    label: "Career & Work",
    icon: "briefcase-outline" as const,
    desc: "Unlock new promotions, interviews & global workplace roles",
  },
  {
    id: "travel",
    label: "Travel & Exploration",
    icon: "airplane-outline" as const,
    desc: "Navigate cities, order local food, and connect easily abroad",
  },
  {
    id: "brain",
    label: "Brain Training",
    icon: "fitness-outline" as const,
    desc: "Keep your mind sharp, build memory, and strengthen focus",
  },
  {
    id: "school",
    label: "Education & Studies",
    icon: "school-outline" as const,
    desc: "Excel in exams, academic research, and degree requirements",
  },
  {
    id: "culture",
    label: "Culture & Connection",
    icon: "heart-outline" as const,
    desc: "Connect with family heritage, friends, cinema, and music",
  },
  {
    id: "other",
    label: "Personal Growth & Other",
    icon: "sparkles-outline" as const,
    desc: "Learn for curiosity, mindful daily practice, or a fun hobby",
  },
];

const STARTING_LEVELS: Array<{
  id: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  name: string;
  badge: string;
  desc: string;
}> = [
  {
    id: "A1",
    name: "Beginner",
    badge: "A1",
    desc: "Brand new to the language. Basic greetings, numbers & common words.",
  },
  {
    id: "A2",
    name: "Elementary",
    badge: "A2",
    desc: "Can understand simple everyday phrases and basic routine exchanges.",
  },
  {
    id: "B1",
    name: "Intermediate",
    badge: "B1",
    desc: "Can discuss familiar topics, travel experiences, work, and hobbies.",
  },
  {
    id: "B2",
    name: "Upper Intermediate",
    badge: "B2",
    desc: "Comfortable in conversations and expressing complex points of view.",
  },
  {
    id: "C1",
    name: "Advanced",
    badge: "C1",
    desc: "Fluent and spontaneous in academic, technical, and professional settings.",
  },
  {
    id: "C2",
    name: "Mastery",
    badge: "C2",
    desc: "Effortless, native-like command across nuanced and subtle contexts.",
  },
];

const DAILY_GOALS = [
  {
    minutes: 5,
    label: "Casual",
    time: "5 min / day",
    icon: "leaf-outline" as const,
    desc: "Quick, bite-sized practice to stay in steady flow.",
  },
  {
    minutes: 15,
    label: "Regular",
    time: "15 min / day",
    icon: "flower-outline" as const,
    desc: "Steady, sustainable daily progress (Recommended).",
    isRecommended: true,
  },
  {
    minutes: 30,
    label: "Serious",
    time: "30 min / day",
    icon: "flame-outline" as const,
    desc: "Accelerated growth with deeper lesson immersion.",
  },
  {
    minutes: 60,
    label: "Intense",
    time: "60 min / day",
    icon: "rocket-outline" as const,
    desc: "Maximum momentum for dedicated fluency seekers.",
  },
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
  motivation: "career",
  startingLevel: "A1",
  placementAttempt: null,
  dailyGoalMinutes: 15,
  dailyTimeBudgetMinutes: 15,
  reminderEnabled: true,
  reminderTime: "20:00",
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  learningPromise: "I promise to spend a few minutes each day cultivating my skills.",
  floCompanion: "flo-sprout",
};

export function OnboardingWizard() {
  const router = useRouter();
  const { isAuthenticated, completeOnboarding } = useAuth();

  const [step, setStep] = useState<StepNumber>(1);
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);
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
          courseLanguage: saved.courseLanguage || prev.courseLanguage,
          appLanguage: saved.appLanguage || prev.appLanguage,
          motivation: saved.motivation || prev.motivation,
          startingLevel: saved.startingLevel || prev.startingLevel,
          dailyGoalMinutes: saved.dailyGoalMinutes || prev.dailyGoalMinutes,
          dailyTimeBudgetMinutes:
            saved.dailyTimeBudgetMinutes || prev.dailyTimeBudgetMinutes,
          reminderTime: saved.reminderTime || prev.reminderTime,
          reminderDays:
            saved.reminderDays && saved.reminderDays.length > 0
              ? saved.reminderDays
              : prev.reminderDays,
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
    if (step === 5) {
      // Validate time format before proceeding
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      const effectiveTime = draft.reminderTime ?? customTimeInput;
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
  ) {
    updateDraft((prev) => ({
      ...prev,
      startingLevel: level,
      placementAttempt: attemptResult,
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

  const progressPercent = (step / TOTAL_STEPS) * 100;

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
          <Ionicons name="arrow-back" size={22} color="#20352b" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.stepCounter}>
            Step {step} of {TOTAL_STEPS}
          </Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Progress Bar Track */}
      <View style={styles.progressBarTrack}>
        <View
          style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* Main Step Container */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: LANGUAGES */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Your Languages</Text>
            <Text style={styles.stepSubtitle}>
              Select the language you want to learn and your interface language.
            </Text>

            {/* Course Language */}
            <Text style={styles.sectionLabel}>I want to learn</Text>
            <View style={styles.cardsColumn}>
              {COURSE_LANGUAGES.map((item) => {
                const isSelected = draft.courseLanguage === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Learn ${item.label}`}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        courseLanguage: item.id,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.selectionCard,
                      isSelected && styles.selectionCardSelected,
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <Text style={styles.flagEmoji}>{item.flag}</Text>
                    <View style={styles.cardTextContainer}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isSelected && styles.cardTitleSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.cardDesc}>{item.desc}</Text>
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

            {/* App Interface Language */}
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
              App Interface Language
            </Text>
            <View style={styles.languagesGrid}>
              {APP_LANGUAGES.map((lang) => {
                const isSelected = draft.appLanguage === lang.id;
                return (
                  <Pressable
                    key={lang.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`App language ${lang.label}`}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        appLanguage: lang.id,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.langChip,
                      isSelected && styles.langChipSelected,
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langChipLabel,
                        isSelected && styles.langChipLabelSelected,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color="#236c19"
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: MOTIVATION */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Why are you learning?</Text>
            <Text style={styles.stepSubtitle}>
              Flo tailors your lesson scenarios and practical drills to your goals.
            </Text>

            <View style={styles.cardsColumn}>
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
                      styles.selectionCard,
                      isSelected && styles.selectionCardSelected,
                      pressed && styles.selectionCardPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.motivationIconCircle,
                        isSelected && styles.motivationIconCircleSelected,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={isSelected ? "#236c19" : "#556b5d"}
                      />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isSelected && styles.cardTitleSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.cardDesc}>{item.desc}</Text>
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

        {/* STEP 3: STARTING LEVEL & PLACEMENT TEST */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What is your starting level?</Text>
            <Text style={styles.stepSubtitle}>
              Select where you feel comfortable, or take our quick placement test.
            </Text>

            {/* Placement Test Callout Card */}
            <View style={styles.placementCalloutCard}>
              <View style={styles.placementCalloutHeader}>
                <View style={styles.sparkleCircle}>
                  <Ionicons name="sparkles" size={20} color="#236c19" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placementCalloutTitle}>
                    Not sure where to begin?
                  </Text>
                  <Text style={styles.placementCalloutDesc}>
                    Take our 5-minute placement test for an adaptive CEFR recommendation.
                  </Text>
                </View>
              </View>

              {draft.placementAttempt ? (
                <View style={styles.placementResultBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#236c19" />
                  <Text style={styles.placementResultText}>
                    Test suggested level:{" "}
                    <Text style={{ fontWeight: "800" }}>
                      {draft.placementAttempt.level}
                    </Text>
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take Placement Test"
                onPress={() => setIsPlacementModalOpen(true)}
                style={({ pressed }) => [
                  styles.placementTestButton,
                  pressed && styles.placementTestButtonPressed,
                ]}
              >
                <Ionicons name="school-outline" size={18} color="#236c19" />
                <Text style={styles.placementTestButtonText}>
                  {draft.placementAttempt
                    ? "Retake Placement Test"
                    : "Take Placement Test (5 min)"}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
              Or choose your level directly
            </Text>
            <View style={styles.cardsColumn}>
              {STARTING_LEVELS.map((level) => {
                const isSelected = draft.startingLevel === level.id;
                return (
                  <Pressable
                    key={level.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Level ${level.badge} ${level.name}`}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        startingLevel: level.id,
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
                        styles.levelPill,
                        isSelected && styles.levelPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelPillText,
                          isSelected && styles.levelPillTextSelected,
                        ]}
                      >
                        {level.badge}
                      </Text>
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isSelected && styles.cardTitleSelected,
                        ]}
                      >
                        {level.name}
                      </Text>
                      <Text style={styles.cardDesc}>{level.desc}</Text>
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

        {/* STEP 4: DAILY GOAL & TIME BUDGET */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Daily Goal & Time Budget</Text>
            <Text style={styles.stepSubtitle}>
              Consistency is key. Choose a daily target that fits naturally into your routine.
            </Text>

            <View style={styles.cardsColumn}>
              {DAILY_GOALS.map((goal) => {
                const isSelected = draft.dailyGoalMinutes === goal.minutes;
                return (
                  <Pressable
                    key={goal.minutes}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${goal.label}: ${goal.time}`}
                    onPress={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        dailyGoalMinutes: goal.minutes,
                        dailyTimeBudgetMinutes: goal.minutes,
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
                        styles.motivationIconCircle,
                        isSelected && styles.motivationIconCircleSelected,
                      ]}
                    >
                      <Ionicons
                        name={goal.icon}
                        size={20}
                        color={isSelected ? "#236c19" : "#556b5d"}
                      />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <View style={styles.goalTitleRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            isSelected && styles.cardTitleSelected,
                          ]}
                        >
                          {goal.label}
                        </Text>
                        <Text style={styles.goalTimeBadge}>{goal.time}</Text>
                      </View>
                      <Text style={styles.cardDesc}>{goal.desc}</Text>
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

        {/* STEP 5: STUDY REMINDER */}
        {step === 5 && (
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

        {/* STEP 6: LEARNING PROMISE & FLO COMPANION */}
        {step === 6 && (
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

        {/* STEP 7: REVIEW & COMPLETION */}
        {step === 7 && (
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
                  {draft.courseLanguage === "es" ? "Spanish 🇪🇸" : "English 🇺🇸"}
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
                <Text style={styles.summaryLabel}>Daily Commitment:</Text>
                <Text style={styles.summaryValue}>
                  {draft.dailyGoalMinutes} minutes / day
                </Text>
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
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </Pressable>
        </View>
      )}

      {/* Placement Test Modal Runner */}
      <PlacementTestModal
        visible={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        onAcceptLevel={handlePlacementAccepted}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f8f4",
  },
  backButtonPressed: {
    backgroundColor: "#e8efe6",
  },
  headerCenter: {
    alignItems: "center",
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: "700",
    color: "#65766c",
  },
  headerRightPlaceholder: {
    width: 38,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#eef3ee",
    width: "100%",
  },
  progressBarFill: {
    height: 4,
    backgroundColor: "#236c19",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#20352b",
    lineHeight: 32,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#65766c",
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
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
    fontSize: 28,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: "#1a5113",
  },
  cardDesc: {
    fontSize: 13,
    color: "#65766c",
    lineHeight: 18,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#20352b",
  },
  langChipLabelSelected: {
    color: "#236c19",
    fontWeight: "700",
  },
  motivationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f5f8f4",
    alignItems: "center",
    justifyContent: "center",
  },
  motivationIconCircleSelected: {
    backgroundColor: "#d5edd0",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 2,
  },
  placementCalloutDesc: {
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
    fontSize: 16,
    fontWeight: "700",
    color: "#20352b",
    marginBottom: 2,
  },
  reminderToggleDesc: {
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
    fontSize: 13,
    color: "#65766c",
  },
  timeInput: {
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
    fontSize: 15,
    color: "#20352b",
    lineHeight: 22,
    minHeight: 64,
  },
  promiseCharCount: {
    textAlign: "right",
    fontSize: 12,
    color: "#8a9a90",
    marginTop: 4,
  },
  promisePresetsLabel: {
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
    fontSize: 14,
    fontWeight: "600",
    color: "#65766c",
    width: 140,
  },
  summaryValue: {
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
    fontSize: 12,
    fontWeight: "700",
    color: "#65766c",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryPromiseText: {
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
    color: "#b42318",
    fontSize: 13,
    flex: 1,
  },
  footerNav: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f4f1",
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#236c19",
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 20,
  },
  primaryButtonPressed: {
    backgroundColor: "#1c5714",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
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
    color: "#20352b",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
