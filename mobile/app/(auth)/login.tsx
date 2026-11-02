import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { ApiError } from "../../services/api";
import { googleSignInUnavailableMessage, signInWithGoogle } from "../../services/auth";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function LoginScreen() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailableMessage = googleSignInUnavailableMessage();

  async function handleGoogleSignIn() {
    setError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      if (user) router.replace("/(tabs)/learn");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : "Google sign-in could not be completed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>FLUORA</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.description}>Sign in to continue your learning plan and keep your progress together.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(unavailableMessage) || isSigningIn, busy: isSigningIn }}
        disabled={Boolean(unavailableMessage) || isSigningIn}
        onPress={handleGoogleSignIn}
        style={({ pressed }) => [styles.googleButton, pressed && !isSigningIn ? styles.pressed : null, (unavailableMessage || isSigningIn) && styles.disabled]}
      >
        {isSigningIn ? <ActivityIndicator color="#236c19" /> : <Text style={styles.googleMark}>G</Text>}
        <Text style={styles.googleButtonText}>{isSigningIn ? "Signing in…" : "Continue with Google"}</Text>
      </Pressable>

      <Text accessibilityLiveRegion="polite" style={error ? styles.error : styles.helper}>
        {error ?? unavailableMessage ?? "Use your Google account to sign in securely."}
      </Text>

      <View style={styles.links}>
        <Link href="/register" style={styles.link}>Create account</Link>
        <Link href="/forgot-password" style={styles.link}>Forgot password</Link>
        {Platform.OS !== "web" ? <Link href="/onboarding" style={styles.link}>Continue as a guest</Link> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { color: "#20352b", fontSize: 30, fontWeight: "900", marginTop: 8 },
  description: { color: "#65766c", fontSize: 15, lineHeight: 22, marginTop: 8 },
  googleButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 32,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  pressed: { backgroundColor: "#f7f9f7" },
  disabled: { opacity: 0.55 },
  googleMark: { color: "#4285f4", fontSize: 20, fontWeight: "900" },
  googleButtonText: { color: "#26352d", fontSize: 15, fontWeight: "700" },
  helper: { color: "#748078", fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: "center" },
  error: { color: "#b42318", fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: "center" },
  links: { alignItems: "center", gap: 16, marginTop: 36 },
  link: { color: "#236c19", fontSize: 14, fontWeight: "700" },
});
