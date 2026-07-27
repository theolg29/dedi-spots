import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import type { SvgProps } from "react-native-svg";

import BeachIcon from "@/assets/icons/beach.svg";
import ForestIcon from "@/assets/icons/forest.svg";
import TelescopeIcon from "@/assets/icons/telescope.svg";
import MountainIcon from "@/assets/icons/mountais.svg";
import SunsetIcon from "@/assets/icons/sunset.svg";
import WaterfallIcon from "@/assets/icons/waterfall.svg";
import LakeIcon from "@/assets/icons/lake.svg";
import ArchitectureIcon from "@/assets/icons/architecture.svg";
import NatureIcon from "@/assets/icons/nature.svg";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts, Radius, FloatingShadow } from "@/constants/theme";
import { AddToFavoritesSheet } from "@/components/AddToFavoritesSheet";
import { AppHeader } from "@/components/AppHeader";
import { StarRating } from "@/components/StarRating";
import ExploreScreen from "@/components/ExploreScreen";

const CARD_WIDTH = Dimensions.get("window").width - 32;
const SCREEN_HEIGHT = Dimensions.get("window").height;
// Hauteur fixe du contenu de la barre "peek" (poignée + pilule de recherche),
// hors inset de sécurité du haut qui varie selon l'appareil.
const PEEK_CONTENT_HEIGHT = 72;

type SpotCard = Doc<"spots"> & { avgRating: number; reviewCount: number };

type CategoryIcon = React.FC<SvgProps>;

// Pas de SVG fourni pour "Patrimoine" — Octicon en attendant.
const PatrimoineIcon: CategoryIcon = ({ width, color }) => (
  <Octicons name="bookmark" size={Number(width) || 20} color={color as string} />
);

// Une seule teinte pour toutes les catégories (façon AllTrails — icônes
// monochromes, pas une couleur pastel différente par catégorie).
export const CATEGORIES: {
  label: string;
  Icon: CategoryIcon;
}[] = [
  { label: "Plage", Icon: BeachIcon },
  { label: "Forêt", Icon: ForestIcon },
  { label: "Panorama", Icon: TelescopeIcon },
  { label: "Montagne", Icon: MountainIcon },
  { label: "Coucher de soleil", Icon: SunsetIcon },
  { label: "Cascade", Icon: WaterfallIcon },
  { label: "Lac", Icon: LakeIcon },
  { label: "Urbain", Icon: ArchitectureIcon },
  { label: "Patrimoine", Icon: PatrimoineIcon },
  { label: "Nature", Icon: NatureIcon },
];

function SpotCard({
  spot,
  isFavorited,
  onFavoritePress,
}: {
  spot: SpotCard;
  isFavorited: boolean;
  onFavoritePress: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const hasMultiplePhotos = spot.photos.length > 1;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}
      onPress={() => router.push(`/spot/${spot._id}`)}
    >
      <View style={s.imageWrap}>
        {hasMultiplePhotos ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPhotoIndex(
                Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH),
              )
            }
          >
            {spot.photos.map((photo, i) => (
              <Image
                key={i}
                source={{ uri: photo }}
                style={s.cardImage}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <Image
            source={{ uri: spot.photos[0] }}
            style={s.cardImage}
            contentFit="cover"
          />
        )}

        <Pressable
          style={s.heartBtn}
          onPress={() => onFavoritePress()}
          hitSlop={8}
        >
          <Octicons
            name={isFavorited ? "heart-fill" : "heart"}
            size={18}
            color={isFavorited ? Colors.accent : Colors.text}
          />
        </Pressable>

        {hasMultiplePhotos && (
          <View style={s.dotsRow}>
            {spot.photos.map((_, i) => (
              <View key={i} style={[s.dot, i === photoIndex && s.dotActive]} />
            ))}
          </View>
        )}
      </View>
      <View style={s.cardBody}>
        <View style={s.tagsRow}>
          {spot.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={s.cardTitle} numberOfLines={2}>
          {spot.title}
        </Text>
        {spot.city && <Text style={s.cardCity}>{spot.city}</Text>}
        <View style={s.cardFooter}>
          <StarRating rating={spot.avgRating} showValue />
          <Text style={s.reviewCount}>{spot.reviewCount} avis</Text>
        </View>
      </View>
    </Pressable>
  );
}

