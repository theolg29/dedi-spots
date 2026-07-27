import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, Map, UserLocation, type CameraRef, type ViewStateChangeEvent } from "@maplibre/maplibre-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Colors, Fonts } from "@/constants/theme";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type LatLng = { latitude: number; longitude: number };

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (coords: LatLng, address: string, city?: string) => void;
  initialCoords?: LatLng | null;
}

const DEFAULT_CENTER: [number, number] = [1.888334, 46.603354];
const DEFAULT_ZOOM = 5;

const PIN_SIZE = 38;
const SHADOW_W = 14;
const SHADOW_H = 5;

export function LocationPickerModal({ visible, onClose, onConfirm, initialCoords }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const pinY = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;

  const [center, setCenter] = useState<LatLng>(
    initialCoords ?? { latitude: DEFAULT_CENTER[1], longitude: DEFAULT_CENTER[0] }
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible || initialCoords) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setTimeout(() => {
          cameraRef.current?.easeTo({
            center: [loc.coords.longitude, loc.coords.latitude],
            zoom: 14,
            duration: 700,
          });
        }, 400);
      } catch {
        // silent
      }
    })();
  }, [visible, initialCoords]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results[0]) {
        const r = results[0];
        const parts = [r.name, r.city ?? r.subregion, r.country].filter(Boolean);
        const addr = parts.join(", ");
        setAddress(addr);
        setSearchText(addr);
        setCity(r.city ?? r.subregion ?? undefined);
      }
    } catch {
      // silent
    }
  }, []);

  const onRegionIsChanging = useCallback(() => {
    setAddress("...");
    Animated.parallel([
      Animated.spring(pinY, { toValue: -10, useNativeDriver: true, friction: 8, tension: 80 }),
      Animated.spring(shadowScale, { toValue: 0.55, useNativeDriver: true, friction: 8 }),
      Animated.timing(shadowOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [pinY, shadowOpacity, shadowScale]);

  const onRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const [lng, lat] = event.nativeEvent.center;
      setCenter({ latitude: lat, longitude: lng });
      Animated.parallel([
        Animated.spring(pinY, { toValue: 0, useNativeDriver: true, friction: 5, tension: 60 }),
        Animated.spring(shadowScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.timing(shadowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      reverseGeocode(lat, lng);
    },
    [pinY, shadowOpacity, shadowScale, reverseGeocode]
  );

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(searchText.trim());
      if (results[0]) {
        cameraRef.current?.easeTo({
          center: [results[0].longitude, results[0].latitude],
          zoom: 14,
          duration: 600,
        });
      } else {
        Alert.alert("Introuvable", "Essaie une autre adresse ou sois plus précis.");
      }
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Active la géolocalisation dans les réglages.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      cameraRef.current?.easeTo({
        center: [loc.coords.longitude, loc.coords.latitude],
        zoom: 16,
        duration: 600,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Erreur", "Impossible de détecter ta position.");
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(center, address, city);
    onClose();
  };

  const initialCenter: [number, number] = initialCoords
    ? [initialCoords.longitude, initialCoords.latitude]
    : DEFAULT_CENTER;
  const initialZoom = initialCoords ? 14 : DEFAULT_ZOOM;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView edges={["top", "bottom"]} style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Octicons name="x" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Choisir un emplacement</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={s.searchContainer}>
          <Octicons name="search" size={15} color={Colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher une adresse…"
            placeholderTextColor={Colors.muted}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searching ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : searchText.length > 0 ? (
            <TouchableOpacity onPress={handleSearch} style={s.searchGoBtn}>
              <Octicons name="arrow-right" size={13} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Map */}
        <View style={s.mapContainer}>
          <Map
            style={StyleSheet.absoluteFill}
            mapStyle={MAP_STYLE}
            onRegionIsChanging={onRegionIsChanging}
            onRegionDidChange={onRegionDidChange}
            logo={false}
            compass={false}
            attribution={false}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{ center: initialCenter, zoom: initialZoom }}
            />
            <UserLocation />
          </Map>

          {/* Pin overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: -PIN_SIZE,
                marginLeft: -(PIN_SIZE / 2),
                transform: [{ translateY: pinY }],
              }}
            >
              <Octicons name="location" size={PIN_SIZE} color={Colors.primary} />
            </Animated.View>
            <Animated.View
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: SHADOW_W,
                height: SHADOW_H,
                borderRadius: SHADOW_H / 2,
                backgroundColor: "rgba(0,0,0,0.18)",
                marginTop: -(SHADOW_H / 2),
                marginLeft: -(SHADOW_W / 2),
                opacity: shadowOpacity,
                transform: [{ scaleX: shadowScale }],
              }}
            />
          </View>

          {/* My location button */}
          <TouchableOpacity style={s.myLocBtn} onPress={handleUseMyLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Octicons name="pin" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.addressRow}>
            <Octicons name="location" size={15} color={Colors.primary} style={{ marginTop: 2 }} />
            <Text style={s.addressText} numberOfLines={2}>
              {address === "..." ? "Déplace la carte…" : address || "Centre la carte sur le spot"}
            </Text>
          </View>
          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
            <Octicons name="check" size={16} color="#fff" />
            <Text style={s.confirmText}>Utiliser cet emplacement</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, height: 52,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: Fonts.bodySemiBold, color: Colors.text },
  searchContainer: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14,
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: Fonts.body, color: Colors.text, paddingVertical: 0 },
  searchGoBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  mapContainer: { flex: 1 },
  myLocBtn: {
    position: "absolute", right: 16, bottom: 16, width: 44, height: 44,
    borderRadius: 12, backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border, elevation: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
  },
  footer: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: Colors.border, gap: 12,
  },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  addressText: { flex: 1, fontSize: 14, fontFamily: Fonts.body, color: Colors.text, lineHeight: 20 },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 52, borderRadius: 14, backgroundColor: Colors.primary,
  },
  confirmText: { fontSize: 16, fontFamily: Fonts.bodySemiBold, color: "#fff", letterSpacing: 0.2 },
});
