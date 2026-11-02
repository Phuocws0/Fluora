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
  googleSignInUnavailableMessage,
  signInWithGoogle,
} from "../../services/auth";
import { useAuth } from "../../features/auth/AuthContext";
import { getLearnerSettings } from "../../features/onboarding/onboarding.service";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function LoginScreen() {
  const router = useRouter();
  const { login, refreshSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unavailableMessage = googleSignInUnavailableMessage();

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

  async function handleGoogleSignIn() {
    setError(null);
    setIsSigningInGoogle(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        await refreshSession();
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
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Google sign-in could not be completed.",
      );
    } finally {
      setIsSigningInGoogle(false);
    }
  }

  const isBusy = isSubmitting || isSigningInGoogle;

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
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.description}>
        Sign in to continue your learning plan and keep your progress together.
      </Text>

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
            placeholder="you@example.com"
            placeholderTextColor="#8a9a90"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              Forgot password?
            </Link>
          </View>
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
              placeholder="Enter your password"
              placeholderTextColor="#8a9a90"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              accessibilityRole="button"
              disabled={isBusy}
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

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy, busy: isSubmitting }}
          disabled={isBusy}
          onPress={handleEmailSignIn}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isBusy ? styles.primaryButtonPressed : null,
            isBusy && styles.disabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: Boolean(unavailableMessage) || isBusy,
          busy: isSigningInGoogle,
        }}
        disabled={Boolean(unavailableMessage) || isBusy}
        onPress={handleGoogleSignIn}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && !isBusy ? styles.googleButtonPressed : null,
          (Boolean(unavailableMessage) || isBusy) && styles.disabled,
        ]}
      >
        {isSigningInGoogle ? (
          <ActivityIndicator color="#236c19" />
        ) : (
          <Text style={styles.googleMark}>G</Text>
        )}
        <Text style={styles.googleButtonText}>
          {isSigningInGoogle ? "Signing in…" : "Continue with Google"}
        </Text>
      </Pressable>

      {unavailableMessage ? (
        <Text style={styles.helper}>{unavailableMessage}</Text>
      ) : null}

      <View style={styles.links}>
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <Link href="/(auth)/register" style={styles.link}>
            Create account
          </Link>
        </View>
        {Platform.OS !== "web" ? (
          <Link href="/(auth)/onboarding" style={styles.guestLink}>
            Continue as a guest
          </Link>
        ) : null}
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#20352b",
    fontSize: 13,
    fontWeight: "700",
  },
  forgotLink: {
    color: "#236c19",
    fontSize: 13,
    fontWeight: "600",
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
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#236c19",
    borderRadius: 14,
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
  disabled: {
    opacity: 0.55,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e1e8e3",
  },
  dividerText: {
    color: "#8a9a90",
    fontSize: 13,
    fontWeight: "600",
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dfda",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
  },
  googleButtonPressed: {
    backgroundColor: "#f7f9f7",
  },
  googleMark: {
    color: "#4285f4",
    fontSize: 20,
    fontWeight: "900",
  },
  googleButtonText: {
    color: "#26352d",
    fontSize: 15,
    fontWeight: "700",
  },
  helper: {
    color: "#748078",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    textAlign: "center",
  },
  links: {
    alignItems: "center",
    gap: 14,
    marginTop: 32,
  },
  registerRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  registerText: {
    color: "#65766c",
    fontSize: 14,
  },
  link: {
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
  guestLink: {
    color: "#52625d",
    fontSize: 14,
    fontWeight: "600",
  },
});
