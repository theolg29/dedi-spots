import { Octicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { HapticTab } from "@/components/haptic-tab";
import { Colors, Fonts } from "@/constants/theme";

type OcticonName = React.ComponentProps<typeof Octicons>["name"];

const TAB_ICONS: Record<string, OcticonName> = {
  index:   "home",
  explore: "location",
  create:  "plus-circle",
  profile: "person",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyMedium,
          fontSize: 10,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIcon: ({ color }) => {
          const name = TAB_ICONS[route.name];
          if (!name) return null;
          return <Octicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index"   options={{ title: "Feed" }} />
      <Tabs.Screen name="explore" options={{ title: "Carte" }} />
      <Tabs.Screen name="create"  options={{ title: "Créer" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
