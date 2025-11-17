const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques
app.use(express.static('public'));

// État du jeu
const gameState = {
  players: {},
  zombies: {},
  bullets: {},
  powerups: {},
  particles: {},
  loot: {},
  walls: [],
  rooms: [],
  currentRoom: 0,
  bossSpawned: false,
  nextZombieId: 0,
  nextBulletId: 0,
  nextPowerupId: 0,
  nextParticleId: 0,
  nextLootId: 0,
  wave: 1,
  zombiesKilledThisWave: 0,
  zombiesSpawnedThisWave: 0,
  permanentUpgrades: {
    maxHealthUpgrade: 0,
    damageUpgrade: 0,
    speedUpgrade: 0,
    goldMultiplier: 1
  }
};

// Configuration du jeu (MAP ÉNORME pour exploration libre)
const CONFIG = {
  ROOM_WIDTH: 3000, // Map beaucoup plus grande (800 -> 3000)
  ROOM_HEIGHT: 2400, // Map beaucoup plus grande (600 -> 2400)
  WALL_THICKNESS: 40, // Murs plus épais pour la grande map
  PLAYER_SPEED: 8, // Vitesse augmentée pour la grande map
  PLAYER_SIZE: 20,
  ZOMBIE_SIZE: 25,
  ZOMBIE_SPAWN_INTERVAL: 1000, // Spawns 2x plus rapides (2000 -> 1000ms)
  MAX_ZOMBIES: 50, // Beaucoup plus de zombies simultanés (35 -> 50)
  BULLET_SPEED: 10,
  BULLET_DAMAGE: 34,
  BULLET_SIZE: 5,
  PLAYER_MAX_HEALTH: 100,
  POWERUP_SPAWN_INTERVAL: 15000,
  POWERUP_SIZE: 15,
  ZOMBIES_PER_ROOM: 25, // Plus de zombies pour augmenter la difficulté (20 -> 25)
  LOOT_SIZE: 10,
  DOOR_WIDTH: 120, // Porte plus large
  ROOMS_PER_RUN: 3
};

// Types d'armes (Améliorées pour un gameplay plus rapide)
const WEAPONS = {
  pistol: {
    name: 'Pistolet',
    damage: 40, // +6 dégâts
    fireRate: 180, // Plus rapide (300 -> 180ms)
    bulletSpeed: 14,
    bulletCount: 1,
    spread: 0,
    color: '#ffff00'
  },
  shotgun: {
    name: 'Shotgun',
    damage: 25, // +5 dégâts par projectile
    fireRate: 600, // Plus rapide (800 -> 600ms)
    bulletSpeed: 11,
    bulletCount: 5,
    spread: 0.3,
    color: '#ff6600'
  },
  machinegun: {
    name: 'Mitraillette',
    damage: 30, // +5 dégâts
    fireRate: 80, // Plus rapide (100 -> 80ms)
    bulletSpeed: 16,
    bulletCount: 1,
    spread: 0.08,
    color: '#00ffff'
  }
};

// Types de power-ups
const POWERUP_TYPES = {
  health: {
    name: 'Santé',
    color: '#00ff00',
    effect: (player) => {
      player.health = Math.min(player.health + 50, player.maxHealth);
    }
  },
  speed: {
    name: 'Vitesse',
    color: '#00ffff',
    effect: (player) => {
      player.speedBoost = Date.now() + 10000; // 10 secondes
    }
  },
  shotgun: {
    name: 'Shotgun',
    color: '#ff6600',
    effect: (player) => {
      player.weapon = 'shotgun';
      player.weaponTimer = Date.now() + 15000; // 15 secondes
    }
  },
  machinegun: {
    name: 'Mitraillette',
    color: '#00ffff',
    effect: (player) => {
      player.weapon = 'machinegun';
      player.weaponTimer = Date.now() + 15000; // 15 secondes
    }
  }
};

// Types de zombies (Rogue-like avec XP améliorée)
const ZOMBIE_TYPES = {
  normal: {
    name: 'Zombie Normal',
    health: 65,
    speed: 2,
    damage: 8,
    color: '#00ff00',
    size: 25,
    goldDrop: 8,
    xpDrop: 20 // +67% XP (12 -> 20)
  },
  fast: {
    name: 'Zombie Rapide',
    health: 45,
    speed: 4,
    damage: 12,
    color: '#ffff00',
    size: 20,
    goldDrop: 15,
    xpDrop: 30 // +67% XP (18 -> 30)
  },
  tank: {
    name: 'Zombie Tank',
    health: 170,
    speed: 1,
    damage: 20,
    color: '#ff6600',
    size: 35,
    goldDrop: 30,
    xpDrop: 60 // +71% XP (35 -> 60)
  },
  explosive: {
    name: 'Zombie Explosif',
    health: 50,
    speed: 2.5,
    damage: 10,
    color: '#ff00ff',
    size: 22,
    goldDrop: 20,
    xpDrop: 40, // +60% XP (25 -> 40)
    explosionRadius: 100,
    explosionDamage: 30
  },
  healer: {
    name: 'Zombie Soigneur',
    health: 85,
    speed: 1.5,
    damage: 5,
    color: '#00ffff',
    size: 28,
    goldDrop: 35,
    xpDrop: 50, // +67% XP (30 -> 50)
    healAmount: 10,
    healRadius: 150,
    healCooldown: 3000
  },
  slower: {
    name: 'Zombie Ralentisseur',
    health: 75,
    speed: 1.8,
    damage: 6,
    color: '#8800ff',
    size: 26,
    goldDrop: 25,
    xpDrop: 45, // +61% XP (28 -> 45)
    slowRadius: 120,
    slowAmount: 0.5,
    slowDuration: 2000
  },
  boss: {
    name: 'Boss Zombie',
    health: 400,
    speed: 1.5,
    damage: 25,
    color: '#ff0000',
    size: 50,
    goldDrop: 150,
    xpDrop: 200 // +67% XP (120 -> 200)
  }
};

