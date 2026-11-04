import { LearningText as Text } from "../../../../components/LearningText";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSpeechPrompt } from "../../audio/useSpeechPrompt";
import { WaveformVisualizer } from "../../components/WaveformVisualizer";
import { useAuth } from "../../../auth/AuthContext";

type Props = {
  promptText: string;
  onExitAudioOnly: () => void;
};

export function AudioOnlyPlayer({ promptText, onExitAudioOnly }: Props) {
  const { settings } = useAuth();
  const steady = Boolean(settings?.reducedMotion || settings?.focusMode);
  const { speak, stop, isSpeaking } = useSpeechPrompt();
  const [metering, setMetering] = useState(0.1);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSpeaking && !steady) {
      interval = setInterval(() => {
        setMetering(0.3 + Math.random() * 0.6);
      }, 100);
    } else {
      setMetering(0.1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpeaking, steady]);

  const handlePlay = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(promptText);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name="headset-outline" size={14} color="#236c19" />
          <Text style={styles.badgeText}>AUDIO-ONLY MODE</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onExitAudioOnly} style={styles.exitBtn}>
          <Text style={styles.exitBtnText}>Standard Mode ›</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Listen carefully without visual distractions</Text>

      <View style={styles.centerStage}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play audio prompt"
          onPress={handlePlay}
          style={[styles.bigPlayButton, isSpeaking && styles.bigPlayButtonActive]}
        >
          <Ionicons
            name={isSpeaking ? "pause" : "volume-high"}
            size={44}
            color={isSpeaking ? "#ffffff" : "#236c19"}
          />
        </Pressable>
        <Text style={styles.playPromptLabel}>
          {isSpeaking ? "Tap to pause" : "Tap to listen to prompt"}
        </Text>

        <View style={styles.waveContainer}>
          <WaveformVisualizer active={isSpeaking} meteringLevel={metering} barCount={24} />
        </View>
      </View>

      {settings?.captions && <Text accessibilityLabel="Audio captions" style={styles.note}>Captions: {promptText}</Text>}
      <Text style={styles.note}>
        Tune your ears to natural pronunciation and cadence. Once you understand the prompt, use the standard mode to submit your response.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 20,
    borderWidth: 1.5,
    marginVertical: 14,
    padding: 20,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  exitBtn: { padding: 4 },
  exitBtnText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
  centerStage: {
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  bigPlayButton: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
    borderRadius: 44,
    borderWidth: 2,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  bigPlayButtonActive: {
    backgroundColor: "#236c19",
  },
  playPromptLabel: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 13,
    fontWeight: "700",
  },
  waveContainer: {
    marginTop: 10,
    width: "100%",
  },
  note: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
