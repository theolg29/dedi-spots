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
