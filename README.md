# Jeu de Zombie Multijoueur

Un jeu de survie zombie en temps réel sur navigateur avec support multijoueur, système de vagues progressives et power-ups !

## Fonctionnalités

### Gameplay
- **Multijoueur en temps réel** avec Socket.IO (synchronisation 60 FPS)
- **Système de vagues** avec difficulté progressive
  - Les zombies deviennent plus résistants et rapides à chaque vague
  - Score multiplié par le numéro de vague
- **Mouvement fluide** des joueurs (WASD ou flèches)
- **IA des zombies** qui chassent intelligemment les joueurs
- **Système de combat** avec tir à la souris

### Armes
- **Pistolet** : Arme de base, tir rapide et précis
- **Shotgun** : 5 projectiles avec dispersion, gros dégâts de zone
- **Mitraillette** : Cadence de tir très élevée, légère dispersion

### Power-ups
- **Santé** (+50 PV) : Restaure la vie du joueur
- **Vitesse** : Boost de vitesse pendant 10 secondes
- **Shotgun** : Arme temporaire pendant 15 secondes
- **Mitraillette** : Arme temporaire pendant 15 secondes

### Interface
- **Barre de vie** dynamique avec code couleur
- **Score en temps réel** avec multiplicateur de vague
- **Compteur de vagues** avec annonces visuelles
- **Indicateur d'arme** actuelle
- **Statistiques** : joueurs en ligne, zombies vivants
- **Mini-map** en temps réel affichant :
  - Votre position et direction
  - Autres joueurs
  - Zombies
  - Power-ups

### Effets Visuels
- **Particules** lors des impacts et mort des zombies
- **Effets de lumière** sur les balles et power-ups
- **Animations** de pulsation pour les power-ups
- **Effets de vitesse** visuels pour les boosts

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

- **WASD** ou **Flèches** : Déplacement
- **Souris** : Viser
- **Clic gauche** : Tirer
- **Collecte automatique** : Marchez sur les power-ups pour les ramasser

## Comment Jouer

1. Tuez des zombies pour gagner des points
2. Survivez aux vagues de zombies (20 zombies par vague)
3. Ramassez les power-ups pour améliorer vos capacités
4. Coopérez avec d'autres joueurs en multijoueur
5. Atteignez la vague la plus haute possible !

## Système de Progression

- **Vague 1** : Zombies normaux (100 PV, vitesse normale)
- **Vague 2+** : +20% PV et +10% vitesse par vague
- **Score** : 10 points × numéro de vague par zombie tué
- **Power-ups** : Apparition toutes les 10 secondes

## Technologies

- **Backend** : Node.js + Express
- **Communication** : Socket.IO (WebSockets)
- **Frontend** : HTML5 Canvas
- **JavaScript** : ES6+
- **Architecture** : Client-serveur avec synchronisation temps réel
