import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[s.star, { color: i <= Math.round(rating) ? Colors.accent : "#E0DDD8" }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[s.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarLetter, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function ReviewCard({ review }: { review: any }) {
  const date = new Date(review.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  return (
    <View style={s.review}>
      <View style={s.reviewHeader}>
        <Avatar url={review.user?.avatarUrl} name={review.user?.name ?? "?"} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={s.reviewName}>{review.user?.name ?? "Anonyme"}</Text>
          <Text style={s.reviewDate}>{date}</Text>
        </View>
        <StarRating rating={review.rating} />
      </View>
      {review.comment ? (
        <Text style={s.reviewComment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const spot = useQuery(api.spots.getById, { id: id as Id<"spots"> });

  if (spot === undefined) {
    return (
      <SafeAreaView style={s.screen}>
        <Text style={s.mutedText}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (spot === null) {
    return (
      <SafeAreaView style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={s.bodyBold}>Spot introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.bodySemiBold }}>
            ← Retour
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const createdDate = new Date(spot.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero image */}
        <View style={s.hero}>
          <Image source={{ uri: spot.photos[0] }} style={s.heroImage} contentFit="cover" />
          <Pressable
            style={[s.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={s.backBtnText}>‹</Text>
          </Pressable>
          {spot.photos[1] ? (
            <View style={s.thumbContainer}>
              <Image source={{ uri: spot.photos[1] }} style={s.thumb} contentFit="cover" />
            </View>
          ) : null}
        </View>

        {/* Content card */}
        <View style={s.content}>
          <View style={s.tagsRow}>
            {spot.tags.map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <Text style={s.spotTitle}>{spot.title}</Text>

          <View style={s.ratingRow}>
            <StarRating rating={spot.avgRating} />
            <Text style={s.ratingValue}>
              {spot.avgRating > 0 ? spot.avgRating.toFixed(1) : "—"}
            </Text>
            <Text style={s.mutedText}>({spot.reviewCount} avis)</Text>
          </View>

          <View style={s.creatorRow}>
            <Avatar url={spot.creator?.avatarUrl} name={spot.creator?.name ?? "?"} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={s.mutedText}>Partagé par</Text>
              <Text style={s.creatorName}>{spot.creator?.name ?? "Utilisateur"}</Text>
            </View>
            <Text style={s.mutedText}>{createdDate}</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.description}>{spot.description}</Text>

          <View style={s.divider} />

          <View style={s.reviewsHeader}>
            <Text style={s.sectionTitle}>Avis</Text>
            <Text style={s.mutedText}>
              {spot.reviewCount} check-in{spot.reviewCount > 1 ? "s" : ""}
            </Text>
          </View>

          {spot.reviews.length === 0 ? (
            <View style={s.emptyReviews}>
              <Text style={[s.mutedText, { textAlign: "center", lineHeight: 21 }]}>
                Sois le premier à laisser un avis en faisant un check-in sur place.
              </Text>
            </View>
          ) : (
            spot.reviews.map((review) => <ReviewCard key={review._id} review={review} />)
          )}
        </View>
      </ScrollView>

      {/* Check-in floating button */}
      <View style={[s.fab, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={({ pressed }) => [s.fabBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.fabText}>Check-in — Laisser un avis</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  mutedText: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body },
  bodyBold: { fontSize: 17, fontFamily: Fonts.headingBold, color: Colors.text },

  hero: { height: 340, position: "relative" },
  heroImage: { width: SCREEN_WIDTH, height: 340 },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    lineHeight: 28,
  },
  thumbContainer: {
    position: "absolute",
    bottom: 12,
    right: 12,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  thumb: { width: 72, height: 72 },

  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -18,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: { color: Colors.tagText, fontSize: 12, fontFamily: Fonts.bodyMedium },
  spotTitle: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  star: { fontSize: 15 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  ratingValue: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.text },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  creatorName: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontFamily: Fonts.headingBold },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  review: { marginBottom: 20 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewName: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  reviewDate: { fontSize: 11, fontFamily: Fonts.body, color: Colors.muted },
  reviewComment: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 21,
    paddingLeft: 44,
  },
  emptyReviews: { alignItems: "center", paddingVertical: 28 },

  fab: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fabBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontFamily: Fonts.bodySemiBold, fontSize: 15 },
});
