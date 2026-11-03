import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../features/auth/AuthContext";

export default function IndexScreen() {
  const { isAuthenticated, settings, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#236c19" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (settings?.onboardingCompleted) {
      return <Redirect href="/(tabs)/learn" />;
    }
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
