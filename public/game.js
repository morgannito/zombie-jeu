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
    this.mobileControls = null;
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

  setMobileControls(mobileControls) {
    this.mobileControls = mobileControls;
  }

  getMovementVector() {
    let dx = 0;
    let dy = 0;

    // Mobile joystick input (takes priority)
    if (this.mobileControls && this.mobileControls.isActive()) {
      const joystickVector = this.mobileControls.getJoystickVector();
      dx = joystickVector.dx;
      dy = joystickVector.dy;
    } else {
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
    }

    return { dx, dy };
  }
}

/* ============================================
   AUDIO MANAGER (Simple synthesized sounds)
   ============================================ */

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  play(soundType) {
    if (!this.enabled || !this.audioContext) return;

    // Resume audio context if needed (for mobile auto-play restrictions)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;

    switch (soundType) {
      case 'shoot':
        this.playShoot(now);
        break;
      case 'doubleClick':
        this.playDoubleClick(now);
        break;
      case 'longPress':
        this.playLongPress(now);
        break;
      case 'swipe':
        this.playSwipe(now);
        break;
      case 'click':
        this.playClick(now);
        break;
      default:
        break;
    }
  }

  playShoot(startTime) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.setValueAtTime(800, startTime);
    osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.1);

    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

    osc.start(startTime);
    osc.stop(startTime + 0.1);
  }

  playDoubleClick(startTime) {
    for (let i = 0; i < 2; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      const time = startTime + i * 0.1;
      osc.frequency.setValueAtTime(1200, time);
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      osc.start(time);
      osc.stop(time + 0.05);
    }
  }

  playLongPress(startTime) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.setValueAtTime(600, startTime);
    osc.frequency.linearRampToValueAtTime(900, startTime + 0.2);

    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }

  playSwipe(startTime) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.setValueAtTime(400, startTime);
    osc.frequency.exponentialRampToValueAtTime(1200, startTime + 0.15);

    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  playClick(startTime) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.setValueAtTime(1000, startTime);
    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

    osc.start(startTime);
    osc.stop(startTime + 0.05);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

/* ============================================
   MOBILE CONTROLS MANAGER
   ============================================ */

class MobileControlsManager {
  constructor() {
    this.isMobile = this.detectMobile();
    this.joystickActive = false;
    this.joystickVector = { dx: 0, dy: 0 };
    this.autoShootActive = false;
    this.autoShootInterval = null;
    this.currentTarget = null; // Store current auto-shoot target

    // Gesture detection properties
    this.lastTapTime = 0;
    this.tapCount = 0;
    this.longPressTimer = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.swipeStartTime = 0;

    if (this.isMobile) {
      this.showMobileControls();
      this.setupJoystick();
      this.setupAutoShoot();
      this.setupAdvancedGestures();
    }
  }

  detectMobile() {
    // Check for touch support and screen size
    const isTouchDevice = ('ontouchstart' in window) ||
                         (navigator.maxTouchPoints > 0) ||
                         (navigator.msMaxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 768;
    return isTouchDevice && isSmallScreen;
  }

  showMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
    } else {
      console.warn('Mobile controls: Container element not found');
    }

