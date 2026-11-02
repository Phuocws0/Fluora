import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../features/auth/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, settings } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const performSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace("/(auth)/welcome");
    } catch {
      // Session cleared locally even if backend call fails
      router.replace("/(auth)/welcome");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOutPress = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out of your Fluora account?");
      if (confirmed) {
        void performSignOut();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out of your Fluora account?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: () => {
              void performSignOut();
            },
          },
        ],
      );
    }
  };

  const initials = (
    user?.displayName?.[0] ||
    user?.email?.[0] ||
    "L"
  ).toUpperCase();

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.description}>
        Manage your learner profile, preferences, and account security.
      </Text>

      {isAuthenticated && user ? (
        <>
          {/* User Card */}
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.displayName}>
                {user.displayName || "Fluora Learner"}
              </Text>
              <Text style={styles.emailText}>{user.email}</Text>

              <View style={styles.badgeRow}>
                {user.emailVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#027a48" />
                    <Text style={styles.verifiedBadgeText}>Email verified</Text>
                  </View>
                ) : (
                  <Link href="/(auth)/verify-email" asChild>
                    <Pressable style={styles.unverifiedBadge}>
                      <Ionicons name="alert-circle-outline" size={13} color="#b54708" />
                      <Text style={styles.unverifiedBadgeText}>Verify email</Text>
                      <Ionicons name="chevron-forward" size={12} color="#b54708" />
                    </Pressable>
                  </Link>
                )}
              </View>
            </View>
          </View>

          {/* Quick Learning Stats */}
          {settings ? (
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={18} color="#236c19" />
                <Text style={styles.statLabel}>Daily Goal</Text>
                <Text style={styles.statValue}>
                  {settings.dailyGoalMinutes ?? 15} min
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="ribbon-outline" size={18} color="#236c19" />
                <Text style={styles.statLabel}>Level</Text>
                <Text style={styles.statValue}>
                  {settings.startingLevel ?? "A1"}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="language-outline" size={18} color="#236c19" />
                <Text style={styles.statLabel}>Language</Text>
                <Text style={styles.statValue}>
                  {settings.appLanguage?.toUpperCase() ?? "EN"}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Menu Sections */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionHeading}>Preferences & Settings</Text>

            <Link href="/settings/general" asChild>
              <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="settings-outline" size={18} color="#236c19" />
                  </View>
                  <Text style={styles.menuItemText}>General Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8a9a90" />
              </Pressable>
            </Link>

            <Link href="/settings/notifications" asChild>
              <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="notifications-outline" size={18} color="#236c19" />
                  </View>
                  <Text style={styles.menuItemText}>Notifications</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8a9a90" />
              </Pressable>
            </Link>

            <Link href="/settings/privacy" asChild>
              <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="shield-outline" size={18} color="#236c19" />
                  </View>
                  <Text style={styles.menuItemText}>Privacy & Security</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8a9a90" />
              </Pressable>
            </Link>
          </View>

          {/* Sign Out Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
            disabled={isSigningOut}
            onPress={handleSignOutPress}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && !isSigningOut ? styles.signOutButtonPressed : null,
              isSigningOut && styles.disabled,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#b42318" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#b42318" />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        /* Guest State */
        <View style={styles.guestContainer}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={44} color="#52625d" />
          </View>
          <Text style={styles.guestTitle}>Guest Learner</Text>
          <Text style={styles.guestDescription}>
            You are browsing as a guest. Sign in or create an account to save your progress, unlock leagues, and access your profile across devices.
          </Text>

          <View style={styles.guestActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(auth)/register")}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </Pressable>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionHeading}>Settings</Text>
            <Link href="/settings/general" asChild>
              <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="settings-outline" size={18} color="#236c19" />
                  </View>
                  <Text style={styles.menuItemText}>General Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8a9a90" />
              </Pressable>
            </Link>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: "#20352b",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },
  description: {
    color: "#65766c",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#f7f9f7",
    borderColor: "#e1e8e3",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eaf8de",
    borderColor: "#c3d1c8",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#236c19",
    fontSize: 24,
    fontWeight: "900",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    color: "#20352b",
    fontSize: 18,
    fontWeight: "800",
  },
  emailText: {
    color: "#65766c",
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ecfdf3",
    borderColor: "#a6f4c5",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    color: "#027a48",
    fontSize: 11,
    fontWeight: "700",
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff8e6",
    borderColor: "#fedf89",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unverifiedBadgeText: {
    color: "#b54708",
    fontSize: 11,
    fontWeight: "700",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderColor: "#e1e8e3",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statLabel: {
    color: "#65766c",
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    color: "#20352b",
    fontSize: 14,
    fontWeight: "800",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#e1e8e3",
  },
  menuSection: {
    marginTop: 28,
    gap: 8,
  },
  sectionHeading: {
    color: "#52625d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderColor: "#e1e8e3",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemPressed: {
    backgroundColor: "#f7f9f7",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eaf8de",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    color: "#20352b",
    fontSize: 15,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fffbfa",
    borderColor: "#fda29b",
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    marginTop: 32,
    paddingHorizontal: 20,
  },
  signOutButtonPressed: {
    backgroundColor: "#fee4e2",
  },
  signOutButtonText: {
    color: "#b42318",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
  guestContainer: {
    alignItems: "center",
    paddingTop: 32,
    width: "100%",
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f2f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  guestTitle: {
    color: "#20352b",
    fontSize: 22,
    fontWeight: "900",
  },
  guestDescription: {
    color: "#65766c",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  guestActions: {
    width: "100%",
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
    width: "100%",
  },
  primaryButtonPressed: {
    backgroundColor: "#1c5714",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 20,
    width: "100%",
  },
  secondaryButtonPressed: {
    backgroundColor: "#f7f9f7",
  },
  secondaryButtonText: {
    color: "#20352b",
    fontSize: 15,
    fontWeight: "600",
  },
});
