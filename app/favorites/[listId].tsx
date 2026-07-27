import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";
import { FavoriteSpotRow } from "@/components/FavoriteSpotRow";
import { CreateListModal } from "@/components/CreateListModal";

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const list = useQuery(api.favorites.getListSpots, { listId: listId as Id<"favoriteLists"> });
  const renameList = useMutation(api.favorites.renameList);
  const deleteList = useMutation(api.favorites.deleteList);
  const [renaming, setRenaming] = useState(false);

  // La liste a été supprimée (par ex. depuis la grille) pendant qu'on est sur l'écran
  useEffect(() => {
    if (list === null) router.back();
  }, [list]);

  const handleRename = async (name: string) => {
    await renameList({ listId: listId as Id<"favoriteLists">, name });
    setRenaming(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer cette liste ?",
      "Les spots qu'elle contient resteront dans tes coups de cœur.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await deleteList({ listId: listId as Id<"favoriteLists"> });
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Octicons name="chevron-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{list?.name ?? "Liste"}</Text>
        <View style={s.headerActions}>
          <Pressable
            onPress={() => setRenaming(true)}
            style={s.headerBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Renommer la liste"
          >
            <Octicons name="pencil" size={16} color={Colors.text} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={s.headerBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Supprimer la liste"
          >
            <Octicons name="trash" size={18} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <CreateListModal
        visible={renaming}
        onClose={() => setRenaming(false)}
        onCreate={handleRename}
        initialName={list?.name ?? ""}
        title="Renommer la liste"
        confirmLabel="Enregistrer"
        confirmingLabel="Enregistrement…"
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {list === undefined && (
          <View style={s.centered}>
            <Text style={s.mutedText}>Chargement…</Text>
          </View>
        )}

        {list && list.spots.length === 0 && (
          <View style={s.centered}>
            <Octicons name="inbox" size={40} color={Colors.border} />
            <Text style={s.emptyTitle}>Cette liste est vide</Text>
            <Text style={[s.mutedText, { textAlign: "center" }]}>
              Ajoute un spot à cette liste depuis sa fiche détail.
            </Text>
          </View>
        )}

        {list?.spots.map((spot) => (
          <FavoriteSpotRow key={spot._id} spot={spot} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
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

  content: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  centered: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
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
});
