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
            <Text style={styles.primaryButtonText}>
              {isAuthenticated && !settings?.onboardingCompleted
                ? "Continue setup"
                : "Continue learning"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#20352b" />
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentTopPadding={28} fixedFooterBottom={20} fixedFooter={
      <View style={styles.stickyFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy, busy: isVerifying }}
          disabled={isBusy}
          onPress={handleVerify}
          style={({ pressed }) => [styles.primaryButton, pressed && !isBusy ? styles.primaryButtonPressed : null, isBusy && styles.disabled]}
        >
          {isVerifying ? <ActivityIndicator color="#20352b" /> : <Text style={styles.primaryButtonText}>Confirm</Text>}
        </Pressable>
        <Text style={styles.footerBrand}>FLUORA · GROW AT YOUR OWN PACE</Text>
      </View>
    }>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to account setup"
        onPress={() => router.back()}
        style={styles.topNavigation}
      >
        <Ionicons name="chevron-back" size={22} color="#236c19" />
        <Text style={styles.eyebrow}>YOUR PERSONAL SETUP</Text>
      </Pressable>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.description}>
        {user?.email ? `Token for ${user.email}; see [dev-mail] log.` : "Paste your local verification token to finish setting up."}
      </Text>

      <View style={styles.codeCard}>
        <TextInput
          accessibilityLabel="Verification token"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isBusy}
          onChangeText={(val) => {
            setToken(val);
            if (error) setError(null);
          }}
          placeholder="Paste verification token"
          placeholderTextColor="#236c19"
          selectTextOnFocus
          style={styles.tokenInput}
          value={token}
        />
      </View>
      <View style={styles.resendRow}>
        {isResending ? <ActivityIndicator color="#236c19" /> : <Pressable accessibilityRole="button" disabled={isBusy} onPress={handleResend}><Text style={styles.resendLink}>Resend verification token</Text></Pressable>}
        {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
      </View>

      {error ? (
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.securityCard}>
        <View style={styles.securityCardCopy}>
          <Text style={styles.securityCardTitle}>Keep your account safe</Text>
          <Text style={styles.securityCardBody}>Never share this token with anyone.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#236c19" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topNavigation: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 8, height: 32, marginBottom: 16 },
  eyebrow: { color: "#65766c", fontFamily: "Nunito_700Bold", fontSize: 12, lineHeight: 18 },
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
    marginTop: 16,
  },
  securityCard: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#dee8d9",
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 20,
    marginTop: 16,
  },
  securityCardCopy: {
    flex: 1,
    gap: 4,
  },
  securityCardTitle: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  securityCardBody: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 12,
    lineHeight: 18,
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
  infoText: {
    fontFamily: "Nunito_700Bold",
    color: "#027a48",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  form: {
    marginTop: 24,
    gap: 14,
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
  codeCard: { backgroundColor: "#eaf8de", borderRadius: 18, justifyContent: "center", marginTop: 16, minHeight: 84, paddingHorizontal: 12 },
  tokenInput: { fontFamily: "Nunito_400Regular", color: "#236c19", fontSize: 12, letterSpacing: 0.2, minHeight: 64, textAlign: "center" },
  resendRow: { marginTop: 16 },
  resendLink: { color: "#65766c", fontFamily: "Nunito_700Bold", fontSize: 12, lineHeight: 18 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#58cc02",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 6,
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
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 28,
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
  stickyFooter: { gap: 10 },
  footerBrand: { color: "#65766c", fontFamily: "Nunito_700Bold", fontSize: 10, lineHeight: 14, textAlign: "center" },
});
