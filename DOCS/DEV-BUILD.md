# Dev Build Android via EAS (sans Android Studio)

L'OAuth Google nécessite un dev build — Expo Go ne supporte pas les custom schemes (`spots://`).

## Prérequis

```bash
npm install -g eas-cli
eas login
```

## 1. Configurer EAS

```bash
eas build:configure
```

Réponds `Android` quand demandé. Ça génère un `eas.json`.

Vérifie que le profil `development` est présent dans `eas.json` :

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

## 2. Lancer le build

```bash
eas build --platform android --profile development
```

- Build dans le cloud (~10-15 min)
- À la fin, tu reçois un lien pour télécharger l'APK

## 3. Installer l'APK

- Télécharge l'APK sur ton téléphone Android
- Active "Sources inconnues" dans les paramètres si demandé
- Installe l'APK

## 4. Lancer le serveur de dev

```bash
npx expo start --dev-client
```

Scanne le QR code avec l'app installée (pas Expo Go).

## Problème : app bloquée sur le splash screen après reconnexion USB

Quand tu déconnectes puis reconnectes le câble, le tunnel ADB se coupe. Le bundle JS ne charge plus.

**Fix** : relancer le port forwarding après chaque reconnexion :

```bash
adb reverse tcp:8081 tcp:8081
```

Pour ne pas avoir à le retaper, crée un alias permanent :

```bash
echo 'alias adbm="adb reverse tcp:8081 tcp:8081"' >> ~/.zshrc && source ~/.zshrc
```

Ensuite tu tapes juste `adbm` dans le terminal.

## Notes

- Le dev build contient le scheme `spots://` → l'OAuth Google fonctionne
- À refaire uniquement si tu modifies des plugins natifs (`app.json` > `plugins`)
- Les changements JS ne nécessitent pas de rebuild, juste `expo start --dev-client`
