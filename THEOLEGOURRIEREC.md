# Spots

Théo Le Gourrierec  
M1 DEDI ALT  
2025/2026

# Description du projet :

Spots est une application mobile communautaire pour découvrir et partager des lieux remarquables et atypiques : criques cachées, panoramas, bancs parfaits pour le coucher de soleil. L'accent est mis sur l'authenticité, seuls les utilisateurs physiquement présents sur place (vérification GPS, rayon de 100 m) peuvent laisser un avis sur un spot.

**⚠️ L'application n'est pas utilisable sur Expo Go** : elle utilise un module de cartographie natif (`@maplibre/maplibre-react-native`), qui n'est pas inclus dans le binaire Expo Go et nécessite un **development build** (Android testé via build de développement). Une vidéo de démonstration complète du parcours utilisateur est fournie pour pallier cette contrainte.

## Fonctionnalités :

- Onboarding avec slides + création / connexion de compte (email avec vérification par code OTP, ou Google)
- Feed de spots triés par distance (GPS) ou par ville (fallback)
- Vue carte interactive avec clusters, recherche et filtres par tag
- Création de spot : photos, titre, description, tags, position GPS (sélecteur sur carte)
- Fiche spot détaillée : carrousel photo, galerie complète (photos du spot + photos postées dans les avis, visionneuse plein écran), météo à 5 jours, itinéraire (Apple Plans / Google Maps / Waze), localisation sur mini-carte
- Check-in géolocalisé : il faut être à moins de 100 m du spot pour pouvoir laisser une note + avis (vérifié côté client ET côté serveur)
- Système de favoris : "Coups de cœur" + listes personnalisées (création, renommage, suppression, consultation du détail d'une liste)
- Profils publics avec système de follow
- Page de profil : stats réelles (spots créés, check-ins, favoris) + onglets Créations / Visités
- Notifications in-app : nouveaux avis, follows et favoris reçus, avec badge non-lu
- Page Réglages : édition des infos personnelles, déconnexion, suppression de compte
- Recherche globale (spots, tags, catégories)

## Stack utilisé :

- Expo (React Native) : [https://expo.dev/](https://expo.dev/)
- Expo Router : [https://docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/)
- TypeScript strict

### Backend &amp; base de données :

- Convex : [https://convex.dev/](https://convex.dev/)
- Auth : `@convex-dev/auth` (Password + Google OAuth)

### Cartographie :

- MapLibre (`@maplibre/maplibre-react-native`) : [https://maplibre.org/](https://maplibre.org/)
- Tuiles : OpenFreeMap (`https://tiles.openfreemap.org`)
- Géolocalisation : `expo-location`

### Météo :

- Open-Meteo (API gratuite, sans clé) : [https://open-meteo.com/](https://open-meteo.com/)

### Gestion des emails :

- Resend : [https://resend.com/](https://resend.com/)

### Images :

- Convex Storage
- `expo-image` / `expo-image-picker`

### Icônes :

- Octicons via `@expo/vector-icons` (jeu d'icônes unique sur toute l'app)

### Typographie :

- Parkinsans (titres) + DM Sans (textes)

### IA :

- Claude Code (Claude Sonnet 4.6 / 5) — génération de code, refonte UI, debug

