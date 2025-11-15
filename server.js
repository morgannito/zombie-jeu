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
  nextZombieId: 0,
  nextBulletId: 0
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
  PLAYER_MAX_HEALTH: 100
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
  gameState.zombies[zombieId] = {
    id: zombieId,
    x: x,
    y: y,
    health: CONFIG.ZOMBIE_HEALTH
  };
}

// Mise à jour de la logique du jeu
function gameLoop() {
  // Mise à jour des zombies - ils chassent le joueur le plus proche
  for (let zombieId in gameState.zombies) {
    const zombie = gameState.zombies[zombieId];

    // Trouver le joueur le plus proche
    let closestPlayer = null;
    let closestDistance = Infinity;

    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];
      const dist = distance(zombie.x, zombie.y, player.x, player.y);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestPlayer = player;
      }
    }

    // Déplacer le zombie vers le joueur
    if (closestPlayer) {
      const angle = Math.atan2(closestPlayer.y - zombie.y, closestPlayer.x - zombie.x);
      zombie.x += Math.cos(angle) * CONFIG.ZOMBIE_SPEED;
      zombie.y += Math.sin(angle) * CONFIG.ZOMBIE_SPEED;

      // Vérifier collision avec joueurs
      for (let playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (distance(zombie.x, zombie.y, player.x, player.y) < CONFIG.ZOMBIE_SIZE) {
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
        zombie.health -= CONFIG.BULLET_DAMAGE;
        delete gameState.bullets[bulletId];

        if (zombie.health <= 0) {
          delete gameState.zombies[zombieId];
          // Ajouter des points au joueur
          if (gameState.players[bullet.playerId]) {
            gameState.players[bullet.playerId].score += 10;
          }
        }
        break;
      }
    }
  }
}

// Spawn automatique des zombies
setInterval(spawnZombie, CONFIG.ZOMBIE_SPAWN_INTERVAL);

// Game loop à 60 FPS
setInterval(() => {
  gameLoop();
  io.emit('gameState', {
    players: gameState.players,
    zombies: gameState.zombies,
    bullets: gameState.bullets
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
    angle: 0
  };

  // Envoyer la configuration au client
  socket.emit('init', {
    playerId: socket.id,
    config: CONFIG
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
    if (player && player.alive) {
      const bulletId = gameState.nextBulletId++;
      gameState.bullets[bulletId] = {
        id: bulletId,
        x: player.x,
        y: player.y,
        vx: Math.cos(data.angle) * CONFIG.BULLET_SPEED,
        vy: Math.sin(data.angle) * CONFIG.BULLET_SPEED,
        playerId: socket.id
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
