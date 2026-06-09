import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";
import { AddToFavoritesSheet } from "@/components/AddToFavoritesSheet";

type SpotCard = Doc<"spots"> & { avgRating: number; reviewCount: number };

type OcticonName = React.ComponentProps<typeof Octicons>["name"];

export const CATEGORIES: { label: string; icon: OcticonName; bg: string; color: string }[] = [
  { label: "Plage",             icon: "sun",        bg: "#D6EEFF", color: "#2478C4" },
  { label: "Forêt",             icon: "north-star", bg: "#D8F0E4", color: "#2C7A48" },
  { label: "Panorama",         icon: "telescope",  bg: "#EAE6F8", color: "#6B4FC0" },
  { label: "Montagne",         icon: "location",   bg: "#E6F0EB", color: "#4A7C59" },
  { label: "Coucher de soleil", icon: "flame",     bg: "#FDECEA", color: "#D95F30" },
  { label: "Cascade",          icon: "cloud",      bg: "#D4EEF7", color: "#2588AB" },
  { label: "Lac",               icon: "globe",      bg: "#D8EAF7", color: "#2270A8" },
  { label: "Urbain",           icon: "home",       bg: "#EEE8E0", color: "#8B6A44" },
  { label: "Caché",             icon: "eye-closed", bg: "#EDE9F7", color: "#7350B8" },
  { label: "Patrimoine",       icon: "bookmark",   bg: "#F5EDE0", color: "#9A6A3C" },
  { label: "Falaise",          icon: "pin",        bg: "#F0EAE6", color: "#9C5A38" },
  { label: "Nature",           icon: "star",       bg: "#E2F0E6", color: "#3D6B4A" },
];

const HOME_CATEGORIES = CATEGORIES.slice(0, 4);

// Tinted card background: white + 5% primary (#1F5C3A)
const CARD_BG = "#EFF5F1";
const CARD_BORDER = "#DCE9E1";

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

function SpotCard({
  spot,
  isFavorited,
  onFavoritePress,
}: {
  spot: SpotCard;
  isFavorited: boolean;
  onFavoritePress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}
      onPress={() => router.push(`/spot/${spot._id}`)}
    >
      <View>
        <Image source={{ uri: spot.photos[0] }} style={s.cardImage} contentFit="cover" />
        <Pressable
          style={s.heartBtn}
          onPress={() => onFavoritePress()}
          hitSlop={8}
        >
          <Octicons
            name={isFavorited ? "heart-fill" : "heart"}
            size={18}
            color={isFavorited ? Colors.accent : Colors.textSecondary}
          />
        </Pressable>
      </View>
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



function CategoryCard({ cat }: { cat: typeof CATEGORIES[number] }) {
  return (
    <Pressable
      style={({ pressed }) => [s.catCard, pressed && { opacity: 0.82 }]}
      onPress={() => router.push(`/category/${encodeURIComponent(cat.label)}`)}
    >
      <View style={[s.catIconWrap, { backgroundColor: cat.bg }]}>
        <Octicons name={cat.icon} size={18} color={cat.color} />
      </View>
      <Text style={s.catLabel} numberOfLines={1}>{cat.label}</Text>
      <Octicons name="chevron-right" size={13} color={Colors.muted} />
    </Pressable>
  );
}

export default function FeedScreen() {
  const spots = useQuery(api.spots.list);
  const myProfile = useQuery(api.users.getMyProfile);
  const favoritedIds = useQuery(api.favorites.getFavoritedIds);

  const removeFav = useMutation(api.favorites.remove);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetSpotId, setSheetSpotId] = useState<Id<"spots"> | null>(null);

  const favSet = new Set((favoritedIds ?? []).map(String));

  const handleFavoritePress = (spotId: Id<"spots">) => {
    if (favSet.has(String(spotId))) {
      removeFav({ spotId });
    } else {
      setSheetSpotId(spotId);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Convex est réactif — les données sont déjà à jour, on simule juste le geste
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      {/* ── Sticky header ── */}
      <View style={s.stickyHeader}>
        <View style={s.heroHeader}>
          <Text style={s.headerTitle}>Spots</Text>
          <View style={s.headerRight}>
            <Pressable style={s.iconBtn} onPress={() => router.push("/modal")}>
              <Octicons name="bell" size={18} color="#fff" />
            </Pressable>
            <Pressable
              style={s.avatarBtn}
              onPress={() => router.push("/(tabs)/profile")}
            >
              {myProfile?.avatarUrl ? (
                <Image source={{ uri: myProfile.avatarUrl }} style={s.avatar} contentFit="cover" />
              ) : (
                <Octicons name="person" size={18} color="rgba(255,255,255,0.85)" />
              )}
            </Pressable>
          </View>
        </View>
        <Pressable style={s.searchBar} onPress={() => router.push("/search")}>
          <Octicons name="search" size={15} color={Colors.muted} />
          <Text style={s.searchPlaceholder}>Rechercher un lieu…</Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Hero banner — défile */}
        <View style={s.heroBannerWrap}>
          <View style={s.heroBanner}>
            <View style={s.heroTextCol}>
              <Text style={s.heroTitle}>Découvrez{"\n"}des lieux{"\n"}uniques.</Text>
              <Text style={s.heroSub}>Des spots cachés près de chez toi</Text>
              <Pressable
                style={s.heroBtn}
                onPress={() => router.push("/(tabs)/explore")}
              >
                <Text style={s.heroBtnText}>Découvrir</Text>
                <Octicons name="arrow-right" size={13} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={s.heroIllustration}>
              <Octicons name="globe" size={64} color="rgba(255,255,255,0.18)" />
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Catégories</Text>
            <Pressable style={s.seeAllBtn} onPress={() => router.push("/categories")}>
              <Text style={s.seeAllText}>Voir tous</Text>
              <Octicons name="chevron-right" size={13} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={s.catGrid}>
            <View style={s.catCol}>
              {HOME_CATEGORIES.filter((_, i) => i % 2 === 0).map((cat) => (
                <CategoryCard key={cat.label} cat={cat} />
              ))}
            </View>
            <View style={s.catCol}>
              {HOME_CATEGORIES.filter((_, i) => i % 2 === 1).map((cat) => (
                <CategoryCard key={cat.label} cat={cat} />
              ))}
            </View>
          </View>
        </View>

        {/* Feed */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Spots récents</Text>
          </View>

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
            </View>
          )}
          {spots?.map((spot) => (
            <SpotCard
              key={spot._id}
              spot={spot}
              isFavorited={favSet.has(String(spot._id))}
              onFavoritePress={() => handleFavoritePress(spot._id)}
            />
          ))}
        </View>
      </ScrollView>

      <AddToFavoritesSheet
        visible={sheetSpotId !== null}
        spotId={sheetSpotId}
        onClose={() => setSheetSpotId(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 110 },

  // ─── Sticky header ──────────────────────────────────────
  stickyHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 14,
  },

  // ─── Hero banner (défile) ────────────────────────────────
  heroBannerWrap: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 24,
  },

  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  avatar: { width: 40, height: 40 },

  // Search bar blanche
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  heroBanner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 17,
    marginBottom: 6,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primary,
  },
  heroIllustration: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Sections ────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.primary,
  },

  // ─── Category grid ────────────────────────────────────────
  catGrid: {
    flexDirection: "row",
    gap: 10,
  },
  catCol: {
    flex: 1,
    gap: 10,
  },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  catIconWrap: {
    width: 36,
    height: 36,
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

  // ─── Feed ─────────────────────────────────────────────────
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  cardImage: { width: "100%", height: 210 },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
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
