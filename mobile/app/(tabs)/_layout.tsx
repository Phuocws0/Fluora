import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { font } from "../../features/profile/garden-ui";

const ACTIVE = "#236c19";
const MUTED = "#65766c";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: MUTED,
        tabBarActiveBackgroundColor: "#eaf8de",
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 11 },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 2, marginVertical: 4 },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          borderRadius: 20,
          height: 54,
          marginBottom: 16,
          marginHorizontal: 24,
          paddingHorizontal: 4,
          position: "absolute",
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: "#236c19",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        },
      }}
    >
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ color }) => <Ionicons name="book-outline" color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="tutor"
        options={{
          title: "Tutor",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses-outline" color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="league"
        options={{
          title: "League",
          tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color} size={20} />,
        }}
      />
    </Tabs>
  );
}
