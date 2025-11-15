# Jeu de Zombie Rogue-like Multijoueur

Un jeu de survie zombie en temps réel sur navigateur avec **système rogue-like**, génération procédurale, progression permanente et multijoueur coopératif !

## Mode Rogue-like

Ce jeu suit les principes du genre rogue-like :
- **Permadeath** : À chaque mort, vous recommencez depuis le début
- **Génération procédurale** : Chaque run génère des salles aléatoires avec obstacles
- **Progression permanente** : Débloquez des upgrades qui persistent entre les runs
- **Boss** : Un boss zombie apparaît à la fin de chaque salle
- **Loot** : Ramassez de l'or et de l'XP pour progresser

## Fonctionnalités

### Système de Salles (Rogue-like)
- **5 salles par run** avec génération procédurale
- Murs extérieurs et obstacles aléatoires (piliers, caisses)
- Portes qui s'ouvrent après avoir tué le boss
- Mini-map en temps réel affichant la salle complète

### Types de Zombies
- **Zombie Normal** (Vert)
  - Vie: 80 | Vitesse: 2 | Dégâts: 8
  - Drop: 5 gold, 10 XP

- **Zombie Rapide** (Jaune)
  - Vie: 50 | Vitesse: 4 | Dégâts: 12
  - Drop: 10 gold, 15 XP

- **Zombie Tank** (Orange)
  - Vie: 200 | Vitesse: 1 | Dégâts: 20
  - Drop: 20 gold, 30 XP

- **Boss Zombie** (Rouge) - Fin de salle
  - Vie: 500 | Vitesse: 1.5 | Dégâts: 25
  - Drop: 100 gold, 100 XP
  - Ouvre la porte vers la salle suivante

### Système de Progression
- **Niveau** : Montez de niveau en gagnant de l'XP
- **Level-up** : +10 PV max et heal complet
- **Gold** : Ramassez l'or des zombies tués
- **XP** : Gain d'expérience progressif (formule: 100 × 1.5^(level-1))

### Armes
- **Pistolet** : Arme de base, tir rapide et précis
  - Dégâts: 34 | Cadence: 300ms | 1 projectile

- **Shotgun** : 5 projectiles avec dispersion
  - Dégâts: 20/projectile | Cadence: 800ms | Dispersion: 0.3

- **Mitraillette** : Cadence de tir très élevée
  - Dégâts: 25 | Cadence: 100ms | Légère dispersion

### Power-ups Temporaires
- **Santé** (+50 PV) : Restaure la vie
- **Vitesse** : Boost x1.5 pendant 10 secondes
- **Shotgun/Mitraillette** : Armes temporaires pendant 15 secondes

