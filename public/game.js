/**
 * ZOMBIE SURVIVAL - Modern JavaScript (2025)
 * Architecture: Class-based, modular design with clean code principles
 * @author Claude Code
 * @version 2.0.0
 */

/* ============================================
   CONSTANTS & CONFIGURATION
   ============================================ */

const CONSTANTS = {
  NICKNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 15
  },
  SPAWN_PROTECTION: {
    DURATION: 3000, // 3 seconds
    UPDATE_INTERVAL: 100
  },
  MINIMAP: {
    WIDTH: 200,
    HEIGHT: 200
  },
  CANVAS: {
    GRID_SIZE: 50
  },
  ANIMATIONS: {
    SHOP_DELAY: 2000,
    MILESTONE_DELAY: 2500,
    BOSS_ANNOUNCEMENT: 2500
  }
};

/* ============================================
   GAME STATE MANAGER
   ============================================ */

class GameStateManager {
  constructor() {
    this.playerId = null;
    this.state = {
      players: {},
      zombies: {},
      bullets: {},
      powerups: {},
      particles: {},
      loot: {},
      walls: [],
      currentRoom: 0,
      totalRooms: 5,
      doors: []
    };
    this.config = {
      ROOM_WIDTH: 3000,
      ROOM_HEIGHT: 2400,
      PLAYER_SIZE: 20,
      ZOMBIE_SIZE: 25,
      POWERUP_SIZE: 15,
      LOOT_SIZE: 10
    };
    this.weapons = {};
    this.powerupTypes = {};
    this.zombieTypes = {};
    this.shopItems = {};
  }

  updateState(newState) {
    this.state = newState;
  }

  getPlayer() {
    return this.state.players[this.playerId];
  }

  initialize(data) {
    this.playerId = data.playerId;
    this.config = data.config;
    this.weapons = data.weapons;
    this.powerupTypes = data.powerupTypes;
    this.zombieTypes = data.zombieTypes;
    this.shopItems = data.shopItems;
    console.log('🎮 Game initialized! Player ID:', this.playerId);
  }
}

/* ============================================
   INPUT MANAGER
   ============================================ */

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;

    // TAB key for stats panel
    if (e.key === 'Tab') {
      e.preventDefault();
      gameUI.toggleStatsPanel();
    }
  }

  handleKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  updateMouse(x, y) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  isKeyPressed(key) {
    return this.keys[key] === true;
  }

  getMovementVector() {
    let dx = 0;
    let dy = 0;

    // WASD or Arrow keys
    if (this.isKeyPressed('w') || this.isKeyPressed('arrowup') || this.isKeyPressed('z')) dy -= 1;
    if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown')) dy += 1;
    if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft') || this.isKeyPressed('q')) dx -= 1;
    if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    return { dx, dy };
  }
}

/* ============================================
   CAMERA MANAGER
   ============================================ */

class CameraManager {
  constructor() {
    this.x = 0;
    this.y = 0;
  }

  follow(player, canvasWidth, canvasHeight) {
    this.x = player.x - canvasWidth / 2;
    this.y = player.y - canvasHeight / 2;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
}

/* ============================================
   NETWORK MANAGER
   ============================================ */

class NetworkManager {
  constructor(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('init', (data) => this.handleInit(data));
    this.socket.on('gameState', (state) => this.handleGameState(state));
    this.socket.on('bossSpawned', (data) => this.handleBossSpawned(data));
    this.socket.on('newWave', (data) => this.handleNewWave(data));
    this.socket.on('levelUp', (data) => this.handleLevelUp(data));
    this.socket.on('roomChanged', (data) => this.handleRoomChanged(data));
    this.socket.on('runCompleted', (data) => this.handleRunCompleted(data));
    this.socket.on('upgradeSelected', (data) => this.handleUpgradeSelected(data));
    this.socket.on('shopUpdate', (data) => this.handleShopUpdate(data));
  }

  handleInit(data) {
    gameState.initialize(data);
  }

  handleGameState(state) {
    // Client-side prediction for local player
    if (gameState.state && gameState.state.players && gameState.state.players[gameState.playerId]) {
      const localPlayer = gameState.state.players[gameState.playerId];
      const { x, y, angle } = localPlayer;

      gameState.updateState(state);

      // Restore predicted position
      if (gameState.state.players[gameState.playerId]) {
        gameState.state.players[gameState.playerId].x = x;
        gameState.state.players[gameState.playerId].y = y;
        gameState.state.players[gameState.playerId].angle = angle;
      }
    } else {
      gameState.updateState(state);
    }

    gameUI.update();
  }

