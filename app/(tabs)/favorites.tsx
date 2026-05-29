import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
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
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";

type ListEntry = {
  _id: string;
  name: string;
  count: number;
  cover: string | null;
};

type FavoriteSpot = {
  _id: Id<"spots">;
  title: string;
  tags: string[];
  photo: string | null;
  avgRating: number;
  reviewCount: number;
};

function SpotRow({ spot }: { spot: FavoriteSpot }) {
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
              <Text style={s.ratingPillStar}>★</Text>
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

function ListRow({
  icon,
  iconBg,
  iconColor,
  cover,
  name,
  count,
  onPress,
}: {
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  cover?: string | null;
  name: string;
  count: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.listRow, pressed && { backgroundColor: Colors.surface }]}
      onPress={onPress}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={s.listThumb} contentFit="cover" />
      ) : (
        <View style={[s.listThumbEmpty, { backgroundColor: iconBg ?? Colors.surface }]}>
          <Octicons
            name={(icon as any) ?? "list-unordered"}
            size={22}
            color={iconColor ?? Colors.muted}
          />
        </View>
      )}
      <View style={s.listInfo}>
        <Text style={s.listName}>{name}</Text>
        <Text style={s.listCount}>{count} spot{count !== 1 ? "s" : ""}</Text>
      </View>
      <Octicons name="chevron-right" size={16} color={Colors.muted} />
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const overview = useQuery(api.favorites.getOverview);
  const defaultSpots = useQuery(api.favorites.getDefaultFavoriteSpots);
  const createList = useMutation(api.favorites.createList);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreateList = async () => {
    if (!newName.trim()) return;
    await createList({ name: newName.trim() });
    setNewName("");
    setCreating(false);
  };

  const isEmpty =
    overview !== undefined &&
    overview !== null &&
    overview.default.count === 0 &&
    overview.lists.length === 0;

  if (!isLoading && !isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={s.screen}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Spots</Text>
          </View>
          <View style={s.headerRight}>
            <Pressable style={s.iconBtn} onPress={() => router.push("/modal")}>
              <Octicons name="bell" size={18} color="#fff" />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={() => router.push("/search")}>
              <Octicons name="search" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
        <View style={[s.scroll, s.gateContainer]}>
          <View style={s.gateIcon}>
            <Octicons name="lock" size={32} color={Colors.primary} />
          </View>
          <Text style={s.gateTitle}>Connecte-toi pour accéder à tes favoris</Text>
          <Text style={s.gateSub}>
            Tes coups de cœur et tes listes sont sauvegardés sur ton compte.
          </Text>
          <Pressable
            style={({ pressed }) => [s.gateBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={s.gateBtnText}>Se connecter</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Spots</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable style={s.iconBtn} onPress={() => router.push("/modal")}>
            <Octicons name="bell" size={18} color="#fff" />
          </Pressable>
          <Pressable style={s.iconBtn} onPress={() => router.push("/search")}>
            <Octicons name="search" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <View style={s.pageTitleRow}>
          <Text style={s.pageTitle}>Favoris</Text>
        </View>

        {/* Create list button */}
        {creating ? (
          <View style={s.createRow}>
            <TextInput
              style={s.createInput}
              placeholder="Nom de la liste…"
              placeholderTextColor={Colors.muted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateList}
            />
            <Pressable
              style={[s.confirmBtn, !newName.trim() && s.confirmBtnDisabled]}
              onPress={handleCreateList}
              disabled={!newName.trim()}
            >
              <Octicons name="check" size={16} color="#fff" />
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={() => { setCreating(false); setNewName(""); }}>
              <Octicons name="x" size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [s.createListBtn, pressed && { opacity: 0.82 }]}
            onPress={() => setCreating(true)}
          >
            <View style={s.createListIcon}>
              <Octicons name="plus" size={20} color="#fff" />
            </View>
            <Text style={s.createListLabel}>Créer une liste</Text>
          </Pressable>
        )}

        {/* Divider */}
        <View style={s.divider} />

        {/* Loading */}
        {overview === undefined && (
          <View style={s.centered}>
            <Text style={s.mutedText}>Chargement…</Text>
          </View>
        )}

        {/* Empty state */}
        {isEmpty && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Octicons name="heart" size={32} color={Colors.accent} />
            </View>
            <Text style={s.emptyTitle}>Aucun favori</Text>
            <Text style={s.emptySub}>
              Appuie sur le cœur d'un spot pour l'ajouter ici.
            </Text>
          </View>
        )}

        {/* Coups de coeurs */}
        {overview && overview.default.count > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Coups de cœurs</Text>
            {defaultSpots?.map((spot) => (
              <SpotRow key={spot._id} spot={spot} />
            ))}
          </View>
        )}

        {/* Mes listes */}
        {overview && overview.lists.length > 0 && (
          <View>
            <Text style={s.sectionTitle2}>Mes listes</Text>
            {overview.lists.map((list) => (
              <ListRow
                key={list._id}
                icon="list-unordered"
                iconBg={Colors.tagBg}
                iconColor={Colors.primary}
                cover={list.cover}
                name={list.name}
                count={list.count}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.primary },

  // ── Header ──────────────────────────────────────────────
  header: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
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

  // ── Scroll ───────────────────────────────────────────────
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 110 },

  // ── Page title ───────────────────────────────────────────
  pageTitleRow: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.5,
  },

  // ── Create list ──────────────────────────────────────────
  createListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  createListIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  createListLabel: {
    fontSize: 16,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  createInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: Colors.muted },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Divider ──────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 0,
    marginBottom: 4,
  },

  // ── List rows ────────────────────────────────────────────
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    flexShrink: 0,
  },
  listThumbEmpty: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listInfo: {
    flex: 1,
    gap: 3,
  },
  listName: {
    fontSize: 16,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  listCount: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },

  // ── Sections ─────────────────────────────────────────────
  section: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  sectionTitle2: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  // ── Spot rows (Coups de cœurs) ────────────────────────────
  spotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  spotRowThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
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
  ratingPillStar: { fontSize: 10, color: Colors.accent },
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Auth gate ────────────────────────────────────────────
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.tagBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gateTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  gateSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  gateBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  gateBtnText: {
    color: "#fff",
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },

  // ── States ───────────────────────────────────────────────
  centered: {
    alignItems: "center",
    paddingVertical: 60,
  },
  mutedText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
