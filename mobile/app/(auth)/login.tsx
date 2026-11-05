import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../services/api";
import { useAuth } from "../../features/auth/AuthContext";
import { getLearnerSettings } from "../../features/onboarding/onboarding.service";
import { ScreenContainer } from "../../components/ScreenContainer";
import { font, garden } from "../../features/profile/garden-ui";
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from "../../features/i18n/i18n";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const trimmed = email.trim();
    if (!trimmed) {
      return "Please enter your email address.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return "Please enter a valid email address.";
    }
    if (!password) {
      return "Please enter your password.";
    }
    return null;
  };

  async function handleEmailSignIn() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      try {
        const settings = await getLearnerSettings();
        if (settings.onboardingCompleted) {
          router.replace("/(tabs)/learn");
        } else {
          router.replace("/(auth)/onboarding");
        }
      } catch {
        router.replace("/(tabs)/learn");
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Sign in could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting;
  const initial = email.trim().charAt(0).toUpperCase() || "M";

  return (
    <ScreenContainer contentTopPadding={28} fixedFooterBottom={20} fixedFooter={
      <View style={styles.stickyFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy, busy: isSubmitting }}
          disabled={isBusy}
          onPress={handleEmailSignIn}
          style={({ pressed }) => [styles.primaryButton, pressed && !isBusy ? styles.primaryButtonPressed : null, isBusy && styles.disabled]}
        >
          {isSubmitting ? <ActivityIndicator color={garden.ink} /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
        </Pressable>
        <Text style={styles.footer}>FLUORA · GROW AT YOUR OWN PACE</Text>
      </View>
    }>
      <View style={styles.topNavigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to welcome"
          onPress={() => router.replace("/(auth)/welcome")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={garden.forest} />
        </Pressable>
        <Text style={styles.eyebrow}>YOUR PERSONAL SETUP</Text>
      </View>
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.description}>Pick up right where you left off.</Text>

      <View style={styles.avatar}><Text style={styles.avatarInitial}>{initial}</Text></View>
      <Text style={styles.gardenCaption}>Your garden is waiting</Text>

      {error ? (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isBusy}
            keyboardType="email-address"
            onChangeText={(val) => {
              setEmail(val);
              if (error) setError(null);
            }}
            placeholder="minh@example.com"
            placeholderTextColor="#8a9a90"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              editable={!isBusy}
              onChangeText={(val) => {
                setPassword(val);
                if (error) setError(null);
              }}
              placeholder="••••••••••"
              placeholderTextColor="#8a9a90"
              secureTextEntry
              style={styles.passwordInput}
              value={password}
            />
          </View>
        </View>
      </View>
      <Link href="/(auth)/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
      <View style={styles.accountPrompt}>
        <Text style={styles.accountPromptText}>New to Fluora?</Text>
        <Link href="/(auth)/register" style={styles.accountLink}>Create account</Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topNavigation: { alignItems: "center", flexDirection: "row", gap: 8, height: 32, marginBottom: 12 },
  backButton: { alignItems: "center", justifyContent: "center", height: 32, width: 28 },
  eyebrow: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  title: {
    color: garden.ink,
    fontFamily: font.heavy,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
  },
  description: {
    color: garden.muted,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  avatar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: garden.mint,
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    marginTop: 12,
    width: 76,
  },
  avatarInitial: { color: garden.forest, fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  gardenCaption: { color: garden.forest, fontFamily: font.bold, fontSize: 18, lineHeight: 25, marginBottom: 12, marginTop: 16, textAlign: "center" },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3f2",
    borderColor: "#fecdca",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  errorText: {
    fontFamily: "Nunito_700Bold",
    color: "#b42318",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  form: {
    marginTop: 8,
    gap: 10,
  },
  field: {
    backgroundColor: "#ffffff",
    borderColor: garden.line,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  label: {
    color: garden.ink,
    fontFamily: font.bold,
    fontSize: 12,
    lineHeight: 18,
  },
  forgotLink: {
    alignSelf: "flex-end",
    color: garden.forest,
    fontFamily: font.bold,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginRight: 4,
  },
  input: {
    color: garden.muted,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    color: garden.muted,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: garden.green,
    borderRadius: 16,
    justifyContent: "center",
    height: 56,
    paddingHorizontal: 20,
    shadowColor: garden.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 3,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    fontFamily: font.bold,
    color: garden.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  stickyFooter: { gap: 8 },
  footer: { color: garden.muted, fontFamily: font.bold, fontSize: 10, lineHeight: 15, textAlign: "center" },
  accountPrompt: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 24 },
  accountPromptText: { color: garden.muted, fontFamily: font.body, fontSize: 13, lineHeight: 20 },
  accountLink: { color: garden.forest, fontFamily: font.bold, fontSize: 13, lineHeight: 20 },
  disabled: {
    opacity: 0.55,
  },
});
