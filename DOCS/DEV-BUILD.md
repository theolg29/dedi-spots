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

## Développement sans câble — ADB WiFi (Android 11+)

Permet de développer exactement comme avec un câble, mais sans fil. À faire une fois pour coupler, puis juste `adb connect` à chaque session.

### Étape 1 — Activer le débogage sans fil sur le téléphone

1. `Paramètres` → `Options développeur` → **Débogage sans fil** → activer
2. Appuie sur **"Associer l'appareil avec un code QR"**
3. Un QR code s'affiche ainsi qu'une IP et un port de couplage (ex: `192.168.1.42:43215`)

> Téléphone et ordi doivent être sur le **même réseau WiFi**.

### Étape 2 — Coupler (une seule fois)

```bash
adb pair <ip>:<port-de-couplage>
# Exemple : adb pair 192.168.1.42:43215
```

Rentre le code à 6 chiffres affiché sur le téléphone quand demandé.

### Étape 3 — Se connecter (à chaque session)

Une fois couplé, le port de connexion est différent du port de couplage.
Sur le téléphone, l'écran **Débogage sans fil** affiche une ligne `IP:port` (ex: `192.168.1.42:42135`).

```bash
adb connect <ip>:<port-de-connexion>
# Exemple : adb connect 192.168.1.42:42135
```

Vérifie que ça fonctionne :

```bash
adb devices
# Doit afficher : 192.168.1.42:42135   device
```

### Étape 4 — Port forwarding + lancer Expo

```bash
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client
```

Ou avec l'alias `adbm` (voir section suivante) :

```bash
adbm && npx expo start --dev-client
```

### Alias recommandés

Ajoute ces deux alias dans ton `~/.zshrc` pour aller plus vite :

```bash
# Port forwarding Metro bundler
echo 'alias adbm="adb reverse tcp:8081 tcp:8081"' >> ~/.zshrc

# Connexion WiFi rapide — remplace l'IP par la tienne
echo 'alias adbw="adb connect 192.168.1.42:42135 && adb reverse tcp:8081 tcp:8081"' >> ~/.zshrc

source ~/.zshrc
```

> ⚠️ Le port de connexion peut changer à chaque fois que tu réactives le débogage sans fil. Si `adb devices` renvoie `offline`, relance `adb connect` avec le port affiché sur le téléphone.

---

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
