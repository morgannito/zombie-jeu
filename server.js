const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  // Activer la compression des paquets Socket.IO
  perMessageDeflate: {
    threshold: 1024  // Compresser si > 1KB (réduction 30-40%)
  },
  // Permettre polling comme fallback pour éviter les erreurs 400
  // Le client upgradера automatiquement vers websocket quand disponible
  pingTimeout: 60000,
  pingInterval: 25000
});
const path = require('path');

// Import des modules d'optimisation
const EntityManager = require('./lib/server/EntityManager');
const CollisionManager = require('./lib/server/CollisionManager');
const NetworkManager = require('./lib/server/NetworkManager');
const MathUtils = require('./lib/MathUtils');

// Import des modules de game logic
const ConfigManager = require('./lib/server/ConfigManager');
const ZombieManager = require('./lib/server/ZombieManager');
const RoomManager = require('./lib/server/RoomManager');
const PlayerManager = require('./lib/server/PlayerManager');

const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques
app.use(express.static('public'));

// Importer la configuration
const {
  CONFIG,
  WEAPONS,
  POWERUP_TYPES,
  ZOMBIE_TYPES,
  LEVEL_UP_UPGRADES,
  SHOP_ITEMS,
  INACTIVITY_TIMEOUT,
  HEARTBEAT_CHECK_INTERVAL
} = ConfigManager;

// État du jeu
const gameState = {
  players: {},
  zombies: {},
  bullets: {},
  powerups: {},
  particles: {},
  poisonTrails: {},
  loot: {},
  explosions: {},
  walls: [],
  rooms: [],
  currentRoom: 0,
  bossSpawned: false,
  nextZombieId: 0,
  nextBulletId: 0,
  nextPowerupId: 0,
  nextParticleId: 0,
  nextPoisonTrailId: 0,
  nextLootId: 0,
  nextExplosionId: 0,
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

// ===============================================
// MANAGERS D'OPTIMISATION & GAME LOGIC
// ===============================================

// Managers d'optimisation
const entityManager = new EntityManager(gameState, CONFIG);
const collisionManager = new CollisionManager(gameState, CONFIG);
const networkManager = new NetworkManager(io, gameState);

// Managers de game logic
const roomManager = new RoomManager(gameState, CONFIG, io);
const playerManager = new PlayerManager(gameState, CONFIG, LEVEL_UP_UPGRADES);
const zombieManager = new ZombieManager(
  gameState,
  CONFIG,
  ZOMBIE_TYPES,
  (x, y, size) => roomManager.checkWallCollision(x, y, size)
);

// ===============================================
// RATE LIMITING SYSTEM
// ===============================================
const rateLimits = new Map();

const RATE_LIMIT_CONFIG = {
  'shoot': { maxRequests: 50, windowMs: 1000 },
  'playerMove': { maxRequests: 60, windowMs: 1000 },
  'setNickname': { maxRequests: 3, windowMs: 10000 },
  'selectUpgrade': { maxRequests: 10, windowMs: 5000 },
  'buyItem': { maxRequests: 20, windowMs: 5000 },
};

function checkRateLimit(socketId, eventName) {
  const config = RATE_LIMIT_CONFIG[eventName];
  if (!config) return true;

  const now = Date.now();

  if (!rateLimits.has(socketId)) {
    rateLimits.set(socketId, {});
  }

  const socketLimits = rateLimits.get(socketId);

  if (!socketLimits[eventName] || now > socketLimits[eventName].resetTime) {
    socketLimits[eventName] = {
      count: 1,
      resetTime: now + config.windowMs
    };
    return true;
  }

  socketLimits[eventName].count++;

  if (socketLimits[eventName].count > config.maxRequests) {
    console.warn(`[RATE LIMIT] Player ${socketId} exceeded rate limit for ${eventName}`);
    return false;
  }

  return true;
}

function cleanupRateLimits(socketId) {
  rateLimits.delete(socketId);
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

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
    // Vagues 4-6 : Mélange équilibré avec apparition des tireurs et zombies poison
    types = ['normal', 'normal', 'fast', 'fast', 'tank', 'tank', 'explosive', 'healer', 'slower', 'poison', 'shooter'];
  } else if (gameState.wave <= 10) {
    // Vagues 7-10 : Plus de zombies spéciaux, tireurs et poison
    types = ['normal', 'fast', 'fast', 'tank', 'tank', 'explosive', 'explosive', 'healer', 'slower', 'slower', 'poison', 'poison', 'shooter', 'shooter'];
  } else {
    // Vague 11+ : Chaos total - Beaucoup de zombies dangereux, tireurs et poison
    types = ['fast', 'fast', 'tank', 'tank', 'tank', 'explosive', 'explosive', 'healer', 'healer', 'slower', 'slower', 'poison', 'poison', 'shooter', 'shooter', 'shooter'];
  }
  const typeKey = types[Math.floor(Math.random() * types.length)];
  const type = ZOMBIE_TYPES[typeKey];

  const zombieId = gameState.nextZombieId++;

  // Les zombies deviennent progressivement plus forts avec les vagues (difficulté progressive améliorée)
  // CORRECTION: Harmonisé avec ZombieManager.js (0.15 au lieu de 0.10)
  const waveMultiplier = 1 + (gameState.wave - 1) * 0.15; // +15% par vague
  const zombieHealth = Math.floor(type.health * waveMultiplier);
  const zombieDamage = Math.floor(type.damage * waveMultiplier);
  const zombieSpeed = Math.min(type.speed * (1 + (gameState.wave - 1) * 0.04), type.speed * 1.8); // +4% vitesse par vague, max +80% (augmenté)
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
    lastHeal: typeKey === 'healer' ? Date.now() : null,
    lastShot: typeKey === 'shooter' ? Date.now() : null,
    lastPoisonTrail: typeKey === 'poison' ? Date.now() : null
  };

  gameState.zombiesSpawnedThisWave++;
  return true;
}

