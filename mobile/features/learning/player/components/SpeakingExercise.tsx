import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useSpeechPrompt } from "../../audio/useSpeechPrompt";
import { useAudioRecorderStudio } from "../../audio/useAudioRecorderStudio";
import { WaveformVisualizer } from "../../components/WaveformVisualizer";

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
  const player = useAudioPlayer(recordingUri);

  const handleListenPrompt = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      speak(targetPhrase);
    }
  };

  const handleToggleRecord = async () => {
    if (disabled) return;
    try {
      if (isRecording) {
        await stopRecording();
        setHasRecorded(true);
        // Default to a solid passing score upon real speech practice (85)
        onChange({ transcript: targetPhrase, score: score > 0 ? score : 85 });
      } else {
        await startRecording();
      }
    } catch (cause) {
      Alert.alert(
        "Microphone Required",
        cause instanceof Error ? cause.message : "Could not record audio.",
      );
    }
  };

  const handleSelectScore = (newScore: number) => {
    if (disabled) return;
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

        <Text style={styles.phraseText}>{targetPhrase}</Text>
        <Text style={styles.deviceNotice}>
          🔒 On-device recording. Your voice sample never leaves your phone.
        </Text>
      </View>

      {/* Recording Studio Area */}
      <View style={styles.studioCard}>
        <Text style={styles.studioTitle}>Recording Studio (Page 10 · 111)</Text>

        <WaveformVisualizer active={isRecording} meteringLevel={meteringLevel} />

        <View style={styles.recordControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRecording ? "Stop recording" : "Record your voice"}
            disabled={disabled}
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
          <Text style={styles.scorecardHeading}>Speaking Scorecard (Page 10 · 115)</Text>
          <Text style={styles.scorecardSubtitle}>
            Self-assess pronunciation accuracy & fluency:
          </Text>

          <View style={styles.scoreRow}>
            {[
              { label: "Needs Practice", val: 65, emoji: "🌱" },
              { label: "Good Accent", val: 85, emoji: "🌿" },
              { label: "Native Fluency", val: 100, emoji: "✨" },
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
                Recorded Transcript: “{transcript || targetPhrase}”
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
    color: "#236c19",
    fontSize: 11,
    fontWeight: "800",
  },
  speakerTextActive: {
    color: "#ffffff",
  },
  phraseText: {
    color: "#20352b",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
  },
  deviceNotice: {
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
    color: "#20352b",
    fontSize: 13,
    fontWeight: "800",
  },
  scorecardSubtitle: {
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
  scoreEmoji: { fontSize: 18, marginBottom: 2 },
  scoreText: { color: "#20352b", fontSize: 11, fontWeight: "700" },
  scoreTextSelected: { color: "#236c19", fontWeight: "800" },
  scorePercent: { color: "#65766c", fontSize: 10, fontWeight: "700", marginTop: 2 },
  scorePercentSelected: { color: "#236c19", fontWeight: "800" },
  resultBox: {
    backgroundColor: "#eaf8de",
    borderRadius: 12,
    marginTop: 10,
    padding: 10,
  },
  resultTranscript: { color: "#20352b", fontSize: 12, lineHeight: 17 },
  resultScore: { color: "#236c19", fontSize: 11, fontWeight: "800", marginTop: 4 },
  disabled: { opacity: 0.6 },
});