  handleBossSpawned(data) {
    gameUI.showBossAnnouncement(data.bossName);
  }

  handleNewWave(data) {
    gameUI.showNewWaveAnnouncement(data.wave, data.zombiesCount);
    setTimeout(() => gameUI.showShop(), CONSTANTS.ANIMATIONS.SHOP_DELAY);
  }

  handleLevelUp(data) {
    if (data.milestoneBonus) {
      gameUI.showMilestoneBonus(data.milestoneBonus, data.newLevel);
      setTimeout(() => {
        gameUI.showLevelUpScreen(data.newLevel, data.upgradeChoices);
      }, CONSTANTS.ANIMATIONS.MILESTONE_DELAY);
    } else {
      gameUI.showLevelUpScreen(data.newLevel, data.upgradeChoices);
    }
  }

  handleRoomChanged(data) {
    gameUI.showRoomAnnouncement(data.roomIndex + 1, data.totalRooms);
  }

  handleRunCompleted(data) {
    gameUI.showRunCompleted(data.gold, data.level);
  }

  handleUpgradeSelected(data) {
    if (data.success) {
      console.log('✅ Upgrade selected:', data.upgradeId);
    }
  }

  handleShopUpdate(data) {
    if (data.success && gameUI.shopOpen) {
      gameUI.populateShop();
    }
  }

  // Send events to server
  setNickname(nickname) {
    this.socket.emit('setNickname', { nickname });
  }

  endSpawnProtection() {
    this.socket.emit('endSpawnProtection');
  }

  playerMove(x, y, angle) {
    this.socket.emit('playerMove', { x, y, angle });
  }

  shoot(angle) {
    this.socket.emit('shoot', { angle });
  }

  respawn() {
    this.socket.emit('respawn');
  }

  selectUpgrade(upgradeId) {
    this.socket.emit('selectUpgrade', { upgradeId });
  }

  buyItem(itemId, category) {
    this.socket.emit('buyItem', { itemId, category });
  }
}

/* ============================================
   PLAYER CONTROLLER
   ============================================ */

class PlayerController {
  constructor(inputManager, networkManager, gameState, camera, canvas) {
    this.input = inputManager;
    this.network = networkManager;
    this.gameState = gameState;
    this.camera = camera;
    this.canvas = canvas;
    this.nickname = null;
    this.gameStarted = false;
    this.spawnProtectionEndTime = 0;
  }

  setNickname(nickname) {
    this.nickname = nickname;
    this.gameStarted = true;
    this.network.setNickname(nickname);

    // Start spawn protection
    this.spawnProtectionEndTime = Date.now() + CONSTANTS.SPAWN_PROTECTION.DURATION;
  }

  update(canvasWidth, canvasHeight) {
    const player = this.gameState.getPlayer();
    if (!player || !player.alive) {
      return;
    }

    // Always update camera to follow player, even before game starts
    this.camera.follow(player, canvasWidth, canvasHeight);

    // Only allow movement after game has started
    if (!this.gameStarted) return;

    // Update movement
    const { dx, dy } = this.input.getMovementVector();

    if (dx !== 0 || dy !== 0) {
      // Calculate speed with multipliers
      let speed = this.gameState.config.PLAYER_SPEED;
      speed *= (player.speedMultiplier || 1);

      if (player.speedBoost && Date.now() < player.speedBoost) {
        speed *= 1.5;
      }

      if (player.slowedUntil && Date.now() < player.slowedUntil) {
        speed *= (player.slowAmount || 1);
      }

      // Calculate new position
      const newX = player.x + dx * speed;
      const newY = player.y + dy * speed;

      // Calculate aim angle
      const angle = Math.atan2(
        this.input.mouse.y - canvasHeight / 2,
        this.input.mouse.x - canvasWidth / 2
      );

      // Client-side prediction
      player.x = newX;
      player.y = newY;
      player.angle = angle;

      // Send to server
      this.network.playerMove(newX, newY, angle);
    }
  }

  shoot() {
    const player = this.gameState.getPlayer();
    if (!player || !player.alive || !this.gameStarted) return;

    const angle = Math.atan2(
      this.input.mouse.y - this.canvas.height / 2,
      this.input.mouse.x - this.canvas.width / 2
    );

    this.network.shoot(angle);
  }

  respawn() {
    this.gameStarted = false;
    this.nickname = null;
    this.network.respawn();
  }