    // Hide instructions on mobile
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
  }

  setupJoystick() {
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');

    if (!joystickBase || !joystickStick) {
      console.warn('Mobile controls: Joystick elements not found');
      return;
    }

    let touchId = null;
    const maxDistance = 45; // Maximum distance the stick can move from center

    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchId = touch.identifier;
      this.joystickActive = true;
      joystickBase.classList.add('active');
      joystickStick.classList.add('active');
      this.updateJoystickPosition(touch, joystickBase, joystickStick, maxDistance);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;

      const touch = Array.from(e.touches).find(t => t.identifier === touchId);
      if (touch) {
        this.updateJoystickPosition(touch, joystickBase, joystickStick, maxDistance);
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      this.joystickActive = false;
      this.joystickVector = { dx: 0, dy: 0 };
      joystickBase.classList.remove('active');
      joystickStick.classList.remove('active');

      // Reset stick position
      joystickStick.style.transform = 'translate(-50%, -50%)';
    };

    joystickBase.addEventListener('touchstart', handleTouchStart, { passive: false });
    joystickBase.addEventListener('touchmove', handleTouchMove, { passive: false });
    joystickBase.addEventListener('touchend', handleTouchEnd, { passive: false });
    joystickBase.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  updateJoystickPosition(touch, base, stick, maxDistance) {
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;

    // Calculate distance from center
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Limit to max distance
    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxDistance;
      dy = Math.sin(angle) * maxDistance;
    }

    // Update stick visual position
    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    // Normalize vector for movement (-1 to 1)
    this.joystickVector = {
      dx: dx / maxDistance,
      dy: dy / maxDistance
    };
  }

  setupAutoShoot() {
    const autoShootBtn = document.getElementById('auto-shoot-btn');
    if (!autoShootBtn) {
      console.warn('Mobile controls: Auto-shoot button not found');
      return;
    }

    autoShootBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggleAutoShoot();
    });
  }

  toggleAutoShoot() {
    this.autoShootActive = !this.autoShootActive;
    const autoShootBtn = document.getElementById('auto-shoot-btn');

    if (this.autoShootActive) {
      autoShootBtn.classList.add('active');
      this.startAutoShoot();
      if (window.audioManager) {
        window.audioManager.play('click');
      }
    } else {
      autoShootBtn.classList.remove('active');
      this.stopAutoShoot();
      if (window.audioManager) {
        window.audioManager.play('click');
      }
    }
  }

  startAutoShoot() {
    // Auto shoot every 100ms when active (server will handle fire rate limiting)
    this.autoShootInterval = setInterval(() => {
      if (!this.autoShootActive) return;

      // Verify all required objects exist
      if (!window.gameState || !window.networkManager || !window.playerController) return;

      const player = window.gameState.getPlayer();
      if (!player || !player.alive || !playerController.gameStarted) return;

      // Find nearest zombie and shoot at it
      const nearestZombie = this.findNearestZombie(player);
      this.currentTarget = nearestZombie; // Store for visual indicator

      if (nearestZombie) {
        const angle = Math.atan2(
          nearestZombie.y - player.y,
          nearestZombie.x - player.x
        );
        // Mettre à jour l'angle visuel du canon
        player.angle = angle;
        window.networkManager.shoot(angle);
      }
    }, 100);
  }

  stopAutoShoot() {
    if (this.autoShootInterval) {
      clearInterval(this.autoShootInterval);
      this.autoShootInterval = null;
    }
    this.currentTarget = null; // Clear target when stopping
  }

  getCurrentTarget() {
    return this.currentTarget;
  }

  findNearestZombie(player) {
    if (!window.gameState || !window.gameState.state || !window.gameState.state.zombies) {
      return null;
    }

    const zombies = Object.values(window.gameState.state.zombies);
    if (zombies.length === 0) return null;

    let nearestZombie = null;
    let minScore = Infinity;

    zombies.forEach(zombie => {
      const dx = zombie.x - player.x;
      const dy = zombie.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate angle to zombie
      const angleToZombie = Math.atan2(dy, dx);
      const playerAngle = player.angle || 0;

      // Calculate angle difference (normalized to -π to π)
      let angleDiff = angleToZombie - playerAngle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Aim assist: prefer zombies in front of player
      // Score = distance * angle_penalty
      // Zombies directly in front have angle_penalty = 1
      // Zombies behind have angle_penalty > 2
      const anglePenalty = 1 + Math.abs(angleDiff) / Math.PI;

      // Boss zombies get priority (lower score)
      const bossPriority = zombie.isBoss ? 0.5 : 1;

      const score = distance * anglePenalty * bossPriority;

      if (score < minScore) {
        minScore = score;
        nearestZombie = zombie;
      }
    });

    return nearestZombie;
  }

  isActive() {
    return this.joystickActive;
  }

  getJoystickVector() {
    return this.joystickVector;
  }

  setupAdvancedGestures() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // Swipe detection for pause menu (from edge)
    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.swipeStartTime = Date.now();

      // Long press detection
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(touch.clientX, touch.clientY);
      }, 500);
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      // Cancel long press if moved
      if (this.longPressTimer) {
        const touch = e.touches[0];
        const dx = touch.clientX - this.swipeStartX;
        const dy = touch.clientY - this.swipeStartY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.swipeStartX;
      const dy = touch.clientY - this.swipeStartY;
      const dt = Date.now() - this.swipeStartTime;

      // Swipe detection (fast movement)
      if (dt < 300 && Math.abs(dx) > 100) {
        this.handleSwipe(dx > 0 ? 'right' : 'left');
      }
    }, { passive: true });

    // Double-tap on auto-shoot for burst mode
    const autoShootBtn = document.getElementById('auto-shoot-btn');
    if (autoShootBtn) {
      autoShootBtn.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - this.lastTapTime < 300) {
          this.tapCount++;
          if (this.tapCount === 2) {
            this.handleDoubleTap();
            this.tapCount = 0;
          }
        } else {
          this.tapCount = 1;
        }
        this.lastTapTime = now;
      }, { passive: true });
    }
  }

  handleDoubleTap() {
    // Visual feedback for double-tap
    console.log('Double-tap detected on auto-shoot!');
    // Could enable burst mode here
    if (window.audioManager) {
      window.audioManager.play('doubleClick');
    }
  }

  handleLongPress(x, y) {
    // Long press detected
    console.log('Long press detected at', x, y);
    if (window.audioManager) {
      window.audioManager.play('longPress');
    }
    // Could trigger special ability or boost
  }

  handleSwipe(direction) {
    // Swipe detected
    console.log('Swipe detected:', direction);
    if (direction === 'right' && this.swipeStartX < 50) {
      // Swipe from left edge - could open menu
      console.log('Menu swipe from left edge');
      if (window.audioManager) {
        window.audioManager.play('swipe');
      }
    }
  }

  cleanup() {
    this.stopAutoShoot();
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
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
  constructor(inputManager, networkManager, gameState, camera) {
    this.input = inputManager;
    this.network = networkManager;
    this.gameState = gameState;
    this.camera = camera;
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
      let angle;
      // Sur mobile, orienter le canon dans la direction du mouvement du joystick
      if (this.input.mobileControls && this.input.mobileControls.isActive()) {
        angle = Math.atan2(dy, dx);
      } else {
        // Sur desktop, utiliser la position de la souris
        angle = Math.atan2(
          this.input.mouse.y - canvasHeight / 2,
          this.input.mouse.x - canvasWidth / 2
        );
      }

      // Client-side prediction
      player.x = newX;
      player.y = newY;
      player.angle = angle;

      // Send to server
      this.network.playerMove(newX, newY, angle);
    }
  }

  shoot(canvasWidth, canvasHeight) {
    const player = this.gameState.getPlayer();
    if (!player || !player.alive || !this.gameStarted) return;

    const angle = Math.atan2(
      this.input.mouse.y - canvasHeight / 2,
      this.input.mouse.x - canvasWidth / 2
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
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transforms
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  render(gameState, playerId) {
    this.clear();

    // Apply pixel ratio scaling for Retina displays
    const pixelRatio = window.devicePixelRatio || 1;
    this.ctx.save();
    this.ctx.scale(pixelRatio, pixelRatio);

    const player = gameState.state.players[playerId];
    if (!player) {
      this.renderWaitingMessage();
      this.ctx.restore();
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
    this.renderTargetIndicator(player); // Show auto-shoot target indicator

    this.ctx.restore();

    // Render minimap
    this.renderMinimap(gameState, playerId);

    this.ctx.restore(); // Restore pixel ratio scaling
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

  renderPlayerNameBubble(x, y, text, isCurrentPlayer, offsetY = -40) {
    // Measure text to calculate bubble size
    this.ctx.font = 'bold 14px Arial';
    const textMetrics = this.ctx.measureText(text);
    const textWidth = textMetrics.width;

    // Bubble dimensions
    const paddingX = 12;
    const paddingY = 8;
    const bubbleWidth = textWidth + paddingX * 2;
    const bubbleHeight = 24;
    const borderRadius = 12;

    // Bubble position (centered above player)
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y + offsetY - bubbleHeight / 2;

    // Draw bubble background with rounded corners (manual path for compatibility)
    this.ctx.fillStyle = isCurrentPlayer ? 'rgba(0, 136, 255, 0.9)' : 'rgba(255, 136, 0, 0.9)';
    this.ctx.beginPath();
    this.ctx.moveTo(bubbleX + borderRadius, bubbleY);
    this.ctx.lineTo(bubbleX + bubbleWidth - borderRadius, bubbleY);
    this.ctx.arcTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + borderRadius, borderRadius);
    this.ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - borderRadius);
    this.ctx.arcTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - borderRadius, bubbleY + bubbleHeight, borderRadius);
    this.ctx.lineTo(bubbleX + borderRadius, bubbleY + bubbleHeight);
    this.ctx.arcTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - borderRadius, borderRadius);
    this.ctx.lineTo(bubbleX, bubbleY + borderRadius);
    this.ctx.arcTo(bubbleX, bubbleY, bubbleX + borderRadius, bubbleY, borderRadius);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw bubble border
    this.ctx.strokeStyle = isCurrentPlayer ? '#00ffff' : '#ffaa00';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw text inside bubble
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y + offsetY);
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

      // Player name bubble with nickname
      const nickname = p.nickname || (isCurrentPlayer ? 'Vous' : 'Joueur');
      const playerLabel = `${nickname} (Lv${p.level || 1})`;
      this.renderPlayerNameBubble(p.x, p.y, playerLabel, isCurrentPlayer, -config.PLAYER_SIZE - 25);

      // Health bar
      const healthPercent = p.health / p.maxHealth;
      this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
      this.ctx.fillRect(p.x - 20, p.y + config.PLAYER_SIZE + 5, 40 * healthPercent, 5);
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(p.x - 20, p.y + config.PLAYER_SIZE + 5, 40, 5);
    });
  }

  renderTargetIndicator(player) {
    // Only render if mobile controls are active and auto-shoot is on
    if (!window.mobileControls || !window.mobileControls.autoShootActive) return;

    const target = window.mobileControls.getCurrentTarget();
    if (!target || !player) return;

    // Draw line from player to target
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(player.x, player.y);
    this.ctx.lineTo(target.x, target.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw target reticle
    const reticleSize = 30;
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 3;

    // Crosshair
    this.ctx.beginPath();
    this.ctx.moveTo(target.x - reticleSize, target.y);
    this.ctx.lineTo(target.x + reticleSize, target.y);
    this.ctx.moveTo(target.x, target.y - reticleSize);
    this.ctx.lineTo(target.x, target.y + reticleSize);
    this.ctx.stroke();

    // Circle around target
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, reticleSize - 5, 0, Math.PI * 2);
    this.ctx.stroke();

    // Pulsing effect
    const pulse = Math.sin(Date.now() / 200) * 5;
    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, reticleSize + pulse, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderMinimap(gameState, playerId) {
    if (!gameState.config.ROOM_WIDTH) return;

    const pixelRatio = window.devicePixelRatio || 1;
    this.minimapCtx.save();
    this.minimapCtx.scale(pixelRatio, pixelRatio);

    const mapWidth = this.minimapCanvas.width / pixelRatio;
    const mapHeight = this.minimapCanvas.height / pixelRatio;
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

    this.minimapCtx.restore(); // Restore pixel ratio scaling
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
      { condition: player.thorns > 0, html: `<div class="stat-item rare"><span class="stat-name">🛡️ Épines</span><span class="stat-value">${(player.thorns * 100).toFixed(0)}%</span></div>` },
      { condition: player.autoTurrets > 0, html: `<div class="stat-item legendary"><span class="stat-name">🎯 Tourelles Automatiques</span><span class="stat-value">x${player.autoTurrets}</span></div>` }
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
    const pixelRatio = window.devicePixelRatio || 1;

    // Set display size (CSS pixels)
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';

    // Set actual size in memory (scaled for Retina/high-DPI displays)
    this.canvas.width = window.innerWidth * pixelRatio;
    this.canvas.height = window.innerHeight * pixelRatio;

    // Note: Pixel ratio scaling is applied in the render() method to avoid accumulation

    // Also resize minimap canvas for Retina displays
    if (this.renderer.minimapCanvas) {
      const minimapSize = 200;
      this.renderer.minimapCanvas.style.width = minimapSize + 'px';
      this.renderer.minimapCanvas.style.height = minimapSize + 'px';
      this.renderer.minimapCanvas.width = minimapSize * pixelRatio;
      this.renderer.minimapCanvas.height = minimapSize * pixelRatio;
      // Minimap scaling is handled in renderMinimap()
    }
  }

  initializeManagers() {
    // Global game state
    window.gameState = new GameStateManager();

    // Managers
    window.inputManager = new InputManager();
    const camera = new CameraManager();
    window.networkManager = new NetworkManager(io());
    window.gameUI = new UIManager(gameState);
    window.audioManager = new AudioManager(); // Audio feedback

    // Mobile controls
    this.mobileControls = new MobileControlsManager();
    window.mobileControls = this.mobileControls; // Make globally accessible
    inputManager.setMobileControls(this.mobileControls);
    window.playerController = this.playerController = new PlayerController(inputManager, networkManager, gameState, camera);

    this.renderer = new Renderer(this.canvas, this.ctx, this.minimapCanvas, this.minimapCtx);
    this.renderer.setCamera(camera);

    this.nicknameManager = new NicknameManager(this.playerController);

    // Mouse events (only if not mobile)
    if (!this.mobileControls.isMobile) {
      this.canvas.addEventListener('mousemove', (e) => {
        inputManager.updateMouse(e.clientX, e.clientY);
      });

      this.canvas.addEventListener('click', () => {
        this.playerController.shoot(this.canvas.width, this.canvas.height);
      });
    }
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
