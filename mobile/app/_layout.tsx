import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { AuthProvider } from "../features/auth/AuthContext";
import { AppLanguageProvider } from "../features/i18n/i18n";
import { WellbeingReminder } from "../features/profile/WellbeingReminder";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });
  if (fontError) throw fontError;
  if (!fontsLoaded) return null;
  return (
    <AuthProvider>
      <AppLanguageProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#ffffff" },
          }}
        />
        <WellbeingReminder />
      </AppLanguageProvider>
    </AuthProvider>
  );
}
