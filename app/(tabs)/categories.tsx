import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { Colors, Fonts } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { CATEGORIES } from "./index";

const CARD_BG = "#EFF5F1";
const CARD_BORDER = "#DCE9E1";

export default function CategoriesScreen() {
  const rows: (typeof CATEGORIES)[] = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    rows.push(CATEGORIES.slice(i, i + 2));
  }

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <AppHeader showBack />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Toutes les catégories</Text>

        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={s.row}>
            {row.map((cat) => (
              <Pressable
                key={cat.label}
                style={({ pressed }) => [s.catCard, pressed && { opacity: 0.82 }]}
                onPress={() => router.push(`/category/${encodeURIComponent(cat.label)}`)}
              >
                <View style={[s.catIconWrap, { backgroundColor: cat.bg }]}>
                  <Octicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <Text style={s.catLabel} numberOfLines={1}>{cat.label}</Text>
                <Octicons name="chevron-right" size={13} color={Colors.muted} />
              </Pressable>
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  pageTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 16,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  catCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  catLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
});
