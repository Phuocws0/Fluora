import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  description?: string | null;
  detail?: string;
  onPress: () => void;
  highlighted?: boolean;
};

export function LearningCard({ title, subtitle, description, detail, onPress, highlighted = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, highlighted && styles.highlighted]}
    >
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{subtitle.toLocaleUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Text accessibilityElementsHidden style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 16,
  },
  highlighted: { backgroundColor: "#eaf8de", borderColor: "#d9e8d1", minHeight: 142 },
  copy: { flex: 1 },
  eyebrow: { fontFamily: "Nunito_800ExtraBold", color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  title: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 18, fontWeight: "800", lineHeight: 25, marginTop: 5 },
  description: { fontFamily: "Nunito_400Regular", color: "#52625d", fontSize: 13, lineHeight: 19, marginTop: 6 },
  detail: { fontFamily: "Nunito_700Bold", color: "#236c19", fontSize: 12, fontWeight: "700", marginTop: 10 },
  arrow: { fontFamily: "Nunito_700Bold", color: "#236c19", fontSize: 30, fontWeight: "500" },
});