// Level-up Upgrades (choix à chaque niveau)
const LEVEL_UP_UPGRADES = {
  maxHealthBoost: {
    id: 'maxHealthBoost',
    name: '❤️ Coeur Robuste',
    description: '+30 PV max',
    rarity: 'common',
    effect: (player) => {
      player.maxHealth += 30;
      player.health = Math.min(player.health + 30, player.maxHealth);
    }
  },
  damageBoost: {
    id: 'damageBoost',
    name: '⚔️ Force Brute',
    description: '+15% dégâts',
    rarity: 'common',
    effect: (player) => {
      player.damageMultiplier = (player.damageMultiplier || 1) * 1.15;
    }
  },
  speedBoost: {
    id: 'speedBoost',
    name: '👟 Vélocité',
    description: '+20% vitesse',
    rarity: 'common',
    effect: (player) => {
      player.speedMultiplier = (player.speedMultiplier || 1) * 1.20;
    }
  },
  fireRateBoost: {
    id: 'fireRateBoost',
    name: '🔫 Gâchette Rapide',
    description: '-15% cooldown armes',
    rarity: 'common',
    effect: (player) => {
      player.fireRateMultiplier = (player.fireRateMultiplier || 1) * 0.85;
    }
  },
  regeneration: {
    id: 'regeneration',
    name: '💚 Régénération',
    description: '+1 PV/sec',
    rarity: 'rare',
    effect: (player) => {
      player.regeneration = (player.regeneration || 0) + 1;
    }
  },
  bulletPiercing: {
    id: 'bulletPiercing',
    name: '🎯 Balles Perforantes',
    description: 'Les balles traversent 1 ennemi de plus',
    rarity: 'rare',
    effect: (player) => {
      player.bulletPiercing = (player.bulletPiercing || 0) + 1;
    }
  },
  lifeSteal: {
    id: 'lifeSteal',
    name: '🩸 Vol de Vie',
    description: '+5% de vol de vie sur dégâts',
    rarity: 'rare',
    effect: (player) => {
      player.lifeSteal = (player.lifeSteal || 0) + 0.05;
    }
  },
  criticalChance: {
    id: 'criticalChance',
    name: '💥 Coup Critique',
    description: '+10% chance de critique (x2 dégâts)',
    rarity: 'rare',
    effect: (player) => {
      player.criticalChance = (player.criticalChance || 0) + 0.10;
    }
  },
  goldMagnet: {
    id: 'goldMagnet',
    name: '💰 Aimant à Or',
    description: '+50% rayon de collecte',
    rarity: 'common',
    effect: (player) => {
      player.goldMagnetRadius = (player.goldMagnetRadius || 0) + 50;
    }
  },
  dodgeChance: {
    id: 'dodgeChance',
    name: '🌀 Esquive',
    description: '+8% chance d\'esquive',
    rarity: 'rare',
    effect: (player) => {
      player.dodgeChance = (player.dodgeChance || 0) + 0.08;
    }
  },
  explosiveRounds: {
    id: 'explosiveRounds',
    name: '💣 Munitions Explosives',
    description: 'Les balles explosent (rayon 30px, 50% dégâts)',
    rarity: 'legendary',
    effect: (player) => {
      player.explosiveRounds = true;
      player.explosionRadius = 30;
      player.explosionDamagePercent = 0.5;
    }
  },
  multishot: {
    id: 'multishot',
    name: '🎆 Tir Multiple',
    description: '+1 balle par tir',
    rarity: 'legendary',
    effect: (player) => {
      player.extraBullets = (player.extraBullets || 0) + 1;
    }
  },
  thorns: {
    id: 'thorns',
    name: '🛡️ Épines',
    description: 'Renvoie 20% des dégâts reçus',
    rarity: 'rare',
    effect: (player) => {
      player.thorns = (player.thorns || 0) + 0.20;
    }
  },
  fullHeal: {
    id: 'fullHeal',
    name: '✨ Soin Complet',
    description: 'Restaure toute votre vie',
    rarity: 'common',
    effect: (player) => {
      player.health = player.maxHealth;
    }
  },
  autoTurret: {
    id: 'autoTurret',
    name: '🎯 Tourelle Automatique',
    description: 'Tire automatiquement sur les zombies proches',
    rarity: 'legendary',
    effect: (player) => {
      player.autoTurrets = (player.autoTurrets || 0) + 1;
      if (!player.lastAutoShot) {
        player.lastAutoShot = Date.now();
      }
    }
  }
};

// Shop Items (Rogue-like)
const SHOP_ITEMS = {
  permanent: {
    maxHealth: {
      id: 'maxHealth',
      name: '❤️ Vie Maximum',
      description: '+20 PV max permanents',
      baseCost: 50,
      costIncrease: 25,
      maxLevel: 10,
      effect: (player) => {
        player.maxHealth += 20;
        player.health = player.maxHealth; // Heal complet
      }
    },
    damage: {
      id: 'damage',
      name: '⚔️ Dégâts',
      description: '+10% dégâts permanents',
      baseCost: 75,
      costIncrease: 35,
      maxLevel: 5,
      effect: (player) => {
        player.damageMultiplier = (player.damageMultiplier || 1) * 1.10;
      }
    },
    speed: {
      id: 'speed',
      name: '👟 Vitesse',
      description: '+15% vitesse permanente',
      baseCost: 60,
      costIncrease: 30,
      maxLevel: 5,
      effect: (player) => {
        player.speedMultiplier = (player.speedMultiplier || 1) * 1.15;
      }
    },
    fireRate: {
      id: 'fireRate',
      name: '🔫 Cadence de Tir',
      description: '-10% cooldown armes',
      baseCost: 80,
      costIncrease: 40,
      maxLevel: 5,
      effect: (player) => {
        player.fireRateMultiplier = (player.fireRateMultiplier || 1) * 0.90;
      }
    }
  },
  temporary: {
    heal: {
      id: 'heal',
      name: '💚 Soin Complet',
      description: 'Restaure toute votre vie',
      cost: 30,
      effect: (player) => {
        player.health = player.maxHealth;
      }
    },
    shotgun: {
      id: 'shotgun',
      name: '🔫 Shotgun',
      description: 'Shotgun pour la salle actuelle',
      cost: 40,
      effect: (player) => {
        player.weapon = 'shotgun';
        player.weaponTimer = Date.now() + 999999; // Jusqu'à la fin de la salle
      }
    },
    machinegun: {
      id: 'machinegun',
      name: '🔫 Mitraillette',
      description: 'Mitraillette pour la salle actuelle',
      cost: 50,
      effect: (player) => {
        player.weapon = 'machinegun';
        player.weaponTimer = Date.now() + 999999; // Jusqu'à la fin de la salle
      }
    },
    speedBoost: {
      id: 'speedBoost',
      name: '⚡ Boost Vitesse',
      description: 'Vitesse x2 pour la salle actuelle',
      cost: 35,
      effect: (player) => {
        player.speedBoost = Date.now() + 999999; // Jusqu'à la fin de la salle
      }
    }
  }
};

