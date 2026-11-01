import { StyleSheet, Text } from "react-native";

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { color: "#20352b", fontSize: 19, fontWeight: "800", marginBottom: 12, marginTop: 26 },
});
