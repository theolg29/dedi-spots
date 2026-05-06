# 🌍 Product Requirements Document (PRD) - Spots

## 1. Vision et Objectif du Produit
**Spots** est une application mobile communautaire permettant de découvrir et de partager des lieux remarquables, précis et atypiques (un sommet en bord de mer, un banc parfait pour le coucher de soleil, une crique cachée). 
L'objectif est d'offrir une expérience de découverte immersive, inspirée d'applications comme *AllTrails*, avec un accent sur la cartographie, la nature et l'authenticité des recommandations (vérifiées par géolocalisation).

**Cadre :** Projet Universitaire.

---

## 2. Stack Technique
Pour garantir un développement rapide, moderne et avec **zéro coût d'infrastructure**, la stack suivante est retenue :
*   **Framework Mobile :** Expo (React Native)
*   **Base de Données & Backend :** Convex (Free tier)
*   **Authentification :** BetterAuth (ou `@convex-dev/auth`) - Email/Mot de passe & Google OAuth
*   **Styling :** NativeWind (Tailwind CSS pour React Native)
*   **Cartographie :** `react-native-maps` (Apple Maps sur iOS, Google Maps sur Android - gratuit sur mobile)
*   **Géolocalisation :** `expo-location`
*   **Images :** Stockage via Convex Storage (Free tier)

---

## 3. Design System & UI/UX
L'interface doit respirer la nature, l'exploration et la clarté (inspiration *AllTrails*).
*   **Typographie Titres :**[Gabarito](https://fonts.google.com/specimen/Gabarito) (Chaleureuse, moderne, lisible).
*   **Typographie Textes :** [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Géométrique, épurée, parfaite pour la lisibilité de l'interface).
*   **Couleurs (Suggestions) :** 
    *   *Primary :* Vert forêt ou Vert sauge (nature).
    *   *Background :* Blanc cassé ou gris très clair pour les cartes (cartes épurées).
    *   *Accent :* Orange coucher de soleil ou Jaune moutarde pour les actions clés et les étoiles de notation.
*   **Composants :** UI épurée avec des "Cards" pour les spots (grande image, titre, distance, tags). Un switch "Liste / Carte" omniprésent.

---

## 4. Fonctionnalités Clés (MVP)

### 4.1. Authentification & Onboarding
*   Inscription / Connexion (Email + Mot de passe, Google OAuth).
*   À la création du compte, l'utilisateur renseigne : Nom, Prénom, et sa Ville (qui servira de position par défaut si la géolocalisation n'est pas activée).

### 4.2. Accueil (Feed) & Découverte
*   **Vue Liste :** Fil d'actualité affichant des suggestions de spots sous forme de cartes.
    *   Triés par distance (autour de l'utilisateur grâce à la géolocalisation).
    *   Si pas de géolocalisation : affiche les spots du pays/de la ville de l'utilisateur (renseignée à l'inscription).
*   **Vue Carte :** Toggle pour passer de la liste à une carte interactive avec des pins (marqueurs) pour chaque spot.
*   **Composant Card Spot :** Photo principale, Titre, Note moyenne (/5), Distance, Tags (ex: #CoucherDeSoleil, #Calme).

### 4.3. Création d'un Spot
*   Bouton d'ajout flottant (FAB) ou onglet dédié.
*   Formulaire :
    *   Upload d'une ou plusieurs photos.
    *   Titre du spot.
    *   Description.
    *   Tags (sélection multiple).
    *   Localisation : L'utilisateur place un pin sur la carte ou utilise sa position actuelle.

### 4.4. Détails du Spot & "Check-in"
*   Page détaillée du lieu avec galerie photo, description de l'auteur, et liste des avis.
*   **Mécanique de Check-in (Authenticité) :**
    *   L'utilisateur ne peut noter un lieu sur 5 étoiles et laisser un avis que **s'il se trouve physiquement sur place** (vérification via `expo-location` comparée aux coordonnées du spot avec une marge d'erreur, ex: 100 mètres).

### 4.5. Profil Utilisateur
*   Informations basiques : Photo de profil (Avatar), Nom, Ville.
*   **Statistiques :** Nombre de spots créés, Nombre de spots visités (check-ins).
*   **Listes :**
    *   Onglet "Mes Créations".
    *   Onglet "Visités".
    *   Onglet "Favoris" (Sauvegardes) avec un toggle de confidentialité (*Public / Privé*). Si public, les autres utilisateurs peuvent voir les lieux qu'il a sauvegardés.

*(Note : Pas de modération des contenus prévue pour le MVP de ce projet universitaire).*

---

## 5. Modèle de Données (Convex Schema Idea)

Voici une ébauche de la structure de la base de données :

*   **Users** : `id`, `name`, `email`, `city`, `avatarUrl`.
*   **Spots** : `id`, `creatorId`, `title`, `description`, `coordinates (lat, lng)`, `photos (Array of URLs)`, `tags (Array of Strings)`, `createdAt`.
*   **Reviews (Check-ins)** : `id`, `spotId`, `userId`, `rating (1-5)`, `comment`, `createdAt`. *(Un user ne peut avoir qu'une review par spot).*
*   **Favorites** : `id`, `userId`, `spotId`, `isPrivate (Boolean)`, `createdAt`.