// Fonction utilitaire pour calculer la distance
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Générer 3 choix d'upgrades aléatoires avec pondération par rareté
function generateUpgradeChoices() {
  const upgradeKeys = Object.keys(LEVEL_UP_UPGRADES);
  const choices = [];
  const selectedKeys = new Set();

  // Pondération par rareté : common: 60%, rare: 30%, legendary: 10%
  while (choices.length < 3 && selectedKeys.size < upgradeKeys.length) {
    const rand = Math.random();
    let targetRarity;

    if (rand < 0.60) {
      targetRarity = 'common';
    } else if (rand < 0.90) {
      targetRarity = 'rare';
    } else {
      targetRarity = 'legendary';
    }

    // Trouver un upgrade de cette rareté qui n'a pas déjà été sélectionné
    const availableUpgrades = upgradeKeys.filter(key =>
      LEVEL_UP_UPGRADES[key].rarity === targetRarity && !selectedKeys.has(key)
    );

    if (availableUpgrades.length > 0) {
      const selectedKey = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
      selectedKeys.add(selectedKey);
      choices.push({
        id: selectedKey,
        name: LEVEL_UP_UPGRADES[selectedKey].name,
        description: LEVEL_UP_UPGRADES[selectedKey].description,
        rarity: LEVEL_UP_UPGRADES[selectedKey].rarity
      });
    }
  }

  // Si on n'a pas réussi à avoir 3 choix avec la pondération, compléter avec n'importe quoi
  while (choices.length < 3 && selectedKeys.size < upgradeKeys.length) {
    const availableUpgrades = upgradeKeys.filter(key => !selectedKeys.has(key));
    if (availableUpgrades.length > 0) {
      const selectedKey = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
      selectedKeys.add(selectedKey);
      choices.push({
        id: selectedKey,
        name: LEVEL_UP_UPGRADES[selectedKey].name,
        description: LEVEL_UP_UPGRADES[selectedKey].description,
        rarity: LEVEL_UP_UPGRADES[selectedKey].rarity
      });
    } else {
      break;
    }
  }

  return choices;
}

// Génération procédurale de salle (Rogue-like)
function generateRoom() {
  const room = {
    width: CONFIG.ROOM_WIDTH,
    height: CONFIG.ROOM_HEIGHT,
    walls: [],
    obstacles: [],
    doors: []
  };

  const w = CONFIG.WALL_THICKNESS;

  // Murs extérieurs
  room.walls.push(
    { x: 0, y: 0, width: room.width, height: w }, // Haut
    { x: 0, y: room.height - w, width: room.width, height: w }, // Bas
    { x: 0, y: 0, width: w, height: room.height }, // Gauche
    { x: room.width - w, y: 0, width: w, height: room.height } // Droite
  );

  // Porte en haut (pour passer à la salle suivante)
  const doorX = (room.width - CONFIG.DOOR_WIDTH) / 2;
  room.doors.push({
    x: doorX,
    y: 0,
    width: CONFIG.DOOR_WIDTH,
    height: w,
    active: false // S'active quand tous les zombies sont morts
  });

  // Obstacles aléatoires (piliers, caisses)
  const numObstacles = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < numObstacles; i++) {
    const obsWidth = 40 + Math.random() * 40;
    const obsHeight = 40 + Math.random() * 40;
    const obsX = 100 + Math.random() * (room.width - 200 - obsWidth);
    const obsY = 100 + Math.random() * (room.height - 200 - obsHeight);

    room.obstacles.push({
      x: obsX,
      y: obsY,
      width: obsWidth,
      height: obsHeight
    });
  }

  return room;
}

// Initialiser les salles
function initializeRooms() {
  gameState.rooms = [];
  gameState.walls = [];
  gameState.currentRoom = 0;

  for (let i = 0; i < CONFIG.ROOMS_PER_RUN; i++) {
    const room = generateRoom();
    gameState.rooms.push(room);
  }

  // Charger les murs de la première salle
  loadRoom(0);
}

// Charger une salle spécifique
function loadRoom(roomIndex) {
  gameState.currentRoom = roomIndex;
  gameState.walls = [];
  gameState.bossSpawned = false;
  gameState.zombiesKilledThisWave = 0;

  const room = gameState.rooms[roomIndex];

  // Charger tous les murs (extérieurs + obstacles)
  gameState.walls = [...room.walls, ...room.obstacles];

  // Nettoyer les zombies existants
  gameState.zombies = {};

  io.emit('roomChanged', {
    roomIndex: roomIndex,
    totalRooms: CONFIG.ROOMS_PER_RUN,
    walls: gameState.walls,
    doors: room.doors
  });
}

// Vérifier collision avec les murs
function checkWallCollision(x, y, size) {
  for (let wall of gameState.walls) {
    if (x + size > wall.x &&
        x - size < wall.x + wall.width &&
        y + size > wall.y &&
        y - size < wall.y + wall.height) {
      return true;
    }
  }
  return false;
}

// Calculer l'XP nécessaire pour le niveau suivant (Courbe améliorée plus progressive)
function getXPForLevel(level) {
  // Courbe plus douce : les premiers niveaux sont rapides, puis ralentit progressivement
  if (level <= 5) {
    return 50 + (level - 1) * 30; // Niveaux 1-5 : 50, 80, 110, 140, 170
  } else if (level <= 10) {
    return 200 + (level - 5) * 50; // Niveaux 6-10 : 200, 250, 300, 350, 400
  } else if (level <= 20) {
    return 400 + (level - 10) * 75; // Niveaux 11-20 : 475, 550, 625...
  } else {
    return Math.floor(1000 + (level - 20) * 100); // Niveaux 20+ : 1100, 1200, 1300...
  }
}

// Calculer le nombre de zombies à spawner par batch selon la vague
function getZombiesPerBatch() {
  if (gameState.wave <= 2) {
    return 2; // Vagues 1-2 : 2 zombies à la fois
  } else if (gameState.wave <= 5) {
    return 3; // Vagues 3-5 : 3 zombies à la fois
  } else if (gameState.wave <= 8) {
    return 5; // Vagues 6-8 : 5 zombies à la fois
  } else if (gameState.wave <= 12) {
    return 7; // Vagues 9-12 : 7 zombies à la fois
  } else {
    return 10; // Vagues 13+ : 10 zombies à la fois (CHAOS!)
  }
}

