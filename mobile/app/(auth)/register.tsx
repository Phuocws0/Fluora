import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <ScreenContainer>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to welcome"
        onPress={() => router.replace("/(auth)/welcome")}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={22} color="#20352b" />
      </Pressable>

      <Text style={styles.eyebrow}>FLUORA</Text>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.description}>
        Save your progress and learn across your devices.
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
          <Text style={styles.label}>Display Name</Text>
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
            placeholder="e.g. Alex Rivera"
            placeholderTextColor="#8a9a90"
            style={styles.input}
            value={displayName}
          />
        </View>

        <View style={styles.field}>
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
            placeholder="you@example.com"
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
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={(val) => {
                setPassword(val);
                if (error) setError(null);
              }}
              placeholder="At least 8 characters"
              placeholderTextColor="#8a9a90"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#65766c"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.termsPill}>
          <Ionicons name="checkmark-circle" size={16} color="#236c19" />
          <Text style={styles.termsText}>Agree to Terms & Privacy</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={handleRegister}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isSubmitting ? styles.primaryButtonPressed : null,
            isSubmitting && styles.disabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Sign in
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 12,
  },
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
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  progressLabelActive: {
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
  },
  progressLabel: {
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
    color: "#b42318",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  form: {
    marginTop: 14,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    color: "#20352b",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 12,
    borderWidth: 1.5,
    color: "#20352b",
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 12,
    borderWidth: 1.5,
  },
  passwordInput: {
    flex: 1,
    color: "#20352b",
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  termsPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: "#eaf8de",
    paddingHorizontal: 12,
  },
  termsText: {
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
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    color: "#65766c",
    fontSize: 14,
  },
  link: {
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
});
