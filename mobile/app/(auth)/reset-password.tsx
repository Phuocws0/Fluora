import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../services/api";
import { resetPassword } from "../../services/auth";
import { ScreenContainer } from "../../components/ScreenContainer";
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from "../../features/i18n/i18n";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const routeToken = Array.isArray(params.token) ? params.token[0] ?? "" : params.token ?? "";

  const [token, setToken] = useState(routeToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): string | null => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return "Please enter the reset token.";
    }

    if (newPassword.length < 8) {
      return "New password must be at least 8 characters long.";
    }
    if (newPassword.length > 128) {
      return "New password must be 128 characters or fewer.";
    }

    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  async function handleResetPassword() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setIsSuccess(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Failed to reset password. The token may be invalid or expired.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="shield-checkmark" size={72} color="#236c19" />
          </View>
          <Text style={styles.successTitle}>Password Reset Successful</Text>
          <Text style={styles.successDescription}>
            Your password has been securely updated. For your security, all active sessions on other devices have been signed out.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
              styles.fullWidth,
            ]}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={22} color="#20352b" />
      </Pressable>

      <Text style={styles.eyebrow}>SECURITY</Text>
      <Text style={styles.title}>Choose a new password</Text>
      <Text style={styles.description}>
        {routeToken
          ? "Enter and confirm your new password."
          : "Enter the reset token from your local demo log, then choose a new password."}
      </Text>

      {error ? (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        {!routeToken ? (
          <View style={styles.field}>
            <Text style={styles.label}>Reset token</Text>
            <TextInput
              accessibilityLabel="Reset token"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={(val) => {
                setToken(val);
                if (error) setError(null);
              }}
              placeholder="Paste reset token here"
              placeholderTextColor="#8a9a90"
              selectTextOnFocus
              style={styles.input}
              value={token}
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              accessibilityLabel="New Password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={(val) => {
                setNewPassword(val);
                if (error) setError(null);
              }}
              placeholder="At least 8 characters"
              placeholderTextColor="#8a9a90"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={newPassword}
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

        <View style={styles.field}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              accessibilityLabel="Confirm New Password"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (error) setError(null);
              }}
              placeholder="Re-enter new password"
              placeholderTextColor="#8a9a90"
              secureTextEntry={!showConfirmPassword}
              style={styles.passwordInput}
              value={confirmPassword}
            />
            <Pressable
              accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#65766c"
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={handleResetPassword}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isSubmitting ? styles.primaryButtonPressed : null,
            isSubmitting && styles.disabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#20352b" />
          ) : (
            <Text style={styles.primaryButtonText}>Reset Password</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Link href="/(auth)/login" style={styles.link}>
          Back to Sign In
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
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },
  description: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
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
    marginTop: 24,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    fontFamily: "Nunito_400Regular",
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 12,
    borderWidth: 1.5,
    color: "#20352b",
    fontSize: 14,
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
    fontFamily: "Nunito_400Regular",
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
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#58cc02",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 8,
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
  footerRow: {
    alignItems: "center",
    marginTop: 32,
  },
  link: {
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingHorizontal: 8,
  },
  successIconWrapper: {
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  successDescription: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
    marginBottom: 32,
  },
  fullWidth: {
    width: "100%",
  },
});
