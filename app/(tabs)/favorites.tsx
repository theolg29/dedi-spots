import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoritesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7F2" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 16, color: "#8A8A8A" }}>Favoris</Text>
      </View>
    </SafeAreaView>
  );
}
