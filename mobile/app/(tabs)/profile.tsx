import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { DestinationPlaceholder } from "../../components/DestinationPlaceholder";

export default function ProfileScreen() {
  return (
    <DestinationPlaceholder title="Profile" description="Manage your learner profile and app preferences.">
      <Link href="/settings/general" style={styles.link}>Open settings</Link>
      <Link href="/(auth)/welcome" style={styles.link}>Go to sign in</Link>
    </DestinationPlaceholder>
  );
}

const styles = StyleSheet.create({ link: { color: "#236c19", fontSize: 14, fontWeight: "700", marginTop: 18 } });
