import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Octicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors, Fonts } from "@/constants/theme";
import { router } from "expo-router";

const DEFAULT_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const TAB_BAR_H = 72;
const SHEET_HEIGHT = 140;

/** Haversine distance in km */
function distanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
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
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT + TAB_BAR_H)).current;

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
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

  // Collect all unique tags for filter chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const sp of spots) sp.tags.forEach((t) => tagSet.add(t));
    return Array.from(tagSet).slice(0, 10);
  }, [spots]);

  // Filter spots by search + tag
  const filteredSpots = useMemo(() => {
    let list = spots;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((sp) => sp.title.toLowerCase().includes(q));
    }
    if (activeTag) {
      list = list.filter((sp) => sp.tags.includes(activeTag));
    }
    return list;
  }, [spots, searchQuery, activeTag]);

  const clusters = useMemo(
    () => computeClusters(filteredSpots, region.latitudeDelta),
    [filteredSpots, region.latitudeDelta]
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }
      setHasPermission(true);
      setPermissionDenied(false);
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            },
            700
          );
        }, 400);
      } catch {
        // stay on default region
      }
    })();
  }, []);

  const openSheet = (spot: SpotItem) => {
    setSelectedSpot(spot);
    Animated.spring(sheetY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 10,
      tension: 60,
    }).start();
    // Center the map on the spot with a slight upward offset to account for the bottom sheet
    mapRef.current?.animateToRegion(
      {
        latitude: spot.latitude - region.latitudeDelta * 0.08,
        longitude: spot.longitude,
        latitudeDelta: Math.min(region.latitudeDelta, 0.05),
        longitudeDelta: Math.min(region.longitudeDelta, 0.05),
      },
      350
    );
  };

  const closeSheet = () => {
    Animated.timing(sheetY, {
      toValue: SHEET_HEIGHT + TAB_BAR_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSelectedSpot(null));
  };

  const handleMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        600
      );
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

  const handleClusterPress = (lat: number, lng: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: region.latitudeDelta / 3,
        longitudeDelta: region.longitudeDelta / 3,
      },
      350
    );
  };

  const handleSpotPress = (spot: SpotItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSheet(spot);
  };

  const isLoading = rawSpots === undefined;
  const spotCount = filteredSpots.length;
  const btnBottom = TAB_BAR_H + insets.bottom + 16;
  const sheetBottom = TAB_BAR_H + insets.bottom;

  // Compute distance for selected spot
  const selectedDistance = useMemo(() => {
    if (!selectedSpot || !userLocation) return null;
    return distanceKm(
      userLocation.latitude, userLocation.longitude,
      selectedSpot.latitude, selectedSpot.longitude,
    );
  }, [selectedSpot, userLocation]);

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={hasPermission}
        showsMyLocationButton={false}
      >
        {clusters.map((item) => {
          if (item.type === "cluster") {
            return (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                onPress={() => handleClusterPress(item.latitude, item.longitude)}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 0.5 }}
                accessibilityLabel={`Groupe de ${item.count} spots`}
              >
                <Svg width={50} height={50} viewBox="0 0 50 50">
                  <Circle cx={25} cy={25} r={23} fill="rgba(74,124,89,0.15)" />
                  <Circle cx={25} cy={25} r={16} fill={Colors.primary} />
                  <SvgText
                    x={25} y={25}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight="700"
                    fill="white"
                  >
                    {item.count}
                  </SvgText>
                </Svg>
              </Marker>
            );
          }

          const spot = item.spot;
          const isSelected = selectedSpot?._id === spot._id;
          return (
            <Marker
              key={spot._id}
              coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
              onPress={() => handleSpotPress(spot)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
              accessibilityLabel={`Spot : ${spot.title}`}
            >
              <Svg width={isSelected ? 38 : 30} height={isSelected ? 38 : 30} viewBox={isSelected ? "0 0 38 38" : "0 0 30 30"}>
                <Circle cx={isSelected ? 19 : 15} cy={isSelected ? 19 : 15} r={isSelected ? 17 : 13} fill="white" />
                <Circle
                  cx={isSelected ? 19 : 15} cy={isSelected ? 19 : 15} r={isSelected ? 10 : 8}
                  fill={isSelected ? Colors.accent : Colors.primary}
                />
              </Svg>
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay — search + tags + count */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={s.header} pointerEvents="box-none">
          {/* Search bar */}
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
                <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityLabel="Effacer la recherche">
                  <Octicons name="x" size={14} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            {/* Spot count badge */}
            {!isLoading && (
              <View style={s.countBadge}>
                <Text style={s.countText}>{spotCount}</Text>
              </View>
            )}
          </View>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tagChipsRow}
            >
              {allTags.map((tag) => {
                const active = activeTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[s.tagChip, active && s.tagChipActive]}
                    onPress={() => setActiveTag(active ? null : tag)}
                    accessibilityLabel={`Filtrer par ${tag}`}
                    accessibilityState={{ selected: active }}
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
        accessibilityLabel="Centrer sur ma position"
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
              {searchQuery || activeTag
                ? "Essaie un autre filtre ou mot-clé."
                : "Sois le premier à partager un lieu !"}
            </Text>
            {!searchQuery && !activeTag && (
              <TouchableOpacity
                style={s.emptyCta}
                onPress={() => router.push("/(tabs)/create")}
              >
                <Text style={s.emptyCtaText}>Créer un spot</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Bottom sheet — enriched spot card */}
      <Animated.View
        style={[s.sheet, { bottom: sheetBottom, transform: [{ translateY: sheetY }] }]}
        pointerEvents={selectedSpot ? "auto" : "none"}
      >
        {selectedSpot && (
          <TouchableOpacity
            activeOpacity={0.97}
            style={s.card}
            onPress={() => {
              closeSheet();
              router.push(`/spot/${selectedSpot._id}`);
            }}
            accessibilityLabel={`Voir le détail de ${selectedSpot.title}`}
          >
            {/* Thumbnail */}
            {selectedSpot.photo ? (
              <Image
                source={{ uri: selectedSpot.photo }}
                style={s.thumb}
                contentFit="cover"
              />
            ) : (
              <View style={[s.thumb, s.thumbPlaceholder]}>
                <Octicons name="image" size={20} color={Colors.muted} />
              </View>
            )}

            {/* Info */}
            <View style={s.info}>
              <Text style={s.spotTitle} numberOfLines={1}>{selectedSpot.title}</Text>

              {/* Rating + distance + reviews */}
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

              {/* Description snippet */}
              {selectedSpot.description ? (
                <Text style={s.descSnippet} numberOfLines={1}>{selectedSpot.description}</Text>
              ) : null}

              {/* Tags */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tagsContent}
              >
                {selectedSpot.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Arrow CTA */}
            <View style={s.arrowBtn}>
              <Octicons name="arrow-right" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Close button */}
        {selectedSpot && (
          <TouchableOpacity style={s.closeBtn} onPress={closeSheet} accessibilityLabel="Fermer">
            <Octicons name="x" size={15} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header overlay
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },

  // Search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.text,
    padding: 0,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },

  // Tag filter chips
  tagChipsRow: {
    gap: 6,
    paddingRight: 16,
  },
  tagChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  tagChipTextActive: {
    color: "#fff",
  },

  // Permission banner
  permBanner: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },

  // Location button
  myLocBtn: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },

  // Empty state
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyCtaText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },

  // Bottom sheet
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Enriched card
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  spotTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  starChar: {
    fontSize: 10,
    color: Colors.accent,
  },
  ratingVal: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  reviewCountText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  descSnippet: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  tagsContent: {
    gap: 5,
    alignItems: "center",
  },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
    color: Colors.tagText,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Close button
  closeBtn: {
    position: "absolute",
    top: 4,
    right: 20,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