  isSpawnProtectionActive() {
    return Date.now() < this.spawnProtectionEndTime;
  }
}

/* ============================================
   RENDERER
   ============================================ */

class Renderer {
  constructor(canvas, ctx, minimapCanvas, minimapCtx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCtx;
    this.camera = null;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(gameState, playerId) {
    this.clear();

    const player = gameState.state.players[playerId];
    if (!player) {
      this.renderWaitingMessage();
      return;
    }

    const cameraPos = this.camera.getPosition();

    this.ctx.save();
    this.ctx.translate(-cameraPos.x, -cameraPos.y);

    // Render layers (bottom to top)
    this.renderFloor(gameState.config);
    this.renderGrid(gameState.config);
    this.renderWalls(gameState.state.walls);
    this.renderDoors(gameState.state.doors);
    this.renderPowerups(gameState.state.powerups, gameState.powerupTypes, gameState.config);
    this.renderLoot(gameState.state.loot, gameState.config);
    this.renderParticles(gameState.state.particles);
    this.renderBullets(gameState.state.bullets, gameState.config);
    this.renderZombies(gameState.state.zombies);
    this.renderPlayers(gameState.state.players, playerId, gameState.config);

    this.ctx.restore();

    // Render minimap
    this.renderMinimap(gameState, playerId);
  }

  renderWaitingMessage() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Connexion au serveur...', this.canvas.width / 2, this.canvas.height / 2);
  }

  renderFloor(config) {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, config.ROOM_WIDTH, config.ROOM_HEIGHT);
  }

  renderGrid(config) {
    this.ctx.strokeStyle = '#252541';
    this.ctx.lineWidth = 1;

    const gridSize = CONSTANTS.CANVAS.GRID_SIZE;

    for (let x = 0; x < config.ROOM_WIDTH; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, config.ROOM_HEIGHT);
      this.ctx.stroke();
    }

