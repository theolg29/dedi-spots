import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Fonts } from "@/constants/theme";

export default function MapScreen() {
  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Carte</Text>
      </View>
      <View style={s.body}>
        <Text style={s.label}>Vue carte</Text>
        <Text style={s.sub}>La carte interactive sera disponible ici.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 34, fontFamily: Fonts.headingBold, color: Colors.text, letterSpacing: -0.5 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
  label: { fontSize: 17, fontFamily: Fonts.heading, color: Colors.text },
  sub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 21,
  },
});
