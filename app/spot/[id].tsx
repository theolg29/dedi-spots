import { Octicons } from "@expo/vector-icons";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { ActionSheetIOS, ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Camera, Map as MapView, Marker } from "@maplibre/maplibre-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts, Radius, FloatingShadow } from "@/constants/theme";
import { StarRating, StarPicker } from "@/components/StarRating";
import { PhotoViewerModal } from "@/components/PhotoViewerModal";
import { AddToFavoritesSheet } from "@/components/AddToFavoritesSheet";

const SCREEN_WIDTH = Dimensions.get("window").width;

/* ── Open-Meteo WMO weather codes → emoji + label ──────────────── */
const WMO: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Ensoleillé" },
  1: { icon: "🌤️", label: "Peu nuageux" },
  2: { icon: "⛅", label: "Partiellement nuageux" },
  3: { icon: "☁️", label: "Couvert" },
  45: { icon: "🌫️", label: "Brouillard" },
  48: { icon: "🌫️", label: "Brouillard givrant" },
  51: { icon: "🌦️", label: "Bruine légère" },
  53: { icon: "🌦️", label: "Bruine" },
  55: { icon: "🌦️", label: "Bruine dense" },
  61: { icon: "🌧️", label: "Pluie légère" },
  63: { icon: "🌧️", label: "Pluie" },
  65: { icon: "🌧️", label: "Pluie forte" },
  66: { icon: "🌧️", label: "Pluie verglaçante" },
  67: { icon: "🌧️", label: "Pluie verglaçante forte" },
  71: { icon: "🌨️", label: "Neige légère" },
  73: { icon: "🌨️", label: "Neige" },
  75: { icon: "🌨️", label: "Neige forte" },
  77: { icon: "🌨️", label: "Grains de neige" },
  80: { icon: "🌦️", label: "Averses légères" },
  81: { icon: "🌦️", label: "Averses" },
  82: { icon: "🌦️", label: "Averses violentes" },
  85: { icon: "🌨️", label: "Averses de neige" },
  86: { icon: "🌨️", label: "Averses de neige fortes" },
  95: { icon: "⛈️", label: "Orage" },
  96: { icon: "⛈️", label: "Orage avec grêle" },
  99: { icon: "⛈️", label: "Orage violent" },
};

function getWmo(code: number) {
  return WMO[code] ?? { icon: "🌡️", label: "Inconnu" };
}

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type WeatherData = {
  current: { temperature: number; code: number };
  daily: { date: string; day: string; dateLabel: string; code: number; max: number; min: number }[];
};

