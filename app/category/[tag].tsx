import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { CATEGORIES } from "../(tabs)/index";
import { StarRating } from "@/components/StarRating";

type SpotCard = Doc<"spots"> & { avgRating: number; reviewCount: number };

export default function CategoryScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag ?? "");
  const spots = useQuery(api.spots.list, {});

  const cat = CATEGORIES.find((c) => c.label === decodedTag);
  const filtered = spots?.filter((spot) => spot.tags.includes(decodedTag)) ?? [];

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Octicons name="chevron-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{decodedTag}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Titre de la catégorie */}
        <View style={s.catHeader}>
          {cat && (
            <View style={s.catIconWrap}>
              <cat.Icon width={20} height={20} color={Colors.primary} />
            </View>
          )}
          <View>
            <Text style={s.catTitle}>{decodedTag}</Text>
            {spots !== undefined && (
              <Text style={s.count}>
                {filtered.length} spot{filtered.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>

        {spots === undefined && (
          <View style={s.centered}>
            <Text style={s.mutedText}>Chargement…</Text>
          </View>
        )}

        {spots !== undefined && filtered.length === 0 && (
          <View style={s.centered}>
            <Octicons name="inbox" size={40} color={Colors.border} />
            <Text style={s.emptyTitle}>Aucun spot ici</Text>
            <Text style={[s.mutedText, { textAlign: "center" }]}>
              Sois le premier à partager un spot "{decodedTag}".
            </Text>
            <Pressable style={s.createBtn} onPress={() => router.push("/(tabs)/create")}>
              <Octicons name="plus" size={14} color="#fff" />
              <Text style={s.createBtnText}>Créer un spot</Text>
            </Pressable>
          </View>
        )}

        {filtered.map((spot) => (
          <Pressable
            key={spot._id}
            style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}
            onPress={() => router.push(`/spot/${spot._id}`)}
          >
            <Image source={{ uri: spot.photos[0] }} style={s.cardImage} contentFit="cover" />
            <View style={s.cardBody}>
              <View style={s.tagsRow}>
                {spot.tags.slice(0, 3).map((t) => (
                  <View key={t} style={s.tag}>
                    <Text style={s.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.cardTitle} numberOfLines={2}>{spot.title}</Text>
              <View style={s.cardFooter}>
                <StarRating rating={(spot as SpotCard).avgRating} showValue />
                <Text style={s.reviewCount}>{(spot as SpotCard).reviewCount} avis</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 110,
  },

  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.tagBg,
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  count: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.muted,
    marginTop: 1,
  },

  centered: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  mutedText: {
    color: Colors.muted,
    fontSize: 14,
    fontFamily: Fonts.body,
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
  },
  createBtnText: {
    color: "#fff",
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    textAlign: "center",
    marginHorizontal: 8,
  },

  card: {
    borderRadius: Radius.card,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  cardImage: { width: "100%", height: 210 },
  cardBody: { padding: 14 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 9 },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: { color: Colors.tagText, fontSize: 11, fontFamily: Fonts.bodyMedium },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 9,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewCount: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body },
});
