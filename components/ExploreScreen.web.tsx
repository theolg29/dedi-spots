import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts } from "@/constants/theme";

// Web stub — react-native-maps is native-only
export default function ExploreScreen() {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>🗺️</Text>
      <Text style={s.title}>Carte non disponible</Text>
      <Text style={s.sub}>La vue carte est disponible sur l'application mobile.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emoji: { fontSize: 48 },
  title: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