// Spawner un seul zombie (fonction utilitaire)
function spawnSingleZombie() {
  // Position aléatoire dans la salle (éviter les murs)
  let x, y;
  let attempts = 0;
  do {
    x = 100 + Math.random() * (CONFIG.ROOM_WIDTH - 200);
    y = 100 + Math.random() * (CONFIG.ROOM_HEIGHT - 200);
    attempts++;
  } while (checkWallCollision(x, y, CONFIG.ZOMBIE_SIZE) && attempts < 50);

  if (attempts >= 50) return false; // Pas de place disponible

  // Choisir un type de zombie avec pondération progressive selon la vague
  // Plus la vague est élevée, plus les zombies dangereux sont fréquents
  let types;
  if (gameState.wave <= 3) {
    // Vagues 1-3 : Principalement des zombies normaux
    types = ['normal', 'normal', 'normal', 'normal', 'fast', 'fast', 'tank'];
  } else if (gameState.wave <= 6) {
    // Vagues 4-6 : Mélange équilibré
    types = ['normal', 'normal', 'fast', 'fast', 'tank', 'tank', 'explosive', 'healer', 'slower'];
  } else if (gameState.wave <= 10) {
    // Vagues 7-10 : Plus de zombies spéciaux
    types = ['normal', 'fast', 'fast', 'tank', 'tank', 'explosive', 'explosive', 'healer', 'slower', 'slower'];
  } else {
    // Vague 11+ : Chaos total - Beaucoup de zombies dangereux
    types = ['fast', 'fast', 'tank', 'tank', 'tank', 'explosive', 'explosive', 'healer', 'healer', 'slower', 'slower'];
  }
  const typeKey = types[Math.floor(Math.random() * types.length)];
  const type = ZOMBIE_TYPES[typeKey];

  const zombieId = gameState.nextZombieId++;

  // Les zombies deviennent progressivement plus forts avec les vagues
  const waveMultiplier = 1 + (gameState.wave - 1) * 0.08; // +8% par vague
  const zombieHealth = Math.floor(type.health * waveMultiplier);
  const zombieDamage = Math.floor(type.damage * waveMultiplier);
  const zombieSpeed = Math.min(type.speed * (1 + (gameState.wave - 1) * 0.03), type.speed * 1.5); // +3% vitesse par vague, max +50%
  const zombieGold = Math.floor(type.goldDrop * waveMultiplier);
  const zombieXP = Math.floor(type.xpDrop * waveMultiplier);

  gameState.zombies[zombieId] = {
    id: zombieId,
    type: typeKey,
    x: x,
    y: y,
    health: zombieHealth,
    maxHealth: zombieHealth,
    speed: zombieSpeed,
    damage: zombieDamage,
    color: type.color,
    size: type.size,
    goldDrop: zombieGold,
    xpDrop: zombieXP,
    // Attributs spéciaux
    lastHeal: typeKey === 'healer' ? Date.now() : null
  };

  gameState.zombiesSpawnedThisWave++;
  return true;
}

// Spawn des zombies en groupes (MODE INFINI avec vagues)
function spawnZombie() {
  if (Object.keys(gameState.zombies).length >= CONFIG.MAX_ZOMBIES) {
    return;
  }

  // Limiter le spawn selon la vague actuelle - Progression agressive
  const zombiesForThisWave = CONFIG.ZOMBIES_PER_ROOM + (gameState.wave - 1) * 5; // +5 zombies par vague (difficulté croissante)

  if (gameState.zombiesSpawnedThisWave >= zombiesForThisWave) {
    // Spawner le boss si pas encore fait
    if (!gameState.bossSpawned && Object.keys(gameState.zombies).length === 0) {
      spawnBoss();
    }
    return;
  }

  // Spawner plusieurs zombies à la fois (batch spawning)
  const batchSize = getZombiesPerBatch();
  let spawned = 0;

  for (let i = 0; i < batchSize; i++) {
    // Vérifier si on a atteint les limites
    if (Object.keys(gameState.zombies).length >= CONFIG.MAX_ZOMBIES) break;
    if (gameState.zombiesSpawnedThisWave >= zombiesForThisWave) break;

    if (spawnSingleZombie()) {
      spawned++;
    }
  }
}

// Spawner un boss zombie (MODE INFINI - difficulté croissante)
function spawnBoss() {
  const type = ZOMBIE_TYPES.boss;

  // Le boss devient plus fort à chaque vague
  const waveMultiplier = 1 + (gameState.wave - 1) * 0.15; // +15% par vague
  const bossHealth = Math.floor(type.health * waveMultiplier);
  const bossDamage = Math.floor(type.damage * waveMultiplier);
  const bossGold = Math.floor(type.goldDrop * waveMultiplier);
  const bossXP = Math.floor(type.xpDrop * waveMultiplier);

  // Centre de la salle
  const x = CONFIG.ROOM_WIDTH / 2;
  const y = CONFIG.ROOM_HEIGHT / 2;

  const zombieId = gameState.nextZombieId++;

  gameState.zombies[zombieId] = {
    id: zombieId,
    type: 'boss',
    x: x,
    y: y,
    health: bossHealth,
    maxHealth: bossHealth,
    speed: type.speed,
    damage: bossDamage,
    color: type.color,
    size: type.size,
    goldDrop: bossGold,
    xpDrop: bossXP,
    isBoss: true
  };

  gameState.bossSpawned = true;

  io.emit('bossSpawned', {
    bossName: `${type.name} (Vague ${gameState.wave})`,
    bossHealth: bossHealth,
    wave: gameState.wave
  });
}

// Spawn des power-ups
function spawnPowerup() {
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];

  let x, y;
  let attempts = 0;
  do {
    x = 100 + Math.random() * (CONFIG.ROOM_WIDTH - 200);
    y = 100 + Math.random() * (CONFIG.ROOM_HEIGHT - 200);
    attempts++;
  } while (checkWallCollision(x, y, CONFIG.POWERUP_SIZE) && attempts < 50);

  if (attempts >= 50) return;

  const powerupId = gameState.nextPowerupId++;
  gameState.powerups[powerupId] = {
    id: powerupId,
    type: type,
    x: x,
    y: y,
    lifetime: Date.now() + 20000 // 20 secondes
  };
}

// Créer du loot (pièces d'or)
function createLoot(x, y, goldAmount, xpAmount) {
  const lootId = gameState.nextLootId++;
  gameState.loot[lootId] = {
    id: lootId,
    x: x,
    y: y,
    gold: goldAmount,
    xp: xpAmount,
    lifetime: Date.now() + 30000 // 30 secondes
  };
}

// Créer des particules
function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const particleId = gameState.nextParticleId++;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;

    gameState.particles[particleId] = {
      id: particleId,
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      lifetime: Date.now() + 500,
      size: Math.random() * 3 + 2
    };
  }
}

