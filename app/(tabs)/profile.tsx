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

function ProfileView() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const myProfile = useQuery(api.users.getMyProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
          <Text style={s.statValue}>0</Text>
          <Text style={s.statLabel}>Spots</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statValue}>0</Text>
          <Text style={s.statLabel}>Check-ins</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statValue}>0</Text>
          <Text style={s.statLabel}>Favoris</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Mes spots</Text>
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>Tu n'as pas encore partagé de spot.</Text>
        </View>
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
            style={({ pressed }) => [s.settingsBtn, pressed && { opacity: 0.6 }]}
          >
            <Octicons name="gear" size={22} color={Colors.text} />
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
  },
  title: { fontSize: 34, fontFamily: Fonts.headingBold, color: Colors.text, letterSpacing: -0.5 },
  settingsBtn: { padding: 4 },
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
