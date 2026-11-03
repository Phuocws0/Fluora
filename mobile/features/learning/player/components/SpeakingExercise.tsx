import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  const [hasPracticed, setHasPracticed] = useState(Boolean(transcript));

  const handleSimulatePractice = (practiceScore: number) => {
    if (disabled) return;
    const recordedTranscript = suggestedPhrase || prompt;
    onChange({ transcript: recordedTranscript, score: practiceScore });
    setHasPracticed(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.phraseCard}>
        <Text style={styles.eyebrow}>TARGET PHRASE:</Text>
        <Text style={styles.phraseText}>
          {suggestedPhrase || prompt}
        </Text>
        <Text style={styles.deviceNotice}>
          🔒 Your voice recording stays safely on your device.
        </Text>
      </View>

      <View style={styles.practiceStudio}>
        <Text style={styles.instruction}>
          Read the phrase aloud clearly. Assess how confident you felt speaking it:
        </Text>

        <View style={styles.scoreRow}>
          {[
            { label: "Needs Practice", val: 65, emoji: "🌱" },
            { label: "Good", val: 85, emoji: "🌿" },
            { label: "Perfect!", val: 100, emoji: "✨" },
          ].map((item) => {
            const isSelected = hasPracticed && score === item.val;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleSimulatePractice(item.val)}
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

        {hasPracticed ? (
          <View style={styles.scorecardPreview}>
            <Text style={styles.scorecardTitle}>Speaking Scorecard Preview</Text>
            <Text style={styles.scorecardDetail}>
              Transcript: “{transcript || suggestedPhrase || prompt}”
            </Text>
            <Text style={styles.scorecardScore}>Self-assessed Score: {score}/100</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 14, gap: 14 },
  phraseCard: {
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
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
  practiceStudio: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  instruction: {
    color: "#52625d",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
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
    paddingVertical: 12,
  },
  scoreButtonSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  scoreEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  scoreText: {
    color: "#20352b",
    fontSize: 12,
    fontWeight: "700",
  },
  scoreTextSelected: {
    color: "#236c19",
    fontWeight: "800",
  },
  scorePercent: {
    color: "#65766c",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  scorePercentSelected: {
    color: "#236c19",
    fontWeight: "800",
  },
  scorecardPreview: {
    backgroundColor: "#eaf8de",
    borderRadius: 12,
    marginTop: 14,
    padding: 12,
  },
  scorecardTitle: {
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  scorecardDetail: {
    color: "#20352b",
    fontSize: 13,
    lineHeight: 18,
  },
  scorecardScore: {
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
});
