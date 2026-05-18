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
              <Octicons name="arrow-left" size={20} color="#fff" />
            </Pressable>
          )}
          <Text style={s.title}>Spots</Text>
        </View>

        <View style={s.actions}>
          <Pressable style={s.iconBtn} onPress={() => router.push("/modal")}>
            <Octicons name="bell" size={18} color="#fff" />
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
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    fontSize: 24,
    fontFamily: Fonts.headingBold,
    color: "#fff",
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  avatar: { width: 38, height: 38 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
});
