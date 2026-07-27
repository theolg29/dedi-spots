import { Platform } from "react-native";

export const Colors = {
  primary: "#1F5C3A",      // vert forêt profond (plus sombre)
  accent: "#F4845F",       // orange coucher de soleil
  background: "#FFFFFF",
  surface: "#F4F4F4",
  card: "#FFFFFF",
  text: "#111111",
  textSecondary: "#666666",
  muted: "#999999",
  border: "#EBEBEB",
  tagBg: "#E6EFE9",        // 6% primary sur blanc
  tagText: "#1F5C3A",      // aligné sur primary
  star: "#F5B400",         // or chaud — dédié aux notations, distinct de l'accent
  starEmpty: "#E0DDD8",
  danger: "#E53E3E",       // actions destructives (suppression de compte, erreurs)
  warning: "#E8A838",      // états d'avertissement (ex: limite de caractères proche)

  light: {
    text: "#111111",
    background: "#FFFFFF",
    tint: "#1F5C3A",
    icon: "#999999",
    tabIconDefault: "#999999",
    tabIconSelected: "#1F5C3A",
  },
  dark: {
    text: "#F0EFEB",
    background: "#151714",
    tint: "#4E8F63",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#4E8F63",
  },
};

export const Fonts = {
  heading: "Parkinsans_600SemiBold" as const,
  headingBold: "Parkinsans_700Bold" as const,
  headingXBold: "Parkinsans_800ExtraBold" as const,
  body: "DMSans_400Regular" as const,
  bodyMedium: "DMSans_500Medium" as const,
  bodySemiBold: "DMSans_600SemiBold" as const,
  bodyBold: "DMSans_700Bold" as const,
};

// Boutons/tags/barres de recherche restent en pill (capsule) ; les cards,
// photos, sheets et modales utilisent un radius léger.
export const Radius = {
  pill: 999,
  card: 16,
  cardSm: 12,
};

// Ombre légère réservée aux boutons circulaires flottants posés sur une photo
// (back/share/heart, contrôles carte…). Le reste de l'UI reste flat, sans ombre.
export const FloatingShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});
