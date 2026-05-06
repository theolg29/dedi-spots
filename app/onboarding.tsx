import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthForm } from "@/components/auth-form";
import { Colors, Fonts } from "@/constants/theme";

const { width: W } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "🗺️",
    title: "Découvre des lieux d'exception",
    description:
      "Des spots partagés par des explorateurs comme toi. Criques secrètes, panoramas époustouflants, recoins magiques.",
  },
  {
    icon: "📍",
    title: "Des avis vérifiés sur place",
    description:
      "Seuls ceux qui s'y trouvent physiquement peuvent noter un spot. Chaque avis est authentique et fiable.",
  },
  {
    icon: "🌿",
    title: "Partage tes coups de cœur",
    description:
      "Ajoute tes propres spots, enregistre tes favoris et inspire d'autres aventuriers autour de toi.",
  },
];

async function markOnboarded() {
  await SecureStore.setItemAsync("onboarded", "true");
}

function skip() {
  markOnboarded();
  router.replace("/(tabs)");
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const totalSlides = SLIDES.length + 1;
  const isLastSlide = index === totalSlides - 1;

  function goNext() {
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: W * next, animated: true });
    setIndex(next);
  }

  function onScroll(e: any) {
    const i = Math.round(e.nativeEvent.contentOffset.x / W);
    setIndex(i);
  }

  async function onAuthSuccess() {
    await markOnboarded();
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={s.screen}>
      <Pressable
        style={[s.skipBtn, { top: insets.top + 10 }]}
        onPress={skip}
        hitSlop={16}
      >
        <Text style={s.skipText}>Passer</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={s.slide}>
            <Text style={s.slideIcon}>{slide.icon}</Text>
            <Text style={s.slideTitle}>{slide.title}</Text>
            <Text style={s.slideSub}>{slide.description}</Text>
          </View>
        ))}

        <KeyboardAvoidingView
          style={s.authSlide}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Text style={s.authTitle}>Rejoins la communauté</Text>
          <Text style={s.authSub}>
            Crée un compte pour partager tes spots et sauvegarder tes favoris.
          </Text>
          <AuthForm onSuccess={onAuthSuccess} onSkip={skip} />
        </KeyboardAvoidingView>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.dots}>
          {Array.from({ length: totalSlides }).map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>

        {!isLastSlide && (
          <Pressable
            style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.85 }]}
            onPress={goNext}
          >
            <Text style={s.nextBtnText}>Suivant</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  skipText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
  },

  slide: {
    width: W,
    flex: 1,
    paddingHorizontal: 36,
    paddingTop: 80,
    justifyContent: "center",
    gap: 0,
  },
  slideIcon: { fontSize: 64, marginBottom: 32 },
  slideTitle: {
    fontSize: 30,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  slideSub: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.muted,
    lineHeight: 25,
  },

  authSlide: {
    width: W,
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    justifyContent: "center",
  },
  authTitle: {
    fontSize: 28,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  authSub: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.muted,
    lineHeight: 23,
    marginBottom: 28,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
  },
});