function useWeather(lat: number, lng: number): { data: WeatherData | null; loading: boolean } {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const daily = json.daily.time.map((date: string, i: number) => {
          const d = new Date(date + "T00:00:00");
          return {
            date,
            day: DAY_NAMES[d.getDay()],
            dateLabel: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
            code: json.daily.weather_code[i],
            max: Math.round(json.daily.temperature_2m_max[i]),
            min: Math.round(json.daily.temperature_2m_min[i]),
          };
        });
        setData({
          current: {
            temperature: Math.round(json.current.temperature_2m),
            code: json.current.weather_code,
          },
          daily,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  return { data, loading };
}

function WeatherBlock({ latitude, longitude }: { latitude: number; longitude: number }) {
  const { data, loading } = useWeather(latitude, longitude);

  if (loading) {
    return (
      <View style={w.card}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  const current = getWmo(data.current.code);

  return (
    <View style={w.card}>
      {/* Current weather row */}
      <View style={w.currentRow}>
        <Text style={w.currentIcon}>{current.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={w.currentTemp}>{data.current.temperature}°C</Text>
          <Text style={w.currentLabel}>{current.label}</Text>
        </View>
      </View>

      {/* Forecast list */}
      <View style={w.forecastList}>
          {data.daily.map((day) => {
            const wmo = getWmo(day.code);
            return (
              <View key={day.date} style={w.forecastDay}>
                <View style={w.forecastDayInfo}>
                  <Text style={w.forecastDayName}>{day.day}</Text>
                  <Text style={w.forecastDate}>{day.dateLabel}</Text>
                </View>
                <Text style={w.forecastIcon}>{wmo.icon}</Text>
                <Text style={w.forecastTemps}>
                  <Text style={w.forecastMax}>{day.max}°</Text>
                  <Text style={w.forecastSep}> / </Text>
                  <Text style={w.forecastMin}>{day.min}°</Text>
                </Text>
              </View>
            );
          })}
        </View>
    </View>
  );
}

const w = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currentIcon: { fontSize: 36 },
  currentTemp: {
    fontSize: 22,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    lineHeight: 28,
  },
  currentLabel: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  forecastList: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 2,
  },
  forecastDay: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  forecastDayInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  forecastDayName: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
    width: 32,
  },
  forecastDate: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  forecastIcon: { fontSize: 20, marginHorizontal: 12 },
  forecastTemps: { textAlign: "right" },
  forecastMax: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  forecastSep: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  forecastMin: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
});

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_REVIEW_PHOTOS = 3;

function ReviewModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string, photoUris: string[]) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_REVIEW_PHOTOS - photos.length,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_REVIEW_PHOTOS));
    }
  };

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, MAX_REVIEW_PHOTOS));
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

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Note requise", "Sélectionne une note de 1 à 5 étoiles.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim(), photos);
      setRating(0);
      setComment("");
      setPhotos([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={rm.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={rm.wrapper}>
        <View style={rm.sheet}>
          <View style={rm.handle} />
          <Text style={rm.title}>Laisser un avis</Text>
          <Text style={rm.subtitle}>Tu es sur place — partage ton expérience !</Text>

          <View style={rm.starsRow}>
            <StarPicker value={rating} onChange={setRating} />
          </View>

          <TextInput
            style={rm.input}
            placeholder="Commentaire (optionnel)"
            placeholderTextColor={Colors.muted}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            returnKeyType="done"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={rm.photosRow}
          >
            {photos.map((uri, i) => (
              <View key={uri} style={rm.photoThumb}>
                <Image source={{ uri }} style={rm.photoImg} contentFit="cover" />
                <Pressable
                  style={rm.photoRemove}
                  onPress={() => removePhoto(i)}
                  accessibilityLabel={`Supprimer la photo ${i + 1}`}
                >
                  <Octicons name="x" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_REVIEW_PHOTOS && (
              <Pressable style={rm.photoAdd} onPress={showPhotoOptions} accessibilityLabel="Ajouter des photos">
                <Octicons name="image" size={20} color={Colors.muted} />
              </Pressable>
            )}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [rm.submitBtn, pressed && { opacity: 0.85 }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={rm.submitText}>Valider mon check-in</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[s.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarLetter, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function ReviewCard({
  review,
  onPhotoPress,
}: {
  review: any;
  onPhotoPress: (index: number) => void;
}) {
  const date = new Date(review.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  return (
    <View style={s.review}>
      <View style={s.reviewHeader}>
        <Avatar url={review.user?.avatarUrl} name={review.user?.name ?? "?"} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={s.reviewName}>{review.user?.name ?? "Anonyme"}</Text>
          <Text style={s.reviewDate}>{date}</Text>
        </View>
        <StarRating rating={review.rating} />
      </View>
      {review.comment ? (
        <Text style={s.reviewComment}>{review.comment}</Text>
      ) : null}
      {review.photos?.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.reviewPhotosRow}>
          {review.photos.map((url: string, i: number) => (
            <Pressable key={i} onPress={() => onPhotoPress(i)}>
              <Image source={{ uri: url }} style={s.reviewPhoto} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const DOT_W = 6;
const DOT_ACTIVE_W = 22;

function AnimatedDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  const anims = useRef(
    Array.from({ length: count }, (_, i) => new Animated.Value(i === 0 ? DOT_ACTIVE_W : DOT_W))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === activeIndex ? DOT_ACTIVE_W : DOT_W,
        useNativeDriver: false,
        damping: 14,
        stiffness: 180,
        mass: 1,
      }).start();
    });
  }, [activeIndex]);

  return (
    <View style={s.photoDots}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            height: 6,
            borderRadius: 3,
            width: anim,
            backgroundColor: anim.interpolate({
              inputRange: [DOT_W, DOT_ACTIVE_W],
              outputRange: ["rgba(255,255,255,0.45)", "#ffffff"],
              extrapolate: "clamp",
            }),
          }}
        />
      ))}
    </View>
  );
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const spot = useQuery(api.spots.getById, { id: id as Id<"spots"> });
  const favoritedIds = useQuery(api.favorites.getFavoritedIds);
  const userReview = useQuery(api.spots.getUserReview, { spotId: id as Id<"spots"> });
  const removeFav = useMutation(api.favorites.remove);
  const addReview = useMutation(api.spots.addReview);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const { isAuthenticated } = useConvexAuth();
  const isFavorited = favoritedIds?.includes(id as Id<"spots">) ?? false;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [checkInCoords, setCheckInCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showFavoritesSheet, setShowFavoritesSheet] = useState(false);

  // Mémorise le dernier spot consulté pour la section "Dernier spot consulté" du feed
  const spotId = spot?._id;
  useEffect(() => {
    if (spotId) {
      SecureStore.setItemAsync("lastVisitedSpotId", spotId);
    }
  }, [spotId]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) { router.push("/onboarding"); return; }
    if (favoritedIds === undefined) return;
    if (isFavorited) {
      await removeFav({ spotId: id as Id<"spots"> });
    } else {
      setShowFavoritesSheet(true);
    }
  };

  const handleShare = async () => {
    if (!spot) return;
    await Share.share({
      title: spot.title,
      message: `Découvre "${spot.title}" sur Spots !\nspots://spot/${id}`,
    });
  };

  const handleOpenMap = () => {
    if (!spot) return;
    router.push({ pathname: "/(tabs)/explore", params: { spotId: spot._id } });
  };

  const handleNavigate = async () => {
    if (!spot) return;
    const { latitude: lat, longitude: lng, title } = spot;
    const label = encodeURIComponent(title);

    if (Platform.OS === "ios") {
      const apps: { name: string; url: string }[] = [
        { name: "Apple Plans", url: `maps://?daddr=${lat},${lng}` },
        { name: "Google Maps", url: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving` },
        { name: "Waze", url: `waze://?ll=${lat},${lng}&navigate=yes` },
      ];
      const available = await Promise.all(
        apps.map(async (a) => ({ ...a, ok: await Linking.canOpenURL(a.url) }))
      );
      const options = available.filter((a) => a.ok);
      if (options.length === 0) {
        Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`);
        return;
      }
      if (options.length === 1) {
        Linking.openURL(options[0].url);
        return;
      }
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Ouvrir avec…",
          options: [...options.map((a) => a.name), "Annuler"],
          cancelButtonIndex: options.length,
        },
        (idx) => {
          if (idx < options.length) Linking.openURL(options[idx].url);
        }
      );
    } else {
      const url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
      Linking.canOpenURL(url).then((ok) => {
        Linking.openURL(ok ? url : `https://maps.google.com/maps?daddr=${lat},${lng}`);
      });
    }
  };

  const handleCheckIn = async () => {
    if (!isAuthenticated) { router.push("/onboarding"); return; }
    if (userReview !== undefined && userReview !== null) return;
    if (!spot) return;
    setCheckInLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Localisation requise", "Autorise la localisation pour valider ton check-in.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const dist = getDistanceMeters(
        loc.coords.latitude,
        loc.coords.longitude,
        spot.latitude,
        spot.longitude
      );
      if (dist > 100) {
        const distLabel = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`;
        Alert.alert(
          "Trop loin 📍",
          `Tu es à ${distLabel} du spot. Tu dois être à moins de 100 m pour laisser un avis.`
        );
        return;
      }
      setCheckInCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setShowReviewModal(true);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSubmitReview = async (rating: number, comment: string, photoUris: string[]) => {
    if (!checkInCoords) return;
    const storageIds: string[] = [];
    for (const uri of photoUris) {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      const { storageId } = await uploadResult.json();
      storageIds.push(storageId);
    }
    await addReview({
      spotId: id as Id<"spots">,
      rating,
      comment: comment || undefined,
      photos: storageIds,
      latitude: checkInCoords.latitude,
      longitude: checkInCoords.longitude,
    });
    setCheckInCoords(null);
    setShowReviewModal(false);
    Alert.alert("Check-in validé ✓", "Merci pour ton avis !");
  };

  if (spot === undefined) {
    return (
      <SafeAreaView style={s.screen}>
        <Text style={s.mutedText}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (spot === null) {
    return (
      <SafeAreaView style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={s.bodyBold}>Spot introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.bodySemiBold }}>
            ← Retour
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const createdDate = new Date(spot.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const allPhotos = [...spot.photos, ...spot.reviews.flatMap((r: any) => r.photos ?? [])];
  const extraPhotosCount = allPhotos.length - spot.photos.length;

  let reviewPhotoOffset = spot.photos.length;
  const reviewsWithPhotoOffset = spot.reviews.map((review: any) => {
    const offset = reviewPhotoOffset;
    reviewPhotoOffset += review.photos?.length ?? 0;
    return { review, offset };
  });

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero slider */}
        <View style={s.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) =>
              setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
          >
            {spot.photos.map((photo, i) => (
              <Pressable key={i} onPress={() => openGallery(i)}>
                <Image source={{ uri: photo }} style={s.heroImage} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>

          {spot.photos.length > 1 && (
            <AnimatedDots count={spot.photos.length} activeIndex={photoIndex} />
          )}

          {extraPhotosCount > 0 && (
            <Pressable
              style={s.galleryBadge}
              onPress={() => openGallery(spot.photos.length)}
              accessibilityRole="button"
              accessibilityLabel={`Voir ${extraPhotosCount} photo${extraPhotosCount > 1 ? "s" : ""} supplémentaire${extraPhotosCount > 1 ? "s" : ""}`}
            >
              <Image
                source={{ uri: allPhotos[spot.photos.length] }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <View style={s.galleryBadgeOverlay} />
              <Text style={s.galleryBadgeText}>+{extraPhotosCount}</Text>
            </Pressable>
          )}

          <Pressable
            style={[s.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Octicons name="chevron-left" size={22} color={Colors.text} />
          </Pressable>
          <View style={[s.heroActions, { top: insets.top + 12 }]}>
            <Pressable style={s.heroActionBtn} onPress={handleToggleFavorite} hitSlop={8}>
              <Octicons
                name={isFavorited ? "heart-fill" : "heart"}
                size={20}
                color={isFavorited ? Colors.accent : Colors.text}
              />
            </Pressable>
            <Pressable style={s.heroActionBtn} onPress={handleShare} hitSlop={8}>
              <Octicons name="share" size={18} color={Colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Content card */}
        <View style={s.content}>
          <View style={s.tagsRow}>
            {spot.tags.map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <Text style={s.spotTitle}>{spot.title}</Text>

          <View style={s.ratingRow}>
            <StarRating rating={spot.avgRating} size={15} />
            <Text style={s.ratingValue}>{spot.avgRating > 0 ? spot.avgRating.toFixed(1) : "—"}</Text>
            <Text style={s.ratingCount}>
              {spot.reviewCount > 0 ? `(${spot.reviewCount} avis)` : "(aucun avis)"}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [s.creatorRow, pressed && { opacity: 0.75 }]}
            onPress={() => router.push({ pathname: "/user/[id]", params: { id: spot.creatorId } })}
          >
            <Avatar url={spot.creator?.avatarUrl} name={spot.creator?.name ?? "?"} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={s.mutedText}>Partagé par</Text>
              <Text style={s.creatorName}>{spot.creator?.name ?? "Utilisateur"}</Text>
            </View>
            <Text style={s.mutedText}>{createdDate}</Text>
          </Pressable>

          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.description}>{spot.description}</Text>

          <Text style={s.sectionTitle}>Localisation</Text>
          <Pressable style={s.mapPreview} onPress={handleOpenMap}>
            <MapView
              style={StyleSheet.absoluteFill}
              mapStyle="https://tiles.openfreemap.org/styles/liberty"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              logo={false}
              attribution={false}
            >
              <Camera initialViewState={{ center: [spot.longitude, spot.latitude], zoom: 12 }} />
              <Marker lngLat={[spot.longitude, spot.latitude]} anchor="center">
                <View style={s.mapPin} />
              </Marker>
            </MapView>
            <View style={s.mapPreviewBadge}>
              <Octicons name="arrow-up-right" size={14} color={Colors.text} />
              <Text style={s.mapPreviewBadgeText}>Agrandir</Text>
            </View>
          </Pressable>

          <Text style={s.sectionTitle}>Météo</Text>
          <WeatherBlock latitude={spot.latitude} longitude={spot.longitude} />

          {allPhotos.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Galerie</Text>
              <View style={s.galleryGrid}>
                {allPhotos.map((uri, i) => (
                  <Pressable
                    key={i}
                    style={s.galleryThumbWrap}
                    onPress={() => openGallery(i)}
                  >
                    <Image source={{ uri }} style={s.galleryThumb} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={s.reviewsHeader}>
            <Text style={s.sectionTitle}>Avis</Text>
            <Text style={s.mutedText}>
              {spot.reviewCount} check-in{spot.reviewCount > 1 ? "s" : ""}
            </Text>
          </View>

          {spot.reviews.length === 0 ? (
            <View style={s.emptyReviews}>
              <Text style={[s.mutedText, { textAlign: "center", lineHeight: 20 }]}>
                Sois le premier à laisser un avis en faisant un check-in sur place.
              </Text>
            </View>
          ) : (
            reviewsWithPhotoOffset.map(({ review, offset }: { review: any; offset: number }) => (
              <ReviewCard
                key={review._id}
                review={review}
                onPhotoPress={(i) => openGallery(offset + i)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar — Itinéraire / Check-in en 50/50 */}
      <View style={[s.fab, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.fabRow}>
          <Pressable
            style={({ pressed }) => [s.fabBtnSecondary, pressed && { opacity: 0.75 }]}
            onPress={handleNavigate}
          >
            <Octicons name="location" size={16} color={Colors.primary} />
            <Text style={s.fabSecondaryText}>Itinéraire</Text>
          </Pressable>

          {userReview ? (
            <View style={[s.fabBtn, s.fabBtnDone]}>
              <Octicons name="check-circle-fill" size={16} color={Colors.primary} />
              <Text style={[s.fabText, { color: Colors.primary }]}>Check-in fait</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [s.fabBtn, pressed && { opacity: 0.85 }, checkInLoading && { opacity: 0.7 }]}
              onPress={handleCheckIn}
              disabled={checkInLoading}
            >
              {checkInLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Octicons name="check-circle" size={16} color="#fff" />
                  <Text style={s.fabText}>Check-in</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
      />

      <PhotoViewerModal
        visible={galleryVisible}
        photos={allPhotos}
        initialIndex={galleryIndex}
        onClose={() => setGalleryVisible(false)}
      />

      <AddToFavoritesSheet
        visible={showFavoritesSheet}
        spotId={id as Id<"spots">}
        onClose={() => setShowFavoritesSheet(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  mutedText: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body },
  bodyBold: { fontSize: 17, fontFamily: Fonts.headingBold, color: Colors.text },

  hero: { height: 340, position: "relative" },
  heroImage: { width: SCREEN_WIDTH, height: 340 },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...FloatingShadow,
  },
  heroActions: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  heroActionBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...FloatingShadow,
  },
  photoDots: {
    position: "absolute",
    bottom: 26,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  galleryBadge: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: Radius.cardSm,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryBadgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  galleryBadgeText: {
    color: "#fff",
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  galleryThumbWrap: {
    width: (SCREEN_WIDTH - 40 - 16) / 3,
    height: (SCREEN_WIDTH - 40 - 16) / 3,
    borderRadius: Radius.cardSm,
    overflow: "hidden",
  },
  galleryThumb: { width: "100%", height: "100%" },

  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    marginTop: -18,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: { color: Colors.tagText, fontSize: 12, fontFamily: Fonts.bodyMedium },
  spotTitle: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  ratingValue: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  ratingCount: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  mapPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  mapPreview: {
    width: "100%",
    height: 220,
    borderRadius: Radius.cardSm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    position: "relative",
  },
  mapPreviewBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: "#fff",
    ...FloatingShadow,
  },
  mapPreviewBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },

  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingVertical: 14,
  },
  creatorName: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontFamily: Fonts.headingBold },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  review: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewName: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  reviewDate: { fontSize: 11, fontFamily: Fonts.body, color: Colors.muted },
  reviewComment: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 44,
  },
  reviewPhotosRow: {
    gap: 8,
    paddingLeft: 44,
    paddingTop: 10,
  },
  reviewPhoto: {
    width: 64,
    height: 64,
    borderRadius: Radius.cardSm,
  },
  emptyReviews: { alignItems: "center", paddingVertical: 28 },

  fab: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  fabRow: {
    flexDirection: "row",
    gap: 10,
  },
  fabBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.tagBg,
    borderRadius: Radius.pill,
    paddingVertical: 16,
  },
  fabSecondaryText: {
    color: Colors.primary,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
  fabBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fabText: { color: "#fff", fontFamily: Fonts.bodySemiBold, fontSize: 15 },
  fabBtnDone: {
    backgroundColor: Colors.tagBg,
    gap: 8,
  },
});

const rm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.muted,
    marginBottom: 24,
  },
  starsRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  photosRow: {
    gap: 10,
    marginBottom: 20,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.cardSm,
    overflow: "hidden",
  },
  photoImg: {
    width: 72,
    height: 72,
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: Radius.cardSm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
});
