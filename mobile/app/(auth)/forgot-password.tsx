import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../services/api";
import { forgotPassword } from "../../services/auth";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = (): string | null => {
    const trimmed = email.trim();
    if (!trimmed) {
      return "Please enter your email address.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  async function handleSendResetToken() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Failed to request password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="mail-open-outline" size={68} color="#236c19" />
          </View>
          <Text style={styles.successTitle}>Reset Token Dispatched</Text>
          <Text style={styles.successDescription}>
            If an account exists for <Text style={styles.boldText}>{email.trim()}</Text>, a reset token has been issued.
          </Text>

          <View style={styles.devCallout}>
            <View style={styles.devCalloutHeader}>
              <Ionicons name="terminal-outline" size={18} color="#155e75" />
              <Text style={styles.devCalloutTitle}>Local Demo Notice</Text>
            </View>
            <Text style={styles.devCalloutBody}>
              In this local demo, check the backend server logs for the{" "}
              <Text style={styles.devCalloutCode}>[dev-mail]</Text> reset token line.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/reset-password")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
              styles.fullWidth,
            ]}
          >
            <Text style={styles.primaryButtonText}>Enter Reset Token</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsSubmitted(false)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
              styles.fullWidth,
              styles.resendButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Link href="/(auth)/login" style={styles.link}>
              Back to Sign In
            </Link>
          </View>
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

      <Text style={styles.eyebrow}>RECOVERY</Text>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.description}>
        Enter the email associated with your Fluora account and we'll issue a password reset token.
      </Text>

      {/* Dev-mail local demo callout */}
      <View style={styles.devCallout}>
        <View style={styles.devCalloutHeader}>
          <Ionicons name="terminal-outline" size={18} color="#155e75" />
          <Text style={styles.devCalloutTitle}>Local Demo Notice</Text>
        </View>
        <Text style={styles.devCalloutBody}>
          In this local development demo, reset tokens are logged to your backend console with{" "}
          <Text style={styles.devCalloutCode}>[dev-mail]</Text>.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email Address</Text>
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

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={handleSendResetToken}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isSubmitting ? styles.primaryButtonPressed : null,
            isSubmitting && styles.disabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Token</Text>
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
  devCallout: {
    backgroundColor: "#ecfeff",
    borderColor: "#a5f3fc",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
    gap: 6,
  },
  devCalloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devCalloutTitle: {
    color: "#155e75",
    fontSize: 13,
    fontWeight: "700",
  },
  devCalloutBody: {
    color: "#164e63",
    fontSize: 13,
    lineHeight: 19,
  },
  devCalloutCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    color: "#0891b2",
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
    marginTop: 24,
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
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
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
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 20,
  },
  secondaryButtonPressed: {
    backgroundColor: "#f7f9f7",
  },
  secondaryButtonText: {
    color: "#20352b",
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.55,
  },
  footerRow: {
    alignItems: "center",
    marginTop: 28,
  },
  link: {
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 36,
    paddingHorizontal: 8,
  },
  successIconWrapper: {
    marginBottom: 20,
  },
  successTitle: {
    color: "#20352b",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  successDescription: {
    color: "#65766c",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
    marginBottom: 8,
  },
  boldText: {
    color: "#20352b",
    fontWeight: "700",
  },
  fullWidth: {
    width: "100%",
  },
  resendButton: {
    marginTop: 12,
  },
});
