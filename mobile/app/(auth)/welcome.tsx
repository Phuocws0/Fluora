import { Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppLanguage } from "../../features/i18n/i18n";
import { LocalizedPressable as Pressable, LocalizedText as Text } from "../../features/i18n/i18n";

export default function WelcomeScreen() {
  const router = useRouter();
  const { language, setLanguage } = useAppLanguage();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>Fluora</Text>
          <View style={styles.languageSwitch} accessibilityRole="radiogroup" accessibilityLabel="App language">
            {(["en", "vi"] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: language === option }}
                accessibilityLabel={option === "en" ? "English interface" : "Vietnamese interface"}
                onPress={() => setLanguage(option)}
                style={[styles.languageOption, language === option && styles.languageOptionSelected]}
              >
                <Text style={[styles.languageOptionText, language === option && styles.languageOptionTextSelected]}>
                  {option.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Image
          accessibilityLabel={language === "vi" ? "Linh vật Flo trong khu vườn học ngôn ngữ" : "Flo growing in a language learning garden"}
          resizeMode="contain"
          source={require("../../assets/fluora-welcome-garden.png")}
          style={styles.illustration}
        />
        <Text style={styles.title}>Enjoy learning. See real progress.</Text>
        <Text style={styles.description}>
          Grow your language skills one small, steady lesson at a time.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(auth)/onboarding")}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Let’s explore</Text>
        </Pressable>

        <View style={styles.signInRow}>
          <Text style={styles.signInPrompt}>Already have an account?</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign in" hitSlop={12} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.footer}>FLUORA · GROW AT YOUR OWN PACE</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  brand: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languageSwitch: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#f4f8f2",
    marginBottom: 20,
  },
  languageOption: {
    minWidth: 40,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: 8,
  },
  languageOptionSelected: {
    backgroundColor: "#eaf8de",
  },
  languageOptionText: {
    color: "#65766c",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  languageOptionTextSelected: {
    color: "#236c19",
  },
  illustration: {
    alignSelf: "center",
    width: "100%",
    height: 280,
    marginBottom: 28,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
  description: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#58cc02",
    borderRadius: 16,
    minHeight: 56,
    marginTop: 30,
  },
  pressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 18,
  },
  signInPrompt: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 14,
  },
  signInLink: {
    fontFamily: "Nunito_700Bold",
    color: "#236c19",
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
    paddingVertical: 14,
  },
});
