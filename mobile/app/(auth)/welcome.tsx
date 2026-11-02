import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "../../features/onboarding/onboarding.storage";

type SupportedLanguage = "en" | "vi";

export default function WelcomeScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("en");

  useEffect(() => {
    let isMounted = true;
    loadOnboardingDraft()
      .then((draft) => {
        if (
          isMounted &&
          draft?.appLanguage &&
          (draft.appLanguage === "vi" || draft.appLanguage === "en")
        ) {
          setSelectedLang(draft.appLanguage);
        }
      })
      .catch(() => {
        // Fallback to default
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    try {
      const existing = await loadOnboardingDraft();
      if (existing) {
        await saveOnboardingDraft({
          ...existing,
          appLanguage: lang,
        });
      } else {
        await saveOnboardingDraft({
          appLanguage: lang,
          courseLanguage: "en",
          motivation: null,
          startingLevel: null,
          placementAttempt: null,
          dailyGoalMinutes: 15,
          dailyTimeBudgetMinutes: 15,
          reminderEnabled: false,
          reminderTime: "09:00",
          reminderDays: [1, 2, 3, 4, 5],
          learningPromise: "Grow your fluency, one day at a time",
          floCompanion: null,
        });
      }
    } catch {
      // Non-blocking storage failure
    }
  };

  const handleGetStarted = async () => {
    try {
      const existing = await loadOnboardingDraft();
      if (!existing) {
        await saveOnboardingDraft({
          appLanguage: selectedLang,
          courseLanguage: "en",
          motivation: null,
          startingLevel: null,
          placementAttempt: null,
          dailyGoalMinutes: 15,
          dailyTimeBudgetMinutes: 15,
          reminderEnabled: false,
          reminderTime: "09:00",
          reminderDays: [1, 2, 3, 4, 5],
          learningPromise: "Grow your fluency, one day at a time",
          floCompanion: null,
        });
      }
    } catch {
      // Non-blocking
    }
    router.push("/(auth)/onboarding");
  };

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  const isVi = selectedLang === "vi";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.eyebrowBadge}>
            <Ionicons name="sparkles" size={12} color="#236c19" />
            <Text style={styles.eyebrowText}>
              {isVi ? "KHU VƯỜN HỌC TẬP" : "GARDEN LEARNING"}
            </Text>
          </View>
          <Text style={styles.brandTitle}>Fluora</Text>
          <Text style={styles.tagline}>Grow your fluency, one day at a time</Text>
          <Text style={styles.description}>
            {isVi
              ? "Nuôi dưỡng vốn từ vựng, sự tự tin giao tiếp và thói quen rèn luyện hàng ngày."
              : "Cultivate your vocabulary, daily habit, and speaking confidence in a calm, focused environment."}
          </Text>
        </View>

        {/* Visual Badge / Plant Emblem */}
        <View style={styles.emblemContainer}>
          <View style={styles.emblemOuterRing}>
            <View style={styles.emblemInnerRing}>
              <Ionicons name="leaf" size={54} color="#236c19" />
            </View>
          </View>

          <View style={styles.emblemMeta}>
            <View style={styles.pillBadge}>
              <Ionicons name="calendar-outline" size={13} color="#236c19" />
              <Text style={styles.pillBadgeText}>
                {isVi ? "15 phút mỗi ngày" : "15 mins daily"}
              </Text>
            </View>
            <View style={styles.pillBadge}>
              <Ionicons name="trending-up-outline" size={13} color="#236c19" />
              <Text style={styles.pillBadgeText}>
                {isVi ? "Tiến độ vững chắc" : "Adaptive growth"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              I already have an account
            </Text>
          </Pressable>
        </View>

        {/* Bottom Language Selector Indicator */}
        <View style={styles.languageContainer}>
          <View style={styles.languageHeader}>
            <Ionicons name="globe-outline" size={15} color="#52625d" />
            <Text style={styles.languageLabel}>
              {isVi ? "Ngôn ngữ ứng dụng" : "App Language"}
            </Text>
          </View>

          <View style={styles.languageToggleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="English language"
              accessibilityState={{ selected: selectedLang === "en" }}
              onPress={() => void handleLanguageChange("en")}
              style={[
                styles.languageButton,
                selectedLang === "en" && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  selectedLang === "en" && styles.languageButtonTextActive,
                ]}
              >
                English (EN)
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vietnamese language"
              accessibilityState={{ selected: selectedLang === "vi" }}
              onPress={() => void handleLanguageChange("vi")}
              style={[
                styles.languageButton,
                selectedLang === "vi" && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  selectedLang === "vi" && styles.languageButtonTextActive,
                ]}
              >
                Tiếng Việt (VI)
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 12,
  },
  eyebrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eaf8de",
    borderColor: "#d5ebd0",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  eyebrowText: {
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  brandTitle: {
    color: "#163820",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    color: "#236c19",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  description: {
    color: "#52625d",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  emblemContainer: {
    alignItems: "center",
    marginVertical: 28,
  },
  emblemOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#f4f9f1",
    borderWidth: 2,
    borderColor: "#deecd8",
    justifyContent: "center",
    alignItems: "center",
  },
  emblemInnerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#e4f5db",
    borderWidth: 1.5,
    borderColor: "#cce8c1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#236c19",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  emblemMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f2f8ee",
    borderColor: "#dee8d9",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillBadgeText: {
    color: "#236c19",
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    gap: 12,
    marginVertical: 12,
  },
  primaryButton: {
    backgroundColor: "#236c19",
    borderRadius: 16,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    shadowColor: "#236c19",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonPressed: {
    backgroundColor: "#1c5614",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderColor: "#d0dcd2",
    borderWidth: 1.5,
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  secondaryButtonPressed: {
    backgroundColor: "#f5f8f5",
  },
  secondaryButtonText: {
    color: "#20352b",
    fontSize: 15,
    fontWeight: "700",
  },
  languageContainer: {
    marginTop: 8,
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eef3ed",
  },
  languageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  languageLabel: {
    color: "#52625d",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  languageToggleRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f5f7f4",
    padding: 4,
    borderRadius: 12,
  },
  languageButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  languageButtonActive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cce2c6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  languageButtonText: {
    color: "#67756f",
    fontSize: 13,
    fontWeight: "600",
  },
  languageButtonTextActive: {
    color: "#236c19",
    fontWeight: "700",
  },
});
