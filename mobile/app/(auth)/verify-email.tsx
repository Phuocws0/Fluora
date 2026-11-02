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
import {
  resendEmailVerification,
  verifyEmail,
} from "../../services/auth";
import { useAuth } from "../../features/auth/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshSession, settings } = useAuth();

  const [token, setToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleVerify() {
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Please enter the verification token.");
      return;
    }

    setError(null);
    setInfoMessage(null);
    setIsVerifying(true);

    try {
      await verifyEmail(trimmed);
      if (isAuthenticated) {
        await refreshSession();
      }
      setIsSuccess(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Verification failed. The token may be expired or invalid.",
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfoMessage(null);
    setIsResending(true);

    try {
      await resendEmailVerification();
      setInfoMessage(
        "A new verification token has been generated! Look for [dev-mail] in your backend terminal logs.",
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Could not resend verification token. Make sure you are signed in.",
      );
    } finally {
      setIsResending(false);
    }
  }

  const handleContinue = () => {
    if (isAuthenticated) {
      if (settings?.onboardingCompleted) {
        router.replace("/(tabs)/learn");
      } else {
        router.replace("/(auth)/onboarding");
      }
    } else {
      router.replace("/(tabs)/learn");
    }
  };

  const isBusy = isVerifying || isResending;

  if (isSuccess) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={72} color="#236c19" />
          </View>
          <Text style={styles.successTitle}>Email Verified!</Text>
          <Text style={styles.successDescription}>
            Your email address has been confirmed. Your Fluora account is ready to nurture your daily language habits.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
              styles.fullWidth,
            ]}
          >
            <Text style={styles.primaryButtonText}>Continue to Learning Home</Text>
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

      <Text style={styles.eyebrow}>VERIFICATION</Text>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.description}>
        {user?.email
          ? `We sent a confirmation token to ${user.email}. Enter it below to finish setting up your account.`
          : "Enter the verification token sent to your email to confirm your account."}
      </Text>

      {/* Dev-mail local demo callout */}
      <View style={styles.devCallout}>
        <View style={styles.devCalloutHeader}>
          <Ionicons name="terminal-outline" size={18} color="#155e75" />
          <Text style={styles.devCalloutTitle}>Local Demo Notice</Text>
        </View>
        <Text style={styles.devCalloutBody}>
          In this local development demo, no real emails are dispatched. Look in your backend terminal console for lines prefixed with{" "}
          <Text style={styles.devCalloutCode}>[dev-mail]</Text> to find your token.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {infoMessage ? (
        <View style={styles.infoContainer} accessibilityLiveRegion="polite">
          <Ionicons name="information-circle-outline" size={18} color="#027a48" />
          <Text style={styles.infoText}>{infoMessage}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Verification Token</Text>
          <TextInput
            accessibilityLabel="Verification Token"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isBusy}
            onChangeText={(val) => {
              setToken(val);
              if (error) setError(null);
            }}
            placeholder="Paste verification token here"
            placeholderTextColor="#8a9a90"
            style={styles.input}
            value={token}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy, busy: isVerifying }}
          disabled={isBusy}
          onPress={handleVerify}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isBusy ? styles.primaryButtonPressed : null,
            isBusy && styles.disabled,
          ]}
        >
          {isVerifying ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify Email</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy, busy: isResending }}
          disabled={isBusy}
          onPress={handleResend}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !isBusy ? styles.secondaryButtonPressed : null,
            isBusy && styles.disabled,
          ]}
        >
          {isResending ? (
            <ActivityIndicator color="#236c19" />
          ) : (
            <Text style={styles.secondaryButtonText}>Resend Verification Token</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Link href="/(tabs)/learn" style={styles.link}>
          Skip for now and continue
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
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf3",
    borderColor: "#a6f4c5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  infoText: {
    color: "#027a48",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  form: {
    marginTop: 24,
    gap: 14,
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
    fontSize: 14,
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
    marginTop: 6,
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
    color: "#65766c",
    fontSize: 14,
    fontWeight: "600",
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
    color: "#20352b",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  successDescription: {
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
