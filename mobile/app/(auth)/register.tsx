import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../services/api";
import { useAuth } from "../../features/auth/AuthContext";
import { loadOnboardingDraft } from "../../features/onboarding/onboarding.storage";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      return "Please enter your name.";
    }
    if (trimmedName.length > 50) {
      return "Display name must be 50 characters or fewer.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return "Please enter your email address.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return "Please enter a valid email address.";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (password.length > 128) {
      return "Password must be 128 characters or fewer.";
    }

    return null;
  };

  async function handleRegister() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const draft = await loadOnboardingDraft();
      await register(
        displayName.trim(),
        email.trim(),
        password,
        draft ?? undefined,
      );
      router.replace("/(auth)/verify-email");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Failed to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenContainer contentTopPadding={32} fixedFooterBottom={20} fixedFooter={
      <View style={styles.stickyFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={handleRegister}
          style={({ pressed }) => [styles.primaryButton, pressed && !isSubmitting ? styles.primaryButtonPressed : null, isSubmitting && styles.disabled]}
        >
          {isSubmitting ? <ActivityIndicator color="#20352b" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
        </Pressable>
        <Text style={styles.footerBrand}>FLUORA · GROW AT YOUR OWN PACE</Text>
      </View>
    }>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to welcome"
        onPress={() => router.replace("/(auth)/welcome")}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={20} color="#236c19" />
        <Text style={styles.eyebrow}>YOUR PERSONAL SETUP</Text>
      </Pressable>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.description}>
        Save your progress and learn across your{ "\n" }devices.
      </Text>

      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabelActive}>01 Account</Text>
        <Text style={styles.progressLabel}>/ 02 Verify / 03 Learn</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      {error ? (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.field}>
          <View style={styles.inputCard}>
            <Text style={styles.label}>Your name</Text>
          <TextInput
            accessibilityLabel="Display Name"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            editable={!isSubmitting}
            maxLength={50}
            onChangeText={(val) => {
              setDisplayName(val);
              if (error) setError(null);
            }}
            placeholder="Minh Nguyễn"
            placeholderTextColor="#8a9a90"
            style={styles.input}
            value={displayName}
          />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.inputCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isSubmitting}
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
        </View>

        <View style={styles.field}>
          <View style={[styles.inputCard, styles.passwordWrapper]}>
            <Text style={styles.label}>Create password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isSubmitting}
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
        <Text style={styles.passwordHint}>8+ characters · One number</Text>

        <View style={styles.termsPill}>
          <Text style={styles.termsText}>Agree to Terms & Privacy</Text>
        </View>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 10,
    height: 32,
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#65766c",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "900",
  },
  description: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  progressLabelActive: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
  },
  progressLabel: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#dfe8dc",
    marginTop: 8,
    marginBottom: 8,
  },
  progressFill: {
    width: "34%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#58cc02",
  },
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
    marginTop: 17,
    gap: 12,
  },
  field: {},
  inputCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 7,
  },
  label: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  input: {
    fontFamily: "Nunito_400Regular",
    color: "#20352b",
    fontSize: 16,
    lineHeight: 24,
    minHeight: 33,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  passwordWrapper: {
    paddingBottom: 3,
  },
  passwordRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  passwordInput: {
    fontFamily: "Nunito_400Regular",
    flex: 1,
    color: "#20352b",
    fontSize: 16,
    lineHeight: 24,
    minHeight: 32,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  termsPill: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 17,
    backgroundColor: "#eaf8de",
    paddingHorizontal: 12,
    marginTop: 13,
  },
  termsText: {
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#58cc02",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
  stickyFooter: { gap: 10 },
  footerBrand: { color: "#65766c", fontFamily: "Nunito_700Bold", fontSize: 10, lineHeight: 14, textAlign: "center" },
  passwordHint: { color: "#65766c", fontFamily: "Nunito_700Bold", fontSize: 12, lineHeight: 18, marginTop: -6 },
});
