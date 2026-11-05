import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import { DestinationPlaceholder } from "./DestinationPlaceholder";
import { LocalizedText as Text } from "../features/i18n/i18n";

type LinkItem = { label: string; href: "/login" | "/register" | "/forgot-password" | "/onboarding" | "/welcome" };

export function FlowPlaceholder({ title, description, links = [] }: { title: string; description: string; links?: LinkItem[] }) {
  return (
    <DestinationPlaceholder title={title} description={description}>
      {links.map((link) => <Link href={link.href} key={link.href} style={styles.link}>{link.label}</Link>)}
    </DestinationPlaceholder>
  );
}

const styles = StyleSheet.create({ link: { fontFamily: "Nunito_700Bold", color: "#236c19", fontSize: 14, fontWeight: "700", marginTop: 18 } });
