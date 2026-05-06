import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";

type SpotCard = Doc<"spots"> & { avgRating: number; reviewCount: number };

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[s.star, { color: i <= Math.round(rating) ? Colors.accent : "#E0DDD8" }]}>
          ★
        </Text>
      ))}
      <Text style={s.ratingNum}>{rating > 0 ? rating.toFixed(1) : "—"}</Text>
    </View>
  );
}

function SpotCard({ spot }: { spot: SpotCard }) {
  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}
      onPress={() => router.push(`/spot/${spot._id}`)}
    >
      <Image source={{ uri: spot.photos[0] }} style={s.cardImage} contentFit="cover" />
      <View style={s.cardBody}>
        <View style={s.tagsRow}>
          {spot.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={s.cardTitle} numberOfLines={2}>{spot.title}</Text>
        <View style={s.cardFooter}>
          <StarRating rating={spot.avgRating} />
          <Text style={s.reviewCount}>{spot.reviewCount} avis</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function FeedScreen() {
  const spots = useQuery(api.spots.list);
  const seed = useMutation(api.seed.run);

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Spots</Text>
      </View>

      <View style={s.searchRow}>
        <Pressable style={s.searchBar}>
          <Octicons name="search" size={16} color={Colors.muted} />
          <Text style={s.searchPlaceholder}>Rechercher un lieu…</Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {spots === undefined && (
          <View style={s.centered}>
            <Text style={s.mutedText}>Chargement…</Text>
          </View>
        )}
        {spots?.length === 0 && (
          <View style={s.centered}>
            <Text style={s.emptyTitle}>Aucun spot pour l'instant</Text>
            <Text style={[s.mutedText, { textAlign: "center" }]}>
              Sois le premier à partager un lieu incroyable.
            </Text>
            <Pressable
              style={({ pressed }) => [s.seedBtn, pressed && { opacity: 0.8 }]}
              onPress={() => seed({})}
            >
              <Text style={s.seedBtnText}>Charger les spots de démo</Text>
            </Pressable>
          </View>
        )}
        {spots?.map((spot) => <SpotCard key={spot._id} spot={spot} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.5,
  },

  searchRow: { paddingHorizontal: 20, paddingBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  mutedText: {
    color: Colors.muted,
    fontSize: 14,
    fontFamily: Fonts.body,
    lineHeight: 21,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  seedBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
  },
  seedBtnText: {
    color: "#fff",
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },

  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  cardImage: { width: "100%", height: 210 },
  cardBody: { padding: 14 },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 9,
  },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    color: Colors.tagText,
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 9,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  star: { fontSize: 12 },
  ratingNum: {
    color: Colors.muted,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    marginLeft: 5,
  },
  reviewCount: {
    color: Colors.muted,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
});
