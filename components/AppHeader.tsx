import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Colors, Fonts } from "@/constants/theme";

interface Props {
  showBack?: boolean;
}

export function AppHeader({ showBack = false }: Props) {
  const myProfile = useQuery(api.users.getMyProfile);

  return (
    <View style={s.hero}>
      <View style={s.row}>
        <View style={s.left}>
          {showBack && (
            <Pressable style={s.backBtn} onPress={() => router.back()}>
              <Octicons name="arrow-left" size={20} color={Colors.text} />
            </Pressable>
          )}
          <Text style={s.title}>Spots</Text>
        </View>

        <View style={s.actions}>
          <Pressable style={s.iconBtn} onPress={() => router.push("/modal")}>
            <Octicons name="bell" size={18} color={Colors.text} />
          </Pressable>
          <Pressable
            style={s.avatarBtn}
            onPress={() => router.push("/(tabs)/profile")}
          >
            {myProfile?.avatarUrl ? (
              <Image
                source={{ uri: myProfile.avatarUrl }}
                style={s.avatar}
                contentFit="cover"
              />
            ) : (
              <Octicons name="person" size={18} color={Colors.textSecondary} />
            )}
          </Pressable>
        </View>
      </View>

      <Pressable style={s.searchBar} onPress={() => router.push("/search")}>
        <Octicons name="search" size={15} color={Colors.muted} />
        <Text style={s.searchPlaceholder}>Rechercher un lieu…</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  avatar: { width: 40, height: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
});
