import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts, Radius, FloatingShadow } from "@/constants/theme";
import { CreateListModal } from "@/components/CreateListModal";
import { FavoriteSpotRow } from "@/components/FavoriteSpotRow";

const GRID_GAP = 12;
const GRID_ITEM_WIDTH = (Dimensions.get("window").width - 40 - GRID_GAP) / 2;

type ListEntry = {
  _id: string;
  name: string;
  count: number;
  cover: string | null;
};

function ListGridItem({
  icon,
  iconBg,
  iconColor,
  cover,
  name,
  count,
  onPress,
  onLongPress,
}: {
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  cover?: string | null;
  name: string;
  count: number;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.gridItem, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={s.gridImage} contentFit="cover" />
      ) : (
        <View style={[s.gridImage, s.gridImageEmpty, { backgroundColor: iconBg ?? Colors.surface }]}>
          <Octicons
            name={(icon as any) ?? "list-unordered"}
            size={26}
            color={iconColor ?? Colors.muted}
          />
        </View>
      )}
      <Text style={s.gridName} numberOfLines={1}>{name}</Text>
      <Text style={s.gridCount}>{count} spot{count !== 1 ? "s" : ""}</Text>
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const overview = useQuery(api.favorites.getOverview);
  const defaultSpots = useQuery(api.favorites.getDefaultFavoriteSpots);
  const createList = useMutation(api.favorites.createList);
  const deleteList = useMutation(api.favorites.deleteList);
  const [creating, setCreating] = useState(false);

  const handleCreateList = async (name: string) => {
    await createList({ name });
    setCreating(false);
  };

  const handleDeleteList = (list: ListEntry) => {
    Alert.alert(
      `Supprimer "${list.name}" ?`,
      "Les spots qu'elle contient resteront dans tes coups de cœur.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteList({ listId: list._id as Id<"favoriteLists"> }),
        },
      ]
    );
  };

  const isEmpty =
    overview !== undefined &&
    overview !== null &&
    overview.default.count === 0 &&
    overview.lists.length === 0;

  if (!isLoading && !isAuthenticated) {
    return (
      <SafeAreaView edges={["top"]} style={s.screen}>
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
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <View style={s.pageTitleRow}>
          <Text style={s.pageTitle}>Favoris</Text>
        </View>

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
              <FavoriteSpotRow key={spot._id} spot={spot} />
            ))}
          </View>
        )}

        {/* Mes listes */}
        {overview && overview.lists.length > 0 && (
          <View>
            <Text style={s.sectionTitle2}>Mes listes</Text>
            <View style={s.grid}>
              {overview.lists.map((list) => (
                <ListGridItem
                  key={list._id}
                  icon="list-unordered"
                  iconBg={Colors.tagBg}
                  iconColor={Colors.primary}
                  cover={list.cover}
                  name={list.name}
                  count={list.count}
                  onPress={() => router.push(`/favorites/${list._id}`)}
                  onLongPress={() => handleDeleteList(list)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.88 }]}
        onPress={() => setCreating(true)}
        accessibilityRole="button"
        accessibilityLabel="Créer une liste"
      >
        <Octicons name="plus" size={16} color="#fff" />
        <Text style={s.fabText}>Nouvelle liste</Text>
      </Pressable>

      <CreateListModal
        visible={creating}
        onClose={() => setCreating(false)}
        onCreate={handleCreateList}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

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

  // ── Bouton flottant "Nouvelle liste" (même style que le bouton Carte de l'accueil) ──
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: Radius.card,
    ...FloatingShadow,
  },
  fabText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },

  // ── List grid (2 colonnes, façon AllTrails) ────────────────
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    paddingHorizontal: 20,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
  },
  gridImage: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    borderRadius: Radius.cardSm,
    marginBottom: 8,
  },
  gridImageEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  gridName: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  gridCount: {
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
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  sectionTitle2: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
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