    for (let y = 0; y < config.ROOM_HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(config.ROOM_WIDTH, y);
      this.ctx.stroke();
    }
  }

  renderWalls(walls) {
    this.ctx.fillStyle = '#2d2d44';

    walls.forEach(wall => {
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      this.ctx.strokeStyle = '#3d3d54';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });
  }

  renderDoors(doors) {
    if (!doors || !Array.isArray(doors)) return;

    doors.forEach(door => {
      this.ctx.fillStyle = door.active ? '#00ff00' : '#ff0000';
      this.ctx.fillRect(door.x, door.y, door.width, door.height);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(door.active ? '▲' : '✖', door.x + door.width / 2, door.y + 15);
    });
  }

  renderPowerups(powerups, powerupTypes, config) {
    Object.values(powerups).forEach(powerup => {
      const type = powerupTypes[powerup.type];
      if (!type) return;

      const pulse = Math.sin(Date.now() / 200) * 3 + config.POWERUP_SIZE;

      this.ctx.fillStyle = type.color;
      this.ctx.beginPath();
      this.ctx.arc(powerup.x, powerup.y, pulse, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Icon
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const symbols = {
        health: '+',
        speed: '»',
        shotgun: 'S',
        machinegun: 'M'
      };

      this.ctx.fillText(symbols[powerup.type] || '?', powerup.x, powerup.y);
    });
  }

  renderLoot(loot, config) {
    Object.values(loot).forEach(item => {
      const rotation = (Date.now() / 500) % (Math.PI * 2);

      this.ctx.save();
      this.ctx.translate(item.x, item.y);
      this.ctx.rotate(rotation);

      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, config.LOOT_SIZE, config.LOOT_SIZE * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#ff8c00';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  renderParticles(particles) {
    Object.values(particles).forEach(particle => {
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = 0.7;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  renderBullets(bullets, config) {
    Object.values(bullets).forEach(bullet => {
      this.ctx.fillStyle = bullet.color || '#ffff00';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = bullet.color || '#ffff00';
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, config.BULLET_SIZE, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  renderZombies(zombies) {
    Object.values(zombies).forEach(zombie => {
      // Body
      this.ctx.fillStyle = zombie.color;
      this.ctx.beginPath();
      this.ctx.arc(zombie.x, zombie.y, zombie.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = zombie.isBoss ? 4 : 2;
      this.ctx.stroke();

      // Eyes
      const eyeSize = zombie.isBoss ? 6 : 3;
      const eyeOffset = zombie.size * 0.3;
      this.ctx.fillStyle = '#ff0000';
      this.ctx.beginPath();
      this.ctx.arc(zombie.x - eyeOffset, zombie.y - 5, eyeSize, 0, Math.PI * 2);
      this.ctx.arc(zombie.x + eyeOffset, zombie.y - 5, eyeSize, 0, Math.PI * 2);
      this.ctx.fill();

      // Health bar
      if (zombie.maxHealth) {
        const healthPercent = zombie.health / zombie.maxHealth;
        const barWidth = zombie.size * 1.6;
        const barY = zombie.y - zombie.size - 10;

        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(zombie.x - barWidth / 2, barY, barWidth * healthPercent, 5);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(zombie.x - barWidth / 2, barY, barWidth, 5);
      }

      // Boss label
      if (zombie.isBoss) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('BOSS', zombie.x, zombie.y - zombie.size - 25);
        this.ctx.fillText('BOSS', zombie.x, zombie.y - zombie.size - 25);
      }

      // Special zombie indicators
      this.renderZombieSpecialIndicator(zombie);
    });
  }

  renderZombieSpecialIndicator(zombie) {
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (zombie.type === 'explosive') {
      this.ctx.fillStyle = '#fff';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeText('💣', zombie.x, zombie.y);
      this.ctx.fillText('💣', zombie.x, zombie.y);
    } else if (zombie.type === 'healer') {
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
      this.ctx.strokeStyle = '#00ffff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(zombie.x, zombie.y, zombie.size + 10 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.fillStyle = '#fff';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeText('+', zombie.x, zombie.y);
      this.ctx.fillText('+', zombie.x, zombie.y);
    } else if (zombie.type === 'slower') {
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
      this.ctx.strokeStyle = '#8800ff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(zombie.x, zombie.y, zombie.size + 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.fillStyle = '#fff';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeText('⏱', zombie.x, zombie.y);
      this.ctx.fillText('⏱', zombie.x, zombie.y);
    }
  }

  renderPlayers(players, currentPlayerId, config) {
    Object.entries(players).forEach(([pid, p]) => {
      const isCurrentPlayer = pid === currentPlayerId;
      if (!p.alive) return;

      // Speed effect
      if (p.speedBoost && Date.now() < p.speedBoost) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00ffff';
      }

      // Body
      this.ctx.fillStyle = isCurrentPlayer ? '#0088ff' : '#ff8800';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, config.PLAYER_SIZE, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Border
      this.ctx.strokeStyle = isCurrentPlayer ? '#00ffff' : '#ffaa00';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // Weapon direction
      const weaponLength = config.PLAYER_SIZE * 2;
      this.ctx.strokeStyle = isCurrentPlayer ? '#00ffff' : '#ffaa00';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(
        p.x + Math.cos(p.angle) * weaponLength,
        p.y + Math.sin(p.angle) * weaponLength
      );
      this.ctx.stroke();

      // Player name and level
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 3;
      const playerLabel = isCurrentPlayer ? `Vous (Lv${p.level || 1})` : `Joueur (Lv${p.level || 1})`;
      this.ctx.strokeText(playerLabel, p.x, p.y - config.PLAYER_SIZE - 15);
      this.ctx.fillText(playerLabel, p.x, p.y - config.PLAYER_SIZE - 15);

      // Health bar
      const healthPercent = p.health / p.maxHealth;
      this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
      this.ctx.fillRect(p.x - 20, p.y + config.PLAYER_SIZE + 5, 40 * healthPercent, 5);
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(p.x - 20, p.y + config.PLAYER_SIZE + 5, 40, 5);
    });
  }

  renderMinimap(gameState, playerId) {
    if (!gameState.config.ROOM_WIDTH) return;

    const mapWidth = this.minimapCanvas.width;
    const mapHeight = this.minimapCanvas.height;
    const scaleX = mapWidth / gameState.config.ROOM_WIDTH;
    const scaleY = mapHeight / gameState.config.ROOM_HEIGHT;

    // Background
    this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Walls
    this.minimapCtx.fillStyle = '#444';
    gameState.state.walls.forEach(wall => {
      this.minimapCtx.fillRect(
        wall.x * scaleX,
        wall.y * scaleY,
        wall.width * scaleX,
        wall.height * scaleY
      );
    });

    // Zombies
    Object.values(gameState.state.zombies).forEach(zombie => {
      this.minimapCtx.fillStyle = zombie.isBoss ? '#ff0000' : zombie.color;
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(zombie.x * scaleX, zombie.y * scaleY, zombie.isBoss ? 6 : 3, 0, Math.PI * 2);
      this.minimapCtx.fill();
    });

    // Loot
    this.minimapCtx.fillStyle = '#ffd700';
    Object.values(gameState.state.loot).forEach(loot => {
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(loot.x * scaleX, loot.y * scaleY, 2, 0, Math.PI * 2);
      this.minimapCtx.fill();
    });

    // Powerups
    this.minimapCtx.fillStyle = '#ffff00';
    Object.values(gameState.state.powerups).forEach(powerup => {
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(powerup.x * scaleX, powerup.y * scaleY, 3, 0, Math.PI * 2);
      this.minimapCtx.fill();
    });

    // Other players
    this.minimapCtx.fillStyle = '#ff8800';
    Object.entries(gameState.state.players).forEach(([pid, p]) => {
      if (pid === playerId || !p.alive) return;
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(p.x * scaleX, p.y * scaleY, 4, 0, Math.PI * 2);
      this.minimapCtx.fill();
    });

    // Current player
    const player = gameState.state.players[playerId];
    if (player && player.alive) {
      this.minimapCtx.fillStyle = '#0088ff';
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(player.x * scaleX, player.y * scaleY, 5, 0, Math.PI * 2);
      this.minimapCtx.fill();

      // Direction
      this.minimapCtx.strokeStyle = '#00ffff';
      this.minimapCtx.lineWidth = 2;
      this.minimapCtx.beginPath();
      this.minimapCtx.moveTo(player.x * scaleX, player.y * scaleY);
      this.minimapCtx.lineTo(
        player.x * scaleX + Math.cos(player.angle) * 10,
        player.y * scaleY + Math.sin(player.angle) * 10
      );
      this.minimapCtx.stroke();
    }

    // Border
    this.minimapCtx.strokeStyle = '#00ff00';
    this.minimapCtx.lineWidth = 2;
    this.minimapCtx.strokeRect(0, 0, mapWidth, mapHeight);
  }
}

/* ============================================
   UI MANAGER
   ============================================ */

class UIManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.shopOpen = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Shop close button
    document.getElementById('shop-close-btn').addEventListener('click', () => {
      this.hideShop();
    });

    // Make buyItem global for onclick handlers
    window.buyItem = (itemId, category) => {
      networkManager.buyItem(itemId, category);
    };
  }

  update() {
    const player = this.gameState.getPlayer();
    if (!player) return;

    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = Math.max(0, Math.round(player.health));

    // XP and level
    if (player.level && player.xp !== undefined) {
      const xpNeeded = this.getXPForLevel(player.level);
      const xpPercent = (player.xp / xpNeeded) * 100;
      document.getElementById('xp-fill').style.width = xpPercent + '%';
      document.getElementById('level-text').textContent = player.level;
      document.getElementById('xp-text').textContent = `${Math.floor(player.xp)}/${xpNeeded}`;
    }

    // Stats
    document.getElementById('score-value').textContent = player.score;
    document.getElementById('wave-value').textContent = `${this.gameState.state.wave || 1}`;
    document.getElementById('gold-value').textContent = player.gold || 0;

    // Game over
    if (!player.alive) {
      document.getElementById('game-over').style.display = 'block';
      document.getElementById('final-score').textContent = player.score;
      document.getElementById('final-wave').textContent = `${this.gameState.state.wave || 1}`;
    }

    // Player count
    document.getElementById('players-count').textContent = Object.keys(this.gameState.state.players).length;
    document.getElementById('zombies-count').textContent = Object.keys(this.gameState.state.zombies).length;
  }

  getXPForLevel(level) {
    if (level <= 5) {
      return 50 + (level - 1) * 30;
    } else if (level <= 10) {
      return 200 + (level - 5) * 50;
    } else if (level <= 20) {
      return 400 + (level - 10) * 75;
    } else {
      return Math.floor(1000 + (level - 20) * 100);
    }
  }

  showBossAnnouncement(bossName) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').textContent = 'BOSS !';
    announcement.querySelector('p').textContent = bossName;
    announcement.style.background = 'rgba(255, 0, 0, 0.9)';
    announcement.style.display = 'block';

    setTimeout(() => {
      announcement.style.display = 'none';
      announcement.style.background = 'rgba(255, 170, 0, 0.9)';
    }, CONSTANTS.ANIMATIONS.BOSS_ANNOUNCEMENT);
  }

  showNewWaveAnnouncement(wave, zombiesCount) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').innerHTML = `VAGUE ${wave}`;
    announcement.querySelector('p').textContent = `${zombiesCount} zombies à éliminer !`;
    announcement.style.background = 'rgba(0, 255, 100, 0.9)';
    announcement.style.display = 'block';

    setTimeout(() => {
      announcement.style.display = 'none';
      announcement.style.background = 'rgba(255, 170, 0, 0.9)';
    }, 3000);
  }

  showMilestoneBonus(bonus, level) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').innerHTML = `${bonus.icon} ${bonus.title}`;
    announcement.querySelector('p').textContent = bonus.description;
    announcement.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%)';
    announcement.style.border = '4px solid #FFD700';
    announcement.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8)';
    announcement.style.display = 'block';

    setTimeout(() => {
      announcement.style.display = 'none';
      announcement.style.background = 'rgba(255, 170, 0, 0.9)';
      announcement.style.border = 'none';
      announcement.style.boxShadow = 'none';
    }, CONSTANTS.ANIMATIONS.MILESTONE_DELAY);
  }

  showLevelUpScreen(newLevel, upgradeChoices) {
    const levelUpScreen = document.getElementById('level-up-screen');
    const upgradeChoicesContainer = document.getElementById('upgrade-choices');

    const levelUpTitle = levelUpScreen.querySelector('.level-up-title');
    levelUpTitle.textContent = `⬆️ NIVEAU ${newLevel} ! ⬆️`;

    // Animate title
    levelUpTitle.style.animation = 'none';
    setTimeout(() => {
      levelUpTitle.style.animation = 'pulse 1s ease-in-out infinite';
    }, 10);

    // Clear previous choices
    upgradeChoicesContainer.innerHTML = '';

    // Create upgrade cards
    upgradeChoices.forEach(upgrade => {
      const card = document.createElement('div');
      card.className = `upgrade-card ${upgrade.rarity}`;
      card.innerHTML = `
        <div class="upgrade-rarity">${upgrade.rarity}</div>
        <div class="upgrade-name">${upgrade.name}</div>
        <div class="upgrade-description">${upgrade.description}</div>
      `;

      card.addEventListener('click', () => {
        networkManager.selectUpgrade(upgrade.id);
        levelUpScreen.style.display = 'none';
      });

      upgradeChoicesContainer.appendChild(card);
    });

    levelUpScreen.style.display = 'flex';
  }

  showRoomAnnouncement(roomNum, totalRooms) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').textContent = `Salle ${roomNum}/${totalRooms}`;
    announcement.querySelector('p').textContent = 'En avant!';
    announcement.style.display = 'block';

    setTimeout(() => {
      announcement.style.display = 'none';
    }, 2000);
  }

  showRunCompleted(gold, level) {
    alert(`Run complété! Or gagné: ${gold}, Niveau atteint: ${level}`);
  }

  showShop() {
    const player = this.gameState.getPlayer();
    if (!player || !player.alive) return;

    this.shopOpen = true;
    document.getElementById('shop').style.display = 'block';
    this.populateShop();
  }

  hideShop() {
    this.shopOpen = false;
    document.getElementById('shop').style.display = 'none';
  }

  populateShop() {
    const player = this.gameState.getPlayer();
    if (!player) return;

    // Update gold display
    document.getElementById('shop-gold').textContent = player.gold || 0;

    // Populate permanent upgrades
    const permanentContainer = document.getElementById('permanent-upgrades');
    permanentContainer.innerHTML = '';

    for (let key in this.gameState.shopItems.permanent) {
      const item = this.gameState.shopItems.permanent[key];
      const currentLevel = player.upgrades[key] || 0;
      const cost = item.baseCost + (currentLevel * item.costIncrease);
      const isMaxed = currentLevel >= item.maxLevel;
      const canAfford = player.gold >= cost;

      const itemDiv = document.createElement('div');
      itemDiv.className = `shop-item ${isMaxed ? 'maxed' : ''}`;

      itemDiv.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.description}</div>
          <div class="shop-item-level">Niveau: ${currentLevel}/${item.maxLevel}</div>
        </div>
        <div class="shop-item-buy">
          <div class="shop-item-price">${isMaxed ? 'MAX' : cost + ' 💰'}</div>
          <button class="shop-buy-btn" ${isMaxed || !canAfford ? 'disabled' : ''}
                  onclick="buyItem('${key}', 'permanent')">
            ${isMaxed ? 'MAX' : 'Acheter'}
          </button>
        </div>
      `;

      permanentContainer.appendChild(itemDiv);
    }

    // Populate temporary items
    const temporaryContainer = document.getElementById('temporary-items');
    temporaryContainer.innerHTML = '';

    for (let key in this.gameState.shopItems.temporary) {
      const item = this.gameState.shopItems.temporary[key];
      const canAfford = player.gold >= item.cost;

      const itemDiv = document.createElement('div');
      itemDiv.className = 'shop-item';

      itemDiv.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.description}</div>
        </div>
        <div class="shop-item-buy">
          <div class="shop-item-price">${item.cost} 💰</div>
          <button class="shop-buy-btn" ${!canAfford ? 'disabled' : ''}
                  onclick="buyItem('${key}', 'temporary')">
            Acheter
          </button>
        </div>
      `;

      temporaryContainer.appendChild(itemDiv);
    }
  }

  toggleStatsPanel() {
    const statsPanel = document.getElementById('stats-panel');
    const isVisible = statsPanel.style.display === 'block';

    if (isVisible) {
      statsPanel.style.display = 'none';
    } else {
      statsPanel.style.display = 'block';
      this.updateStatsPanel();
    }
  }

  updateStatsPanel() {
    const player = this.gameState.getPlayer();
    if (!player) return;

    // Base stats
    const baseStatsContainer = document.getElementById('base-stats');
    baseStatsContainer.innerHTML = `
      <div class="stat-item">
        <span class="stat-name">❤️ Vie</span>
        <span class="stat-value">${Math.round(player.health)} / ${player.maxHealth}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">⚔️ Multiplicateur de Dégâts</span>
        <span class="stat-value multiplier">x${(player.damageMultiplier || 1).toFixed(2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">👟 Multiplicateur de Vitesse</span>
        <span class="stat-value multiplier">x${(player.speedMultiplier || 1).toFixed(2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">🔫 Multiplicateur Cadence</span>
        <span class="stat-value multiplier">x${(player.fireRateMultiplier || 1).toFixed(2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">📊 Niveau</span>
        <span class="stat-value">${player.level || 1}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">💰 Or</span>
        <span class="stat-value">${player.gold || 0}</span>
      </div>
    `;

    // Active upgrades
    this.updateActiveUpgrades(player);

    // Shop upgrades
    this.updateShopUpgrades(player);
  }

  updateActiveUpgrades(player) {
    const container = document.getElementById('active-upgrades');
    let hasUpgrades = false;
    let html = '';

    const upgrades = [
      { condition: player.regeneration > 0, html: `<div class="stat-item rare"><span class="stat-name">💚 Régénération</span><span class="stat-value">+${player.regeneration} PV/sec</span></div>` },
      { condition: player.bulletPiercing > 0, html: `<div class="stat-item rare"><span class="stat-name">🎯 Balles Perforantes</span><span class="stat-value">+${player.bulletPiercing} ennemis</span></div>` },
      { condition: player.lifeSteal > 0, html: `<div class="stat-item rare"><span class="stat-name">🩸 Vol de Vie</span><span class="stat-value">${(player.lifeSteal * 100).toFixed(0)}%</span></div>` },
      { condition: player.criticalChance > 0, html: `<div class="stat-item rare"><span class="stat-name">💥 Chance Critique</span><span class="stat-value">${(player.criticalChance * 100).toFixed(0)}%</span></div>` },
      { condition: player.goldMagnetRadius > 0, html: `<div class="stat-item"><span class="stat-name">💰 Aimant à Or</span><span class="stat-value">+${player.goldMagnetRadius}px</span></div>` },
      { condition: player.dodgeChance > 0, html: `<div class="stat-item rare"><span class="stat-name">🌀 Esquive</span><span class="stat-value">${(player.dodgeChance * 100).toFixed(0)}%</span></div>` },
      { condition: player.explosiveRounds, html: `<div class="stat-item legendary"><span class="stat-name">💣 Munitions Explosives</span><span class="stat-value">Rayon ${player.explosionRadius}px</span></div>` },
      { condition: player.extraBullets > 0, html: `<div class="stat-item legendary"><span class="stat-name">🎆 Balles Supplémentaires</span><span class="stat-value">+${player.extraBullets}</span></div>` },
      { condition: player.thorns > 0, html: `<div class="stat-item rare"><span class="stat-name">🛡️ Épines</span><span class="stat-value">${(player.thorns * 100).toFixed(0)}%</span></div>` }
    ];

    upgrades.forEach(upgrade => {
      if (upgrade.condition) {
        hasUpgrades = true;
        html += upgrade.html;
      }
    });

    container.innerHTML = hasUpgrades ? html : '<div class="no-upgrades">Aucune amélioration active</div>';
  }

  updateShopUpgrades(player) {
    const container = document.getElementById('permanent-shop-upgrades');
    let hasUpgrades = false;
    let html = '';

    if (player.upgrades && player.upgrades.maxHealth > 0) {
      hasUpgrades = true;
      html += `<div class="stat-item"><span class="stat-name">❤️ Vie Maximum</span><span class="stat-value">Niveau ${player.upgrades.maxHealth}/10</span></div>`;
    }

    if (player.upgrades && player.upgrades.damage > 0) {
      hasUpgrades = true;
      html += `<div class="stat-item"><span class="stat-name">⚔️ Dégâts</span><span class="stat-value">Niveau ${player.upgrades.damage}/5</span></div>`;
    }

    if (player.upgrades && player.upgrades.speed > 0) {
      hasUpgrades = true;
      html += `<div class="stat-item"><span class="stat-name">👟 Vitesse</span><span class="stat-value">Niveau ${player.upgrades.speed}/5</span></div>`;
    }

    if (player.upgrades && player.upgrades.fireRate > 0) {
      hasUpgrades = true;
      html += `<div class="stat-item"><span class="stat-name">🔫 Cadence de Tir</span><span class="stat-value">Niveau ${player.upgrades.fireRate}/5</span></div>`;
    }

    container.innerHTML = hasUpgrades ? html : '<div class="no-upgrades">Aucun upgrade permanent acheté</div>';
  }
}

