import { useQuery, useMutation } from "convex/react";
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
import { Colors, Fonts } from "@/constants/theme";

type ListEntry = {
  _id: string;
  name: string;
  count: number;
  cover: string | null;
};

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
  const overview = useQuery(api.favorites.getOverview);
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

        {/* Default "Favoris" row */}
        {overview && overview.default.count > 0 && (
          <ListRow
            icon="heart-fill"
            iconBg="#FFF0EB"
            iconColor={Colors.accent}
            cover={overview.default.cover}
            name="Favoris"
            count={overview.default.count}
          />
        )}

        {/* Custom lists */}
        {overview?.lists.map((list) => (
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
