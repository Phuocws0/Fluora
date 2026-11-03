import { useLocalSearchParams } from "expo-router";
import { ProfileAuthGate } from "../../features/profile/garden-ui";
import { Analytics, EditProfile, General, Preferences, Security } from "../../features/profile/settings-screens";
import { Exports, Help, Support } from "../../features/profile/support-screens";

export default function SettingsScreen() {
  const { section = "general" } = useLocalSearchParams<{ section: string }>();
  return <ProfileAuthGate>{(() => {
    if (section === "general") return <General />;
    if (section === "edit-profile") return <EditProfile />;
    if (section === "analytics") return <Analytics />;
    if (section === "security") return <Security />;
    if (section === "help") return <Help />;
    if (section === "support") return <Support />;
    if (section === "exports") return <Exports />;
    return <Preferences section={section} />;
  })()}</ProfileAuthGate>;
}
