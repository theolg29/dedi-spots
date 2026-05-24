import { Octicons } from "@expo/vector-icons";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";

function SpotCard({ spot }: { spot: { _id: Id<"spots">; title: string; tags: string[]; photo: string | null } }) {
  return (
    <Pressable
      style={({ pressed }) => [s.spotCard, pressed && { opacity: 0.85 }]}
      onPress={() => router.push({ pathname: "/spot/[id]", params: { id: spot._id } })}
    >
      {spot.photo ? (
        <Image source={{ uri: spot.photo }} style={s.spotPhoto} contentFit="cover" />
      ) : (
        <View style={[s.spotPhoto, { backgroundColor: Colors.surface }]} />
      )}
      <View style={s.spotBody}>
        <Text style={s.spotTitle} numberOfLines={1}>{spot.title}</Text>
        {spot.tags.length > 0 && (
          <View style={s.spotTags}>
            {spot.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Octicons name="chevron-right" size={16} color={Colors.muted} style={{ marginRight: 14 }} />
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();

  const userId = id as Id<"users">;
  const profile = useQuery(api.users.getPublicProfile, { userId });
  const viewer = useQuery(api.users.viewer);
  const followCounts = useQuery(api.follows.getFollowCounts, { userId });
  const isFollowing = useQuery(api.follows.isFollowing, { userId });
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);

  const isOwnProfile = viewer?._id === userId;

  const handleFollowToggle = async () => {
    if (!isAuthenticated) { router.push("/onboarding"); return; }
    if (isFollowing) {
      await unfollow({ userId });
    } else {
      await follow({ userId });
    }
  };

  const loading = profile === undefined;
  const notFound = profile === null;

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Octicons name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Profil</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : notFound ? (
        <View style={s.centered}>
          <Text style={s.mutedText}>Utilisateur introuvable</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Hero — aligné à gauche comme profile.tsx */}
          <View style={s.profileHero}>
            <View style={s.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarLetter}>
                    {(profile.name ?? profile.profile?.username ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={s.profileName}>{profile.name ?? profile.profile?.username ?? "Utilisateur"}</Text>
            {profile.profile?.username ? (
              <Text style={s.profileSub}>@{profile.profile.username}</Text>
            ) : null}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statValue}>{profile.spots.length}</Text>
              <Text style={s.statLabel}>Spots</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{followCounts?.followers ?? "—"}</Text>
              <Text style={s.statLabel}>Abonnés</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{followCounts?.following ?? "—"}</Text>
              <Text style={s.statLabel}>Abonnements</Text>
            </View>
          </View>

          {/* Follow button */}
          {!isOwnProfile && (
            <Pressable
              style={({ pressed }) => [
                s.followBtn,
                isFollowing && s.followBtnOutline,
                pressed && { opacity: 0.75 },
              ]}
              onPress={handleFollowToggle}
            >
              <Text style={[s.followBtnText, isFollowing && s.followBtnTextOutline]}>
                {isFollowing ? "Abonné" : "Suivre"}
              </Text>
            </Pressable>
          )}

          {/* Spots */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Spots partagés</Text>
            {profile.spots.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>Aucun spot partagé pour l'instant.</Text>
              </View>
            ) : (
              profile.spots.map((spot) => <SpotCard key={spot._id} spot={spot} />)
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  mutedText: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  backBtn: { padding: 4 },

  /* Hero — même style que profile.tsx */
  profileHero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  avatarWrap: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLetter: {
    fontSize: 30,
    color: "#fff",
    fontFamily: Fonts.headingBold,
  },
  profileName: {
    fontSize: 24,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  profileSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  /* Stats — même style que profile.tsx */
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 20,
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: { fontSize: 12, fontFamily: Fonts.body, color: Colors.muted },
  statDivider: { width: 1, backgroundColor: Colors.border },

  /* Follow button */
  followBtn: {
    marginHorizontal: 20,
    marginBottom: 28,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  followBtnOutline: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },
  followBtnTextOutline: {
    color: Colors.muted,
  },

  /* Spots */
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
  },
  spotCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  spotPhoto: { width: 72, height: 72 },
  spotBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  spotTitle: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  spotTags: { flexDirection: "row", gap: 6 },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  tagText: { fontSize: 11, fontFamily: Fonts.bodyMedium, color: Colors.tagText },
});