### Interface & Graphismes
- **Style rogue-like** avec salles closes et murs
- Sol en grille avec couleurs sombres (#1a1a2e)
- Murs et obstacles avec textures
- Portes colorées (rouge=fermée, vert=ouverte)
- Pièces d'or animées avec rotation
- Particules colorées selon le type de zombie
- Barres de vie dynamiques pour tous les ennemis
- Effets visuels (glow, shadows) pour armes et power-ups

### Effets Visuels
- **Particules** lors des impacts (couleur selon type de zombie)
- **Pièces d'or** qui tournent
- **Effets de lumière** sur les balles
- **Animations** de pulsation pour les power-ups
- **Boss** avec bordure épaisse et label "BOSS"
- **Level-up** avec annonce visuelle verte

## Installation

```bash
npm install
```

## Démarrage

```bash
npm start
```

Ouvrez plusieurs onglets sur `http://localhost:3000` pour tester le multijoueur !

## Contrôles

- **WASD/ZQSD** ou **Flèches** : Déplacement
- **Souris** : Viser
- **Clic gauche** : Tirer
- **Collecte automatique** : Marchez sur le loot et power-ups

## Comment Jouer (Guide Rogue-like)

1. **Survivez à chaque salle**
   - Tuez les 10 zombies qui spawn progressivement
   - Affrontez le boss zombie qui apparaît ensuite
   - La porte s'ouvre après la mort du boss

2. **Ramassez le loot**
   - Pièces d'or pour acheter des upgrades dans le shop
   - XP pour monter de niveau pendant le run
   - Power-ups temporaires pour vous aider

3. **Utilisez le shop**
   - Le shop s'ouvre automatiquement après avoir tué le boss
   - Achetez des upgrades permanents (conservés après la mort)
   - Achetez des items temporaires pour la salle actuelle
   - Cliquez sur "Continuer" pour passer à la salle suivante

4. **Progressez à travers les salles**
   - Passez par la porte verte en haut
   - 5 salles par run complet
   - Chaque salle a des obstacles différents

5. **Permadeath**
   - À la mort, vous perdez tout sauf les upgrades permanents
   - Recommencez depuis la salle 1
   - Votre niveau et votre or sont réinitialisés
   - Vos multiplicateurs d'upgrades sont conservés !

6. **Coopération multijoueur**
   - Jouez avec d'autres pour survivre plus longtemps
   - Partagez le loot et l'XP
   - Stratégie d'équipe contre les boss

## Système de Vagues par Salle

- **10 zombies** spawns progressifs par salle
- **1 boss zombie** après les 10 zombies
- **Types variés** : Mélange de normaux, rapides et tanks
- **Spawn limité** : Maximum 15 zombies simultanés
- **Interval** : Nouveau zombie toutes les 3 secondes

## Progression Permanente & Shop

### Système de Shop
Le shop s'ouvre automatiquement après avoir tué le boss de chaque salle. Vous pouvez y dépenser votre or pour acheter :

**Upgrades Permanents** (conservés après la mort) :
- **❤️ Vie Maximum** : +20 PV max permanents
  - Coût de base : 50 gold | +25 par niveau | Max : Niveau 10
- **⚔️ Dégâts** : +10% dégâts permanents
  - Coût de base : 75 gold | +35 par niveau | Max : Niveau 5
- **👟 Vitesse** : +15% vitesse permanente
  - Coût de base : 60 gold | +30 par niveau | Max : Niveau 5
- **🔫 Cadence de Tir** : -10% cooldown armes
  - Coût de base : 80 gold | +40 par niveau | Max : Niveau 5

**Items Temporaires** (pour la salle actuelle) :
- **💚 Soin Complet** : Restaure toute votre vie (30 gold)
- **🔫 Shotgun** : Shotgun pour la salle actuelle (40 gold)
- **🔫 Mitraillette** : Mitraillette pour la salle actuelle (50 gold)
- **⚡ Boost Vitesse** : Vitesse x2 pour la salle actuelle (35 gold)

## Architecture Technique

### Backend (Node.js + Socket.IO)
- Génération procédurale des salles au démarrage
- Game loop à 60 FPS avec synchronisation
- Détection de collisions serveur-side (murs, zombies, joueurs)
- Système de portes avec activation conditionnelle
- Gestion du loot et de l'XP

### Frontend (HTML5 Canvas)
- Rendu optimisé avec caméra centrée
- Mini-map en temps réel
- Animations fluides (rotation, pulsation)
- Effets visuels (particules, glow, shadows)
- UI responsive avec stats en direct

### Synchronisation
- WebSockets (Socket.IO) pour communication temps réel
- État du jeu envoyé à 60 FPS
- Validation serveur-side des mouvements
- Événements spéciaux (boss spawn, level-up, portes)

## Prochaines Fonctionnalités

- [x] Shop entre les salles pour dépenser l'or ✅
- [x] Upgrades permanents achetables ✅
- [ ] Sons et effets audio (tirs, impacts, musique)
- [ ] Plus de types de zombies (explosif, soigneur, ralentisseur, etc.)
- [ ] Armes permanentes à débloquer
- [ ] Système de classes de personnages
- [ ] Leaderboard multijoueur
- [ ] Achievements et unlocks
- [ ] Sauvegarde des upgrades en base de données

## Technologies

- **Backend** : Node.js + Express
- **Communication** : Socket.IO (WebSockets)
- **Frontend** : HTML5 Canvas + JavaScript ES6+
- **Architecture** : Client-serveur avec autorité serveur
- **Style** : Rogue-like procédural

---

**Bon run et que la chance soit avec vous !** 🧟‍♂️💀🎮
