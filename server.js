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
  nextZombieId: 0,
  nextBulletId: 0,
  nextPowerupId: 0,
  nextParticleId: 0,
  wave: 1,
  zombiesKilledThisWave: 0,
  zombiesSpawnedThisWave: 0
};

// Configuration du jeu
const CONFIG = {
  WORLD_WIDTH: 2000,
  WORLD_HEIGHT: 2000,
  PLAYER_SPEED: 5,
  PLAYER_SIZE: 20,
  ZOMBIE_SPEED: 2,
  ZOMBIE_SIZE: 25,
  ZOMBIE_DAMAGE: 10,
  ZOMBIE_HEALTH: 100,
  ZOMBIE_SPAWN_INTERVAL: 2000,
  MAX_ZOMBIES: 50,
  BULLET_SPEED: 10,
  BULLET_DAMAGE: 34,
  BULLET_SIZE: 5,
  PLAYER_MAX_HEALTH: 100,
  POWERUP_SPAWN_INTERVAL: 10000,
  POWERUP_SIZE: 15,
  ZOMBIES_PER_WAVE: 20
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
      player.health = Math.min(player.health + 50, CONFIG.PLAYER_MAX_HEALTH);
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

// Fonction utilitaire pour calculer la distance
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Spawn des zombies
function spawnZombie() {
  if (Object.keys(gameState.zombies).length >= CONFIG.MAX_ZOMBIES) {
    return;
  }

  // Limiter le spawn selon les vagues
  if (gameState.zombiesSpawnedThisWave >= CONFIG.ZOMBIES_PER_WAVE * gameState.wave) {
    return;
  }

  const side = Math.floor(Math.random() * 4);
  let x, y;

  switch (side) {
    case 0: // Top
      x = Math.random() * CONFIG.WORLD_WIDTH;
      y = -50;
      break;
    case 1: // Right
      x = CONFIG.WORLD_WIDTH + 50;
      y = Math.random() * CONFIG.WORLD_HEIGHT;
      break;
    case 2: // Bottom
      x = Math.random() * CONFIG.WORLD_WIDTH;
      y = CONFIG.WORLD_HEIGHT + 50;
      break;
    case 3: // Left
      x = -50;
      y = Math.random() * CONFIG.WORLD_HEIGHT;
      break;
  }

  const zombieId = gameState.nextZombieId++;
  // Augmenter la vie des zombies avec les vagues
  const healthMultiplier = 1 + (gameState.wave - 1) * 0.2;
  const speedMultiplier = 1 + (gameState.wave - 1) * 0.1;

  gameState.zombies[zombieId] = {
    id: zombieId,
    x: x,
    y: y,
    health: CONFIG.ZOMBIE_HEALTH * healthMultiplier,
    maxHealth: CONFIG.ZOMBIE_HEALTH * healthMultiplier,
    speed: CONFIG.ZOMBIE_SPEED * speedMultiplier
  };

  gameState.zombiesSpawnedThisWave++;
}

// Spawn des power-ups
function spawnPowerup() {
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];

  const powerupId = gameState.nextPowerupId++;
  gameState.powerups[powerupId] = {
    id: powerupId,
    type: type,
    x: Math.random() * (CONFIG.WORLD_WIDTH - 100) + 50,
    y: Math.random() * (CONFIG.WORLD_HEIGHT - 100) + 50,
    lifetime: Date.now() + 20000 // 20 secondes
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
      zombie.x += Math.cos(angle) * zombie.speed;
      zombie.y += Math.sin(angle) * zombie.speed;

      // Vérifier collision avec joueurs
      for (let playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (player.alive && distance(zombie.x, zombie.y, player.x, player.y) < CONFIG.ZOMBIE_SIZE) {
          player.health -= CONFIG.ZOMBIE_DAMAGE * 0.016; // Dégâts par frame
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

    // Retirer les balles hors de la carte
    if (bullet.x < 0 || bullet.x > CONFIG.WORLD_WIDTH ||
        bullet.y < 0 || bullet.y > CONFIG.WORLD_HEIGHT) {
      delete gameState.bullets[bulletId];
      continue;
    }

    // Vérifier collision avec zombies
    for (let zombieId in gameState.zombies) {
      const zombie = gameState.zombies[zombieId];
      if (distance(bullet.x, bullet.y, zombie.x, zombie.y) < CONFIG.ZOMBIE_SIZE) {
        zombie.health -= bullet.damage;
        delete gameState.bullets[bulletId];

        // Créer des particules de sang
        createParticles(zombie.x, zombie.y, '#00ff00', 5);

        if (zombie.health <= 0) {
          // Créer plus de particules pour la mort
          createParticles(zombie.x, zombie.y, '#00ff00', 15);
          delete gameState.zombies[zombieId];

          // Ajouter des points au joueur
          if (gameState.players[bullet.playerId]) {
            gameState.players[bullet.playerId].score += 10 * gameState.wave;
            gameState.zombiesKilledThisWave++;

            // Vérifier si la vague est terminée
            if (gameState.zombiesKilledThisWave >= CONFIG.ZOMBIES_PER_WAVE * gameState.wave) {
              gameState.wave++;
              gameState.zombiesKilledThisWave = 0;
              gameState.zombiesSpawnedThisWave = 0;

              // Annoncer nouvelle vague à tous les joueurs
              io.emit('newWave', gameState.wave);
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
}

// Spawn automatique des zombies
setInterval(spawnZombie, CONFIG.ZOMBIE_SPAWN_INTERVAL);

// Spawn automatique des power-ups
setInterval(spawnPowerup, CONFIG.POWERUP_SPAWN_INTERVAL);

// Game loop à 60 FPS
setInterval(() => {
  gameLoop();
  io.emit('gameState', {
    players: gameState.players,
    zombies: gameState.zombies,
    bullets: gameState.bullets,
    powerups: gameState.powerups,
    particles: gameState.particles,
    wave: gameState.wave
  });
}, 1000 / 60);

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un joueur s\'est connecté:', socket.id);

  // Créer un nouveau joueur
  gameState.players[socket.id] = {
    id: socket.id,
    x: Math.random() * CONFIG.WORLD_WIDTH,
    y: Math.random() * CONFIG.WORLD_HEIGHT,
    health: CONFIG.PLAYER_MAX_HEALTH,
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
    powerupTypes: POWERUP_TYPES
  });

  // Mouvement du joueur
  socket.on('playerMove', (data) => {
    const player = gameState.players[socket.id];
    if (player && player.alive) {
      player.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH, data.x));
      player.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT, data.y));
      player.angle = data.angle;
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

  // Respawn du joueur
  socket.on('respawn', () => {
    const player = gameState.players[socket.id];
    if (player) {
      player.x = Math.random() * CONFIG.WORLD_WIDTH;
      player.y = Math.random() * CONFIG.WORLD_HEIGHT;
      player.health = CONFIG.PLAYER_MAX_HEALTH;
      player.alive = true;
      player.score = 0;
      player.weapon = 'pistol';
      player.speedBoost = null;
      player.weaponTimer = null;
      player.lastShot = 0;
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
