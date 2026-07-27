import { Octicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts } from "@/constants/theme";

type OcticonName = React.ComponentProps<typeof Octicons>["name"];

const TAB_ITEMS: { name: string; label: string; icon: OcticonName }[] = [
  { name: "index", label: "Feed", icon: "home" },
  { name: "create", label: "Créer", icon: "plus-circle" },
  { name: "favorites", label: "Favoris", icon: "heart" },
  { name: "profile", label: "Profil", icon: "person" },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom || 12 }]}>
      {TAB_ITEMS.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) return null;
        const isFocused = activeName === tab.name;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={tab.name} style={s.item} onPress={onPress} hitSlop={8}>
            <Octicons name={tab.icon} size={22} color={isFocused ? Colors.primary : Colors.muted} />
            <Text style={[s.label, isFocused && s.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="categories" options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: "center", gap: 4 },
  label: { fontSize: 11, fontFamily: Fonts.bodyMedium, color: Colors.muted },
  labelActive: { color: Colors.primary, fontFamily: Fonts.bodySemiBold },
});
