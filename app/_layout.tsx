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
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { SystemBars } from "react-native-edge-to-edge";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

// Prevent the splash screen from auto-hiding before asset/status loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

WebBrowser.maybeCompleteAuthSession();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function RootLayout() {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [timedOut, setTimedOut] = useState(false);

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

  // Check onboarding status on mount
  useEffect(() => {
    SecureStore.getItemAsync("onboarded")
      .then((value) => {
        setIsOnboarded(value === "true");
      })
      .catch(() => {
        setIsOnboarded(false);
      });
  }, []);

  // Hide splash screen only when everything is loaded/checked
  useEffect(() => {
    if ((fontsLoaded || fontError) && isOnboarded !== null) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, isOnboarded]);

  // Safety timeout: never stay stuck on splash screen more than 3s
  useEffect(() => {
    const id = setTimeout(() => {
      setTimedOut(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(id);
  }, []);

  // Block render until fonts + onboarding state are ready — but never past the 3s timeout
  if (((!fontsLoaded && !fontError) || isOnboarded === null) && !timedOut) {
    return null;
  }

  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      <SafeAreaProvider>
        <SystemBars style="dark" />
        <Stack initialRouteName={isOnboarded === true ? "(tabs)" : "onboarding"}>
          <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
          <Stack.Screen name="onboarding"     options={{ headerShown: false }} />
          <Stack.Screen name="spot/[id]"      options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="settings"       options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="category/[tag]" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="favorites/[listId]" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="user/[id]"      options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="search"         options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="modal"          options={{ headerShown: false, presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </ConvexAuthProvider>
  );
}

