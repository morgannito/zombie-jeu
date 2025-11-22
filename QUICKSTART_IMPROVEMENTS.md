# ⚡ Guide de Démarrage Rapide - Améliorations

## 🚀 Installation en 3 étapes

### Étape 1 : Installer les dépendances
```bash
npm install
```

### Étape 2 : Générer les icônes PWA

**Option A - Générateur automatique (Recommandé)** :
```bash
# 1. Démarrer le serveur
npm start

# 2. Ouvrir http://localhost:3000

# 3. Ouvrir la console (F12) et exécuter :
```
```javascript
const script = document.createElement('script');
script.src = '/generateIcons.js';
document.head.appendChild(script);

// Attendre 1 seconde puis :
const generator = new IconGenerator();
generator.showPreview(); // Cliquer sur "Generate & Download All"
```

**Option B - Sauter cette étape** :
Les icônes ne sont pas critiques pour le développement. Vous pouvez les générer plus tard.

### Étape 3 : Lancer le jeu
```bash
npm start
# Ouvrir http://localhost:3000
```

---

## ✅ Vérifier que tout fonctionne

### 1. Service Worker
- Ouvrir la console (F12)
- Chercher : `✅ Service Worker registered`
- DevTools > Application > Service Workers devrait montrer "Activated"

### 2. PWA Manifest
- DevTools > Application > Manifest
- Vérifier que le manifest est bien chargé

### 3. Nouvelles fonctionnalités
- **Boutons UX** : Coin supérieur droit (📥 Installer, 🔗 Partager, 🎨 Couleurs, ❓ Aide)
- **Ping** : Indicateur dans le HUD en haut à gauche
- **Aide** : Cliquer sur "❓ Aide" ou appuyer sur `H`

### 4. Raccourcis clavier
- `H` : Ouvrir l'aide
- `F` : Plein écran
- `TAB` : Stats
- `ESC` : Fermer menus

---

## 📝 TODO avant déploiement production

1. **Générer toutes les icônes PWA** (voir Étape 2)
2. **Mettre à jour les URLs** dans `/public/index.html` :
   ```html
   <meta property="og:url" content="https://VOTRE-DOMAINE.com">
   <meta property="og:image" content="https://VOTRE-DOMAINE.com/og-image.jpg">
   ```
3. **Créer les images de preview** (optionnel) :
   - og-image.jpg (1200x630)
   - twitter-card.jpg (1200x675)
4. **Tester avec Lighthouse** :
   - DevTools > Lighthouse
   - Cocher tout (Performance, SEO, PWA, Accessibility)
   - Target : 90+ pour tous

---

## 🎯 Ce qui a été ajouté

### SEO ⭐
- ✅ Meta tags (description, keywords, author)
- ✅ Open Graph (Facebook, Discord)
- ✅ Twitter Cards
- ✅ Favicons multi-tailles

### PWA 📱
- ✅ Manifest.json
- ✅ Service Worker (cache offline)
- ✅ Bouton d'installation

### Performance ⚡
- ✅ Compression Gzip (-60 à -80% taille)
- ✅ Cache-Control headers
- ✅ Offline support

### UX 🎮
- ✅ Partage social (Web Share API)
- ✅ Indicateur de ping réseau
- ✅ Modal d'aide interactive
- ✅ Tutoriel automatique

### Accessibilité ♿
- ✅ Skip link (navigation clavier)
- ✅ Mode daltonien (3 modes)
- ✅ Raccourcis clavier améliorés
- ✅ Support ARIA

---

## 📚 Documentation complète

Pour tous les détails, consultez **WEBSITE_IMPROVEMENTS.md**

---

## 🆘 Problèmes fréquents

**Q : Les icônes PWA ne s'affichent pas**
R : Elles ne sont pas critiques pour le dev. Générez-les avant le déploiement.

**Q : Service Worker error**
R : Effacez le cache (DevTools > Application > Clear Storage) et rafraîchissez.

**Q : Boutons UX invisibles**
R : Vérifiez que `uxImprovements.css` et `uxImprovements.js` sont bien chargés.

---

Bon développement ! 🚀
