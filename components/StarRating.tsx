import { Octicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

export function StarRating({
  rating,
  size = 12,
  showValue = false,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) {
  return (
    <View style={s.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Octicons
          key={i}
          name={i <= Math.round(rating) ? "star-fill" : "star"}
          size={size}
          color={i <= Math.round(rating) ? Colors.star : Colors.starEmpty}
        />
      ))}
      {showValue && (
        <Text style={s.value}>{rating > 0 ? rating.toFixed(1) : "—"}</Text>
      )}
    </View>
  );
}

export function StarPicker({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={s.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={8}>
          <Octicons
            name={i <= value ? "star-fill" : "star"}
            size={size}
            color={i <= value ? Colors.star : Colors.starEmpty}
          />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  value: {
    color: Colors.muted,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    marginLeft: 4,
  },
});
