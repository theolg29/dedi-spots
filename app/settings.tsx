import { useAuthActions } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";
import { useMutation, useQuery } from "convex/react";
import { Octicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Fonts } from "@/constants/theme";
import { api } from "@/convex/_generated/api";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type Form = {
  firstName: string;
  lastName: string;
  username: string;
  country: string;
};

function RowSep() {
  return <View style={s.rowSep} />;
}

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const myProfile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateProfile);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<Form>({
    firstName: "",
    lastName: "",
    username: "",
    country: "",
  });
  const [debouncedUsername, setDebouncedUsername] = useState("");

  const profile = myProfile?.profile;
  const initial = viewer?.name?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = myProfile?.avatarUrl ?? viewer?.image ?? null;
  const originalUsername = profile?.username ?? "";

  // Sync form when profile or viewer loads
  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        username: profile.username ?? "",
        country: profile.country ?? "",
      });
      setDebouncedUsername(profile.username ?? "");
    } else if (myProfile && !profile && viewer) {
      // No profile record yet (e.g. Google sign-in) — prefill from auth user
      const parts = (viewer.name ?? "").split(" ");
      setForm({
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") ?? "",
        username: "",
        country: "",
      });
    }
  }, [
    profile?.firstName,
    profile?.lastName,
    profile?.username,
    profile?.country,
    myProfile,
    viewer,
  ]);

  // Debounce username input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUsername(form.username), 500);
    return () => clearTimeout(t);
  }, [form.username]);

  const isOwnUsername =
    debouncedUsername.toLowerCase() === originalUsername.toLowerCase();

  const usernameExists = useQuery(
    api.users.checkUsername,
    !isOwnUsername &&
      USERNAME_RE.test(debouncedUsername) &&
      debouncedUsername.length >= 3
      ? { username: debouncedUsername }
      : "skip"
  );

  const usernameStatus = useMemo<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >(() => {
    const u = form.username;
    if (!u) return "idle";
    if (!USERNAME_RE.test(u)) return "invalid";
    if (isOwnUsername) return "available";
    if (u !== debouncedUsername || usernameExists === undefined)
      return "checking";
    return usernameExists ? "taken" : "available";
  }, [form.username, debouncedUsername, usernameExists, isOwnUsername]);

  const canSave =
    editing &&
    !saving &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    (usernameStatus === "available" || usernameStatus === "idle");

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

  const handleCancel = () => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        username: profile.username ?? "",
        country: profile.country ?? "",
      });
      setDebouncedUsername(profile.username ?? "");
    }
    setEditing(false);
  };

  const handleSave = async () => {
    if (usernameStatus === "taken") {
      Alert.alert("Pseudo indisponible", "Ce pseudo est déjà utilisé.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de sauvegarder.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    void signOut().then(() => router.replace("/(tabs)"));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer le compte",
      "Cette action est irréversible. Tes avis et favoris seront supprimés. Tes spots resteront visibles sous le nom « Inconnu ».",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void deleteAccount()
              .then(() => signOut())
              .then(() => router.replace("/(tabs)"))
              .catch(() =>
                Alert.alert("Erreur", "Impossible de supprimer le compte.")
              );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        {editing ? (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [s.headerSideBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={s.cancelText}>Annuler</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.headerSideBtn, pressed && { opacity: 0.5 }]}
          >
            <Octicons name="arrow-left" size={20} color={Colors.text} />
          </Pressable>
        )}

        <Text style={s.headerTitle}>Réglages</Text>

        {editing ? (
          <Pressable
            onPress={() => void handleSave()}
            disabled={!canSave}
            style={({ pressed }) => [
              s.headerSideBtn,
              s.headerSideBtnRight,
              pressed && { opacity: 0.5 },
            ]}
          >
            <Text style={[s.saveText, !canSave && { opacity: 0.4 }]}>
              {saving ? "…" : "Enregistrer"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            style={({ pressed }) => [
              s.headerSideBtn,
              s.headerSideBtnRight,
              pressed && { opacity: 0.5 },
            ]}
          >
            <Text style={s.saveText}>Modifier</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar + identity */}
          <View style={s.avatarRow}>
            <Pressable
              onPress={() => { if (editing) void handlePickAvatar(); }}
              style={({ pressed }) => [s.avatarWrap, pressed && editing && { opacity: 0.75 }]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarLetter}>{initial}</Text>
                </View>
              )}
              {editing && (
                <View style={s.avatarEditOverlay}>
                  {uploadingAvatar ? (
                    <Octicons name="hourglass" size={18} color="#fff" />
                  ) : (
                    <Octicons name="pencil" size={18} color="#fff" />
                  )}
                </View>
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{viewer?.name ?? "—"}</Text>
              {viewer?.email ? (
                <Text style={s.heroEmail}>{viewer.email}</Text>
              ) : null}
            </View>
          </View>

          {/* Informations personnelles */}
          <Text style={s.sectionTitle}>Informations personnelles</Text>
          <View style={s.card}>
            <InfoRow
              label="Prénom"
              value={form.firstName}
              editing={editing}
              onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
              autoCapitalize="words"
            />
            <RowSep />
            <InfoRow
              label="Nom"
              value={form.lastName}
              editing={editing}
              onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
              autoCapitalize="words"
            />
            <RowSep />
            {/* Username row with availability check */}
            <View style={s.row}>
              <Text style={s.rowLabel}>Pseudo</Text>
              {editing ? (
                <View style={s.inputWrap}>
                  <Text style={s.inputPrefix}>@</Text>
                  <TextInput
                    style={s.input}
                    value={form.username}
                    onChangeText={(v) =>
                      setForm((f) => ({
                        ...f,
                        username: v.replace(/\s/g, ""),
                      }))
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    placeholderTextColor={Colors.muted}
                  />
                  <View style={{ marginLeft: 6 }}>
                    {usernameStatus === "checking" && (
                      <Octicons name="clock" size={17} color={Colors.muted} />
                    )}
                    {usernameStatus === "available" && (
                      <Octicons name="check-circle" size={17} color={Colors.primary} />
                    )}
                    {(usernameStatus === "taken" ||
                      usernameStatus === "invalid") && (
                      <Octicons name="x-circle" size={17} color="#D94F4F" />
                    )}
                  </View>
                </View>
              ) : (
                <Text style={s.rowValue}>
                  {profile?.username ? `@${profile.username}` : "—"}
                </Text>
              )}
            </View>
            {editing && usernameStatus === "invalid" && form.username.length > 0 && (
              <Text style={s.usernameHint}>
                3–20 caractères, lettres, chiffres ou _.
              </Text>
            )}
            {editing && usernameStatus === "taken" && (
              <Text style={[s.usernameHint, { color: "#D94F4F" }]}>
                Ce pseudo est déjà pris.
              </Text>
            )}
            <RowSep />
            <InfoRow
              label="Email"
              value={viewer?.email ?? "—"}
              editing={false}
            />
            <RowSep />
            <InfoRow
              label="Pays"
              value={form.country}
              editing={editing}
              onChangeText={(v) => setForm((f) => ({ ...f, country: v }))}
              autoCapitalize="words"
            />
          </View>

          {/* Compte */}
          <Text style={s.sectionTitle}>Compte</Text>
          <View style={s.card}>
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.55 }]}
              onPress={() => {
                void SecureStore.deleteItemAsync("onboarded").then(() =>
                  router.replace("/onboarding")
                );
              }}
            >
              <Text style={s.rowLabel}>Revoir l'introduction</Text>
              <Octicons name="chevron-right" size={15} color={Colors.muted} />
            </Pressable>
            <View style={s.rowSep} />
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.55 }]}
              onPress={handleSignOut}
            >
              <Text style={s.rowLabel}>Se déconnecter</Text>
              <Octicons name="chevron-right" size={15} color={Colors.muted} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.55 }]}
            onPress={handleDeleteAccount}
          >
            <Text style={s.deleteText}>Supprimer mon compte</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  editing,
  onChangeText,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (v: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          returnKeyType="done"
          placeholderTextColor={Colors.muted}
        />
      ) : (
        <Text style={s.rowValue} numberOfLines={1} ellipsizeMode="tail">
          {value || "—"}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerSideBtn: { minWidth: 60 },
  headerSideBtnRight: { alignItems: "flex-end" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
  },
  saveText: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.primary,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 20,
    marginBottom: 4,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLetter: {
    fontSize: 26,
    color: "#fff",
    fontFamily: Fonts.headingBold,
  },
  avatarEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  heroEmail: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  sectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
    marginTop: 24,
    marginBottom: 8,
  },

  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
    flexShrink: 0,
    marginRight: 12,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "right",
  },

  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  inputPrefix: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.text,
    textAlign: "right",
    padding: 0,
  },
  usernameHint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -6,
  },

  rowSep: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },

  deleteBtn: {
    marginTop: 40,
    alignItems: "center",
  },
  deleteText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: "#E53E3E",
  },
});