// Mise à jour de la logique du jeu
function gameLoop() {
  const now = Date.now();

  // Mise à jour des joueurs (power-ups temporaires)
  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];

    if (!player.alive) continue;

    // Vérifier l'expiration de la protection de spawn
    if (player.spawnProtection && now > player.spawnProtectionEndTime) {
      player.spawnProtection = false;
    }

    // Retour au pistolet si l'arme spéciale a expiré
    if (player.weaponTimer && now > player.weaponTimer) {
      player.weapon = 'pistol';
      player.weaponTimer = null;
    }

    // Retour à la vitesse normale si le boost a expiré
    if (player.speedBoost && now > player.speedBoost) {
      player.speedBoost = null;
    }

    // Régénération de vie
    if (player.regeneration > 0) {
      if (!player.lastRegenTick || now - player.lastRegenTick >= 1000) {
        player.health = Math.min(player.health + player.regeneration, player.maxHealth);
        player.lastRegenTick = now;
      }
    }

    // Tourelles automatiques
    if (player.autoTurrets > 0 && player.hasNickname && !player.spawnProtection) {
      // Cooldown : 600ms par tourelle (plus on a de tourelles, plus on tire vite)
      const autoFireCooldown = 600 / player.autoTurrets;

      if (now - player.lastAutoShot >= autoFireCooldown) {
        // Trouver le zombie le plus proche
        let closestZombie = null;
        let closestDistance = Infinity;
        const autoTurretRange = 500; // Portée de 500 pixels

        for (let zombieId in gameState.zombies) {
          const zombie = gameState.zombies[zombieId];
          const dist = distance(player.x, player.y, zombie.x, zombie.y);

          if (dist < closestDistance && dist <= autoTurretRange) {
            closestDistance = dist;
            closestZombie = zombie;
          }
        }

        // Tirer sur le zombie le plus proche
        if (closestZombie) {
          const angle = Math.atan2(closestZombie.y - player.y, closestZombie.x - player.x);
          const bulletId = gameState.nextBulletId++;

          // Les tourelles font 60% des dégâts normaux
          const baseDamage = CONFIG.BULLET_DAMAGE * 0.6;
          const damage = baseDamage * (player.damageMultiplier || 1);

          gameState.bullets[bulletId] = {
            id: bulletId,
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * CONFIG.BULLET_SPEED,
            vy: Math.sin(angle) * CONFIG.BULLET_SPEED,
            playerId: playerId,
            damage: damage,
            color: '#00ffaa', // Couleur spéciale pour les tourelles
            piercing: 0,
            piercedZombies: [],
            explosiveRounds: false,
            explosionRadius: 0,
            explosionDamagePercent: 0,
            isAutoTurret: true
          };

          player.lastAutoShot = now;

          // Créer des particules pour indiquer le tir
          createParticles(player.x, player.y, '#00ffaa', 3);
        }
      }
    }
  }

  // Mise à jour des zombies - ils chassent le joueur le plus proche
  for (let zombieId in gameState.zombies) {
    const zombie = gameState.zombies[zombieId];

    // Capacité spéciale : Zombie Soigneur
    if (zombie.type === 'healer') {
      const healerType = ZOMBIE_TYPES.healer;
      if (!zombie.lastHeal || now - zombie.lastHeal >= healerType.healCooldown) {
        zombie.lastHeal = now;

        // Soigner les zombies autour
        for (let otherId in gameState.zombies) {
          if (otherId !== zombieId) {
            const other = gameState.zombies[otherId];
            const dist = distance(zombie.x, zombie.y, other.x, other.y);
            if (dist < healerType.healRadius && other.health < other.maxHealth) {
              other.health = Math.min(other.health + healerType.healAmount, other.maxHealth);
              // Créer des particules de soin
              createParticles(other.x, other.y, '#00ffff', 5);
            }
          }
        }
      }
    }

    // Capacité spéciale : Zombie Ralentisseur
    if (zombie.type === 'slower') {
      const slowerType = ZOMBIE_TYPES.slower;

      // Ralentir les joueurs dans le rayon
      for (let playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (player.alive) {
          const dist = distance(zombie.x, zombie.y, player.x, player.y);
          if (dist < slowerType.slowRadius) {
            // Appliquer l'effet de ralentissement
            player.slowedUntil = now + slowerType.slowDuration;
            player.slowAmount = slowerType.slowAmount;
          }
        }
      }
    }

    // Trouver le joueur le plus proche
    // IMPORTANT: Les zombies ignorent les joueurs sans pseudo ou avec protection de spawn
    let closestPlayer = null;
    let closestDistance = Infinity;

    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];

      // Ignorer les joueurs morts, sans pseudo, ou avec protection de spawn
      if (!player.alive || !player.hasNickname || player.spawnProtection) {
        continue;
      }

      const dist = distance(zombie.x, zombie.y, player.x, player.y);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestPlayer = player;
      }
    }

    // Déplacer le zombie vers le joueur
    if (closestPlayer) {
      const angle = Math.atan2(closestPlayer.y - zombie.y, closestPlayer.x - zombie.x);
      const newX = zombie.x + Math.cos(angle) * zombie.speed;
      const newY = zombie.y + Math.sin(angle) * zombie.speed;

      // Vérifier collision avec les murs - avec système de glissement
      let finalX = zombie.x;
      let finalY = zombie.y;

      // Essayer de se déplacer dans les deux directions
      if (!checkWallCollision(newX, newY, zombie.size)) {
        // Pas de collision, mouvement libre
        finalX = newX;
        finalY = newY;
      } else {
        // Collision détectée, essayer de glisser le long des murs
        // Essayer uniquement l'axe X
        if (!checkWallCollision(newX, zombie.y, zombie.size)) {
          finalX = newX;
        }
        // Essayer uniquement l'axe Y
        if (!checkWallCollision(zombie.x, newY, zombie.size)) {
          finalY = newY;
        }
      }

      // Appliquer la nouvelle position
      zombie.x = finalX;
      zombie.y = finalY;

      // Vérifier collision avec joueurs
      for (let playerId in gameState.players) {
        const player = gameState.players[playerId];

        // Ignorer les joueurs morts, sans pseudo, ou avec protection de spawn
        if (!player.alive || !player.hasNickname || player.spawnProtection) {
          continue;
        }

        if (distance(zombie.x, zombie.y, player.x, player.y) < zombie.size) {
          // Esquive
          if (Math.random() < (player.dodgeChance || 0)) {
            continue; // Esquive réussie
          }

          const damageDealt = zombie.damage * 0.016; // Dégâts par frame
          player.health -= damageDealt;

          // Épines (renvoyer des dégâts)
          if (player.thorns > 0) {
            const thornsDamage = damageDealt * player.thorns;
            zombie.health -= thornsDamage;
          }

          if (player.health <= 0) {
            player.health = 0;
            player.alive = false;
          }
        }
      }
    }
  }

  // Mise à jour des balles
  for (let bulletId in gameState.bullets) {
    const bullet = gameState.bullets[bulletId];

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    // Retirer les balles hors de la salle ou qui touchent un mur
    if (bullet.x < 0 || bullet.x > CONFIG.ROOM_WIDTH ||
        bullet.y < 0 || bullet.y > CONFIG.ROOM_HEIGHT ||
        checkWallCollision(bullet.x, bullet.y, CONFIG.BULLET_SIZE)) {
      delete gameState.bullets[bulletId];
      continue;
    }

    // Vérifier collision avec zombies
    for (let zombieId in gameState.zombies) {
      const zombie = gameState.zombies[zombieId];
      if (distance(bullet.x, bullet.y, zombie.x, zombie.y) < zombie.size) {

        // Vérifier si ce zombie a déjà été percé par cette balle
        if (bullet.piercedZombies && bullet.piercedZombies.includes(zombieId)) {
          continue;
        }

        zombie.health -= bullet.damage;

        // Vol de vie pour le joueur
        if (bullet.playerId) {
          const shooter = gameState.players[bullet.playerId];
          if (shooter && shooter.lifeSteal > 0) {
            const lifeStolen = bullet.damage * shooter.lifeSteal;
            shooter.health = Math.min(shooter.health + lifeStolen, shooter.maxHealth);
          }
        }

        // Balles perforantes
        if (bullet.piercing > 0 && bullet.piercedZombies) {
          bullet.piercedZombies.push(zombieId);
          if (bullet.piercedZombies.length > bullet.piercing) {
            delete gameState.bullets[bulletId];
          }
        } else {
          delete gameState.bullets[bulletId];
        }

        // Balles explosives
        if (bullet.explosiveRounds && bullet.explosionRadius > 0) {
          // Créer explosion
          createParticles(zombie.x, zombie.y, '#ff8800', 20);

          // Infliger dégâts dans le rayon
          for (let otherId in gameState.zombies) {
            if (otherId !== zombieId) {
              const other = gameState.zombies[otherId];
              const dist = distance(zombie.x, zombie.y, other.x, other.y);
              if (dist < bullet.explosionRadius) {
                other.health -= bullet.damage * bullet.explosionDamagePercent;
              }
            }
          }
        }

        // Créer des particules de sang
        createParticles(zombie.x, zombie.y, zombie.color, 5);

        if (zombie.health <= 0) {
          // Créer plus de particules pour la mort
          createParticles(zombie.x, zombie.y, zombie.color, 15);

          // Effet spécial : Zombie Explosif
          if (zombie.type === 'explosive') {
            const explosionType = ZOMBIE_TYPES.explosive;
            // Créer une énorme explosion de particules
            createParticles(zombie.x, zombie.y, '#ff00ff', 30);

            // Infliger des dégâts à tous les joueurs dans le rayon
            for (let playerId in gameState.players) {
              const player = gameState.players[playerId];
              // Ignorer les joueurs morts, sans pseudo, ou avec protection de spawn
              if (player.alive && player.hasNickname && !player.spawnProtection) {
                const dist = distance(zombie.x, zombie.y, player.x, player.y);
                if (dist < explosionType.explosionRadius) {
                  player.health -= explosionType.explosionDamage;
                  if (player.health <= 0) {
                    player.health = 0;
                    player.alive = false;
                  }
                }
              }
            }
          }

          // Créer du loot
          createLoot(zombie.x, zombie.y, zombie.goldDrop, zombie.xpDrop);

          // Supprimer le zombie
          delete gameState.zombies[zombieId];

          gameState.zombiesKilledThisWave++;

          // Si c'était le boss, lancer une nouvelle vague (MODE INFINI)
          if (zombie.isBoss) {
            // Nouvelle vague !
            gameState.wave++;
            gameState.bossSpawned = false;
            gameState.zombiesKilledThisWave = 0;
            gameState.zombiesSpawnedThisWave = 0;

            // Accélérer le spawn pour la nouvelle vague
            restartZombieSpawner();

            // Notifier tous les joueurs de la nouvelle vague
            io.emit('newWave', {
              wave: gameState.wave,
              zombiesCount: CONFIG.ZOMBIES_PER_ROOM + (gameState.wave - 1) * 5 // Mis à jour pour correspondre à la nouvelle progression
            });

            // Bonus de santé pour les joueurs survivants
            for (let playerId in gameState.players) {
              const player = gameState.players[playerId];
              if (player.alive) {
                player.health = Math.min(player.health + 50, player.maxHealth);
                player.gold += 50; // Bonus d'or pour avoir survécu à la vague
              }
            }
          }
        }
        break;
      }
    }
  }

  // Mise à jour des particules
  for (let particleId in gameState.particles) {
    const particle = gameState.particles[particleId];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1; // Gravité

    if (now > particle.lifetime) {
      delete gameState.particles[particleId];
    }
  }

  // Mise à jour des power-ups
  for (let powerupId in gameState.powerups) {
    const powerup = gameState.powerups[powerupId];

    // Retirer les power-ups expirés
    if (now > powerup.lifetime) {
      delete gameState.powerups[powerupId];
      continue;
    }

    // Vérifier collision avec joueurs
    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];
      // Seuls les joueurs avec pseudo peuvent collecter des power-ups
      if (player.alive && player.hasNickname && distance(powerup.x, powerup.y, player.x, player.y) < CONFIG.PLAYER_SIZE + CONFIG.POWERUP_SIZE) {
        // Appliquer l'effet du power-up
        POWERUP_TYPES[powerup.type].effect(player);
        delete gameState.powerups[powerupId];

        // Créer des particules
        createParticles(powerup.x, powerup.y, POWERUP_TYPES[powerup.type].color, 12);
        break;
      }
    }
  }

  // Mise à jour du loot (Rogue-like)
  for (let lootId in gameState.loot) {
    const loot = gameState.loot[lootId];

    // Retirer le loot expiré
    if (now > loot.lifetime) {
      delete gameState.loot[lootId];
      continue;
    }

    // Vérifier collision avec joueurs
    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];
      const collectRadius = CONFIG.PLAYER_SIZE + CONFIG.LOOT_SIZE + (player.goldMagnetRadius || 0);
      // Seuls les joueurs avec pseudo peuvent collecter du loot
      if (player.alive && player.hasNickname && distance(loot.x, loot.y, player.x, player.y) < collectRadius) {
        // Donner l'or et l'XP
        player.gold += loot.gold;
        player.xp += loot.xp;

        // Créer des particules dorées
        createParticles(loot.x, loot.y, '#ffff00', 10);

        delete gameState.loot[lootId];

        // Level up si assez d'XP
        while (player.xp >= getXPForLevel(player.level)) {
          player.xp -= getXPForLevel(player.level);
          player.level++;

          // PALIERS DE NIVEAU - Bonus automatiques tous les 5 niveaux
          let milestoneBonus = null;
          if (player.level % 5 === 0) {
            // Bonus spéciaux par palier
            if (player.level === 5) {
              player.maxHealth += 50;
              player.health = Math.min(player.health + 50, player.maxHealth);
              milestoneBonus = {
                title: '🎖️ PALIER 5 !',
                description: '+50 PV max et régénération complète',
                icon: '❤️'
              };
            } else if (player.level === 10) {
              player.damageMultiplier = (player.damageMultiplier || 1) * 1.25;
              player.speedMultiplier = (player.speedMultiplier || 1) * 1.20;
              milestoneBonus = {
                title: '🎖️ PALIER 10 !',
                description: '+25% dégâts et +20% vitesse permanents',
                icon: '⚔️'
              };
            } else if (player.level === 15) {
              player.fireRateMultiplier = (player.fireRateMultiplier || 1) * 0.75;
              player.criticalChance = (player.criticalChance || 0) + 0.15;
              milestoneBonus = {
                title: '🎖️ PALIER 15 !',
                description: '-25% cooldown et +15% coup critique',
                icon: '🔫'
              };
            } else if (player.level === 20) {
              player.maxHealth += 100;
              player.health = player.maxHealth; // Heal complet
              player.lifeSteal = (player.lifeSteal || 0) + 0.10;
              milestoneBonus = {
                title: '🎖️ PALIER 20 !',
                description: '+100 PV max, heal complet et +10% vol de vie',
                icon: '💪'
              };
            } else {
              // Paliers 25, 30, 35, etc. - Bonus génériques
              const tier = Math.floor(player.level / 5);
              player.maxHealth += 30;
              player.health = Math.min(player.health + 30, player.maxHealth);
              player.damageMultiplier = (player.damageMultiplier || 1) * 1.10;
              milestoneBonus = {
                title: `🎖️ PALIER ${player.level} !`,
                description: '+30 PV max et +10% dégâts',
                icon: '🌟'
              };
            }
          }

          // Générer 3 choix d'upgrades
          const upgradeChoices = generateUpgradeChoices();

          io.to(playerId).emit('levelUp', {
            newLevel: player.level,
            upgradeChoices: upgradeChoices,
            milestoneBonus: milestoneBonus // Envoyer le bonus de palier s'il existe
          });
        }

        break;
      }
    }
  }
}

