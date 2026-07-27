import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";

export function NotificationDot() {
  const unreadCount = useQuery(api.notifications.unreadCount);
  if (!unreadCount) return null;
  return <View style={s.dot} />;
}

const s = StyleSheet.create({
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
});
