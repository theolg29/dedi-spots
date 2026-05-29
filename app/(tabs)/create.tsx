import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors, Fonts } from "@/constants/theme";
import { router } from "expo-router";
import { LocationPickerModal } from "@/components/LocationPickerModal";

const TAGS = [
  "Plage", "Panorama", "Forêt", "Montagne", "Urbain",
  "Caché", "Coucher de soleil", "Cascade", "Lac", "Falaise",
  "Patrimoine", "Nature",
];

const MAX_PHOTOS = 5;

type PhotoAsset = { uri: string };

export default function CreateScreen() {
  const descRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [mapVisible, setMapVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ title?: boolean; description?: boolean; location?: boolean }>({});

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const createSpot = useMutation(api.spots.create);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) {
      setPhotos((prev) =>
        [...prev, ...result.assets.map((a) => ({ uri: a.uri }))].slice(0, MAX_PHOTOS)
      );
    }
  };

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, { uri: result.assets[0].uri }].slice(0, MAX_PHOTOS));
    }
  };

  const showPhotoOptions = () => {
    Alert.alert("Ajouter une photo", undefined, [
      { text: "Appareil photo", onPress: pickFromCamera },
      { text: "Galerie", onPress: pickFromGallery },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const removePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setSelectedTags([]);
    setPhotos([]);
    setLocation(null);
    setLocationAddress("");
    setErrors({});
    setUploadProgress(null);
  }, []);

  const handleSubmit = async () => {
    // Inline validation
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = true;
    if (!description.trim()) newErrors.description = true;
    if (!location) newErrors.location = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Scroll to top to show first error
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setErrors({});
    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const storageIds: string[] = [];

      if (photos.length > 0) {
        setUploadProgress({ current: 0, total: photos.length });
        for (let i = 0; i < photos.length; i++) {
          setUploadProgress({ current: i + 1, total: photos.length });
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(photos[i].uri);
          const blob = await response.blob();
          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type || "image/jpeg" },
            body: blob,
          });
          const { storageId } = await uploadResult.json();
          storageIds.push(storageId);
        }
      }

      await createSpot({
        title: title.trim(),
        description: description.trim(),
        latitude: location!.latitude,
        longitude: location!.longitude,
        photos: storageIds,
        tags: selectedTags,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploadProgress(null);

      // Show success overlay
      setShowSuccess(true);
      successOpacity.setValue(0);
      successScale.setValue(0.8);
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
      ]).start();

      setTimeout(() => {
        resetForm();
        setShowSuccess(false);
        router.replace("/(tabs)");
      }, 1800);
    } catch {
      Alert.alert("Erreur", "Impossible de créer le spot. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  // Clear individual errors on edit
  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (errors.title && text.trim()) setErrors((e) => ({ ...e, title: false }));
  };
  const handleDescChange = (text: string) => {
    setDescription(text);
    if (errors.description && text.trim()) setErrors((e) => ({ ...e, description: false }));
  };

  // Progress calculation (0→1)
  const progress =
    (title.trim() ? 0.3 : 0) +
    (description.trim() ? 0.3 : 0) +
    (location ? 0.25 : 0) +
    (photos.length > 0 ? 0.1 : 0) +
    (selectedTags.length > 0 ? 0.05 : 0);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !!location && !submitting;

  // Character count color helpers
  const titleCountColor = title.length > 54 ? Colors.accent : title.length > 48 ? "#E8A838" : Colors.muted;
  const descCountColor = description.length > 475 ? Colors.accent : description.length > 400 ? "#E8A838" : Colors.muted;

  return (
    <SafeAreaView edges={["top"]} style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Nouveau spot</Text>
        <Text style={s.subtitle}>Partage un lieu qui mérite d'être découvert</Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photos */}
        <View style={s.photoSection}>
          <View style={s.photoLabelRow}>
            <Text style={s.label}>Photos</Text>
            <Text style={s.hint}>{photos.length}/{MAX_PHOTOS}</Text>
          </View>

          <TouchableOpacity
            style={s.photoArea}
            onPress={showPhotoOptions}
            activeOpacity={0.7}
            accessibilityLabel="Ajouter des photos"
          >
            {photos.length === 0 ? (
              <>
                <Octicons name="image" size={30} color={Colors.muted} />
                <Text style={s.photoAreaTitle}>Ajouter des photos</Text>
                <Text style={s.photoAreaHint}>Caméra ou galerie</Text>
              </>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.photosRow}
                onStartShouldSetResponder={() => false}
              >
                {photos.map((p, i) => (
                  <View key={i} style={s.photoThumb}>
                    <Image source={{ uri: p.uri }} style={s.photoImg} />
                    {i === 0 && (
                      <View style={s.coverBadge}>
                        <Text style={s.coverBadgeText}>Couverture</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.photoRemove}
                      onPress={() => removePhoto(i)}
                      accessibilityLabel={`Supprimer la photo ${i + 1}`}
                    >
                      <Octicons name="x" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <View style={s.photoAddMore}>
                    <Octicons name="plus" size={22} color={Colors.muted} />
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </View>

        {/* Titre */}
        <View style={s.section}>
          <Text style={s.label}>Titre <Text style={s.required}>*</Text></Text>
          <TextInput
            style={[s.input, errors.title && s.inputError]}
            placeholder="Un nom mémorable…"
            placeholderTextColor={Colors.muted}
            value={title}
            onChangeText={handleTitleChange}
            maxLength={60}
            returnKeyType="next"
            onSubmitEditing={() => descRef.current?.focus()}
            blurOnSubmit={false}
            accessibilityLabel="Titre du spot"
          />
          {errors.title ? (
            <Text style={s.errorText}>Le titre est obligatoire</Text>
          ) : (
            <Text style={[s.hint, { color: titleCountColor }]}>{title.length}/60</Text>
          )}
        </View>

        {/* Description */}
        <View style={s.section}>
          <Text style={s.label}>Description <Text style={s.required}>*</Text></Text>
          <TextInput
            ref={descRef}
            style={[s.input, s.textarea, errors.description && s.inputError]}
            placeholder="Décris ce qui rend cet endroit spécial, comment y accéder, à quelle heure y aller…"
            placeholderTextColor={Colors.muted}
            value={description}
            onChangeText={handleDescChange}
            multiline
            maxLength={500}
            textAlignVertical="top"
            accessibilityLabel="Description du spot"
          />
          {errors.description ? (
            <Text style={s.errorText}>La description est obligatoire</Text>
          ) : (
            <Text style={[s.hint, { color: descCountColor }]}>{description.length}/500</Text>
          )}
        </View>

        {/* Tags */}
        <View style={s.section}>
          <Text style={s.label}>Tags</Text>
          <View style={s.tagsGrid}>
            {TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[s.tag, active && s.tagActive]}
                  onPress={() => toggleTag(tag)}
                  accessibilityLabel={tag}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s.tagText, active && s.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* GPS */}
        <View style={s.section}>
          <Text style={s.label}>Position GPS <Text style={s.required}>*</Text></Text>
          <TouchableOpacity
            style={[
              s.locationBtn,
              !!location && s.locationBtnDone,
              errors.location && s.locationBtnError,
            ]}
            onPress={() => {
              setMapVisible(true);
              if (errors.location) setErrors((e) => ({ ...e, location: false }));
            }}
            accessibilityLabel="Choisir un emplacement sur la carte"
          >
            <Octicons
              name="location"
              size={18}
              color={location ? "#fff" : errors.location ? Colors.accent : Colors.primary}
            />
            <Text style={[s.locationText, !!location && s.locationTextDone]} numberOfLines={1}>
              {locationAddress || "Choisir un emplacement"}
            </Text>
            {location && (
              <Octicons name="check-circle" size={16} color="#fff" />
            )}
          </TouchableOpacity>
          {errors.location && (
            <Text style={s.errorText}>La position est obligatoire</Text>
          )}
        </View>

        <LocationPickerModal
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          initialCoords={location}
          onConfirm={(coords, addr) => {
            setLocation(coords);
            setLocationAddress(addr);
            setErrors((e) => ({ ...e, location: false }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && s.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityLabel="Publier le spot"
        >
          {submitting ? (
            <View style={s.submitInner}>
              <ActivityIndicator size="small" color="#fff" />
              {uploadProgress && (
                <Text style={s.submitText}>
                  Upload {uploadProgress.current}/{uploadProgress.total}…
                </Text>
              )}
              {!uploadProgress && (
                <Text style={s.submitText}>Publication…</Text>
              )}
            </View>
          ) : (
            <Text style={s.submitText}>Publier le spot</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[s.successOverlay, { opacity: successOpacity }]}>
          <Animated.View style={[s.successCard, { transform: [{ scale: successScale }] }]}>
            <View style={s.successCheck}>
              <Octicons name="check" size={32} color="#fff" />
            </View>
            <Text style={s.successTitle}>Spot publié !</Text>
            <Text style={s.successSubtitle}>Ton lieu a été partagé avec la communauté</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.muted,
    marginTop: 2,
  },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  required: {
    color: Colors.accent,
  },
  hint: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.muted,
    marginTop: 4,
    textAlign: "right",
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.accent,
    marginTop: 6,
  },
  input: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: Colors.accent,
    borderBottomColor: Colors.accent,
  },
  textarea: {
    height: 110,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    lineHeight: 22,
  },

  // Photos
  photoSection: {
    marginTop: 20,
  },
  photoLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  photoArea: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoAreaTitle: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  photoAreaHint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  photosRow: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  photoThumb: {
    width: 150,
    height: 176,
    borderRadius: 12,
    overflow: "hidden",
  },
  photoImg: {
    width: 150,
    height: 176,
  },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  coverBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },
  photoAddMore: {
    width: 60,
    height: 176,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  // Tags
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "transparent",
  },
  tagActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tagBg,
  },
  tagText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  tagTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.bodySemiBold,
  },

  // Location
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "transparent",
  },
  locationBtnDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  locationBtnError: {
    borderColor: Colors.accent,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.primary,
  },
  locationTextDone: {
    color: "#fff",
  },

  // Submit
  submitBtn: {
    marginHorizontal: 20,
    marginTop: 32,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
    letterSpacing: 0.2,
  },

  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  successCheck: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
  },
});

