import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ContentState } from "./ContentState";
import { ScreenContainer } from "./ScreenContainer";

export function DestinationPlaceholder({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>FLUORA</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.state}>
        <ContentState title="Coming soon" message="This Fluora experience will be available in a later demo build." />
      </View>
      {children}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: "Nunito_800ExtraBold", color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 28, fontWeight: "900", marginTop: 8 },
  description: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, lineHeight: 21, marginTop: 8 },
  state: { marginTop: 24 },
});