/* ============================================
   NICKNAME MANAGER
   ============================================ */

class NicknameManager {
  constructor(playerController) {
    this.playerController = playerController;
    this.nicknameInput = document.getElementById('nickname-input');
    this.startGameBtn = document.getElementById('start-game-btn');
    this.nicknameScreen = document.getElementById('nickname-screen');
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.startGame();
      }
    });

    this.startGameBtn.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('respawn-btn').addEventListener('click', () => {
      this.respawn();
    });
  }

  startGame() {
    const nickname = this.nicknameInput.value.trim();

    if (nickname.length < CONSTANTS.NICKNAME.MIN_LENGTH) {
      alert(`Votre pseudo doit contenir au moins ${CONSTANTS.NICKNAME.MIN_LENGTH} caractères !`);
      return;
    }

    if (nickname.length > CONSTANTS.NICKNAME.MAX_LENGTH) {
      alert(`Votre pseudo ne peut pas dépasser ${CONSTANTS.NICKNAME.MAX_LENGTH} caractères !`);
      return;
    }

    // Hide nickname screen
    this.nicknameScreen.style.display = 'none';

    // Set player nickname
    this.playerController.setNickname(nickname);

    // Display player name
    document.getElementById('player-name-display').textContent = `🎮 ${nickname}`;

    // Show spawn protection
    this.showSpawnProtection();
  }

  showSpawnProtection() {
    const protectionDiv = document.getElementById('spawn-protection');
    const timerSpan = document.getElementById('protection-timer');

    protectionDiv.style.display = 'block';

    const interval = setInterval(() => {
      const remaining = Math.ceil((this.playerController.spawnProtectionEndTime - Date.now()) / 1000);

      if (remaining <= 0) {
        protectionDiv.style.display = 'none';
        clearInterval(interval);
        networkManager.endSpawnProtection();
      } else {
        timerSpan.textContent = remaining;
      }
    }, CONSTANTS.SPAWN_PROTECTION.UPDATE_INTERVAL);
  }

  respawn() {
    this.playerController.respawn();
    document.getElementById('game-over').style.display = 'none';

    // Show nickname screen again
    this.nicknameInput.value = '';
    this.nicknameScreen.style.display = 'flex';
    this.nicknameInput.focus();
  }
}

