import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, Map as MapView, Marker, UserLocation, type CameraRef, type ViewStateChangeEvent } from "@maplibre/maplibre-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Octicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors, Fonts } from "@/constants/theme";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER: [number, number] = [1.888334, 46.603354]; // [lng, lat]
const DEFAULT_ZOOM = 5;
const SHEET_HEIGHT = 108;

function zoomToLatitudeDelta(zoom: number): number {
  return 360 / Math.pow(2, zoom);
}

/** Haversine distance in km */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

type SpotItem = {
  _id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  avgRating: number;
  reviewCount: number;
  tags: string[];
  photo?: string;
};

type MapCluster =
  | { type: "cluster"; id: string; latitude: number; longitude: number; count: number }
  | { type: "single"; spot: SpotItem };

function computeClusters(spots: SpotItem[], latitudeDelta: number): MapCluster[] {
  const cellSize = Math.max(latitudeDelta * 0.12, 0.001);
  const cells = new Map<string, SpotItem[]>();
  for (const spot of spots) {
    const cx = Math.floor(spot.longitude / cellSize);
    const cy = Math.floor(spot.latitude / cellSize);
    const key = `${cx},${cy}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(spot);
  }
  const result: MapCluster[] = [];
  for (const [key, group] of cells.entries()) {
    if (group.length === 1) {
      result.push({ type: "single", spot: group[0] });
    } else {
      const lat = group.reduce((s, sp) => s + sp.latitude, 0) / group.length;
      const lng = group.reduce((s, sp) => s + sp.longitude, 0) / group.length;
      result.push({ type: "cluster", id: key, latitude: lat, longitude: lng, count: group.length });
    }
  }
  return result;
}

export default function MapScreen() {
  const { spotId } = useLocalSearchParams<{ spotId?: string }>();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const pendingSpotId = useRef<string | null>(null);
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT + 50)).current;

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedSpot, setSelectedSpot] = useState<SpotItem | null>(null);
  const [locating, setLocating] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const rawSpots = useQuery(api.spots.listForMap);

  const spots: SpotItem[] = useMemo(() => {
    if (!rawSpots) return [];
    return rawSpots.map((s) => ({
      _id: s._id,
      title: s.title,
      description: s.description,
      latitude: s.latitude,
      longitude: s.longitude,
      avgRating: s.avgRating,
      reviewCount: s.reviewCount,
      tags: s.tags,
      photo: s.photo,
    }));
  }, [rawSpots]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const sp of spots) sp.tags.forEach((t) => tagSet.add(t));
    return Array.from(tagSet).slice(0, 10);
  }, [spots]);

  const filteredSpots = useMemo(() => {
    let list = spots;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((sp) => sp.title.toLowerCase().includes(q));
    }
    if (activeTag) list = list.filter((sp) => sp.tags.includes(activeTag));
    return list;
  }, [spots, searchQuery, activeTag]);

  const clusters = useMemo(
    () => computeClusters(filteredSpots, zoomToLatitudeDelta(zoom)),
    [filteredSpots, zoom]
  );

  const locationInitialized = useRef(false);

  // Track incoming spotId param
  useEffect(() => {
    if (spotId) {
      pendingSpotId.current = spotId;
    }
  }, [spotId]);

  // When spots are loaded and we have a pending spotId, fly to it
  useEffect(() => {
    if (!pendingSpotId.current || spots.length === 0) return;
    const target = spots.find((sp) => sp._id === pendingSpotId.current);
    if (target) {
      pendingSpotId.current = null;
      setTimeout(() => {
        openSheet(target);
        cameraRef.current?.easeTo({
          center: [target.longitude, target.latitude],
          zoom: 15,
          duration: 800,
        });
      }, 500);
    }
  }, [spots, spotId]);

  useFocusEffect(
    useCallback(() => {
      if (locationInitialized.current) return;
      if (spotId) {
        // Skip auto-location when navigating to a specific spot
        locationInitialized.current = true;
        (async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            setHasPermission(true);
            setPermissionDenied(false);
          }
        })();
        return;
      }
      locationInitialized.current = true;
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionDenied(true);
          return;
        }
        setHasPermission(true);
        setPermissionDenied(false);
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          setTimeout(() => {
            cameraRef.current?.easeTo({
              center: [loc.coords.longitude, loc.coords.latitude],
              zoom: 12,
              duration: 700,
            });
          }, 400);
        } catch {
          // stay on default position
        }
      })();
    }, [spotId])
  );

  const openSheet = (spot: SpotItem) => {
    setSelectedSpot(spot);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, friction: 10, tension: 60 }).start();
    cameraRef.current?.easeTo({
      center: [spot.longitude, spot.latitude],
      zoom: Math.max(zoom, 12),
      duration: 350,
    });
  };

  const closeSheet = () => {
    Animated.timing(sheetY, { toValue: SHEET_HEIGHT + 50, duration: 220, useNativeDriver: true }).start(
      () => setSelectedSpot(null)
    );
  };

  const handleMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      cameraRef.current?.easeTo({ center: [loc.coords.longitude, loc.coords.latitude], zoom: 14, duration: 600 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silent
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = useCallback(() => {
    if (selectedSpot) closeSheet();
  }, [selectedSpot]);

  const handleRegionDidChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    setZoom(event.nativeEvent.zoom);
  }, []);

  const handleClusterPress = (lat: number, lng: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cameraRef.current?.easeTo({ center: [lng, lat], zoom: zoom + 2, duration: 350 });
  };

  const handleSpotPress = (spot: SpotItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSheet(spot);
  };

  const isLoading = rawSpots === undefined;
  const spotCount = filteredSpots.length;
  const btnBottom = 16;
  const sheetBottom = 8;

  const selectedDistance = useMemo(() => {
    if (!selectedSpot || !userLocation) return null;
    return distanceKm(userLocation.latitude, userLocation.longitude, selectedSpot.latitude, selectedSpot.longitude);
  }, [selectedSpot, userLocation]);

  return (
    <View style={s.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE}
        onPress={handleMapPress}
        onRegionDidChange={handleRegionDidChange}
        logo={false}
        attributionPosition={{ bottom: btnBottom, left: 8 }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }}
        />
        {hasPermission && <UserLocation />}

        {clusters.map((item) => {
          if (item.type === "cluster") {
            return (
              <Marker
                key={item.id}
                lngLat={[item.longitude, item.latitude]}
                onPress={() => handleClusterPress(item.latitude, item.longitude)}
                anchor="center"
              >
                <View collapsable={false} style={{ width: 50, height: 50, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ position: "absolute", width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(31,92,58,0.12)" }} />
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>{item.count}</Text>
                  </View>
                </View>
              </Marker>
            );
          }
          const spot = item.spot;
          const isSelected = selectedSpot?._id === spot._id;
          return (
            <Marker
              key={spot._id}
              lngLat={[spot.longitude, spot.latitude]}
              onPress={() => handleSpotPress(spot)}
              anchor="center"
            >
              <View
                collapsable={false}
                style={{
                  width: isSelected ? 38 : 30,
                  height: isSelected ? 38 : 30,
                  borderRadius: (isSelected ? 38 : 30) / 2,
                  borderWidth: isSelected ? 3 : 2,
                  borderColor: "white",
                  backgroundColor: isSelected ? Colors.accent : Colors.primary,
                }}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={s.header} pointerEvents="box-none">
          <View style={s.searchRow}>
            <View style={s.searchBar}>
              <Octicons name="search" size={15} color={Colors.muted} />
              <TextInput
                style={s.searchInput}
                placeholder="Rechercher un spot…"
                placeholderTextColor={Colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                accessibilityLabel="Rechercher un spot"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Octicons name="x" size={14} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            {!isLoading && (
              <View style={s.countBadge}>
                <Text style={s.countText}>{spotCount}</Text>
              </View>
            )}
          </View>
          {allTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagChipsRow}>
              {allTags.map((tag) => {
                const active = activeTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[s.tagChip, active && s.tagChipActive]}
                    onPress={() => setActiveTag(active ? null : tag)}
                  >
                    <Text style={[s.tagChipText, active && s.tagChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* Permission denied banner */}
      {permissionDenied && (
        <SafeAreaView edges={["top"]} pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}>
          <View style={[s.permBanner, { bottom: btnBottom + 52 }]}>
            <Octicons name="alert" size={13} color={Colors.accent} />
            <Text style={s.permText}>Active la localisation pour centrer la carte</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Location button */}
      <TouchableOpacity
        style={[s.myLocBtn, { bottom: btnBottom }]}
        onPress={handleMyLocation}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Octicons name="location" size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>

      {/* Loading */}
      {isLoading && (
        <View style={s.loadingOverlay} pointerEvents="none">
          <View style={s.loadingCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={s.loadingText}>Chargement…</Text>
          </View>
        </View>
      )}

      {/* Empty state */}
      {!isLoading && spotCount === 0 && (
        <View style={s.emptyOverlay} pointerEvents="box-none">
          <View style={s.emptyCard}>
            <Octicons name="location" size={28} color={Colors.muted} />
            <Text style={s.emptyTitle}>
              {searchQuery || activeTag ? "Aucun résultat" : "Aucun spot pour l'instant"}
            </Text>
            <Text style={s.emptySubtitle}>
              {searchQuery || activeTag ? "Essaie un autre filtre ou mot-clé." : "Sois le premier à partager un lieu !"}
            </Text>
            {!searchQuery && !activeTag && (
              <TouchableOpacity style={s.emptyCta} onPress={() => router.push("/(tabs)/create")}>
                <Text style={s.emptyCtaText}>Créer un spot</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Bottom sheet */}
      <Animated.View
        style={[s.sheet, { bottom: sheetBottom, transform: [{ translateY: sheetY }] }]}
        pointerEvents={selectedSpot ? "auto" : "none"}
      >
        {selectedSpot && (
          <TouchableOpacity
            activeOpacity={0.97}
            style={s.card}
            onPress={() => { closeSheet(); router.push(`/spot/${selectedSpot._id}`); }}
          >
            {selectedSpot.photo ? (
              <Image source={{ uri: selectedSpot.photo }} style={s.thumb} contentFit="cover" />
            ) : (
              <View style={[s.thumb, s.thumbPlaceholder]}>
                <Octicons name="image" size={20} color={Colors.muted} />
              </View>
            )}
            <View style={s.info}>
              <Text style={s.spotTitle} numberOfLines={1}>{selectedSpot.title}</Text>
              <View style={s.metaRow}>
                {selectedSpot.avgRating > 0 && (
                  <View style={s.ratingPill}>
                    <Text style={s.starChar}>★</Text>
                    <Text style={s.ratingVal}>{selectedSpot.avgRating.toFixed(1)}</Text>
                  </View>
                )}
                {selectedSpot.reviewCount > 0 && (
                  <Text style={s.reviewCountText}>{selectedSpot.reviewCount} avis</Text>
                )}
                {selectedDistance !== null && (
                  <Text style={s.distanceText}>· {formatDistance(selectedDistance)}</Text>
                )}
              </View>
              {selectedSpot.description ? (
                <Text style={s.descSnippet} numberOfLines={1}>{selectedSpot.description}</Text>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagsContent}>
                {selectedSpot.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={s.arrowBtn}>
              <Octicons name="arrow-right" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.body, color: Colors.text, padding: 0 },
  countBadge: {
    backgroundColor: Colors.primary, borderRadius: 12, minWidth: 32,
    height: 32, alignItems: "center", justifyContent: "center", paddingHorizontal: 8,
  },
  countText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: "#fff" },
  tagChipsRow: { gap: 6, paddingRight: 16 },
  tagChip: {
    backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  tagChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagChipText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.text },
  tagChipTextActive: { color: "#fff" },
  permBanner: {
    position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  permText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors.text },
  myLocBtn: {
    position: "absolute", right: 16, width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  loadingCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
  },
  loadingText: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: Colors.text },
  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  emptyCard: {
    alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 28, paddingVertical: 24, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.headingBold, color: Colors.text },
  emptySubtitle: { fontSize: 13, fontFamily: Fonts.body, color: Colors.muted, textAlign: "center" },
  emptyCta: { marginTop: 4, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyCtaText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: "#fff" },
  sheet: { position: "absolute", left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 10, overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.surface },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  spotTitle: { fontSize: 15, fontFamily: Fonts.headingBold, color: Colors.text, letterSpacing: -0.2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingPill: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: Colors.tagBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  starChar: { fontSize: 10, color: Colors.accent },
  ratingVal: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  reviewCountText: { fontSize: 11, fontFamily: Fonts.body, color: Colors.muted },
  distanceText: { fontSize: 11, fontFamily: Fonts.body, color: Colors.muted },
  descSnippet: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textSecondary, lineHeight: 16 },
  tagsContent: { gap: 5, alignItems: "center" },
  tag: { backgroundColor: Colors.tagBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  tagText: { fontSize: 10, fontFamily: Fonts.bodyMedium, color: Colors.tagText },
  arrowBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
});
