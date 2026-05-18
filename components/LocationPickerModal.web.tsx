import { View } from "react-native";

type LatLng = { latitude: number; longitude: number };

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (coords: LatLng, address: string) => void;
  initialCoords?: LatLng | null;
}

// Web stub — react-native-maps is native-only
export function LocationPickerModal(_props: Props) {
  return <View />;
}
