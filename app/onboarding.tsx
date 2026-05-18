import { Octicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
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

// 0 = welcome  |  1-3 = features  |  4 = auth
const TOTAL = SLIDES.length + 2;
const DOT_W = 6;
const DOT_ACTIVE_W = 22;

// ─── Dots spring ──────────────────────────────────────────────────────────
function AnimatedDots({ activeIndex }: { activeIndex: number }) {
  const anims = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? DOT_ACTIVE_W : DOT_W))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === activeIndex ? DOT_ACTIVE_W : DOT_W,
        useNativeDriver: false,
        damping: 14,
        stiffness: 180,
        mass: 1,
      }).start();
    });
  }, [activeIndex]);

  return (
    <View style={s.dots}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            {
              width: anim,
              backgroundColor: anim.interpolate({
                inputRange: [DOT_W, DOT_ACTIVE_W],
                outputRange: [Colors.border, Colors.primary],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

async function markOnboarded() {
  await SecureStore.setItemAsync("onboarded", "true");
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isWelcome = index === 0;
  const isAuth = index === TOTAL - 1;

  function goTo(i: number) {
    scrollRef.current?.scrollTo({ x: W * i, animated: true });
    setIndex(i);
  }

  function goNext() { if (index < TOTAL - 1) goTo(index + 1); }
  function goPrev() { if (index > 0) goTo(index - 1); }

  function skip() {
    markOnboarded();
    router.replace("/(tabs)");
  }

  async function onAuthSuccess() {
    await markOnboarded();
    router.replace("/(tabs)");
  }

  function onScroll(e: any) {
    const i = Math.round(e.nativeEvent.contentOffset.x / W);
    setIndex(i);
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* ── 0 : Welcome ───────────────────────────────────────────────── */}
        <View style={s.slide}>
          <View style={s.welcomeTop}>
            <Text style={s.welcomeApp}>Spots</Text>
            <Text style={s.welcomeTagline}>
              {"Découvre des lieux\nuniques autour de toi."}
            </Text>
          </View>

          <View style={s.welcomePills}>
            {(
              [
                { emoji: "🗺️", label: "Lieux d'exception" },
                { emoji: "📍", label: "Avis vérifiés sur place" },
                { emoji: "🌿", label: "Partage & favoris" },
              ] as const
            ).map(({ emoji, label }) => (
              <View key={label} style={s.pill}>
                <Text style={s.pillEmoji}>{emoji}</Text>
                <Text style={s.pillLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 1-3 : Feature slides ──────────────────────────────────────── */}
        {SLIDES.map((slide) => (
          <View key={slide.title} style={s.slide}>
            <Text style={s.slideIcon}>{slide.icon}</Text>
            <Text style={s.slideTitle}>{slide.title}</Text>
            <Text style={s.slideSub}>{slide.description}</Text>
          </View>
        ))}

        {/* ── 4 : Auth ─────────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={[s.slide, { paddingTop: 20 }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.authTopBar}>
            <Pressable
              onPress={skip}
              hitSlop={16}
              style={({ pressed }) => pressed && { opacity: 0.4 }}
            >
              <Octicons name="x" size={18} color={Colors.muted} />
            </Pressable>
          </View>

          <Text style={s.authTitle}>Rejoins la communauté</Text>
          <Text style={s.authSub}>
            Crée un compte pour partager tes spots et sauvegarder tes favoris.
          </Text>
          <AuthForm onSuccess={onAuthSuccess} onSkip={skip} />
        </KeyboardAvoidingView>
      </ScrollView>

      {/* ── Footer unifié — même hauteur sur welcome ET feature slides ────
          Les dots sont invisibles sur le welcome (opacity 0) mais occupent
          toujours leur espace, ce qui maintient le bouton vert au même Y.   */}
      {!isAuth && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 20 }]}>

          {/* Dots — cachés sur welcome, visibles sur features */}
          <View style={{ opacity: isWelcome ? 0 : 1 }}>
            <AnimatedDots activeIndex={Math.max(0, index - 1)} />
          </View>

          {/* Bouton principal — même taille, même position */}
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
            onPress={isWelcome ? () => goTo(1) : goNext}
          >
            <Text style={s.primaryBtnText}>
              {isWelcome ? "Découvrir" : "Suivant"}
            </Text>
          </Pressable>

          {/* Lien secondaire — même taille, même position */}
          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.5 }]}
            onPress={isWelcome ? () => goTo(TOTAL - 1) : goPrev}
            hitSlop={10}
          >
            <Text style={s.secondaryText}>
              {isWelcome ? "Se connecter" : "Retour"}
            </Text>
          </Pressable>

        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  slide: {
    width: W,
    flex: 1,
    paddingHorizontal: 36,
    paddingTop: 64,
  },

  // ── Welcome ──────────────────────────────────────────────────────────────
  welcomeTop: { flex: 1, justifyContent: "center" },
  welcomeApp: {
    fontSize: 44,
    fontFamily: Fonts.headingXBold,
    color: Colors.primary,
    letterSpacing: -1.2,
    marginBottom: 10,
  },
  welcomeTagline: {
    fontSize: 26,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  welcomePills: { gap: 8, marginBottom: 20 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  pillEmoji: { fontSize: 17 },
  pillLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },

  // ── Feature slides ────────────────────────────────────────────────────────
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

  // ── Auth ──────────────────────────────────────────────────────────────────
  authTopBar: {
    alignItems: "flex-end",
    marginBottom: 32,
    marginRight: -8,
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

  // ── Footer unifié ─────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: Fonts.bodySemiBold },
  secondaryBtn: { alignItems: "center", paddingVertical: 10 },
  secondaryText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
});
