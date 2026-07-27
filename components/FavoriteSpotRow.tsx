import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Octicons } from "@expo/vector-icons";

import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts, Radius } from "@/constants/theme";

export type FavoriteSpot = {
  _id: Id<"spots">;
  title: string;
  tags: string[];
  photo: string | null;
  avgRating: number;
  reviewCount: number;
};

export function FavoriteSpotRow({ spot }: { spot: FavoriteSpot }) {
  return (
    <Pressable
      style={({ pressed }) => [s.spotRow, pressed && { opacity: 0.88 }]}
      onPress={() => router.push(`/spot/${spot._id}`)}
    >
      {spot.photo ? (
        <Image source={{ uri: spot.photo }} style={s.spotRowThumb} contentFit="cover" />
      ) : (
        <View style={[s.spotRowThumb, s.spotRowThumbEmpty]}>
          <Octicons name="image" size={20} color={Colors.muted} />
        </View>
      )}
      <View style={s.spotRowInfo}>
        <Text style={s.spotRowTitle} numberOfLines={1}>{spot.title}</Text>
        <View style={s.spotRowMeta}>
          {spot.avgRating > 0 && (
            <View style={s.ratingPill}>
              <Octicons name="star-fill" size={10} color={Colors.star} />
              <Text style={s.ratingPillVal}>{spot.avgRating.toFixed(1)}</Text>
            </View>
          )}
          {spot.reviewCount > 0 && (
            <Text style={s.spotRowCount}>{spot.reviewCount} avis</Text>
          )}
        </View>
        {spot.tags.length > 0 && (
          <View style={s.spotRowTags}>
            {spot.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={s.spotRowTag}>
                <Text style={s.spotRowTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={s.arrowBtn}>
        <Octicons name="arrow-right" size={16} color={Colors.primary} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  spotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.cardSm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  spotRowThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.cardSm - 4,
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  spotRowThumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  spotRowInfo: { flex: 1, gap: 4 },
  spotRowTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  spotRowMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  ratingPillVal: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  spotRowCount: { fontSize: 11, fontFamily: Fonts.body, color: Colors.muted },
  spotRowTags: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  spotRowTag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  spotRowTagText: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: Colors.tagText },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
