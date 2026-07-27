import { useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Octicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface Props {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoViewerModal({ visible, photos, initialIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  if (!visible || photos.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
          }
        >
          {photos.map((uri, i) => (
            <View key={i} style={s.page}>
              <Image source={{ uri }} style={s.image} contentFit="contain" />
            </View>
          ))}
        </ScrollView>

        <Pressable
          style={[s.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer la galerie"
        >
          <Octicons name="x" size={20} color="#fff" />
        </Pressable>

        {photos.length > 1 && (
          <View style={[s.counter, { top: insets.top + 18 }]}>
            <Text style={s.counterText}>{index + 1} / {photos.length}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  page: { width: SCREEN_WIDTH, alignItems: "center", justifyContent: "center" },
  image: { width: SCREEN_WIDTH, height: "100%" },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterText: { color: "#fff", fontFamily: Fonts.bodySemiBold, fontSize: 13 },
});
