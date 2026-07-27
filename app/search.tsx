import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { StarRating } from "@/components/StarRating";
import { CATEGORIES } from "./(tabs)/index";

type SpotCard = Doc<"spots"> & { avgRating: number; reviewCount: number };

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const spots = useQuery(api.spots.list, {});

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();

  const results = q.length >= 2
    ? (spots ?? []).filter((spot) =>
        spot.title.toLowerCase().includes(q) ||
        spot.description?.toLowerCase().includes(q) ||
        spot.tags.some((t) => t.toLowerCase().includes(q))
      )
    : [];

  const suggestedCats = q.length > 0
    ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(q))
    : CATEGORIES.slice(0, 6);

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      {/* Header avec input intégré */}
      <View style={s.header}>
        <View style={s.searchBar}>
          <Octicons name="search" size={15} color={Colors.muted} />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="Nom de spot, lieu, catégorie…"
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Octicons name="x-circle-fill" size={16} color={Colors.muted} />
            </Pressable>
          )}
        </View>
        <Pressable style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelText}>Annuler</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Résultats spots */}
        {q.length >= 2 && (
          <>
            {results.length === 0 && spots !== undefined && (
              <View style={s.empty}>
                <Octicons name="search" size={36} color={Colors.border} />
                <Text style={s.emptyTitle}>Aucun résultat</Text>
                <Text style={s.emptyText}>Essaie un autre mot-clé ou une catégorie.</Text>
              </View>
            )}
            {results.length > 0 && (
              <>
                <Text style={s.sectionLabel}>{results.length} spot{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}</Text>
                {results.map((spot) => (
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
              </>
            )}
          </>
        )}

        {/* Suggestions catégories (toujours visibles) */}
        {(q.length < 2 || suggestedCats.length > 0) && (
          <View style={s.catsSection}>
            <Text style={s.sectionLabel}>
              {q.length === 0 ? "Catégories populaires" : "Catégories"}
            </Text>
            <View style={s.catsList}>
              {suggestedCats.map((cat) => (
                <Pressable
                  key={cat.label}
                  style={({ pressed }) => [s.catChip, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push(`/category/${encodeURIComponent(cat.label)}`)}
                >
                  <cat.Icon width={14} height={14} color={Colors.primary} />
                  <Text style={s.catChipText}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.primary,
  },

  content: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
  },

  catsSection: { marginTop: 8 },
  catsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.primary,
  },

  card: {
    borderRadius: Radius.card,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: Colors.card,
  },
  cardImage: { width: "100%", height: 180 },
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
  reviewCount: {
    color: Colors.muted,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
});
