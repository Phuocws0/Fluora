import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../services/api";
import { forgotPassword } from "../../services/auth";
import { ScreenContainer } from "../../components/ScreenContainer";
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from "../../features/i18n/i18n";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
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
          <Text style={styles.successTitle}>Reset request received</Text>
          <Text style={styles.successDescription}>
            If an account exists for <Text style={styles.boldText}>{email.trim()}</Text>, a reset token has been created.
          </Text>

          <View style={styles.devCallout}>
            <View style={styles.devCalloutHeader}>
              <Ionicons name="mail-outline" size={18} color="#236c19" />
              <Text style={styles.devCalloutTitle}>Local demo email</Text>
            </View>
            <Text style={styles.devCalloutBody}>
              Email delivery is disabled. Copy the reset token from the backend terminal line prefixed with{" "}
              <Text style={styles.devCalloutCode}>[dev-mail]</Text>.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Reset token</Text>
            <TextInput
              accessibilityLabel="Reset token from backend log"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setResetToken}
              placeholder="Paste the token here"
              placeholderTextColor="#8a9a90"
              selectTextOnFocus
              style={styles.input}
              value={resetToken}
            />
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>What happens next?</Text>
            <Text style={styles.stepsText}>1 · Check the backend log</Text>
            <Text style={styles.stepsText}>2 · Enter the secure token above</Text>
            <Text style={styles.stepsText}>3 · Choose a new password</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !resetToken.trim() }}
            disabled={!resetToken.trim()}
            onPress={() => router.push({ pathname: "/(auth)/reset-password", params: { token: resetToken.trim() } })}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
              !resetToken.trim() && styles.disabled,
              styles.fullWidth,
            ]}
          >
            <Text style={styles.primaryButtonText}>Choose a new password</Text>
            <Ionicons name="arrow-forward" size={18} color="#20352b" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setResetToken("");
              setIsSubmitted(false);
            }}
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
    <ScreenContainer contentTopPadding={28} fixedFooterBottom={20} fixedFooter={
      <View style={styles.stickyFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={handleSendResetToken}
          style={({ pressed }) => [styles.primaryButton, pressed && !isSubmitting ? styles.primaryButtonPressed : null, isSubmitting && styles.disabled]}
        >
          {isSubmitting ? <ActivityIndicator color="#20352b" /> : <Text style={styles.primaryButtonText}>Send reset link</Text>}
        </Pressable>
        <Text style={styles.footerBrand}>FLUORA · GROW AT YOUR OWN PACE</Text>
      </View>
    }>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to sign in"
        onPress={() => router.back()}
        style={styles.topNavigation}
      >
        <Ionicons name="chevron-back" size={22} color="#236c19" />
        <Text style={styles.eyebrow}>YOUR PERSONAL SETUP</Text>
      </Pressable>
      <Text style={styles.title}>Recover your account</Text>
      <Text style={styles.description}>
        Enter your email to get a password reset link.
      </Text>

      <View style={styles.recoveryCard}>
        <Text style={styles.recoveryLabel}>RECOVERY EMAIL</Text>
        <Text style={styles.recoveryAt}>@</Text>
        <Text style={styles.recoveryCaption}>A private link, just for you.</Text>
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
          <Text style={styles.label}>Where should we send the link?</Text>
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
      </View>

      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>What happens next?</Text>
        <Text style={styles.stepsText}>1 · Check your inbox</Text>
        <Text style={styles.stepsText}>2 · Open the secure link</Text>
        <Text style={styles.stepsText}>3 · Choose a new password</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topNavigation: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 8, height: 32, marginBottom: 12 },
  eyebrow: { fontFamily: "Nunito_700Bold", color: "#65766c", fontSize: 12, lineHeight: 18 },
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
  recoveryCard: {
    width: 240,
    height: 160,
    alignSelf: "center",
    justifyContent: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
  },
  recoveryLabel: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
  },
  recoveryAt: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  recoveryCaption: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  stepsCard: {
    gap: 6,
    marginTop: 44,
    marginBottom: 12,
  },
  stepsTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  stepsText: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 13,
    lineHeight: 19,
  },
  devCallout: {
    backgroundColor: "#eaf8de",
    borderColor: "#d5edc5",
    borderRadius: 16,
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
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 13,
    fontWeight: "700",
  },
  devCalloutBody: {
    fontFamily: "Nunito_400Regular",
    color: "#52625d",
    fontSize: 13,
    lineHeight: 19,
  },
  devCalloutCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    color: "#236c19",
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
    marginTop: 30,
    gap: 16,
  },
  field: {},
  inputCard: { backgroundColor: "#ffffff", borderColor: "#dee8d9", borderRadius: 16, borderWidth: 1, minHeight: 76, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 7 },
  label: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  input: {
    fontFamily: "Nunito_400Regular",
    color: "#20352b",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 33,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#58cc02",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
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
    fontFamily: "Nunito_700Bold",
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
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "stretch",
    justifyContent: "center",
    paddingTop: 20,
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
    textAlign: "left",
  },
  successDescription: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "left",
    marginBottom: 8,
  },
  boldText: {
    color: "#20352b",
    fontWeight: "700",
  },
  fullWidth: {
    width: "100%",
  },
  stickyFooter: { gap: 10 },
  footerBrand: { color: "#65766c", fontFamily: "Nunito_700Bold", fontSize: 10, lineHeight: 14, textAlign: "center" },
  resendButton: {
    marginTop: 12,
  },
});