function LastVisitedCard({
  spot,
  isFavorited,
  onFavoritePress,
}: {
  spot: SpotCard;
  isFavorited: boolean;
  onFavoritePress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.lastVisited, pressed && { opacity: 0.96 }]}
      onPress={() => router.push(`/spot/${spot._id}`)}
    >
      <Image
        source={{ uri: spot.photos[0] }}
        style={s.lastVisitedThumb}
        contentFit="cover"
      />
      <View style={s.lastVisitedInfo}>
        <Text style={s.lastVisitedTitle} numberOfLines={1}>
          {spot.title}
        </Text>
        <StarRating rating={spot.avgRating} showValue />
      </View>
      <Pressable
        style={s.lastVisitedHeart}
        onPress={() => onFavoritePress()}
        hitSlop={8}
      >
        <Octicons
          name={isFavorited ? "heart-fill" : "heart"}
          size={16}
          color={isFavorited ? Colors.accent : Colors.text}
        />
      </Pressable>
    </Pressable>
  );
}

function CategoryPill({ cat }: { cat: (typeof CATEGORIES)[number] }) {
  const { Icon } = cat;
  return (
    <Pressable
      style={({ pressed }) => [s.catPill, pressed && { opacity: 0.8 }]}
      onPress={() => router.push(`/category/${encodeURIComponent(cat.label)}`)}
    >
      <View style={s.catPillIcon}>
        <Icon width={18} height={18} color={Colors.primary} />
      </View>
      <Text style={s.catPillLabel}>{cat.label}</Text>
    </Pressable>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const SHEET_PEEK = PEEK_CONTENT_HEIGHT;
  const [mapMounted, setMapMounted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const expandedRef = useRef(true);
  const containerHeightRef = useRef(SCREEN_HEIGHT);
  const translateY = useRef(new Animated.Value(0)).current;

  const snapTo = (toExpanded: boolean) => {
    if (!toExpanded) setMapMounted(true);
    expandedRef.current = toExpanded;
    setExpanded(toExpanded);
    Animated.spring(translateY, {
      toValue: toExpanded ? 0 : containerHeightRef.current - SHEET_PEEK,
      useNativeDriver: true,
      friction: 9,
      tension: 65,
    }).start();
  };

  // Le drag ne fonctionne que depuis l'état replié (carte) pour remonter
  // vers la liste — depuis la liste, seul le bouton "Carte" fait redescendre.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !expandedRef.current,
      onMoveShouldSetPanResponder: (_, g) => !expandedRef.current && Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        translateY.setOffset(containerHeightRef.current - SHEET_PEEK);
        translateY.setValue(0);
      },
      onPanResponderMove: Animated.event([null, { dy: translateY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        const hiddenY = containerHeightRef.current - SHEET_PEEK;
        if (Math.abs(g.dy) < 5 && Math.abs(g.dx) < 5) {
          snapTo(true);
          return;
        }
        const projected = hiddenY + g.dy;
        const shouldExpand = g.vy < -0.6 ? true : projected < hiddenY / 2;
        snapTo(shouldExpand);
      },
    })
  ).current;

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [lastVisitedId, setLastVisitedId] = useState<Id<"spots"> | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      try {
        const loc = await Location.getLastKnownPositionAsync();
        if (loc)
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
      } catch {
        // pas de position connue — le feed reste trié par récence
      }
    })();
  }, []);

  useEffect(() => {
    SecureStore.getItemAsync("lastVisitedSpotId").then((v) => {
      if (v) setLastVisitedId(v as Id<"spots">);
    });
  }, []);

  const spots = useQuery(api.spots.list, userLocation ?? {});
  const lastVisitedSpot = useQuery(
    api.spots.getById,
    lastVisitedId ? { id: lastVisitedId } : "skip"
  );
  const favoritedIds = useQuery(api.favorites.getFavoritedIds);

  const { isAuthenticated } = useConvexAuth();
  const removeFav = useMutation(api.favorites.remove);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetSpotId, setSheetSpotId] = useState<Id<"spots"> | null>(null);

  const favSet = new Set((favoritedIds ?? []).map(String));

  const handleFavoritePress = (spotId: Id<"spots">) => {
    if (!isAuthenticated) {
      router.push("/onboarding");
      return;
    }
    if (favSet.has(String(spotId))) {
      removeFav({ spotId });
    } else {
      setSheetSpotId(spotId);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Convex est réactif — les données sont déjà à jour, on simule juste le geste
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={s.screen}>
      {mapMounted && <ExploreScreen bottomInset={SHEET_PEEK} />}

      <Animated.View
        style={[s.sheetContainer, { transform: [{ translateY }] }]}
        onLayout={(e) => { containerHeightRef.current = e.nativeEvent.layout.height; }}
      >
        <View style={{ flex: 1 }}>
          {expanded ? (
            <View style={{ paddingTop: insets.top }} />
          ) : (
            <View {...panResponder.panHandlers} style={[s.peekBar, { paddingTop: 8 }]}>
              <View style={s.dragHandle} />
              <View style={s.peekSearchBar}>
                <Octicons name="search" size={15} color={Colors.muted} />
                <Text style={s.peekSearchText}>Rechercher un lieu…</Text>
              </View>
            </View>
          )}

          {expanded && <AppHeader showTitle={false} showActions={false} />}

          {/* Filtres catégories — juste sous la recherche, façon AllTrails */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catPillsRow}
            style={s.catPillsScroll}
          >
            {CATEGORIES.map((cat) => (
              <CategoryPill key={cat.label} cat={cat} />
            ))}
          </ScrollView>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          >
            {/* Dernier spot consulté */}
            {lastVisitedSpot && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Dernier spot consulté</Text>
                <LastVisitedCard
                  spot={lastVisitedSpot}
                  isFavorited={favSet.has(String(lastVisitedSpot._id))}
                  onFavoritePress={() => handleFavoritePress(lastVisitedSpot._id)}
                />
              </View>
            )}

            {/* Feed */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {userLocation ? "Près de toi" : "Spots récents"}
              </Text>

              {spots === undefined && (
                <View style={s.centered}>
                  <Text style={s.mutedText}>Chargement…</Text>
                </View>
              )}
              {spots?.length === 0 && (
                <View style={s.centered}>
                  <Text style={s.emptyTitle}>Aucun spot pour l'instant</Text>
                  <Text style={[s.mutedText, { textAlign: "center" }]}>
                    Sois le premier à partager un lieu incroyable.
                  </Text>
                </View>
              )}
              {spots?.map((spot) => (
                <SpotCard
                  key={spot._id}
                  spot={spot}
                  isFavorited={favSet.has(String(spot._id))}
                  onFavoritePress={() => handleFavoritePress(spot._id)}
                />
              ))}
            </View>
          </ScrollView>

          <AddToFavoritesSheet
            visible={sheetSpotId !== null}
            spotId={sheetSpotId}
            onClose={() => setSheetSpotId(null)}
          />
        </View>

        <Pressable style={s.viewToggle} onPress={() => snapTo(false)}>
          <Octicons name="location" size={15} color="#fff" />
          <Text style={s.viewToggleText}>Carte</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 110 },

  // ─── Toggle liste/carte (façon AllTrails) ─────────────────
  viewToggle: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: Radius.card,
    ...FloatingShadow,
  },
  viewToggleText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },

  // ─── Sheet liste par-dessus la carte (façon AllTrails) ────
  sheetContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    overflow: "hidden",
    ...FloatingShadow,
  },
  peekBar: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  peekSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "stretch",
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  peekSearchText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  // ─── Filtres catégories (sous la recherche) ───────────────
  catPillsScroll: {
    flexGrow: 0,
  },

  // ─── Sections ────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },

  // ─── Dernier spot consulté ─────────────────────────────────
  lastVisited: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lastVisitedThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.cardSm,
    backgroundColor: Colors.surface,
  },
  lastVisitedInfo: { flex: 1, gap: 6 },
  lastVisitedTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  lastVisitedHeart: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Category pills ─────────────────────────────────────────
  catPillsRow: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: Radius.card,
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  catPillLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },

  // ─── Feed ─────────────────────────────────────────────────
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  mutedText: {
    color: Colors.muted,
    fontSize: 14,
    fontFamily: Fonts.body,
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  card: {
    borderRadius: Radius.card,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageWrap: { position: "relative" },
  cardImage: { width: CARD_WIDTH, height: 220 },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...FloatingShadow,
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBody: { padding: 14, paddingTop: 12 },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 9,
  },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    color: Colors.tagText,
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 2,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardCity: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginBottom: 9,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewCount: {
    color: Colors.muted,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
});
