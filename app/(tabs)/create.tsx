import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Fonts } from "@/constants/theme";

export default function CreateScreen() {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Nouveau spot</Text>
      </View>
      <View style={s.body}>
        <Text style={s.label}>Partage un lieu</Text>
        <Text style={s.sub}>Le formulaire de création apparaîtra ici.</Text>
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
