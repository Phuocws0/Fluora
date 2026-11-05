import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { PreferenceModal } from "../../components/PreferenceModal";
import { addStudyTime, breakIsDue } from "./learning-preferences";
import { font, garden } from "./garden-ui";
import { LocalizedPressable as Pressable, LocalizedText as Text } from "../i18n/i18n";

export function WellbeingReminder() {
  const { user, settings } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const elapsed = useRef(0);
  const reminding = useRef(false);
  const interval = settings?.wellbeingTimerMinutes;
  const reset = () => { elapsed.current = 0; reminding.current = false; setVisible(false); };

  useEffect(() => {
    elapsed.current = 0;
    reminding.current = false;
    setVisible(false);
    if (!user || !interval) return;
    let active = AppState.currentState === "active";
    let last = Date.now();
    const subscription = AppState.addEventListener("change", state => { active = state === "active"; last = Date.now(); });
    const timer = setInterval(() => {
      const now = Date.now();
      elapsed.current = addStudyTime(elapsed.current, now - last, active, reminding.current);
      last = now;
      if (!reminding.current && breakIsDue(elapsed.current, interval)) { reminding.current = true; setVisible(true); }
    }, 1000);
    return () => { clearInterval(timer); subscription.remove(); };
  }, [user?.id, interval]);

  return <PreferenceModal transparent visible={visible} animationType="fade" onRequestClose={reset}>
    <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Time for a little break</Text>
      <Text style={styles.copy}>You have spent {interval} minutes learning in Fluora. Rest your eyes and take a breath.</Text>
      <Pressable accessibilityRole="button" onPress={() => { reset(); router.replace("/(tabs)/learn"); }} style={styles.primary}><Text style={styles.buttonText}>Take a break · return Home</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={reset} style={styles.secondary}><Text style={styles.buttonText}>Continue learning</Text></Pressable>
    </View></View>
  </PreferenceModal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "white", padding: 24, borderRadius: 20, gap: 18 },
  title: { color: garden.ink, fontFamily: font.heavy, fontSize: 24 },
  copy: { color: garden.muted, fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  primary: { minHeight: 56, backgroundColor: garden.green, borderRadius: 16, padding: 14, justifyContent: "center", alignItems: "center" },
  secondary: { minHeight: 48, padding: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: garden.forest, fontFamily: font.bold, fontSize: 15, textAlign: "center" },
});
