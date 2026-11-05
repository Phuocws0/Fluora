import { LearningText as Text } from "../../../../components/LearningText";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useSpeechPrompt } from "../../audio/useSpeechPrompt";
import { useAudioRecorderStudio } from "../../audio/useAudioRecorderStudio";
import { WaveformVisualizer } from "../../components/WaveformVisualizer";
import { LocalizedAlert as Alert, LocalizedPressable as Pressable } from "../../../i18n/i18n";

type Props = {
  content: unknown;
  prompt: string;
  transcript: string;
  score: number;
  onChange: (data: { transcript: string; score: number }) => void;
  disabled?: boolean;
};

function parseSuggestedPhrase(content: unknown): string {
  if (content && typeof content === "object" && "suggestedPhrase" in content) {
    const raw = (content as { suggestedPhrase: unknown }).suggestedPhrase;
    if (typeof raw === "string") return raw;
  }
  return "";
}

export function SpeakingExercise({
  content,
  prompt,
  transcript,
  score,
  onChange,
  disabled = false,
}: Props) {
  const suggestedPhrase = parseSuggestedPhrase(content);
  const targetPhrase = suggestedPhrase || prompt;

  const { speak, stop: stopSpeech, isSpeaking } = useSpeechPrompt();
  const {
    isRecording,
    recordingUri,
    meteringLevel,
    startRecording,
    stopRecording,
  } = useAudioRecorderStudio();

  const [hasRecorded, setHasRecorded] = useState(Boolean(transcript));
  const [togglingRecording, setTogglingRecording] = useState(false);
  const player = useAudioPlayer(recordingUri);

  const handleListenPrompt = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      speak(targetPhrase);
    }
  };

  const handleToggleRecord = async () => {
    if (disabled || togglingRecording) return;
    setTogglingRecording(true);
    try {
      if (isRecording) {
        await stopRecording();
        setHasRecorded(true);
        // Pronunciation is self-assessed in this local demo, not inferred from audio.
        onChange({ transcript: targetPhrase, score: 0 });
      } else {
        onChange({ transcript: "", score: 0 });
        setHasRecorded(false);
        await startRecording();
      }
    } catch (cause) {
      Alert.alert(
        "Microphone Required",
        cause instanceof Error ? cause.message : "Could not record audio.",
      );
    } finally {
      setTogglingRecording(false);
    }
  };

  const handleSelectScore = (newScore: number) => {
    if (disabled || isRecording || togglingRecording) return;
    onChange({ transcript: targetPhrase, score: newScore });
    setHasRecorded(true);
  };

  const handlePlayRecording = () => {
    if (player && recordingUri) {
      player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={styles.container}>
      {/* Target Phrase Box */}
      <View style={styles.phraseCard}>
        <View style={styles.phraseHeader}>
          <Text style={styles.eyebrow}>TARGET PHRASE</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listen to pronunciation"
            onPress={handleListenPrompt}
            style={[styles.speakerButton, isSpeaking && styles.speakerButtonActive]}
          >
            <Ionicons
              name={isSpeaking ? "volume-high" : "volume-medium-outline"}
              size={18}
              color={isSpeaking ? "#ffffff" : "#236c19"}
            />
            <Text style={[styles.speakerText, isSpeaking && styles.speakerTextActive]}>
              {isSpeaking ? "Speaking…" : "Listen"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.phraseText} translate={false}>{targetPhrase}</Text>
        <Text style={styles.deviceNotice}>
          🔒 On-device recording. Your voice sample never leaves your phone.
        </Text>
      </View>

      {/* Recording Studio Area */}
      <View style={styles.studioCard}>
        <Text style={styles.studioTitle}>Recording Studio</Text>

        <WaveformVisualizer active={isRecording} meteringLevel={meteringLevel} />

        <View style={styles.recordControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRecording ? "Stop recording" : "Record your voice"}
            disabled={disabled || togglingRecording}
            onPress={() => void handleToggleRecord()}
            style={[
              styles.micButton,
              isRecording ? styles.micButtonRecording : styles.micButtonIdle,
              disabled && styles.disabled,
            ]}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={28}
              color="#ffffff"
            />
          </Pressable>
          <Text style={styles.micLabel}>
            {isRecording ? "Tap to stop recording" : "Tap microphone to speak"}
          </Text>

          {recordingUri && !isRecording ? (
            <Pressable
              accessibilityRole="button"
              onPress={handlePlayRecording}
              style={styles.playbackButton}
            >
              <Ionicons name="play-outline" size={16} color="#236c19" />
              <Text style={styles.playbackText}>Play back my recording</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Speaking Scorecard */}
        <View style={styles.scorecardContainer}>
          <Text style={styles.scorecardHeading}>Speaking Scorecard</Text>
          <Text style={styles.scorecardSubtitle}>
            Demo self-assessment: listen back and rate your practice. Audio is not automatically scored.
          </Text>

          <View style={styles.scoreRow}>
            {[
              { label: "Needs Practice", val: 65, emoji: "🌱" },
              { label: "Good Accent", val: 85, emoji: "🌿" },
              { label: "Confident", val: 100, emoji: "✨" },
            ].map((item) => {
              const isSelected = hasRecorded && score === item.val;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => handleSelectScore(item.val)}
                  style={[
                    styles.scoreButton,
                    isSelected && styles.scoreButtonSelected,
                    disabled && styles.disabled,
                  ]}
                >
                  <Text style={styles.scoreEmoji}>{item.emoji}</Text>
                  <Text style={[styles.scoreText, isSelected && styles.scoreTextSelected]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.scorePercent, isSelected && styles.scorePercentSelected]}>
                    {item.val}%
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {hasRecorded ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTranscript}>
                Practice phrase (not transcribed): “{transcript || targetPhrase}”
              </Text>
              <Text style={styles.resultScore}>Scorecard Rating: {score}/100</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 14, gap: 14 },
  phraseCard: {
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  phraseHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  speakerButton: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  speakerButtonActive: {
    backgroundColor: "#236c19",
  },
  speakerText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
  },
  speakerTextActive: {
    color: "#ffffff",
  },
  phraseText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
  },
  deviceNotice: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 11,
    marginTop: 10,
  },
  studioCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  studioTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  recordControls: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  micButton: {
    alignItems: "center",
    borderRadius: 34,
    elevation: 3,
    height: 68,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 68,
  },
  micButtonIdle: {
    backgroundColor: "#236c19",
  },
  micButtonRecording: {
    backgroundColor: "#d32f2f",
  },
  micLabel: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 12,
    fontWeight: "700",
  },
  playbackButton: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  playbackText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
  },
  scorecardContainer: {
    borderTopColor: "#f0f4ee",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  scorecardHeading: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 13,
    fontWeight: "800",
  },
  scorecardSubtitle: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 8,
  },
  scoreButton: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 10,
  },
  scoreButtonSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  scoreEmoji: { fontFamily: "Nunito_400Regular", fontSize: 18, marginBottom: 2 },
  scoreText: { fontFamily: "Nunito_700Bold", color: "#20352b", fontSize: 11, fontWeight: "700" },
  scoreTextSelected: { color: "#236c19", fontWeight: "800" },
  scorePercent: { fontFamily: "Nunito_700Bold", color: "#65766c", fontSize: 10, fontWeight: "700", marginTop: 2 },
  scorePercentSelected: { color: "#236c19", fontWeight: "800" },
  resultBox: {
    backgroundColor: "#eaf8de",
    borderRadius: 12,
    marginTop: 10,
    padding: 10,
  },
  resultTranscript: { fontFamily: "Nunito_400Regular", color: "#20352b", fontSize: 12, lineHeight: 17 },
  resultScore: { fontFamily: "Nunito_800ExtraBold", color: "#236c19", fontSize: 11, fontWeight: "800", marginTop: 4 },
  disabled: { opacity: 0.6 },
});
