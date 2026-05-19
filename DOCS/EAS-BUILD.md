# EAS Build — Guide Spots

## C'est quoi EAS Build ?

EAS Build = compiler l'app sur les serveurs d'Expo, pas en local.  
Utile quand tu n'as pas assez de place ou de RAM pour compiler Android localement.

**Free tier : 15 builds Android + 15 builds iOS par mois** — à ne pas gaspiller, tester d'abord sur Expo Go.

---

## Les 3 profils de build

| Profil | Commande | Résultat | Usage |
|---|---|---|---|
| `preview` | `eas build --platform android --profile preview` | `.apk` téléchargeable | Tester sur le téléphone |
| `development` | `eas build --platform android --profile development` | Dev client | Remplace Expo Go, toutes les APIs natives |
| `production` | `eas build --platform android --profile production` | `.aab` | Release Play Store |

**Pour l'instant : utiliser `preview`** — génère un APK installable directement, sans passer par le Play Store.

---

## Variables d'environnement

### Le problème
Expo Go lit `.env.local` automatiquement.  
EAS Build tourne sur un serveur distant qui ne connaît pas ce fichier → crash immédiat au démarrage si les variables manquent.

### La solution : les déclarer dans `eas.json`

```json
"preview": {
  "env": {
    "EXPO_PUBLIC_CONVEX_URL": "https://xxx.convex.cloud",
    "EXPO_PUBLIC_CONVEX_SITE_URL": "https://xxx.convex.site"
  }
}
```

### Deux façons de fournir des variables à EAS

| `eas.json` → `env` | Dashboard expo.dev → Environment Variables |
|---|---|
| Visible dans le code/git | Chiffré, jamais exposé |
| OK pour valeurs publiques | Pour secrets sensibles |
| `EXPO_PUBLIC_*` | Clés privées, tokens OAuth |

### Ce fichier `.env.local` contient :

```
CONVEX_DEPLOYMENT=dev:nom-du-projet   # CLI uniquement, pas l'app
EXPO_PUBLIC_CONVEX_URL=https://...    # URL runtime → dans eas.json
EXPO_PUBLIC_CONVEX_SITE_URL=https://  # URL runtime → dans eas.json
```

**`CONVEX_DEPLOYMENT`** → uniquement pour `npx convex dev` en local. L'app ne l'utilise jamais — elle utilise directement l'URL complète.

---

## Dev vs Prod Convex

Actuellement, `eas.json` pointe sur le déploiement **dev** de Convex.  
L'APK preview tape donc sur la même BDD que `npx convex dev`.

Pour une release prod :
1. `npx convex deploy` → crée un déploiement prod avec une nouvelle URL
2. Mettre cette URL dans le profil `production` de `eas.json`
3. `eas build --platform android --profile production`

---

## Checklist avant un build

- [ ] `npx expo export` → vérifie que le bundle compile sans erreur (TypeScript + bundler) **avant** de lancer un build EAS, pour ne pas griller un crédit sur un bug basique
- [ ] `npx expo install --check` → vérifier qu'aucun package est hors version
- [ ] Variables dans `eas.json` à jour
- [ ] `npx convex dev` tourne (backend accessible)
- [ ] Tester d'abord dans Expo Go pour ne pas griller un build

---

## Workflow recommandé

```
Développement quotidien  →  Expo Go (illimité)
Test features natives    →  eas build --profile preview  (compte dans les 30/mois)
Release                  →  eas build --profile production
```

Les features qui nécessitent un vrai build (non testables dans Expo Go) :
- Predictive Back Gesture (Android 14+)
- Vitesse d'animations natives
- Notifications push
- Modules natifs custom
