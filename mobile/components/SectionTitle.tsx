import { StyleSheet } from "react-native";
import { LocalizedText as Text } from "../features/i18n/i18n";

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 19, fontWeight: "800", marginBottom: 12, marginTop: 26 },
});