// Spawn des zombies en groupes (MODE INFINI avec vagues)
function spawnZombie() {
  if (Object.keys(gameState.zombies).length >= CONFIG.MAX_ZOMBIES) {
    return;
  }

  // Limiter le spawn selon la vague actuelle - Progression agressive améliorée
  const zombiesForThisWave = CONFIG.ZOMBIES_PER_ROOM + (gameState.wave - 1) * 7; // +7 zombies par vague (augmenté de 5 à 7)

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

  // Le boss devient plus fort à chaque vague (difficulté progressive améliorée)
  const waveMultiplier = 1 + (gameState.wave - 1) * 0.20; // +20% par vague (augmenté de 15% à 20%)
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
  // Utiliser EntityManager avec Object Pool
  entityManager.createParticles(x, y, color, count);
}

// Créer une explosion visuelle
function createExplosion(x, y, radius, isRocket = false) {
  // Utiliser EntityManager avec Object Pool
  entityManager.createExplosion({
    x, y, radius, isRocket,
    createdAt: Date.now(),
    duration: 400
  });
}

// Mise à jour de la logique du jeu
function gameLoop() {
  const now = Date.now();

  // Reconstruire le Quadtree pour les collisions optimisées
  collisionManager.rebuildQuadtree();

  // Mise à jour des joueurs (power-ups temporaires)
  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];

    if (!player.alive) continue;

    // Vérifier l'expiration de la protection de spawn
    if (player.spawnProtection && now > player.spawnProtectionEndTime) {
      player.spawnProtection = false;
    }

    // Vérifier l'expiration de l'invisibilité après upgrade
    if (player.invisible && now > player.invisibleEndTime) {
      player.invisible = false;
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

    // Réinitialiser le combo si le timeout est dépassé
    const COMBO_TIMEOUT = 5000; // 5 secondes
    if (player.combo > 0 && player.comboTimer > 0 && now - player.comboTimer > COMBO_TIMEOUT) {
      player.combo = 0;
      player.comboTimer = 0;
      // Notifier le client que le combo est terminé
      io.to(playerId).emit('comboReset');
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
        // Trouver le zombie le plus proche (OPTIMISÉ avec Quadtree)
        const autoTurretRange = 500;
        const closestZombie = collisionManager.findClosestZombie(player.x, player.y, autoTurretRange);

        // Tirer sur le zombie le plus proche
        if (closestZombie) {
          const angle = Math.atan2(closestZombie.y - player.y, closestZombie.x - player.x);

          // Les tourelles font 60% des dégâts normaux
          const baseDamage = CONFIG.BULLET_DAMAGE * 0.6;
          const damage = baseDamage * (player.damageMultiplier || 1);

          // Créer la balle (OPTIMISÉ avec Object Pool)
          entityManager.createBullet({
            x: player.x,
            y: player.y,
            vx: MathUtils.fastCos(angle) * CONFIG.BULLET_SPEED,
            vy: MathUtils.fastSin(angle) * CONFIG.BULLET_SPEED,
            playerId: playerId,
            damage: damage,
            color: '#00ffaa',
            piercing: 0,
            explosiveRounds: false,
            explosionRadius: 0,
            explosionDamagePercent: 0,
            isAutoTurret: true
          });

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

    // Capacité spéciale : Zombie Soigneur (OPTIMISÉ avec Quadtree)
    if (zombie.type === 'healer') {
      const healerType = ZOMBIE_TYPES.healer;
      if (!zombie.lastHeal || now - zombie.lastHeal >= healerType.healCooldown) {
        zombie.lastHeal = now;

        // Soigner les zombies autour (OPTIMISÉ)
        const nearbyZombies = collisionManager.findZombiesInRadius(
          zombie.x, zombie.y, healerType.healRadius, zombieId
        );

        for (let other of nearbyZombies) {
          if (other.health < other.maxHealth) {
            other.health = Math.min(other.health + healerType.healAmount, other.maxHealth);
            // Créer des particules de soin
            createParticles(other.x, other.y, '#00ffff', 5);
          }
        }
      }
    }

    // Capacité spéciale : Zombie Ralentisseur (OPTIMISÉ avec Quadtree)
    if (zombie.type === 'slower') {
      const slowerType = ZOMBIE_TYPES.slower;

      // Ralentir les joueurs dans le rayon (OPTIMISÉ)
      const nearbyPlayers = collisionManager.findPlayersInRadius(
        zombie.x, zombie.y, slowerType.slowRadius
      );

      for (let player of nearbyPlayers) {
        // Appliquer l'effet de ralentissement
        player.slowedUntil = now + slowerType.slowDuration;
        player.slowAmount = slowerType.slowAmount;
      }
    }

    // Capacité spéciale : Zombie Tireur (OPTIMISÉ avec Quadtree)
    if (zombie.type === 'shooter') {
      const shooterType = ZOMBIE_TYPES.shooter;

      // Vérifier le cooldown de tir
      if (!zombie.lastShot || now - zombie.lastShot >= shooterType.shootCooldown) {
        // Trouver le joueur le plus proche dans la portée (OPTIMISÉ)
        const targetPlayer = collisionManager.findClosestPlayer(
          zombie.x, zombie.y, shooterType.shootRange,
          { ignoreSpawnProtection: true, ignoreInvisible: true }
        );

        // Tirer sur le joueur cible
        if (targetPlayer) {
          zombie.lastShot = now;
          const angle = Math.atan2(targetPlayer.y - zombie.y, targetPlayer.x - zombie.x);

          // Créer une balle de zombie (OPTIMISÉ avec Object Pool)
          entityManager.createBullet({
            x: zombie.x,
            y: zombie.y,
            vx: MathUtils.fastCos(angle) * shooterType.bulletSpeed,
            vy: MathUtils.fastSin(angle) * shooterType.bulletSpeed,
            zombieId: zombieId,
            damage: zombie.damage,
            color: shooterType.bulletColor,
            isZombieBullet: true, // Marquer comme balle de zombie
            piercing: 0,
            piercedZombies: [],
            explosiveRounds: false,
            explosionRadius: 0,
            explosionDamagePercent: 0
          });

          // Créer des particules de tir
          createParticles(zombie.x, zombie.y, shooterType.bulletColor, 5);
        }
      }
    }

    // Capacité spéciale : Zombie Poison - laisse une traînée de poison
    if (zombie.type === 'poison') {
      const poisonType = ZOMBIE_TYPES.poison;

      // Vérifier le cooldown pour laisser une traînée
      if (!zombie.lastPoisonTrail || now - zombie.lastPoisonTrail >= poisonType.poisonTrailInterval) {
        zombie.lastPoisonTrail = now;

        // Créer une nouvelle traînée de poison
        const trailId = gameState.nextPoisonTrailId++;
        gameState.poisonTrails[trailId] = {
          id: trailId,
          x: zombie.x,
          y: zombie.y,
          radius: poisonType.poisonRadius,
          damage: poisonType.poisonDamage,
          createdAt: now,
          duration: poisonType.poisonDuration
        };

        // Créer des particules vertes pour l'effet visuel
        createParticles(zombie.x, zombie.y, poisonType.color, 3);
      }
    }

    // Trouver le joueur le plus proche (OPTIMISÉ avec Quadtree)
    const closestPlayer = collisionManager.findClosestPlayer(
      zombie.x, zombie.y, Infinity,
      { ignoreSpawnProtection: true, ignoreInvisible: true }
    );

    // Déplacer le zombie vers le joueur ou de manière aléatoire
    if (closestPlayer) {
      const angle = Math.atan2(closestPlayer.y - zombie.y, closestPlayer.x - zombie.x);
      const newX = zombie.x + MathUtils.fastCos(angle) * zombie.speed;
      const newY = zombie.y + MathUtils.fastSin(angle) * zombie.speed;

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

      // OPTIMISATION: Utilisation du Quadtree pour trouver les joueurs proches
      const nearbyPlayers = collisionManager.findPlayersInRadius(
        zombie.x,
        zombie.y,
        zombie.size + CONFIG.PLAYER_SIZE
      );

      // Vérifier collision avec les joueurs proches uniquement
      for (let player of nearbyPlayers) {
        // Ignorer les joueurs avec protection de spawn ou invisibles
        if (player.spawnProtection || player.invisible) {
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
    } else {
      // Aucun joueur visible - mouvement aléatoire
      // Changer de direction aléatoire toutes les 2 secondes
      if (!zombie.randomMoveTimer || now - zombie.randomMoveTimer > 2000) {
        zombie.randomAngle = Math.random() * Math.PI * 2;
        zombie.randomMoveTimer = now;
      }

      const newX = zombie.x + Math.cos(zombie.randomAngle) * zombie.speed;
      const newY = zombie.y + Math.sin(zombie.randomAngle) * zombie.speed;

      // Vérifier collision avec les murs - avec système de glissement
      let finalX = zombie.x;
      let finalY = zombie.y;

      // Essayer de se déplacer dans les deux directions
      if (!checkWallCollision(newX, newY, zombie.size)) {
        // Pas de collision, mouvement libre
        finalX = newX;
        finalY = newY;
      } else {
        // Collision détectée, changer de direction aléatoire
        zombie.randomAngle = Math.random() * Math.PI * 2;
      }

      // Appliquer la nouvelle position
      zombie.x = finalX;
      zombie.y = finalY;
    }
  }

  // Mise à jour des traînées de poison
  for (let trailId in gameState.poisonTrails) {
    const trail = gameState.poisonTrails[trailId];

    // Nettoyer les traînées expirées (après 3 secondes)
    if (now - trail.createdAt >= trail.duration) {
      entityManager.destroyPoisonTrail(trailId);
      continue;
    }

    // Appliquer les dégâts aux joueurs qui marchent sur les traînées
    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];

      // Ignorer les joueurs morts, sans pseudo, avec protection de spawn, ou invisibles
      if (!player.alive || !player.hasNickname || player.spawnProtection || player.invisible) {
        continue;
      }

      const dist = distance(player.x, player.y, trail.x, trail.y);
      if (dist < trail.radius) {
        // Appliquer les dégâts de poison toutes les 500ms
        if (!player.lastPoisonDamage || now - player.lastPoisonDamage >= 500) {
          player.health -= trail.damage;
          player.lastPoisonDamage = now;

          // Créer des particules pour l'effet visuel
          createParticles(player.x, player.y, '#22ff22', 2);

          // Vérifier si le joueur est mort
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

    // Appliquer la gravité pour les grenades
    if (bullet.gravity && bullet.gravity > 0) {
      bullet.vy += bullet.gravity;
    }

    // Vérifier le lifetime pour les flammes et autres armes à durée limitée
    if (bullet.lifetime && now > bullet.lifetime) {
      entityManager.destroyBullet(bulletId);
      continue;
    }

    // Retirer les balles hors de la salle ou qui touchent un mur
    if (bullet.x < 0 || bullet.x > CONFIG.ROOM_WIDTH ||
        bullet.y < 0 || bullet.y > CONFIG.ROOM_HEIGHT ||
        checkWallCollision(bullet.x, bullet.y, CONFIG.BULLET_SIZE)) {
      entityManager.destroyBullet(bulletId);
      continue;
    }

    // Si c'est une balle de zombie, vérifier collision avec les joueurs
    if (bullet.isZombieBullet) {
      for (let playerId in gameState.players) {
        const player = gameState.players[playerId];

        // Ignorer les joueurs morts, sans pseudo, avec protection de spawn, ou invisibles
        if (!player.alive || !player.hasNickname || player.spawnProtection || player.invisible) {
          continue;
        }

        if (distance(bullet.x, bullet.y, player.x, player.y) < CONFIG.PLAYER_SIZE) {
          // Esquive
          if (Math.random() < (player.dodgeChance || 0)) {
            entityManager.destroyBullet(bulletId);
            break; // Esquive réussie, balle disparaît
          }

          // Infliger les dégâts
          player.health -= bullet.damage;

          if (player.health <= 0) {
            player.health = 0;
            player.alive = false;
          }

          // Créer des particules de sang
          createParticles(player.x, player.y, '#ff0000', 8);

          entityManager.destroyBullet(bulletId);
          break;
        }
      }
      continue; // Passer à la prochaine balle, ne pas vérifier les zombies
    }

    // Vérifier collision avec zombies (seulement pour les balles de joueurs)
    // OPTIMISATION: Utilisation du Quadtree au lieu de boucle O(n*m)
    const hitZombies = collisionManager.checkBulletZombieCollisions(bullet);

    for (let {id: zombieId, zombie} of hitZombies) {
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
          entityManager.destroyBullet(bulletId);
        }
      } else {
        entityManager.destroyBullet(bulletId);
      }

      // Balles explosives
      if (bullet.explosiveRounds && bullet.explosionRadius > 0) {
        // Créer l'effet visuel d'explosion
        createExplosion(zombie.x, zombie.y, bullet.explosionRadius, bullet.isRocket);

        // Créer explosion - plus intense pour les roquettes
        const explosionColor = bullet.isRocket ? '#ff0000' : '#ff8800';
        const particleCount = bullet.isRocket ? 40 : 20;
        createParticles(zombie.x, zombie.y, explosionColor, particleCount);

        // Pour les roquettes, créer aussi des particules orange et jaunes
        if (bullet.isRocket) {
          createParticles(zombie.x, zombie.y, '#ff8800', 30);
          createParticles(zombie.x, zombie.y, '#ffff00', 20);
        }

        // Infliger dégâts dans le rayon
        for (let otherId in gameState.zombies) {
          if (otherId !== zombieId) {
            const other = gameState.zombies[otherId];
            const dist = distance(zombie.x, zombie.y, other.x, other.y);
            if (dist < bullet.explosionRadius) {
              // Les armes avec explosion définie utilisent les dégâts fixes, sinon un pourcentage
              const explosionDmg = bullet.rocketExplosionDamage > 0 ? bullet.rocketExplosionDamage : (bullet.damage * bullet.explosionDamagePercent);
              other.health -= explosionDmg;
              // Créer des particules sur les zombies touchés
              createParticles(other.x, other.y, other.color, 8);
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
          createParticles(zombie.x, zombie.y, '#ff8800', 20);

          // Infliger des dégâts à tous les joueurs dans le rayon
          for (let playerId in gameState.players) {
            const player = gameState.players[playerId];
            // Ignorer les joueurs morts, sans pseudo, avec protection de spawn, ou invisibles
            if (player.alive && player.hasNickname && !player.spawnProtection && !player.invisible) {
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

          // NOUVEAU : Infliger des dégâts aux autres zombies dans le rayon
          for (let otherId in gameState.zombies) {
            if (otherId !== zombieId) {
              const other = gameState.zombies[otherId];
              const dist = distance(zombie.x, zombie.y, other.x, other.y);
              if (dist < explosionType.explosionRadius) {
                // L'explosion tue instantanément les zombies normaux, blesse les autres
                const explosionDamage = explosionType.explosionDamage * 1.5; // 50% plus de dégâts aux zombies
                other.health -= explosionDamage;
                // Créer des particules pour montrer l'impact
                createParticles(other.x, other.y, other.color, 8);
              }
            }
          }
        }

        // Créer du loot avec bonus de combo
        let goldBonus = zombie.goldDrop;
        let xpBonus = zombie.xpDrop;

        // Mettre à jour le combo et le score du joueur
        if (bullet.playerId) {
          const shooter = gameState.players[bullet.playerId];
          if (shooter && shooter.alive) {
            const now = Date.now();
            const COMBO_TIMEOUT = 5000; // 5 secondes pour maintenir le combo

            // Reset ou continue le combo
            if (shooter.comboTimer > 0 && now - shooter.comboTimer < COMBO_TIMEOUT) {
              shooter.combo++;
            } else {
              shooter.combo = 1;
            }

            shooter.comboTimer = now;
            shooter.kills++;
            shooter.zombiesKilled++;

            // Mettre à jour le meilleur combo
            if (shooter.combo > shooter.highestCombo) {
              shooter.highestCombo = shooter.combo;
            }

            // Calculer le multiplicateur de combo
            let comboMultiplier = 1;
            if (shooter.combo >= 50) comboMultiplier = 10;
            else if (shooter.combo >= 30) comboMultiplier = 5;
            else if (shooter.combo >= 15) comboMultiplier = 3;
            else if (shooter.combo >= 5) comboMultiplier = 2;

            // Appliquer le bonus de combo sur l'or et l'XP
            goldBonus = Math.floor(zombie.goldDrop * comboMultiplier);
            xpBonus = Math.floor(zombie.xpDrop * comboMultiplier);

            // Calculer le score (base + combo bonus)
            const baseScore = zombie.goldDrop + zombie.xpDrop;
            const comboScore = baseScore * (comboMultiplier - 1);
            shooter.totalScore += baseScore + comboScore;

            // Émettre l'événement de combo pour l'affichage visuel
            io.to(bullet.playerId).emit('comboUpdate', {
              combo: shooter.combo,
              multiplier: comboMultiplier,
              score: shooter.totalScore,
              goldBonus: goldBonus - zombie.goldDrop,
              xpBonus: xpBonus - zombie.xpDrop
            });
          }
        }

        createLoot(zombie.x, zombie.y, goldBonus, xpBonus);

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
            zombiesCount: CONFIG.ZOMBIES_PER_ROOM + (gameState.wave - 1) * 7 // Mis à jour pour correspondre à la nouvelle progression améliorée
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

  // Mise à jour des particules
  for (let particleId in gameState.particles) {
    const particle = gameState.particles[particleId];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1; // Gravité
  }

  // Nettoyer les entités expirées (OPTIMISÉ avec Object Pools)
  entityManager.cleanupExpiredEntities(now);

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

          // Activer l'invisibilité - le joueur devient invisible tant qu'il n'a pas choisi d'amélioration
          player.invisible = true;
          player.invisibleEndTime = Infinity; // Invisible jusqu'à ce qu'il choisisse une amélioration

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

// ===============================================
// DELTA COMPRESSION SYSTEM - Réduction de 80-90% de la bande passante
// ===============================================

// Delta compression géré par NetworkManager (voir lib/server/NetworkManager.js)

// Game loop à 30 FPS avec Delta Compression (OPTIMISÉ avec NetworkManager)
setInterval(() => {
  gameLoop();

  // Émettre l'état du jeu (delta compression automatique)
  networkManager.emitGameState();
}, 1000 / 30);

// Vérification périodique de l'inactivité des joueurs
setInterval(() => {
  const now = Date.now();

  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];

    // Vérifier si le joueur est inactif depuis trop longtemps
    if (player.lastActivityTime && (now - player.lastActivityTime) > INACTIVITY_TIMEOUT) {
      console.log(`[TIMEOUT] Player ${player.nickname || playerId} disconnected due to inactivity (${Math.round((now - player.lastActivityTime) / 1000)}s)`);

      // Émettre un event de timeout au client
      io.to(playerId).emit('sessionTimeout', {
        reason: 'Inactivité détectée - Vous avez été déconnecté après 2 minutes sans activité'
      });

      // CORRECTION: Nettoyer les balles orphelines appartenant à ce joueur
      for (let bulletId in gameState.bullets) {
        const bullet = gameState.bullets[bulletId];
        if (bullet.playerId === playerId) {
          entityManager.destroyBullet(bulletId);
        }
      }

      // Supprimer le joueur
      delete gameState.players[playerId];
    }
  }
}, HEARTBEAT_CHECK_INTERVAL);

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
    invisible: false, // Invisibilité après upgrade ou lors du level up
    invisibleEndTime: 0, // Fin de l'invisibilité
    lastActivityTime: Date.now(), // Pour détecter l'inactivité
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
    // Système de combos et score
    kills: 0,
    zombiesKilled: 0,
    combo: 0,
    comboTimer: 0,
    highestCombo: 0,
    totalScore: 0,
    survivalTime: Date.now(),
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
    // Rate limiting
    if (!checkRateLimit(socket.id, 'playerMove')) return;

    const player = gameState.players[socket.id];
    if (!player || !player.alive || !player.hasNickname) return; // Pas de mouvement sans pseudo

    // Clamp position to map boundaries, accounting for player size to prevent leaving map
    const halfSize = CONFIG.PLAYER_SIZE / 2;
    const newX = Math.max(halfSize, Math.min(CONFIG.ROOM_WIDTH - halfSize, data.x));
    const newY = Math.max(halfSize, Math.min(CONFIG.ROOM_HEIGHT - halfSize, data.y));

    // VALIDATION: Vérifier la distance parcourue pour éviter la téléportation
    const distance = Math.sqrt(
      Math.pow(newX - player.x, 2) + Math.pow(newY - player.y, 2)
    );

    // Calculer la vitesse maximale autorisée
    const speedMultiplier = player.speedMultiplier || 1;
    const hasSpeedBoost = player.speedBoost && Date.now() < player.speedBoost;
    const boostMultiplier = hasSpeedBoost ? 2 : 1;

    // Distance max par frame (à 30 FPS avec tolérance pour latence)
    const MAX_DISTANCE_PER_FRAME = CONFIG.PLAYER_SPEED * speedMultiplier * boostMultiplier * 1.5;

    // Rejeter le mouvement si distance trop importante (tentative de téléportation)
    if (distance > MAX_DISTANCE_PER_FRAME) {
      console.warn(`[ANTI-CHEAT] Player ${player.nickname || socket.id} attempted teleport: ${Math.round(distance)}px (max: ${Math.round(MAX_DISTANCE_PER_FRAME)}px)`);
      // Corriger la position du client
      socket.emit('positionCorrection', { x: player.x, y: player.y });
      return;
    }

    // Vérifier collision avec les murs
    if (!checkWallCollision(newX, newY, CONFIG.PLAYER_SIZE)) {
      player.x = newX;
      player.y = newY;
    }

    player.angle = data.angle;

    // Mettre à jour le timestamp d'activité
    player.lastActivityTime = Date.now();

    // MODE INFINI - Pas de portes ni de changements de salle
  });

  // Tir du joueur
  socket.on('shoot', (data) => {
    // Rate limiting
    if (!checkRateLimit(socket.id, 'shoot')) return;

    const player = gameState.players[socket.id];
    if (!player || !player.alive || !player.hasNickname) return; // Pas de tir sans pseudo

    const now = Date.now();
    player.lastActivityTime = now; // Mettre à jour l'activité

    const weapon = WEAPONS[player.weapon] || WEAPONS.pistol;

    // Appliquer le multiplicateur de cadence de tir
    const fireRate = weapon.fireRate * (player.fireRateMultiplier || 1);

    // Vérifier le cooldown de l'arme
    if (now - player.lastShot < fireRate) return;

    player.lastShot = now;

    // Nombre total de balles (arme + extra bullets)
    const totalBullets = weapon.bulletCount + (player.extraBullets || 0);

    // Créer les balles selon l'arme (OPTIMISÉ avec Object Pool)
    for (let i = 0; i < totalBullets; i++) {
      const spreadAngle = data.angle + (Math.random() - 0.5) * weapon.spread;

      // Appliquer le multiplicateur de dégâts
      let damage = weapon.damage * (player.damageMultiplier || 1);

      // Critique (chance de base + chance de l'arme)
      const totalCritChance = (player.criticalChance || 0) + (weapon.criticalChance || 0);
      const isCritical = Math.random() < totalCritChance;
      if (isCritical) {
        const critMultiplier = weapon.criticalMultiplier || 2;
        damage *= critMultiplier;
      }

      // Piercing (de base + piercing de l'arme)
      const totalPiercing = (player.bulletPiercing || 0) + (weapon.piercing || 0);

      // CORRECTION: Utilisation du pool d'objets au lieu de création manuelle
      entityManager.createBullet({
        x: player.x,
        y: player.y,
        vx: Math.cos(spreadAngle) * weapon.bulletSpeed,
        vy: Math.sin(spreadAngle) * weapon.bulletSpeed,
        playerId: socket.id,
        damage: damage,
        color: isCritical ? '#ff0000' : weapon.color,
        size: weapon.bulletSize || CONFIG.BULLET_SIZE,
        piercing: totalPiercing,
        explosiveRounds: player.explosiveRounds || weapon.hasExplosion || false,
        explosionRadius: weapon.hasExplosion ? weapon.explosionRadius : (player.explosionRadius || 0),
        explosionDamagePercent: weapon.hasExplosion ? 1 : (player.explosionDamagePercent || 0),
        rocketExplosionDamage: weapon.hasExplosion ? weapon.explosionDamage : 0,
        isRocket: weapon.hasExplosion && !weapon.isGrenade || false,
        isFlame: weapon.isFlame || false,
        isLaser: weapon.isLaser || false,
        isGrenade: weapon.isGrenade || false,
        isCrossbow: weapon.isCrossbow || false,
        gravity: weapon.gravity || 0,
        lifetime: weapon.lifetime ? now + weapon.lifetime : null,
        createdAt: now
      });
    }
  });

  // Respawn du joueur (Rogue-like - nouveau run)
  socket.on('respawn', () => {
    const player = gameState.players[socket.id];
    if (player) {
      player.lastActivityTime = Date.now(); // Mettre à jour l'activité

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
      player.invisible = false;
      player.invisibleEndTime = 0;
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

      // CORRECTION: Réinitialiser les statistiques de run
      player.zombiesKilled = 0;
      player.kills = 0;
      player.combo = 0;
      player.comboTimer = 0;
      player.highestCombo = 0;
      player.totalScore = 0;

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
    // Rate limiting
    if (!checkRateLimit(socket.id, 'selectUpgrade')) return;

    const player = gameState.players[socket.id];
    if (!player || !player.alive) return;

    player.lastActivityTime = Date.now(); // Mettre à jour l'activité

    const { upgradeId } = data;
    const upgrade = LEVEL_UP_UPGRADES[upgradeId];

    if (!upgrade) return;

    // Appliquer l'effet de l'upgrade
    upgrade.effect(player);

    // Désactiver l'invisibilité - le joueur redevient visible dès qu'il choisit une amélioration
    player.invisible = false;
    player.invisibleEndTime = 0;

    socket.emit('upgradeSelected', { success: true, upgradeId });
  });

  // Acheter un item dans le shop
  socket.on('buyItem', (data) => {
    // Rate limiting
    if (!checkRateLimit(socket.id, 'buyItem')) return;

    const player = gameState.players[socket.id];
    if (!player || !player.alive) return;

    player.lastActivityTime = Date.now(); // Mettre à jour l'activité

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
    // Rate limiting
    if (!checkRateLimit(socket.id, 'setNickname')) {
      socket.emit('nicknameRejected', {
        reason: 'Trop de tentatives. Attendez quelques secondes.'
      });
      return;
    }

    const player = gameState.players[socket.id];
    if (!player) return;

    player.lastActivityTime = Date.now(); // Mettre à jour l'activité

    // VALIDATION STRICTE DU PSEUDO
    let nickname = data.nickname ? data.nickname.trim() : '';

    // Filtrer caractères non autorisés (lettres, chiffres, espaces, tirets, underscores)
    nickname = nickname.replace(/[^a-zA-Z0-9\s\-_]/g, '');

    // Limiter à 15 caractères max
    nickname = nickname.substring(0, 15);

    // Vérifier longueur minimale
    if (nickname.length < 2) {
      socket.emit('nicknameRejected', {
        reason: 'Le pseudo doit contenir au moins 2 caractères alphanumériques'
      });
      return;
    }

    // Vérifier si le pseudo n'est pas déjà pris par un autre joueur
    const isDuplicate = Object.values(gameState.players).some(
      p => p.id !== socket.id && p.nickname && p.nickname.toLowerCase() === nickname.toLowerCase()
    );

    if (isDuplicate) {
      socket.emit('nicknameRejected', {
        reason: 'Ce pseudo est déjà utilisé par un autre joueur'
      });
      return;
    }

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
  });

  // Fin de la protection de spawn
  socket.on('endSpawnProtection', () => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.lastActivityTime = Date.now(); // Mettre à jour l'activité

    player.spawnProtection = false;
    console.log(`${player.nickname || socket.id} n'a plus de protection de spawn`);
  });

  // Ouverture du shop - activer l'invisibilité
  socket.on('shopOpened', () => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.lastActivityTime = Date.now(); // Mettre à jour l'activité

    player.invisible = true;
    player.invisibleEndTime = Infinity; // Invisibilité sans limite de temps
    console.log(`${player.nickname || socket.id} est invisible (shop ouvert)`);
  });

  // Fermeture du shop - désactiver l'invisibilité
  socket.on('shopClosed', () => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.lastActivityTime = Date.now(); // Mettre à jour l'activité

    player.invisible = false;
    player.invisibleEndTime = 0;
    console.log(`${player.nickname || socket.id} n'est plus invisible (shop fermé)`);
  });

  // Déconnexion du joueur
  socket.on('disconnect', () => {
    console.log('Un joueur s\'est déconnecté:', socket.id);

    // CORRECTION: Nettoyer les balles orphelines appartenant à ce joueur
    for (let bulletId in gameState.bullets) {
      const bullet = gameState.bullets[bulletId];
      if (bullet.playerId === socket.id) {
        entityManager.destroyBullet(bulletId);
      }
    }

    delete gameState.players[socket.id];
    // Nettoyer les rate limits
    cleanupRateLimits(socket.id);
  });
});

// Gestion des erreurs 404 (Route non trouvée)
app.use((req, res, next) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Page non trouvée</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        h1 { font-size: 72px; margin: 0; }
        p { font-size: 24px; }
        a { color: #ffeb3b; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>404</h1>
      <p>🧟 Page non trouvée</p>
      <p><a href="/">← Retour au jeu</a></p>
    </body>
    </html>
  `);
});

// Gestion des erreurs serveur (500, 503, etc.)
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(err.status || 500).send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Erreur serveur</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        h1 { font-size: 72px; margin: 0; }
        p { font-size: 24px; }
        a { color: #ffeb3b; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .error-code { opacity: 0.7; font-size: 18px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>${err.status || 500}</h1>
      <p>💥 Une erreur serveur s'est produite</p>
      <p><a href="/">← Retour au jeu</a></p>
      <div class="error-code">Code d'erreur: ${err.status || 500}</div>
    </body>
    </html>
  `);
});

http.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Ouvrez http://localhost:${PORT} dans votre navigateur`);
});
