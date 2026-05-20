import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { Colors, Fonts } from "@/constants/theme";

export default function NotificationsModal() {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        <Pressable
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Octicons name="x" size={20} color={Colors.text} />
        </Pressable>
      </View>

      <View style={s.empty}>
        <Octicons name="bell" size={36} color={Colors.muted} />
        <Text style={s.emptyTitle}>Aucune notification</Text>
        <Text style={s.emptySub}>Tu seras notifié quand quelqu'un interagit avec tes spots.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
