import { useLocalSearchParams } from "expo-router";
import { DestinationPlaceholder } from "../../components/DestinationPlaceholder";

export default function SettingsScreen() {
  const { section = "general" } = useLocalSearchParams<{ section: string }>();
  const title = section.replaceAll("-", " ");
  return <DestinationPlaceholder title={`${title.charAt(0).toLocaleUpperCase()}${title.slice(1)} settings`} description="Settings sections will be implemented in the profile and settings issue." />;
}
