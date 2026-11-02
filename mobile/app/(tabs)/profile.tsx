import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getLearningProgress,
  getWeeklyLearningAnalytics,
  type LearningProgress,
  type WeeklyLearningAnalytics,
} from "../../features/learning/activity.service";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, settings } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSignOutConfirmationOpen, setIsSignOutConfirmationOpen] = useState(false);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [weekly, setWeekly] = useState<WeeklyLearningAnalytics | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingProgress(true);
    setProgressError(null);
    try {
      const [currentProgress, weeklyAnalytics] = await Promise.all([
        getLearningProgress(),
        getWeeklyLearningAnalytics(),
      ]);
      setProgress(currentProgress);
      setWeekly(weeklyAnalytics);
    } catch (cause) {
      setProgressError(cause instanceof Error ? cause.message : "Could not load progress.");
    } finally {
      setIsLoadingProgress(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const performSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } catch {
      // AuthContext clears the local user even if token storage cannot be reached.
    } finally {
      setIsSigningOut(false);
      setIsSignOutConfirmationOpen(false);
      router.replace("/(auth)/welcome");
    }
  };

  const courseName = settings?.courseLanguage === "es"
    ? "Spanish"
    : settings?.courseLanguage === "en"
      ? "English"
      : null;

  return (
    <ScreenContainer>
      {isAuthenticated && user ? (
        <>
          <Text style={styles.eyebrow}>MY SPACE</Text>
          <Text style={styles.title}>{user.displayName || "Fluora Learner"}</Text>
          <Text style={styles.description}>
            {courseName ? `${user.email} · Learning ${courseName}` : user.email}
          </Text>

          <View style={styles.gardenBanner}>
            <Image
              accessibilityLabel="Flo growing in the Fluora garden"
              resizeMode="contain"
              source={require("../../assets/fluora-welcome-garden.png")}
              style={styles.gardenIllustration}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {progress ? `${progress.currentStreak} days` : isLoadingProgress ? "…" : "—"}
              </Text>
              <Text style={styles.statLabel}>Current streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {weekly ? weekly.summary.xp.toLocaleString() : isLoadingProgress ? "…" : "—"}
              </Text>
              <Text style={styles.statLabel}>Weekly XP</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{settings?.startingLevel ?? "—"}</Text>
              <Text style={styles.statLabel}>Your level</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/community/users/[userId]", params: { userId: user.id } })}
            style={({ pressed }) => [styles.profileLinkCard, pressed && styles.pressed]}
          >
            <View style={styles.profileLinkIcon}>
              <Ionicons name="person-circle-outline" size={22} color="#236c19" />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>View learner profile</Text>
              <Text style={styles.cardDescription}>Email, learning plan and achievements</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#236c19" />
          </Pressable>

          {isLoadingProgress ? (
            <View style={styles.progressMessage}>
              <ActivityIndicator color="#58cc02" />
              <Text style={styles.helperText}>Loading your progress…</Text>
            </View>
          ) : progressError ? (
            <Pressable accessibilityRole="button" onPress={() => void loadProgress()} style={styles.progressMessage}>
              <Text style={styles.helperText}>{progressError}</Text>
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          ) : (
            <View style={styles.progressCard}>
              <View style={styles.cardIcon}>
                <Ionicons name="bar-chart-outline" size={20} color="#236c19" />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>Learning progress</Text>
                <Text style={styles.cardDescription}>
                  {progress
                    ? `${progress.completedLessons} lessons completed · ${progress.xp.toLocaleString()} total XP`
                    : "Your lesson and XP summary"}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Account settings</Text>
          <SettingLink icon="person-circle-outline" label="Profile and preferences" onPress={() => router.push("/settings/profile")} />
          <SettingLink icon="notifications-outline" label="Notifications" onPress={() => router.push("/settings/notifications")} />
          <SettingLink icon="shield-outline" label="Privacy and security" onPress={() => router.push("/settings/privacy")} />

          {!user.emailVerified ? (
            <Pressable onPress={() => router.push("/(auth)/verify-email")} style={styles.verifyLink}>
              <Ionicons name="mail-unread-outline" size={18} color="#236c19" />
              <Text style={styles.verifyLinkText}>Verify your email address</Text>
              <Ionicons name="chevron-forward" size={18} color="#236c19" />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
            disabled={isSigningOut}
            onPress={() => setIsSignOutConfirmationOpen(true)}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={19} color="#b42318" />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.guestContainer}>
          <Text style={styles.eyebrow}>MY SPACE</Text>
          <Text style={styles.title}>Your learning garden</Text>
          <Text style={styles.description}>
            Sign in or create an account to keep your progress across devices.
          </Text>
          <View style={styles.guestActions}>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/login")} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Sign in</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/register")} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Create account</Text>
            </Pressable>
          </View>
          <SettingLink icon="settings-outline" label="General settings" onPress={() => router.push("/settings/general")} />
        </View>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsSignOutConfirmationOpen(false)}
        transparent
        visible={isSignOutConfirmationOpen}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Sign out?</Text>
            <Text style={styles.confirmationDescription}>
              You can sign back in to continue learning with your account.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
              disabled={isSigningOut}
              onPress={() => void performSignOut()}
              style={({ pressed }) => [styles.confirmSignOutButton, pressed && styles.pressed]}
            >
              {isSigningOut ? <ActivityIndicator color="#b42318" /> : <Text style={styles.confirmSignOutText}>Sign out</Text>}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSigningOut}
              onPress={() => setIsSignOutConfirmationOpen(false)}
              style={({ pressed }) => [styles.cancelSignOutButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelSignOutText}>Stay in Fluora</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function SettingLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingLink, pressed && styles.pressed]}>
      <Ionicons name={icon} size={19} color="#236c19" />
      <Text style={styles.settingLinkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#8a9a90" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: "#65766c", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { color: "#20352b", fontSize: 28, fontWeight: "800", lineHeight: 36, marginTop: 6 },
  description: { color: "#65766c", fontSize: 14, lineHeight: 21, marginTop: 4 },
  gardenBanner: { height: 124, alignItems: "center", justifyContent: "center", backgroundColor: "#eaf8de", borderRadius: 20, marginTop: 16, overflow: "hidden" },
  gardenIllustration: { width: 150, height: 124 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statCard: { alignItems: "center", justifyContent: "center", backgroundColor: "#eaf8de", borderRadius: 16, flex: 1, minHeight: 82, paddingHorizontal: 4 },
  statValue: { color: "#236c19", fontSize: 19, fontWeight: "800" },
  statLabel: { color: "#65766c", fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 4 },
  progressMessage: { alignItems: "center", justifyContent: "center", minHeight: 64, gap: 6 },
  helperText: { color: "#65766c", fontSize: 13, textAlign: "center" },
  retryText: { color: "#236c19", fontSize: 13, fontWeight: "700" },
  progressCard: { alignItems: "center", flexDirection: "row", gap: 12, backgroundColor: "#eaf8de", borderColor: "#d8e8d0", borderWidth: 1, borderRadius: 18, marginTop: 12, minHeight: 86, padding: 16 },
  profileLinkCard: { alignItems: "center", flexDirection: "row", gap: 12, backgroundColor: "#ffffff", borderColor: "#d8e8d0", borderWidth: 1, borderRadius: 18, marginTop: 12, minHeight: 86, padding: 16 },
  profileLinkIcon: { alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, backgroundColor: "#eaf8de" },
  cardIcon: { alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, backgroundColor: "#ffffff" },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: "#20352b", fontSize: 15, fontWeight: "700" },
  cardDescription: { color: "#65766c", fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: "#236c19", fontSize: 13, fontWeight: "800", marginTop: 22, marginBottom: 8 },
  settingLink: { alignItems: "center", flexDirection: "row", gap: 12, backgroundColor: "#ffffff", borderColor: "#d8e8d0", borderWidth: 1, borderRadius: 14, minHeight: 52, marginTop: 8, paddingHorizontal: 14 },
  settingLinkText: { color: "#20352b", flex: 1, fontSize: 14, fontWeight: "600" },
  verifyLink: { alignItems: "center", flexDirection: "row", gap: 10, backgroundColor: "#eaf8de", borderRadius: 14, minHeight: 48, marginTop: 14, paddingHorizontal: 14 },
  verifyLinkText: { color: "#236c19", flex: 1, fontSize: 13, fontWeight: "700" },
  signOutButton: { alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderColor: "#fecdca", borderWidth: 1, borderRadius: 14, minHeight: 50, marginTop: 18 },
  signOutText: { color: "#b42318", fontSize: 14, fontWeight: "700" },
  guestContainer: { flex: 1, justifyContent: "center" },
  guestActions: { gap: 10, marginVertical: 20 },
  primaryButton: { alignItems: "center", justifyContent: "center", backgroundColor: "#58cc02", borderRadius: 16, minHeight: 54 },
  primaryButtonText: { color: "#20352b", fontSize: 15, fontWeight: "800" },
  secondaryButton: { alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", borderColor: "#d8e8d0", borderWidth: 1, borderRadius: 16, minHeight: 52 },
  secondaryButtonText: { color: "#236c19", fontSize: 14, fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(32, 53, 43, 0.68)", paddingHorizontal: 24 },
  confirmationCard: { width: "100%", maxWidth: 380, borderRadius: 24, backgroundColor: "#ffffff", padding: 24, gap: 12 },
  confirmationTitle: { color: "#20352b", fontSize: 22, fontWeight: "800", textAlign: "center" },
  confirmationDescription: { color: "#65766c", fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 6 },
  confirmSignOutButton: { minHeight: 50, borderRadius: 14, backgroundColor: "#fff1f0", borderWidth: 1, borderColor: "#fecdca", justifyContent: "center", alignItems: "center" },
  confirmSignOutText: { color: "#b42318", fontSize: 15, fontWeight: "800" },
  cancelSignOutButton: { minHeight: 50, borderRadius: 14, backgroundColor: "#58cc02", justifyContent: "center", alignItems: "center" },
  cancelSignOutText: { color: "#20352b", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.78 },
});
