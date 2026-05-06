import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  Parkinsans_400Regular,
  Parkinsans_600SemiBold,
  Parkinsans_700Bold,
  Parkinsans_800ExtraBold,
} from "@expo-google-fonts/parkinsans";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

WebBrowser.maybeCompleteAuthSession();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export const unstable_settings = { initialRouteName: "(tabs)" };

function InitialRedirect() {
  useEffect(() => {
    SecureStore.getItemAsync("onboarded").then((value) => {
      if (!value) router.replace("/onboarding");
    });
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Parkinsans_400Regular,
    Parkinsans_600SemiBold,
    Parkinsans_700Bold,
    Parkinsans_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      <SafeAreaProvider>
        <InitialRedirect />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="spot/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_right" }} />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ConvexAuthProvider>
  );
}