// Spawn automatique des zombies avec accélération progressive
// L'intervalle de spawn diminue avec les vagues pour augmenter la difficulté
function getSpawnInterval() {
  // Commence à 1000ms, diminue de 50ms par vague jusqu'à un minimum de 400ms
  const baseInterval = CONFIG.ZOMBIE_SPAWN_INTERVAL;
  const reduction = Math.min((gameState.wave - 1) * 50, 600); // Max 600ms de réduction
  return Math.max(baseInterval - reduction, 400); // Minimum 400ms entre les spawns
}

let zombieSpawnTimer;
function startZombieSpawner() {
  if (zombieSpawnTimer) {
    clearInterval(zombieSpawnTimer);
  }
  zombieSpawnTimer = setInterval(spawnZombie, getSpawnInterval());
}

// Relancer le timer quand une nouvelle vague commence pour ajuster la vitesse
function restartZombieSpawner() {
  startZombieSpawner();
}

startZombieSpawner();

// Spawn automatique des power-ups
setInterval(spawnPowerup, CONFIG.POWERUP_SPAWN_INTERVAL);

// Initialiser le jeu au démarrage
initializeRooms();

// Game loop à 60 FPS
setInterval(() => {
  gameLoop();
  io.emit('gameState', {
    players: gameState.players,
    zombies: gameState.zombies,
    bullets: gameState.bullets,
    powerups: gameState.powerups,
    particles: gameState.particles,
    loot: gameState.loot,
    walls: gameState.walls,
    wave: gameState.wave, // MODE INFINI - afficher la vague actuelle
    zombiesRemaining: Object.keys(gameState.zombies).length
  });
}, 1000 / 60);

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un joueur s\'est connecté:', socket.id);

  // Créer un nouveau joueur (Rogue-like)
  gameState.players[socket.id] = {
    id: socket.id,
    nickname: null, // Pseudo non défini au départ
    hasNickname: false, // Le joueur n'a pas encore choisi de pseudo
    spawnProtection: false, // Protection de spawn inactive
    spawnProtectionEndTime: 0, // Fin de la protection
    x: CONFIG.ROOM_WIDTH / 2,
    y: CONFIG.ROOM_HEIGHT - 100,
    health: CONFIG.PLAYER_MAX_HEALTH,
    maxHealth: CONFIG.PLAYER_MAX_HEALTH,
    level: 1,
    xp: 0,
    gold: 0,
    score: 0,
    alive: true,
    angle: 0,
    weapon: 'pistol',
    lastShot: 0,
    speedBoost: null,
    weaponTimer: null,
    // Upgrades permanents (shop)
    upgrades: {
      maxHealth: 0,
      damage: 0,
      speed: 0,
      fireRate: 0
    },
    damageMultiplier: 1,
    speedMultiplier: 1,
    fireRateMultiplier: 1,
    // Stats des upgrades de level-up
    regeneration: 0,
    bulletPiercing: 0,
    lifeSteal: 0,
    criticalChance: 0,
    goldMagnetRadius: 0,
    dodgeChance: 0,
    explosiveRounds: false,
    explosionRadius: 0,
    explosionDamagePercent: 0,
    extraBullets: 0,
    thorns: 0,
    lastRegenTick: Date.now(),
    autoTurrets: 0,
    lastAutoShot: Date.now()
  };

  // Envoyer la configuration au client
  socket.emit('init', {
    playerId: socket.id,
    config: CONFIG,
    weapons: WEAPONS,
    powerupTypes: POWERUP_TYPES,
    zombieTypes: ZOMBIE_TYPES,
    shopItems: SHOP_ITEMS,
    walls: gameState.walls,
    rooms: gameState.rooms.length,
    currentRoom: gameState.currentRoom
  });

  // Mouvement du joueur (Rogue-like avec collision)
  socket.on('playerMove', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.alive || !player.hasNickname) return; // Pas de mouvement sans pseudo

    const newX = Math.max(0, Math.min(CONFIG.ROOM_WIDTH, data.x));
    const newY = Math.max(0, Math.min(CONFIG.ROOM_HEIGHT, data.y));

    // Vérifier collision avec les murs
    if (!checkWallCollision(newX, newY, CONFIG.PLAYER_SIZE)) {
      player.x = newX;
      player.y = newY;
    }

    player.angle = data.angle;

    // MODE INFINI - Pas de portes ni de changements de salle
  });

  // Tir du joueur
  socket.on('shoot', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.alive || !player.hasNickname) return; // Pas de tir sans pseudo

    const now = Date.now();
    const weapon = WEAPONS[player.weapon] || WEAPONS.pistol;

    // Appliquer le multiplicateur de cadence de tir
    const fireRate = weapon.fireRate * (player.fireRateMultiplier || 1);

    // Vérifier le cooldown de l'arme
    if (now - player.lastShot < fireRate) return;

    player.lastShot = now;

    // Nombre total de balles (arme + extra bullets)
    const totalBullets = weapon.bulletCount + (player.extraBullets || 0);

    // Créer les balles selon l'arme
    for (let i = 0; i < totalBullets; i++) {
      const bulletId = gameState.nextBulletId++;
      const spreadAngle = data.angle + (Math.random() - 0.5) * weapon.spread;

      // Appliquer le multiplicateur de dégâts
      let damage = weapon.damage * (player.damageMultiplier || 1);

      // Critique
      const isCritical = Math.random() < (player.criticalChance || 0);
      if (isCritical) {
        damage *= 2;
      }

      gameState.bullets[bulletId] = {
        id: bulletId,
        x: player.x,
        y: player.y,
        vx: Math.cos(spreadAngle) * weapon.bulletSpeed,
        vy: Math.sin(spreadAngle) * weapon.bulletSpeed,
        playerId: socket.id,
        damage: damage,
        color: isCritical ? '#ff0000' : weapon.color,
        piercing: player.bulletPiercing || 0,
        piercedZombies: [],
        explosiveRounds: player.explosiveRounds || false,
        explosionRadius: player.explosionRadius || 0,
        explosionDamagePercent: player.explosionDamagePercent || 0
      };
    }
  });

  // Respawn du joueur (Rogue-like - nouveau run)
  socket.on('respawn', () => {
    const player = gameState.players[socket.id];
    if (player) {
      // Sauvegarder les upgrades permanents
      const savedUpgrades = { ...player.upgrades };
      const savedMultipliers = {
        damage: player.damageMultiplier,
        speed: player.speedMultiplier,
        fireRate: player.fireRateMultiplier
      };

      // Calculer la vie maximale avec les upgrades
      const baseMaxHealth = CONFIG.PLAYER_MAX_HEALTH;
      const upgradeHealth = (savedUpgrades.maxHealth || 0) * 20;
      const totalMaxHealth = baseMaxHealth + upgradeHealth;

      // Réinitialiser le run (Permadeath mais garde les upgrades permanents)
      player.nickname = null; // Réinitialiser le pseudo
      player.hasNickname = false;
      player.spawnProtection = false;
      player.spawnProtectionEndTime = 0;
      player.x = CONFIG.ROOM_WIDTH / 2;
      player.y = CONFIG.ROOM_HEIGHT - 100;
      player.health = totalMaxHealth;
      player.maxHealth = totalMaxHealth;
      player.alive = true;
      player.level = 1;
      player.xp = 0;
      player.gold = 0; // L'or est perdu au respawn
      player.score = 0;
      player.weapon = 'pistol';
      player.speedBoost = null;
      player.weaponTimer = null;
      player.lastShot = 0;

      // Restaurer les upgrades permanents
      player.upgrades = savedUpgrades;
      player.damageMultiplier = savedMultipliers.damage;
      player.speedMultiplier = savedMultipliers.speed;
      player.fireRateMultiplier = savedMultipliers.fireRate;

      // Recharger depuis la première salle
      loadRoom(0);
    }
  });

  // Sélectionner un upgrade au level up
  socket.on('selectUpgrade', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.alive) return;

    const { upgradeId } = data;
    const upgrade = LEVEL_UP_UPGRADES[upgradeId];

    if (!upgrade) return;

    // Appliquer l'effet de l'upgrade
    upgrade.effect(player);

    socket.emit('upgradeSelected', { success: true, upgradeId });
  });

  // Acheter un item dans le shop
  socket.on('buyItem', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.alive) return;

    const { itemId, category } = data;

    if (category === 'permanent') {
      const item = SHOP_ITEMS.permanent[itemId];
      if (!item) return;

      const currentLevel = player.upgrades[itemId] || 0;

      // Vérifier si déjà au max
      if (currentLevel >= item.maxLevel) {
        socket.emit('shopUpdate', { success: false, message: 'Niveau maximum atteint' });
        return;
      }

      // Calculer le coût
      const cost = item.baseCost + (currentLevel * item.costIncrease);

      // Vérifier si le joueur a assez d'or
      if (player.gold < cost) {
        socket.emit('shopUpdate', { success: false, message: 'Or insuffisant' });
        return;
      }

      // Déduire l'or
      player.gold -= cost;

      // Augmenter le niveau de l'upgrade
      player.upgrades[itemId] = currentLevel + 1;

      // Appliquer l'effet
      item.effect(player);

      socket.emit('shopUpdate', { success: true, itemId, category });

    } else if (category === 'temporary') {
      const item = SHOP_ITEMS.temporary[itemId];
      if (!item) return;

      // Vérifier si le joueur a assez d'or
      if (player.gold < item.cost) {
        socket.emit('shopUpdate', { success: false, message: 'Or insuffisant' });
        return;
      }

      // Déduire l'or
      player.gold -= item.cost;

      // Appliquer l'effet
      item.effect(player);

      socket.emit('shopUpdate', { success: true, itemId, category });
    }
  });

  // Définir le pseudo du joueur
  socket.on('setNickname', (data) => {
    const player = gameState.players[socket.id];
    if (!player) return;

    const nickname = data.nickname.trim().substring(0, 15); // Max 15 caractères

    if (nickname.length >= 2) {
      player.nickname = nickname;
      player.hasNickname = true;
      player.spawnProtection = true;
      player.spawnProtectionEndTime = Date.now() + 3000; // 3 secondes de protection

      console.log(`${socket.id} a choisi le pseudo: ${nickname}`);

      // Notifier tous les joueurs
      io.emit('playerNicknameSet', {
        playerId: socket.id,
        nickname: nickname
      });
    }
  });

  // Fin de la protection de spawn
  socket.on('endSpawnProtection', () => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.spawnProtection = false;
    console.log(`${player.nickname || socket.id} n'a plus de protection de spawn`);
  });

  // Déconnexion du joueur
  socket.on('disconnect', () => {
    console.log('Un joueur s\'est déconnecté:', socket.id);
    delete gameState.players[socket.id];
  });
});

http.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Ouvrez http://localhost:${PORT} dans votre navigateur`);
});
