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

// Configuration du jeu
const CONFIG = {
  ROOM_WIDTH: 800,
  ROOM_HEIGHT: 600,
  WALL_THICKNESS: 20,
  PLAYER_SPEED: 5,
  PLAYER_SIZE: 20,
  ZOMBIE_SIZE: 25,
  ZOMBIE_SPAWN_INTERVAL: 3000,
  MAX_ZOMBIES: 15,
  BULLET_SPEED: 10,
  BULLET_DAMAGE: 34,
  BULLET_SIZE: 5,
  PLAYER_MAX_HEALTH: 100,
  POWERUP_SPAWN_INTERVAL: 15000,
  POWERUP_SIZE: 15,
  ZOMBIES_PER_ROOM: 10,
  LOOT_SIZE: 10,
  DOOR_WIDTH: 80,
  ROOMS_PER_RUN: 5
};

// Types d'armes
const WEAPONS = {
  pistol: {
    name: 'Pistolet',
    damage: 34,
    fireRate: 300,
    bulletSpeed: 12,
    bulletCount: 1,
    spread: 0,
    color: '#ffff00'
  },
  shotgun: {
    name: 'Shotgun',
    damage: 20,
    fireRate: 800,
    bulletSpeed: 10,
    bulletCount: 5,
    spread: 0.3,
    color: '#ff6600'
  },
  machinegun: {
    name: 'Mitraillette',
    damage: 25,
    fireRate: 100,
    bulletSpeed: 15,
    bulletCount: 1,
    spread: 0.1,
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

// Types de zombies (Rogue-like)
const ZOMBIE_TYPES = {
  normal: {
    name: 'Zombie Normal',
    health: 80,
    speed: 2,
    damage: 8,
    color: '#00ff00',
    size: 25,
    goldDrop: 5,
    xpDrop: 10
  },
  fast: {
    name: 'Zombie Rapide',
    health: 50,
    speed: 4,
    damage: 12,
    color: '#ffff00',
    size: 20,
    goldDrop: 10,
    xpDrop: 15
  },
  tank: {
    name: 'Zombie Tank',
    health: 200,
    speed: 1,
    damage: 20,
    color: '#ff6600',
    size: 35,
    goldDrop: 20,
    xpDrop: 30
  },
  boss: {
    name: 'Boss Zombie',
    health: 500,
    speed: 1.5,
    damage: 25,
    color: '#ff0000',
    size: 50,
    goldDrop: 100,
    xpDrop: 100
  }
};

// Fonction utilitaire pour calculer la distance
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
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

// Calculer l'XP nécessaire pour le niveau suivant
function getXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Spawn des zombies (Rogue-like avec types)
function spawnZombie() {
  if (Object.keys(gameState.zombies).length >= CONFIG.MAX_ZOMBIES) {
    return;
  }

  // Limiter le spawn selon la salle
  if (gameState.zombiesSpawnedThisWave >= CONFIG.ZOMBIES_PER_ROOM) {
    // Spawner le boss si pas encore fait
    if (!gameState.bossSpawned && Object.keys(gameState.zombies).length === 0) {
      spawnBoss();
    }
    return;
  }

  // Position aléatoire dans la salle (éviter les murs)
  let x, y;
  let attempts = 0;
  do {
    x = 100 + Math.random() * (CONFIG.ROOM_WIDTH - 200);
    y = 100 + Math.random() * (CONFIG.ROOM_HEIGHT - 200);
    attempts++;
  } while (checkWallCollision(x, y, CONFIG.ZOMBIE_SIZE) && attempts < 50);

  if (attempts >= 50) return; // Pas de place disponible

  // Choisir un type de zombie aléatoirement
  const types = ['normal', 'normal', 'normal', 'fast', 'tank']; // Plus de normaux
  const typeKey = types[Math.floor(Math.random() * types.length)];
  const type = ZOMBIE_TYPES[typeKey];

  const zombieId = gameState.nextZombieId++;

  gameState.zombies[zombieId] = {
    id: zombieId,
    type: typeKey,
    x: x,
    y: y,
    health: type.health,
    maxHealth: type.health,
    speed: type.speed,
    damage: type.damage,
    color: type.color,
    size: type.size,
    goldDrop: type.goldDrop,
    xpDrop: type.xpDrop
  };

  gameState.zombiesSpawnedThisWave++;
}

// Spawner un boss zombie
function spawnBoss() {
  const type = ZOMBIE_TYPES.boss;

  // Centre de la salle
  const x = CONFIG.ROOM_WIDTH / 2;
  const y = CONFIG.ROOM_HEIGHT / 2;

  const zombieId = gameState.nextZombieId++;

  gameState.zombies[zombieId] = {
    id: zombieId,
    type: 'boss',
    x: x,
    y: y,
    health: type.health,
    maxHealth: type.health,
    speed: type.speed,
    damage: type.damage,
    color: type.color,
    size: type.size,
    goldDrop: type.goldDrop,
    xpDrop: type.xpDrop,
    isBoss: true
  };

  gameState.bossSpawned = true;

  io.emit('bossSpawned', {
    bossName: type.name,
    bossHealth: type.health
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

    // Retour au pistolet si l'arme spéciale a expiré
    if (player.weaponTimer && now > player.weaponTimer) {
      player.weapon = 'pistol';
      player.weaponTimer = null;
    }

    // Retour à la vitesse normale si le boost a expiré
    if (player.speedBoost && now > player.speedBoost) {
      player.speedBoost = null;
    }
  }

  // Mise à jour des zombies - ils chassent le joueur le plus proche
  for (let zombieId in gameState.zombies) {
    const zombie = gameState.zombies[zombieId];

    // Trouver le joueur le plus proche
    let closestPlayer = null;
    let closestDistance = Infinity;

    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];
      if (player.alive) {
        const dist = distance(zombie.x, zombie.y, player.x, player.y);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestPlayer = player;
        }
      }
    }

    // Déplacer le zombie vers le joueur
    if (closestPlayer) {
      const angle = Math.atan2(closestPlayer.y - zombie.y, closestPlayer.x - zombie.x);
      const newX = zombie.x + Math.cos(angle) * zombie.speed;
      const newY = zombie.y + Math.sin(angle) * zombie.speed;

      // Vérifier collision avec les murs
      if (!checkWallCollision(newX, newY, zombie.size)) {
        zombie.x = newX;
        zombie.y = newY;
      }

      // Vérifier collision avec joueurs
      for (let playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (player.alive && distance(zombie.x, zombie.y, player.x, player.y) < zombie.size) {
          player.health -= zombie.damage * 0.016; // Dégâts par frame
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
        zombie.health -= bullet.damage;
        delete gameState.bullets[bulletId];

        // Créer des particules de sang
        createParticles(zombie.x, zombie.y, zombie.color, 5);

        if (zombie.health <= 0) {
          // Créer plus de particules pour la mort
          createParticles(zombie.x, zombie.y, zombie.color, 15);

          // Créer du loot
          createLoot(zombie.x, zombie.y, zombie.goldDrop, zombie.xpDrop);

          // Supprimer le zombie
          delete gameState.zombies[zombieId];

          gameState.zombiesKilledThisWave++;

          // Si c'était le boss, activer la porte
          if (zombie.isBoss) {
            const room = gameState.rooms[gameState.currentRoom];
            if (room && room.doors.length > 0) {
              room.doors[0].active = true;
              io.emit('doorOpened');
            }
          }

          // Si tous les zombies sont morts et le boss aussi, permettre de passer à la salle suivante
          if (Object.keys(gameState.zombies).length === 0 && gameState.bossSpawned) {
            // La porte est déjà ouverte
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
      if (player.alive && distance(powerup.x, powerup.y, player.x, player.y) < CONFIG.PLAYER_SIZE + CONFIG.POWERUP_SIZE) {
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
      if (player.alive && distance(loot.x, loot.y, player.x, player.y) < CONFIG.PLAYER_SIZE + CONFIG.LOOT_SIZE) {
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
          player.maxHealth += 10;
          player.health = player.maxHealth; // Full heal au level up

          io.to(playerId).emit('levelUp', {
            newLevel: player.level,
            maxHealth: player.maxHealth
          });
        }

        break;
      }
    }
  }
}

// Spawn automatique des zombies
setInterval(spawnZombie, CONFIG.ZOMBIE_SPAWN_INTERVAL);

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
    currentRoom: gameState.currentRoom,
    totalRooms: CONFIG.ROOMS_PER_RUN,
    doors: gameState.rooms[gameState.currentRoom]?.doors || []
  });
}, 1000 / 60);

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un joueur s\'est connecté:', socket.id);

  // Créer un nouveau joueur (Rogue-like)
  gameState.players[socket.id] = {
    id: socket.id,
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
    weaponTimer: null
  };

  // Envoyer la configuration au client
  socket.emit('init', {
    playerId: socket.id,
    config: CONFIG,
    weapons: WEAPONS,
    powerupTypes: POWERUP_TYPES,
    zombieTypes: ZOMBIE_TYPES,
    walls: gameState.walls,
    rooms: gameState.rooms.length,
    currentRoom: gameState.currentRoom
  });

  // Mouvement du joueur (Rogue-like avec collision)
  socket.on('playerMove', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.alive) return;

    const newX = Math.max(0, Math.min(CONFIG.ROOM_WIDTH, data.x));
    const newY = Math.max(0, Math.min(CONFIG.ROOM_HEIGHT, data.y));

    // Vérifier collision avec les murs
    if (!checkWallCollision(newX, newY, CONFIG.PLAYER_SIZE)) {
      player.x = newX;
      player.y = newY;
    }

    player.angle = data.angle;

    // Vérifier si le joueur passe par la porte (pour changer de salle)
    const room = gameState.rooms[gameState.currentRoom];
    if (room && room.doors.length > 0 && room.doors[0].active) {
      const door = room.doors[0];
      // Si le joueur est proche de la porte (en haut)
      if (player.y < 30 && player.x > door.x && player.x < door.x + door.width) {
        // Passer à la salle suivante
        if (gameState.currentRoom < CONFIG.ROOMS_PER_RUN - 1) {
          loadRoom(gameState.currentRoom + 1);
          // Réinitialiser la position du joueur en bas de la nouvelle salle
          player.x = CONFIG.ROOM_WIDTH / 2;
          player.y = CONFIG.ROOM_HEIGHT - 100;
        } else {
          // Fin du run!
          io.emit('runCompleted', {
            gold: player.gold,
            level: player.level
          });
        }
      }
    }
  });

  // Tir du joueur
  socket.on('shoot', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.alive) return;

    const now = Date.now();
    const weapon = WEAPONS[player.weapon] || WEAPONS.pistol;

    // Vérifier le cooldown de l'arme
    if (now - player.lastShot < weapon.fireRate) return;

    player.lastShot = now;

    // Créer les balles selon l'arme
    for (let i = 0; i < weapon.bulletCount; i++) {
      const bulletId = gameState.nextBulletId++;
      const spreadAngle = data.angle + (Math.random() - 0.5) * weapon.spread;

      gameState.bullets[bulletId] = {
        id: bulletId,
        x: player.x,
        y: player.y,
        vx: Math.cos(spreadAngle) * weapon.bulletSpeed,
        vy: Math.sin(spreadAngle) * weapon.bulletSpeed,
        playerId: socket.id,
        damage: weapon.damage,
        color: weapon.color
      };
    }
  });

  // Respawn du joueur (Rogue-like - nouveau run)
  socket.on('respawn', () => {
    const player = gameState.players[socket.id];
    if (player) {
      // Réinitialiser le run (Permadeath mais garde les upgrades permanents)
      player.x = CONFIG.ROOM_WIDTH / 2;
      player.y = CONFIG.ROOM_HEIGHT - 100;
      player.health = CONFIG.PLAYER_MAX_HEALTH + (gameState.permanentUpgrades.maxHealthUpgrade * 10);
      player.maxHealth = CONFIG.PLAYER_MAX_HEALTH + (gameState.permanentUpgrades.maxHealthUpgrade * 10);
      player.alive = true;
      player.level = 1;
      player.xp = 0;
      player.gold = 0; // L'or est perdu (on peut modifier pour garder)
      player.score = 0;
      player.weapon = 'pistol';
      player.speedBoost = null;
      player.weaponTimer = null;
      player.lastShot = 0;

      // Recharger depuis la première salle
      loadRoom(0);
    }
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
