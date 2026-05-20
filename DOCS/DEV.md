# Spots — Commandes de développement

## 1. Démarrage (toujours dans cet ordre)

```bash
npx convex dev
```
Lance le backend Convex en mode watch (sync schéma + fonctions en temps réel).
→ Laisser tourner dans un terminal dédié.

```bash
npx expo start
```
Lance Metro bundler. Fast refresh actif tant que le téléphone est branché ou sur le même réseau.

---

## 2. Builds locaux (câble USB)

```bash
npx expo run:android
```
Compile et installe le dev build sur l'Android branché. À utiliser quand tu ajoutes une nouvelle dépendance native.

```bash
npx expo run:android --device
```
Affiche la liste des appareils/émulateurs disponibles pour choisir.

```bash
npx expo run:android --variant release
```
Build de release en local (pour tester les perfs sans passer par EAS).

---

## 3. Builds cloud (EAS)

```bash
eas build --platform android --profile development
```
Dev client APK buildé dans le cloud. À utiliser si tu veux distribuer le build de dev à quelqu'un d'autre.

```bash
eas build --platform android --profile preview
```
APK standalone testable (sans Play Store), idéal pour faire tester l'app.

```bash
eas build --platform android --profile production
```
AAB signé pour le Google Play Store.

```bash
eas build --platform ios --profile production
```
IPA pour l'App Store (nécessite un compte Apple Developer).

```bash
eas build --platform all --profile production
```
Build Android + iOS en parallèle.

---

## 4. OTA Updates (sans rebuild natif)

```bash
eas update --branch main --message "fix: description du changement"
```
Pousse une mise à jour JS/assets sans passer par les stores. Les utilisateurs la reçoivent au prochain lancement de l'app.

```bash
eas update --branch main --auto
```
Utilise le dernier commit Git comme message automatiquement.

---

## 5. Convex

```bash
npx convex dev
```
Mode développement avec hot-reload des fonctions.

```bash
npx convex deploy
```
Déploie les fonctions Convex en production (à faire avant un build de prod).

```bash
npx convex dashboard
```
Ouvre le dashboard Convex dans le navigateur (logs, données, fonctions).

---

## 6. Utilitaires Expo

```bash
npx expo install <package>
```
Installe un package avec la version compatible avec ton SDK Expo (toujours préférer ça à `npm install` pour les packages Expo/RN).

```bash
npx expo doctor
```
Vérifie que toutes les dépendances sont compatibles entre elles.

```bash
npx expo prebuild
```
Génère les dossiers `android/` et `ios/` à partir de `app.json` (utile si tu dois inspecter le code natif).

```bash
npx expo prebuild --clean
```
Même chose mais repart de zéro (supprime et recrée les dossiers natifs).

---

## 7. Workflow type

| Situation | Commandes |
|---|---|
| Dev quotidien | `npx convex dev` + `npx expo start` |
| Nouvelle dépendance native | `npx expo install <pkg>` → `npx expo run:android` |
| Faire tester l'app | `eas build --platform android --profile preview` |
| Déployer une correction JS rapide | `eas update --branch main --message "..."` |
| Release production | `npx convex deploy` → `eas build --platform android --profile production` |
