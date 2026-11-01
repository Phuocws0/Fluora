import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { title: string; message: string; actionLabel?: string; onAction?: () => void };

export function ContentState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", backgroundColor: "#f5f8f4", borderRadius: 20, padding: 24 },
  title: { color: "#20352b", fontSize: 18, fontWeight: "800", textAlign: "center" },
  message: { color: "#65766c", fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  button: { backgroundColor: "#eaf8de", borderRadius: 14, marginTop: 16, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#236c19", fontSize: 14, fontWeight: "700" },
});
