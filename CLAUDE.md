# Spots — CLAUDE.md

## Projet

**Spots** est une application mobile communautaire (projet universitaire) pour découvrir et partager des lieux remarquables et atypiques : criques cachées, panoramas, bancs parfaits pour le coucher de soleil. L'accent est mis sur l'authenticité — seuls les utilisateurs physiquement présents sur place peuvent noter un spot (vérification GPS).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework mobile | Expo ~54 (React Native) |
| Routing | Expo Router ~6 |
| Backend & base de données | Convex (free tier) |
| Auth | `@convex-dev/auth` + `@auth/core@0.37.0` |
| Styling | NativeWind v5 (Tailwind pour React Native) |
| Cartographie | `react-native-maps` (Apple Maps iOS / Google Maps Android) |
| Géolocalisation | `expo-location` |
| Images | Convex Storage |
| Langage | TypeScript strict |

---

## Structure des fichiers

```
spots/
├── app/
│   ├── _layout.tsx          # Root layout — ConvexAuthProvider + SecureStore
│   ├── onboarding.tsx       # Slides d'onboarding + formulaire auth
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar
│   │   ├── index.tsx        # Feed / accueil
│   │   ├── explore.tsx      # Vue carte
│   │   ├── create.tsx       # Créer un spot
│   │   └── profile.tsx      # Profil — useConvexAuth + useAuthActions
│   └── spot/[id].tsx        # Détail d'un spot
├── components/
│   ├── auth-form.tsx        # Formulaire auth réutilisable (signup/login + Google)
│   └── ui/                  # Composants UI génériques
├── convex/
│   ├── schema.ts            # Schéma — ...authTables + spots/reviews/favorites
│   ├── auth.ts              # Config @convex-dev/auth (Password + Google)
│   ├── http.ts              # auth.addHttpRoutes(http)
│   ├── convex.config.ts     # defineApp() vide
│   ├── users.ts             # query viewer — getAuthUserId
│   └── spots.ts             # Queries/mutations spots
└── constants/
    └── theme.ts             # Couleurs et typographie
```

---

## Design system

**Palette** (définie dans `constants/theme.ts`) :

| Token | Valeur | Usage |
|---|---|---|
| `primary` | `#4A7C59` | Vert forêt — CTA, accents |
| `accent` | `#F4845F` | Orange coucher de soleil — étoiles, badges |
| `background` | `#F8F7F2` | Blanc cassé — fond global |
| `card` | `#FFFFFF` | Blanc pur — cartes |
| `text` | `#1A1A1A` | Texte principal |
| `muted` | `#8A8A8A` | Texte secondaire |
| `border` | `#E8E6E1` | Séparateurs, contours |
| `tagBg` | `#EDF3EF` | Fond des tags |
| `tagText` | `#4A7C59` | Texte des tags |

**Typographie cible** : Gabarito (titres) + DM Sans (textes). Fonts non encore installées.

---

## Auth — architecture

- `ConvexAuthProvider` (root dans `_layout.tsx`) avec `storage={secureStoreAdapter}` (adaptateur SecureStore)
- `convex/auth.ts` : `convexAuth({ providers: [Password, Google] })`
- `convex/users.ts` : query `viewer` via `getAuthUserId(ctx)`
- `auth.addHttpRoutes(http)` dans `convex/http.ts` — enregistre automatiquement les routes OAuth
- `useConvexAuth()` → état d'auth (`isAuthenticated`, `isLoading`)
- `useAuthActions()` → `signIn`, `signOut`

**Flux email/password :**
```ts
signIn("password", { email, password, name, flow: "signUp" | "signIn" })
```

**Flux Google (mobile) :**
```ts
const result = await signIn("google") as any;
const url = result?.url ?? result?.redirect;
if (url) await WebBrowser.openAuthSessionAsync(url, "spots://");
```

**Variables d'env Convex :**
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — OAuth Google
- `JWKS` — généré automatiquement par `@convex-dev/auth` au 1er démarrage

**Redirect URI Google Console :** `https://fabulous-pheasant-994.eu-west-1.convex.site/api/auth/callback/google`

---

## Schéma de données

`authTables` (géré par `@convex-dev/auth`) fournit la table `users` avec : `name?`, `email?`, `image?`, `emailVerificationTime?`, ainsi que les tables internes `authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`.

Tables applicatives :
```
spots      { creatorId, title, description, latitude, longitude,
             photos[], tags[], createdAt }         index: by_creator, by_location
reviews    { spotId, userId, rating, comment?,
             createdAt }                           index: by_spot, by_user, by_spot_and_user
favorites  { userId, spotId, isPrivate,
             createdAt }                           index: by_user, by_spot, by_user_and_spot
```

---

## Fonctionnalités MVP

1. **Onboarding + Auth** — slides → inscription/connexion (email ou Google)
2. **Feed** — liste de spots triés par distance (GPS) ou par ville (fallback)
3. **Vue carte** — toggle liste ↔ carte avec pins
4. **Création de spot** — photos, titre, description, tags, position GPS
5. **Détail spot + Check-in** — l'utilisateur doit être à ≤ 100m pour noter
6. **Profil** — stats (spots créés, check-ins, favoris), onglets Créations / Visités / Favoris

---

## Règles de développement

- **Code propre et maintenable** : extraire les composants réutilisables, pas de logique ou styles dupliqués, nettoyer les imports/styles orphelins après chaque refacto.
- Toujours lire `convex/_generated/ai/guidelines.md` avant d'écrire du code Convex.
- Zéro coût d'infrastructure : rester sur les free tiers (Convex, Google Maps mobile).
- Pas de modération de contenu prévue pour le MVP.

---

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