/* ============================================
   GAME ENGINE
   ============================================ */

class GameEngine {
  constructor() {
    this.setupCanvas();
    this.initializeManagers();
    this.start();
  }

  setupCanvas() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Resize canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initializeManagers() {
    // Global game state
    window.gameState = new GameStateManager();

    // Managers
    window.inputManager = new InputManager();
    const camera = new CameraManager();
    window.networkManager = new NetworkManager(io());
    window.gameUI = new UIManager(gameState);

    this.playerController = new PlayerController(inputManager, networkManager, gameState, camera, this.canvas);
    this.renderer = new Renderer(this.canvas, this.ctx, this.minimapCanvas, this.minimapCtx);
    this.renderer.setCamera(camera);

    this.nicknameManager = new NicknameManager(this.playerController);

    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => {
      inputManager.updateMouse(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('click', () => {
      this.playerController.shoot();
    });
  }

  update() {
    this.playerController.update(this.canvas.width, this.canvas.height);
  }

  render() {
    this.renderer.render(gameState, gameState.playerId);
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  start() {
    console.log('🎮 Zombie Survival - Game Engine Started');
    this.gameLoop();
  }
}

/* ============================================
   GAME INITIALIZATION
   ============================================ */

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new GameEngine();
  });
} else {
  new GameEngine();
}
