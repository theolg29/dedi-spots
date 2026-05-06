import { Colors, Fonts } from "@/constants/theme";
import { Octicons } from "@expo/vector-icons";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";


function TabButton(props: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const show = () => {
    scale.setValue(0.5);
    opacity.setValue(0.12);
    Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  };

  const hide = () => {
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      {...props}
      android_ripple={null}
      onPressIn={(e) => { show(); props.onPressIn?.(e); }}
      onPressOut={(e) => { hide(); props.onPressOut?.(e); }}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.ripple, { transform: [{ scale }], opacity }]}
      />
      {props.children}
    </Pressable>
  );
}

type OcticonName = React.ComponentProps<typeof Octicons>["name"];

const TAB_ICONS: Record<string, OcticonName> = {
  index:     "home",
  explore:   "location",
  create:    "plus-circle",
  favorites: "heart",
  profile:   "person",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "rgba(0,0,0,0.38)",
        tabBarActiveBackgroundColor: "#EAEAEC",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarButton: TabButton,
        headerShown: false,
        tabBarIcon: ({ color }) => {
          const name = TAB_ICONS[route.name];
          if (!name) return null;
          return <Octicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index"     options={{ title: "Feed" }} />
      <Tabs.Screen name="explore"   options={{ title: "Carte" }} />
      <Tabs.Screen name="create"    options={{ title: "Créer" }} />
      <Tabs.Screen name="favorites" options={{ title: "Favoris" }} />
      <Tabs.Screen name="profile"   options={{ title: "Profil" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    backgroundColor: "#F9F9FB",
    borderTopWidth: 0,
    elevation: 0,
    height: 72,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabItem: {
    borderRadius: 1000,
    marginHorizontal: 2,
    overflow: "hidden",
  },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A1A1A",
    borderRadius: 1000,
  },
});
