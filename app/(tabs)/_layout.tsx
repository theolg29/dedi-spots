import { Octicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={Colors.primary}
      backgroundColor="#F9F9FB"
      indicatorColor={Colors.primary}
      iconColor={{ default: "rgba(0,0,0,0.38)", selected: "#FFFFFF" }}
      labelVisibilityMode="labeled"
      rippleColor="transparent"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Octicons} name="home" />} />
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Octicons} name="location" />} />
        <NativeTabs.Trigger.Label>Carte</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Octicons} name="plus-circle" />} />
        <NativeTabs.Trigger.Label>Créer</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Octicons} name="heart" />} />
        <NativeTabs.Trigger.Label>Favoris</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Octicons} name="person" />} />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="categories" hidden />
    </NativeTabs>
  );
}
