import { Octicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={Colors.primary}
      backgroundColor="#F9F9FB"
      indicatorColor={Colors.primary}
      iconColor={{ default: "rgba(0,0,0,0.38)", selected: "#FFFFFF" }}
    >
      <NativeTabs.Trigger name="index">
        <Icon src={<VectorIcon family={Octicons} name="home" />} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon src={<VectorIcon family={Octicons} name="location" />} />
        <Label>Carte</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Icon src={<VectorIcon family={Octicons} name="plus-circle" />} />
        <Label>Créer</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites">
        <Icon src={<VectorIcon family={Octicons} name="heart" />} />
        <Label>Favoris</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon src={<VectorIcon family={Octicons} name="person" />} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="categories" hidden />
    </NativeTabs>
  );
}
