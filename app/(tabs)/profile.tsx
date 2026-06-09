import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Octicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthForm } from "@/components/auth-form";
import { Colors, Fonts } from "@/constants/theme";
import { api } from "@/convex/_generated/api";

function GuestView() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.guestScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.guestTitle}>Rejoins la communauté</Text>
        <Text style={s.guestSub}>
          Crée un compte pour partager des spots et sauvegarder tes favoris.
        </Text>
        <AuthForm />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type SpotItem = {
  _id: string;
  title: string;
  tags: string[];
  photo: string | null;
  avgRating: number;
  reviewCount: number;
};

function SpotRow({ spot }: { spot: SpotItem }) {
  return (
    <Pressable
      style={({ pressed }) => [s.spotRow, pressed && { opacity: 0.88 }]}
      onPress={() => router.push(`/spot/${spot._id}`)}
    >
      {spot.photo ? (
        <Image source={{ uri: spot.photo }} style={s.spotThumb} contentFit="cover" />
      ) : (
        <View style={[s.spotThumb, s.spotThumbEmpty]}>
          <Octicons name="image" size={18} color={Colors.muted} />
        </View>
      )}
      <View style={s.spotInfo}>
        <Text style={s.spotTitle} numberOfLines={1}>{spot.title}</Text>
        <View style={s.spotMeta}>
          {spot.avgRating > 0 && (
            <View style={s.ratingPill}>
              <Text style={s.ratingPillStar}>★</Text>
              <Text style={s.ratingPillVal}>{spot.avgRating.toFixed(1)}</Text>
            </View>
          )}
          {spot.tags.length > 0 && (
            <Text style={s.spotTag}>{spot.tags[0]}</Text>
          )}
        </View>
      </View>
      <Octicons name="chevron-right" size={16} color={Colors.muted} />
    </Pressable>
  );
}

function SpotList({ spots, emptyMessage }: { spots: SpotItem[] | undefined; emptyMessage: string }) {
  if (spots === undefined) {
    return <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />;
  }
  if (spots.length === 0) {
    return (
      <View style={s.emptyBox}>
        <Text style={s.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }
  return (
    <View>
      {spots.map((spot) => (
        <SpotRow key={spot._id} spot={spot} />
      ))}
    </View>
  );
}

function ProfileView() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const myProfile = useQuery(api.users.getMyProfile);
  const myStats = useQuery(api.users.myStats);
  const mySpots = useQuery(api.spots.mySpots);
  const myVisited = useQuery(api.spots.myVisitedSpots);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<"creations" | "visited" | "favorites">("creations");

  const initial = viewer?.name?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = myProfile?.avatarUrl ?? viewer?.image ?? null;

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorise l'accès à ta galerie dans les réglages.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setUploadingAvatar(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });
      const { storageId } = await uploadResponse.json();
      await updateAvatar({ storageId });
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour la photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const tabs = [
    { key: "creations" as const, label: "Créations" },
    { key: "visited" as const, label: "Visités" },
    { key: "favorites" as const, label: "Favoris" },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={s.profileHero}>
        <Pressable
          onPress={() => void handlePickAvatar()}
          style={({ pressed }) => [s.avatarWrap, pressed && { opacity: 0.75 }]}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarLetter}>{initial}</Text>
            </View>
          )}
          <View style={s.avatarBadge}>
            {uploadingAvatar ? (
              <Octicons name="hourglass" size={13} color="#fff" />
            ) : (
              <Octicons name="device-camera" size={13} color="#fff" />
            )}
          </View>
        </Pressable>
        <Text style={s.profileName}>{viewer?.name ?? "—"}</Text>
        {viewer?.email ? <Text style={s.profileEmail}>{viewer.email}</Text> : null}
      </View>

      <View style={s.statsRow}>
        <View style={s.stat}>
          {myStats === undefined ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={s.statValue}>{myStats.spotsCount}</Text>
          )}
          <Text style={s.statLabel}>Spots</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          {myStats === undefined ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={s.statValue}>{myStats.checkInsCount}</Text>
          )}
          <Text style={s.statLabel}>Check-ins</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          {myStats === undefined ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={s.statValue}>{myStats.favoritesCount}</Text>
          )}
          <Text style={s.statLabel}>Favoris</Text>
        </View>
      </View>

      <View style={s.tabRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.tabContent}>
        {activeTab === "creations" && (
          <SpotList spots={mySpots} emptyMessage="Tu n'as pas encore partagé de spot." />
        )}
        {activeTab === "visited" && (
          <SpotList spots={myVisited} emptyMessage="Tu n'as encore visité aucun spot." />
        )}
        {activeTab === "favorites" && (
          <View style={s.favoritesTab}>
            <Text style={s.favoritesCount}>
              {myStats?.favoritesCount ?? 0} favori{(myStats?.favoritesCount ?? 0) !== 1 ? "s" : ""}
            </Text>
            <Pressable
              style={({ pressed }) => [s.favoritesBtn, pressed && { opacity: 0.75 }]}
              onPress={() => router.push("/(tabs)/favorites")}
            >
              <Text style={s.favoritesBtnText}>Voir mes favoris</Text>
              <Octicons name="arrow-right" size={15} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.6 }]}
        onPress={() => void signOut()}
      >
        <Text style={s.signOutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Profil</Text>
        {isAuthenticated && (
          <Pressable
            onPress={() => router.push("/settings")}
            style={({ pressed }) => [s.settingsBtn, pressed && { opacity: 0.7 }]}
          >
            <Octicons name="gear" size={18} color={Colors.text} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : isAuthenticated ? (
        <ProfileView />
      ) : (
        <GuestView />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 28, fontFamily: Fonts.headingBold, color: Colors.text, letterSpacing: -0.5 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  guestScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  guestTitle: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  guestSub: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.muted,
    lineHeight: 23,
    marginBottom: 28,
  },

  profileHero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  avatarWrap: {
    position: "relative",
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
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
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
  profileEmail: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 20,
    marginBottom: 28,
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

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: "#fff",
  },
  tabContent: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  spotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  spotThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
  },
  spotThumbEmpty: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  spotInfo: { flex: 1 },
  spotTitle: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 4,
  },
  spotMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF8EC",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  ratingPillStar: { fontSize: 11, color: Colors.accent },
  ratingPillVal: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.text },
  spotTag: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.tagText,
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  favoritesTab: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 16,
  },
  favoritesCount: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  favoritesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  favoritesBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: "#fff",
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
  },

  signOutBtn: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
  },
});
