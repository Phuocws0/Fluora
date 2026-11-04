import { StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  content: unknown;
  prompt: string;
  text: string;
  onChange: (text: string) => void;
  disabled?: boolean;
};

function parseTranscript(content: unknown): string {
  if (content && typeof content === "object" && "transcript" in content) {
    const raw = (content as { transcript: unknown }).transcript;
    if (typeof raw === "string") return raw;
  }
  return "";
}

export function TranscriptGapExercise({ content, prompt, text, onChange, disabled = false }: Props) {
  const transcript = parseTranscript(content);

  return (
    <View style={styles.container}>
      {transcript ? (
        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptEyebrow}>LISTEN & FILL THE GAP:</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      ) : null}

      <Text style={styles.inputLabel}>YOUR ANSWER:</Text>
      <TextInput
        accessibilityLabel="Your answer"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        onChangeText={onChange}
        placeholder="Type the missing word here…"
        placeholderTextColor="#8d9d94"
        style={[styles.input, disabled && styles.disabled]}
        value={text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 14, gap: 14 },
  transcriptCard: {
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  transcriptEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  transcriptText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
  },
  inputLabel: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#65766c",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: "Nunito_700Bold",
    backgroundColor: "#ffffff",
    borderColor: "#c5d6bf",
    borderRadius: 14,
    borderWidth: 1.5,
    color: "#20352b",
    fontSize: 16,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabled: {
    backgroundColor: "#f5f8f4",
    opacity: 0.6,
  },
});
