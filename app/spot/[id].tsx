import { Octicons } from "@expo/vector-icons";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { ActionSheetIOS, ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from "react-native";
import { Camera, Map as MapView, Marker } from "@maplibre/maplibre-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";

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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
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

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[s.star, { color: i <= Math.round(rating) ? Colors.accent : "#E0DDD8" }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={8}>
          <Text style={[s.starLg, { color: i <= value ? Colors.accent : "#E0DDD8" }]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReviewModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Note requise", "Sélectionne une note de 1 à 5 étoiles.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setComment("");
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

function ReviewCard({ review }: { review: any }) {
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
  const addToList = useMutation(api.favorites.addToList);
  const removeFav = useMutation(api.favorites.remove);
  const addReview = useMutation(api.spots.addReview);

  const { isAuthenticated } = useConvexAuth();
  const isFavorited = favoritedIds?.includes(id as Id<"spots">) ?? false;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [mapCardWidth, setMapCardWidth] = useState(0);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const onMapCardLayout = (e: LayoutChangeEvent) => setMapCardWidth(e.nativeEvent.layout.width);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) { router.push("/onboarding"); return; }
    if (favoritedIds === undefined) return;
    if (isFavorited) {
      await removeFav({ spotId: id as Id<"spots"> });
    } else {
      await addToList({ spotId: id as Id<"spots"> });
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
      setShowReviewModal(true);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    await addReview({ spotId: id as Id<"spots">, rating, comment: comment || undefined });
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
              <Image key={i} source={{ uri: photo }} style={s.heroImage} contentFit="cover" />
            ))}
          </ScrollView>

          {spot.photos.length > 1 && (
            <AnimatedDots count={spot.photos.length} activeIndex={photoIndex} />
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

          {/* Info cards row */}
          <View style={s.infoCardsRow}>
            {/* Rating card */}
            <View style={s.infoCard}>
              <Text style={s.infoCardRatingValue}>
                {spot.avgRating > 0 ? `${spot.avgRating.toFixed(1)}/5` : "—"}
              </Text>
              <StarRating rating={spot.avgRating} />
              <Text style={s.infoCardSubtitle}>
                {spot.reviewCount > 0 ? `${spot.reviewCount} avis` : "Aucun avis"}
              </Text>
            </View>

            {/* Map preview card */}
            <Pressable style={s.infoCardMap} onPress={handleOpenMap} onLayout={onMapCardLayout}>
              {mapCardWidth > 0 ? (
                <MapView
                  style={StyleSheet.absoluteFill}
                  mapStyle="https://tiles.openfreemap.org/styles/liberty"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  logo={false}
                  attributionPosition={{ bottom: 4, left: 4 }}
                >
                  <Camera
                    initialViewState={{
                      center: [spot.longitude, spot.latitude],
                      zoom: 11,
                    }}
                  />
                  <Marker lngLat={[spot.longitude, spot.latitude]} anchor="center">
                    <View style={s.mapPin} />
                  </Marker>
                </MapView>
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
              )}
              <Pressable style={s.mapExpandBtn} onPress={handleOpenMap} hitSlop={8}>
                <Octicons name="arrow-up-right" size={16} color={Colors.text} />
              </Pressable>
            </Pressable>
          </View>

          {/* Navigate button */}
          <Pressable
            style={({ pressed }) => [s.navBtn, pressed && { opacity: 0.75 }]}
            onPress={handleNavigate}
          >
            <Octicons name="location" size={16} color={Colors.primary} />
            <Text style={s.navBtnText}>Itinéraire</Text>
          </Pressable>

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

          <View style={s.divider} />

          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.description}>{spot.description}</Text>

          {/* Weather block */}
          <WeatherBlock latitude={spot.latitude} longitude={spot.longitude} />

          <View style={s.divider} />

          <View style={s.reviewsHeader}>
            <Text style={s.sectionTitle}>Avis</Text>
            <Text style={s.mutedText}>
              {spot.reviewCount} check-in{spot.reviewCount > 1 ? "s" : ""}
            </Text>
          </View>

          {spot.reviews.length === 0 ? (
            <View style={s.emptyReviews}>
              <Text style={[s.mutedText, { textAlign: "center", lineHeight: 21 }]}>
                Sois le premier à laisser un avis en faisant un check-in sur place.
              </Text>
            </View>
          ) : (
            spot.reviews.map((review) => <ReviewCard key={review._id} review={review} />)
          )}
        </View>
      </ScrollView>

      {/* Check-in floating button */}
      <View style={[s.fab, { paddingBottom: insets.bottom + 12 }]}>
        {userReview ? (
          <View style={[s.fabBtn, s.fabBtnDone]}>
            <Octicons name="check-circle-fill" size={16} color={Colors.primary} />
            <Text style={[s.fabText, { color: Colors.primary }]}>Check-in effectué</Text>
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
              <Text style={s.fabText}>Check-in — Laisser un avis</Text>
            )}
          </Pressable>
        )}
      </View>

      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
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
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoDots: {
    position: "absolute",
    bottom: 26,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  starRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  star: { fontSize: 15 },
  infoCardsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginBottom: 20,
    alignItems: "stretch",
  },
  infoCard: {
    flex: 1,
    minHeight: 130,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
  },
  infoCardRatingValue: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    lineHeight: 34,
  },
  infoCardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  infoCardMap: {
    flex: 1,
    minHeight: 130,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    position: "relative",
  },
  mapPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  mapExpandBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  creatorName: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontFamily: Fonts.headingBold },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 20 },
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
    lineHeight: 24,
    marginBottom: 20,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  review: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewName: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  reviewDate: { fontSize: 11, fontFamily: Fonts.body, color: Colors.muted },
  reviewComment: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 21,
    paddingLeft: 44,
  },
  emptyReviews: { alignItems: "center", paddingVertical: 28 },

  starLg: { fontSize: 32 },

  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    marginBottom: 20,
  },
  navBtnText: {
    color: Colors.primary,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },

  fab: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fabBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontFamily: Fonts.bodySemiBold, fontSize: 15 },
  fabBtnDone: {
    backgroundColor: Colors.tagBg,
    flexDirection: "row",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
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
