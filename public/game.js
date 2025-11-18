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
  },
  MOBILE: {
    AUTO_SHOOT_INTERVAL: 250, // ms between auto-shoot attempts
    GESTURE_THRESHOLD: 50, // minimum distance for swipe detection
    LONG_PRESS_DURATION: 500, // ms for long press detection
    DOUBLE_TAP_DELAY: 300 // ms between taps for double-tap
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

    // Store handler references for cleanup
    this.handlers = {
      keydown: (e) => this.handleKeyDown(e),
      keyup: (e) => this.handleKeyUp(e)
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.handlers.keydown);
    window.addEventListener('keyup', this.handlers.keyup);
  }

  cleanup() {
    // Remove keyboard event listeners
    window.removeEventListener('keydown', this.handlers.keydown);
    window.removeEventListener('keyup', this.handlers.keyup);
  }

  handleKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;

    // TAB key for stats panel
    if (e.key === 'Tab') {
      e.preventDefault();
      if (window.gameUI) {
        window.gameUI.toggleStatsPanel();
      }
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

    // Store handlers and elements for cleanup
    this.handlers = {};
    this.elements = {};

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

    this.elements.joystickBase = joystickBase;
    this.elements.joystickStick = joystickStick;

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

    // Store handlers for cleanup
    this.handlers.joystickStart = handleTouchStart;
    this.handlers.joystickMove = handleTouchMove;
    this.handlers.joystickEnd = handleTouchEnd;

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

    this.elements.autoShootBtn = autoShootBtn;

    const handleAutoShoot = (e) => {
      e.preventDefault();
      this.toggleAutoShoot();
    };

    this.handlers.autoShoot = handleAutoShoot;
    autoShootBtn.addEventListener('touchstart', handleAutoShoot);
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
    // Auto shoot at regular intervals (server will handle fire rate limiting)
    this.autoShootInterval = setInterval(() => {
      if (!this.autoShootActive) return;

      // Verify all required objects exist
      if (!window.gameState || !window.networkManager || !window.playerController) return;

      const player = window.gameState.getPlayer();
      if (!player || !player.alive || !window.playerController.gameStarted) return;

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
    }, CONSTANTS.MOBILE.AUTO_SHOOT_INTERVAL);
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

    this.elements.canvas = canvas;

    // Swipe detection for pause menu (from edge)
    const handleGestureTouchStart = (e) => {
      const touch = e.touches[0];
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.swipeStartTime = Date.now();

      // Long press detection
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(touch.clientX, touch.clientY);
      }, 500);
    };

    const handleGestureTouchMove = (e) => {
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
    };

    const handleGestureTouchEnd = (e) => {
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
    };

    // Store handlers for cleanup
    this.handlers.gestureTouchStart = handleGestureTouchStart;
    this.handlers.gestureTouchMove = handleGestureTouchMove;
    this.handlers.gestureTouchEnd = handleGestureTouchEnd;

    canvas.addEventListener('touchstart', handleGestureTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleGestureTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleGestureTouchEnd, { passive: true });

    // Double-tap on auto-shoot for burst mode
    const autoShootBtn = this.elements.autoShootBtn || document.getElementById('auto-shoot-btn');
    if (autoShootBtn) {
      const handleDoubleTapDetect = (e) => {
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
      };

      this.handlers.doubleTapDetect = handleDoubleTapDetect;
      autoShootBtn.addEventListener('touchend', handleDoubleTapDetect, { passive: true });
    }
  }

  handleDoubleTap() {
    // Visual feedback for double-tap
    // Could enable burst mode here
    if (window.audioManager) {
      window.audioManager.play('doubleClick');
    }
  }

  handleLongPress(x, y) {
    // Long press detected
    if (window.audioManager) {
      window.audioManager.play('longPress');
    }
    // Could trigger special ability or boost
  }

  handleSwipe(direction) {
    // Swipe detected
    if (direction === 'right' && this.swipeStartX < CONSTANTS.MOBILE.GESTURE_THRESHOLD) {
      // Swipe from left edge - could open menu
      if (window.audioManager) {
        window.audioManager.play('swipe');
      }
    }
  }

  cleanup() {
    // Stop auto-shoot interval
    this.stopAutoShoot();

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Remove joystick event listeners
    if (this.elements.joystickBase && this.handlers.joystickStart) {
      this.elements.joystickBase.removeEventListener('touchstart', this.handlers.joystickStart);
      this.elements.joystickBase.removeEventListener('touchmove', this.handlers.joystickMove);
      this.elements.joystickBase.removeEventListener('touchend', this.handlers.joystickEnd);
      this.elements.joystickBase.removeEventListener('touchcancel', this.handlers.joystickEnd);
    }

    // Remove auto-shoot event listener
    if (this.elements.autoShootBtn && this.handlers.autoShoot) {
      this.elements.autoShootBtn.removeEventListener('touchstart', this.handlers.autoShoot);
    }

    // Remove gesture event listeners
    if (this.elements.canvas) {
      if (this.handlers.gestureTouchStart) {
        this.elements.canvas.removeEventListener('touchstart', this.handlers.gestureTouchStart);
      }
      if (this.handlers.gestureTouchMove) {
        this.elements.canvas.removeEventListener('touchmove', this.handlers.gestureTouchMove);
      }
      if (this.handlers.gestureTouchEnd) {
        this.elements.canvas.removeEventListener('touchend', this.handlers.gestureTouchEnd);
      }
    }

    // Remove double-tap listener
    if (this.elements.autoShootBtn && this.handlers.doubleTapDetect) {
      this.elements.autoShootBtn.removeEventListener('touchend', this.handlers.doubleTapDetect);
    }

    // Clear references
    this.handlers = {};
    this.elements = {};
  }
}

/* ============================================
   CAMERA MANAGER
   ============================================ */

class CameraManager {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }

  follow(player, canvasWidth, canvasHeight) {
    this.x = player.x - canvasWidth / 2;
    this.y = player.y - canvasHeight / 2;
    this.width = canvasWidth;
    this.height = canvasHeight;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  // Vérifie si une entité est visible dans le viewport avec une marge
  isInViewport(x, y, margin = 100) {
    return (
      x + margin >= this.x &&
      x - margin <= this.x + this.width &&
      y + margin >= this.y &&
      y - margin <= this.y + this.height
    );
  }
}

/* ============================================
   COMBO SYSTEM
   ============================================ */

class ComboSystem {
  constructor() {
    this.combo = 0;
    this.multiplier = 1;
    this.score = 0;
    this.displayCombo = 0; // Pour l'animation
    this.comboElement = null;
    this.scoreElement = null;
    this.createUI();
  }

  createUI() {
    // Détecter si on est sur mobile
    const isMobile = window.innerWidth <= 768;

    // Créer l'élément d'affichage du combo
    this.comboElement = document.createElement('div');
    this.comboElement.id = 'combo-display';

    // Styles adaptés pour mobile ou desktop
    if (isMobile) {
      this.comboElement.style.cssText = `
        position: fixed;
        top: 60px;
        right: 8px;
        background: rgba(255, 100, 0, 0.6);
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
        color: white;
        text-align: center;
        z-index: 1000;
        display: none;
        box-shadow: 0 0 15px rgba(255, 100, 0, 0.4);
        border: 2px solid rgba(255, 150, 0, 0.6);
        transform: scale(1);
        transition: transform 0.2s ease;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      `;
    } else {
      this.comboElement.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: rgba(255, 100, 0, 0.9);
        padding: 15px 25px;
        border-radius: 10px;
        font-size: 32px;
        font-weight: bold;
        color: white;
        text-align: center;
        z-index: 1000;
        display: none;
        box-shadow: 0 0 20px rgba(255, 100, 0, 0.5);
        border: 3px solid rgba(255, 150, 0, 0.8);
        transform: scale(1);
        transition: transform 0.2s ease;
      `;
    }
    document.body.appendChild(this.comboElement);

    // Créer l'élément d'affichage du score
    this.scoreElement = document.createElement('div');
    this.scoreElement.id = 'score-display';

    // Styles adaptés pour mobile ou desktop
    if (isMobile) {
      this.scoreElement.style.cssText = `
        position: fixed;
        top: 8px;
        right: 8px;
        background: rgba(30, 30, 60, 0.6);
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 13px;
        font-weight: bold;
        color: #FFD700;
        z-index: 1000;
        border: 1px solid rgba(255, 215, 0, 0.4);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      `;
    } else {
      this.scoreElement.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: rgba(30, 30, 60, 0.9);
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 20px;
        font-weight: bold;
        color: #FFD700;
        z-index: 1000;
        border: 2px solid rgba(255, 215, 0, 0.5);
      `;
    }
    this.scoreElement.innerHTML = '🏆 Score: 0';
    document.body.appendChild(this.scoreElement);

    // Stocker si mobile pour les ajustements dynamiques
    this.isMobile = isMobile;
  }

  updateCombo(data) {
    this.combo = data.combo;
    this.multiplier = data.multiplier;
    this.score = data.score;

    // Afficher le combo
    if (this.combo > 1) {
      this.comboElement.style.display = 'block';

      // Couleur selon le multiplicateur
      let color = '#ff6400';
      if (this.multiplier >= 10) color = '#ff0000';
      else if (this.multiplier >= 5) color = '#ff3300';
      else if (this.multiplier >= 3) color = '#ff5500';

      // Adapter l'opacité selon mobile ou desktop
      const opacity = this.isMobile ? 0.6 : 0.9;
      this.comboElement.style.background = `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, ${opacity})`;

      const shadowSize = this.isMobile ? 15 : 30;
      this.comboElement.style.boxShadow = `0 0 ${shadowSize}px ${color}`;

      // Adapter la taille du texte selon mobile ou desktop
      const multiplierFontSize = this.isMobile ? '12px' : '24px';
      let comboText = `${this.combo} COMBO`;
      if (this.multiplier > 1) {
        comboText += `<br><span style="font-size: ${multiplierFontSize}; color: #FFD700;">x${this.multiplier} MULTI</span>`;
      }

      this.comboElement.innerHTML = comboText;

      // Animation de pulsation (réduite sur mobile)
      const scaleAmount = this.isMobile ? 1.1 : 1.2;
      this.comboElement.style.transform = `scale(${scaleAmount})`;
      setTimeout(() => {
        if (this.comboElement) {
          this.comboElement.style.transform = 'scale(1)';
        }
      }, 200);

      // Animation bonus pour les gros combos (tous les 10 kills)
      if (this.combo % 10 === 0) {
        const bigFontSize = this.isMobile ? '20px' : '40px';
        const normalFontSize = this.isMobile ? '16px' : '32px';
        this.comboElement.style.fontSize = bigFontSize;
        setTimeout(() => {
          if (this.comboElement) {
            this.comboElement.style.fontSize = normalFontSize;
          }
        }, 300);
      }
    }

    // Mettre à jour le score
    this.scoreElement.innerHTML = `🏆 Score: ${this.score.toLocaleString()}`;
  }

  resetCombo() {
    this.combo = 0;
    this.multiplier = 1;

    // Cacher l'affichage du combo avec animation
    if (this.comboElement) {
      this.comboElement.style.transform = 'scale(0.5)';
      this.comboElement.style.opacity = '0';
      setTimeout(() => {
        if (this.comboElement) {
          this.comboElement.style.display = 'none';
          this.comboElement.style.transform = 'scale(1)';
          this.comboElement.style.opacity = '1';
        }
      }, 300);
    }
  }
}

/* ============================================
   TOAST NOTIFICATION SYSTEM
   ============================================ */

class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.toasts = [];
  }

  show(options) {
    const {
      title = '',
      message = '',
      type = 'info', // success, info, warning, error
      icon = this.getDefaultIcon(type),
      duration = 3000
    } = options;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
    `;

    // Add to container
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return toast;
  }

  remove(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300); // Match animation duration
  }

  getDefaultIcon(type) {
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type] || icons.info;
  }

  success(message, title) {
    return this.show({ title, message, type: 'success' });
  }

  info(message, title) {
    return this.show({ title, message, type: 'info' });
  }

  warning(message, title) {
    return this.show({ title, message, type: 'warning' });
  }

  error(message, title) {
    return this.show({ title, message, type: 'error' });
  }

  clear() {
    this.toasts.forEach(toast => this.remove(toast));
  }
}

/* ============================================
   LEADERBOARD SYSTEM
   ============================================ */

class LeaderboardSystem {
  constructor() {
    this.leaderboard = this.loadLeaderboard();
    this.createUI();
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('zombieGameLeaderboard');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      highestScore: 0,
      mostKills: 0,
      mostGold: 0,
      longestSurvival: 0,
      entries: []
    };
  }

  saveLeaderboard() {
    localStorage.setItem('zombieGameLeaderboard', JSON.stringify(this.leaderboard));
  }

  addEntry(player) {
    if (player && player.alive === false) {
      const survivalTime = player.survivalTime ? Math.floor((Date.now() - player.survivalTime) / 1000) : 0;

      const entry = {
        nickname: player.nickname || 'Anonyme',
        score: player.totalScore || player.score || 0,
        kills: player.zombiesKilled || player.kills || 0,
        gold: player.gold || 0,
        survivalTime: survivalTime,
        date: new Date().toISOString(),
        wave: window.gameState?.state?.wave || 1
      };

      // Mettre à jour les records
      if (entry.score > this.leaderboard.highestScore) {
        this.leaderboard.highestScore = entry.score;
      }
      if (entry.kills > this.leaderboard.mostKills) {
        this.leaderboard.mostKills = entry.kills;
      }
      if (entry.gold > this.leaderboard.mostGold) {
        this.leaderboard.mostGold = entry.gold;
      }
      if (survivalTime > this.leaderboard.longestSurvival) {
        this.leaderboard.longestSurvival = survivalTime;
      }

      // Ajouter l'entrée
      this.leaderboard.entries.push(entry);

      // Garder seulement les 10 meilleures entrées
      this.leaderboard.entries.sort((a, b) => b.score - a.score);
      this.leaderboard.entries = this.leaderboard.entries.slice(0, 10);

      this.saveLeaderboard();
      this.updateUI();
    }
  }

  createUI() {
    // Créer le bouton pour afficher le leaderboard
    const btn = document.createElement('button');
    btn.id = 'leaderboard-btn';
    btn.innerHTML = '🏆 Classement';
    btn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(255, 215, 0, 0.9);
      border: 2px solid #FFD700;
      border-radius: 8px;
      color: #000;
      font-weight: bold;
      cursor: pointer;
      z-index: 1000;
      font-size: 16px;
    `;
    btn.onclick = () => this.toggleLeaderboard();
    document.body.appendChild(btn);

    // Créer le panneau du leaderboard
    const panel = document.createElement('div');
    panel.id = 'leaderboard-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-height: 80vh;
      background: rgba(20, 20, 40, 0.95);
      border: 3px solid #FFD700;
      border-radius: 15px;
      padding: 20px;
      z-index: 2000;
      display: none;
      overflow-y: auto;
      box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
    `;
    panel.innerHTML = `
      <h2 style="color: #FFD700; text-align: center; margin-top: 0;">🏆 CLASSEMENT 🏆</h2>
      <div id="leaderboard-records" style="margin-bottom: 20px;"></div>
      <div id="leaderboard-content"></div>
      <button id="close-leaderboard" style="
        width: 100%;
        padding: 10px;
        margin-top: 20px;
        background: #ff4444;
        border: none;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        cursor: pointer;
        font-size: 16px;
      ">Fermer</button>
    `;
    document.body.appendChild(panel);

    document.getElementById('close-leaderboard').onclick = () => this.toggleLeaderboard();

    this.updateUI();
  }

  toggleLeaderboard() {
    const panel = document.getElementById('leaderboard-panel');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      this.updateUI();
    } else {
      panel.style.display = 'none';
    }
  }

  updateUI() {
    const recordsDiv = document.getElementById('leaderboard-records');
    const contentDiv = document.getElementById('leaderboard-content');

    if (!recordsDiv || !contentDiv) return;

    // Afficher les records
    recordsDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
        <div style="background: rgba(255, 215, 0, 0.2); padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #FFD700; font-size: 24px; font-weight: bold;">${this.leaderboard.highestScore.toLocaleString()}</div>
          <div style="color: #ccc; font-size: 14px;">Meilleur Score</div>
        </div>
        <div style="background: rgba(255, 100, 100, 0.2); padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #ff6464; font-size: 24px; font-weight: bold;">${this.leaderboard.mostKills.toLocaleString()}</div>
          <div style="color: #ccc; font-size: 14px;">Record de Kills</div>
        </div>
        <div style="background: rgba(100, 255, 100, 0.2); padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #64ff64; font-size: 24px; font-weight: bold;">${this.leaderboard.mostGold.toLocaleString()}</div>
          <div style="color: #ccc; font-size: 14px;">Plus d'Or</div>
        </div>
        <div style="background: rgba(100, 100, 255, 0.2); padding: 10px; border-radius: 5px; text-align: center;">
          <div style="color: #6464ff; font-size: 24px; font-weight: bold;">${this.formatTime(this.leaderboard.longestSurvival)}</div>
          <div style="color: #ccc; font-size: 14px;">Temps de Survie</div>
        </div>
      </div>
    `;

    // Afficher le top 10
    if (this.leaderboard.entries.length === 0) {
      contentDiv.innerHTML = '<p style="color: #ccc; text-align: center;">Aucune partie jouée</p>';
      return;
    }

    let html = '<table style="width: 100%; color: white; border-collapse: collapse;">';
    html += `
      <tr style="background: rgba(255, 215, 0, 0.2); border-bottom: 2px solid #FFD700;">
        <th style="padding: 10px; text-align: left;">Rang</th>
        <th style="padding: 10px; text-align: left;">Joueur</th>
        <th style="padding: 10px; text-align: center;">Score</th>
        <th style="padding: 10px; text-align: center;">Kills</th>
        <th style="padding: 10px; text-align: center;">Vague</th>
      </tr>
    `;

    this.leaderboard.entries.forEach((entry, index) => {
      const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#fff';
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);

      html += `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <td style="padding: 10px; color: ${rankColor}; font-weight: bold;">${rankIcon}</td>
          <td style="padding: 10px;">${entry.nickname}</td>
          <td style="padding: 10px; text-align: center; color: #FFD700;">${entry.score.toLocaleString()}</td>
          <td style="padding: 10px; text-align: center; color: #ff6464;">${entry.kills}</td>
          <td style="padding: 10px; text-align: center; color: #64ff64;">Vague ${entry.wave}</td>
        </tr>
      `;
    });

    html += '</table>';
    contentDiv.innerHTML = html;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    this.socket.on('comboUpdate', (data) => this.handleComboUpdate(data));
    this.socket.on('comboReset', () => this.handleComboReset());
  }

  handleInit(data) {
    window.gameState.initialize(data);
  }

  handleGameState(state) {
    // Client-side prediction for local player
    if (window.gameState.state && window.gameState.state.players && window.gameState.state.players[window.gameState.playerId]) {
      const localPlayer = window.gameState.state.players[window.gameState.playerId];
      const { x, y, angle } = localPlayer;

      window.gameState.updateState(state);

      // Restore predicted position
      if (window.gameState.state.players[window.gameState.playerId]) {
        window.gameState.state.players[window.gameState.playerId].x = x;
        window.gameState.state.players[window.gameState.playerId].y = y;
        window.gameState.state.players[window.gameState.playerId].angle = angle;
      }
    } else {
      window.gameState.updateState(state);
    }

    if (window.gameUI) {
      window.gameUI.update();
    }
  }

  handleBossSpawned(data) {
    if (window.gameUI) {
      window.gameUI.showBossAnnouncement(data.bossName);
    }
  }

  handleNewWave(data) {
    if (window.gameUI) {
      window.gameUI.showNewWaveAnnouncement(data.wave, data.zombiesCount);
      setTimeout(() => window.gameUI.showShop(), CONSTANTS.ANIMATIONS.SHOP_DELAY);
    }
  }

  handleLevelUp(data) {
    if (window.gameUI) {
      if (data.milestoneBonus) {
        window.gameUI.showMilestoneBonus(data.milestoneBonus, data.newLevel);
        setTimeout(() => {
          if (window.gameUI) {
            window.gameUI.showLevelUpScreen(data.newLevel, data.upgradeChoices);
          }
        }, CONSTANTS.ANIMATIONS.MILESTONE_DELAY);
      } else {
        window.gameUI.showLevelUpScreen(data.newLevel, data.upgradeChoices);
      }
    }
  }

  handleRoomChanged(data) {
    if (window.gameUI) {
      window.gameUI.showRoomAnnouncement(data.roomIndex + 1, data.totalRooms);
    }
  }

  handleRunCompleted(data) {
    if (window.gameUI) {
      window.gameUI.showRunCompleted(data.gold, data.level);
    }
  }

  handleUpgradeSelected(data) {
    // Upgrade successfully selected
  }

  handleShopUpdate(data) {
    if (data.success && window.gameUI && window.gameUI.shopOpen) {
      window.gameUI.populateShop();
    }
  }

  handleComboUpdate(data) {
    if (window.comboSystem) {
      window.comboSystem.updateCombo(data);
    }
  }

  handleComboReset() {
    if (window.comboSystem) {
      window.comboSystem.resetCombo();
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

  shopOpened() {
    this.socket.emit('shopOpened');
  }

  shopClosed() {
    this.socket.emit('shopClosed');
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

  /**
   * Check if a position collides with any wall
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} size - Object size/radius
   * @returns {boolean} - True if collision detected
   */
  checkWallCollision(x, y, size) {
    const walls = this.gameState.state.walls;
    if (!walls || !Array.isArray(walls)) return false;

    for (let wall of walls) {
      if (x + size > wall.x &&
          x - size < wall.x + wall.width &&
          y + size > wall.y &&
          y - size < wall.y + wall.height) {
        return true;
      }
    }
    return false;
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
        // Convertir les coordonnées écran de la souris en coordonnées monde
        const cameraPos = this.camera.getPosition();
        const mouseWorldX = this.input.mouse.x + cameraPos.x;
        const mouseWorldY = this.input.mouse.y + cameraPos.y;
        // Calculer l'angle du joueur vers la souris
        angle = Math.atan2(
          mouseWorldY - player.y,
          mouseWorldX - player.x
        );
      }

      // Client-side collision detection with sliding
      let finalX = player.x;
      let finalY = player.y;

      // Try to move in both directions
      if (!this.checkWallCollision(newX, newY, this.gameState.config.PLAYER_SIZE)) {
        // No collision, move freely
        finalX = newX;
        finalY = newY;
      } else {
        // Collision detected, try sliding along walls
        // Try X-axis only
        if (!this.checkWallCollision(newX, player.y, this.gameState.config.PLAYER_SIZE)) {
          finalX = newX;
        }
        // Try Y-axis only
        if (!this.checkWallCollision(player.x, newY, this.gameState.config.PLAYER_SIZE)) {
          finalY = newY;
        }
      }

      // Update player position only if it changed
      if (finalX !== player.x || finalY !== player.y) {
        // Client-side prediction
        player.x = finalX;
        player.y = finalY;
        player.angle = angle;

        // Send to server
        this.network.playerMove(finalX, finalY, angle);
      } else {
        // Position didn't change, but update angle
        player.angle = angle;
      }
    }
  }

  shoot(canvasWidth, canvasHeight) {
    const player = this.gameState.getPlayer();
    if (!player || !player.alive || !this.gameStarted) return;

    // Convertir les coordonnées écran de la souris en coordonnées monde
    const cameraPos = this.camera.getPosition();
    const mouseWorldX = this.input.mouse.x + cameraPos.x;
    const mouseWorldY = this.input.mouse.y + cameraPos.y;
    // Calculer l'angle du joueur vers la souris
    const angle = Math.atan2(
      mouseWorldY - player.y,
      mouseWorldX - player.x
    );

    // Jouer le son de tir
    if (window.onPlayerShoot) {
      window.onPlayerShoot(player.x, player.y, angle, player.weapon || 'pistol');
    }

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
    this.performanceSettings = null; // Will be set by GameEngine
    this.gridCanvas = null; // Offscreen canvas for grid optimization
    this.gridConfig = null; // Store config to detect changes
  }

  setCamera(camera) {
    this.camera = camera;
  }

  // Crée un canvas offscreen pour la grille (optimisation)
  createGridCanvas(config) {
    // Si déjà créé avec la même config, ne pas recréer
    if (this.gridCanvas && this.gridConfig &&
        this.gridConfig.ROOM_WIDTH === config.ROOM_WIDTH &&
        this.gridConfig.ROOM_HEIGHT === config.ROOM_HEIGHT) {
      return;
    }

    // Créer un nouveau canvas offscreen
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.width = config.ROOM_WIDTH;
    this.gridCanvas.height = config.ROOM_HEIGHT;
    const gridCtx = this.gridCanvas.getContext('2d');

    // Dessiner la grille sur le canvas offscreen
    gridCtx.strokeStyle = '#252541';
    gridCtx.lineWidth = 1;

    const gridSize = CONSTANTS.CANVAS.GRID_SIZE;

    for (let x = 0; x < config.ROOM_WIDTH; x += gridSize) {
      gridCtx.beginPath();
      gridCtx.moveTo(x, 0);
      gridCtx.lineTo(x, config.ROOM_HEIGHT);
      gridCtx.stroke();
    }

    for (let y = 0; y < config.ROOM_HEIGHT; y += gridSize) {
      gridCtx.beginPath();
      gridCtx.moveTo(0, y);
      gridCtx.lineTo(config.ROOM_WIDTH, y);
      gridCtx.stroke();
    }

    // Sauvegarder la config
    this.gridConfig = {
      ROOM_WIDTH: config.ROOM_WIDTH,
      ROOM_HEIGHT: config.ROOM_HEIGHT
    };
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

    // Cache timestamps for performance (calculate once per frame)
    const timestamp = performance.now();
    const dateNow = Date.now();

    // Scale context for Retina displays (canvas is already physically sized × pixelRatio)
    // This allows us to draw in CSS pixels while the canvas renders at device pixels
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
    this.renderPowerups(gameState.state.powerups, gameState.powerupTypes, gameState.config, dateNow);
    this.renderLoot(gameState.state.loot, gameState.config, dateNow);
    this.renderParticles(gameState.state.particles);
    this.renderPoisonTrails(gameState.state.poisonTrails, dateNow);
    this.renderExplosions(gameState.state.explosions, dateNow);
    this.renderBullets(gameState.state.bullets, gameState.config);
    this.renderZombies(gameState.state.zombies, timestamp);
    this.renderPlayers(gameState.state.players, playerId, gameState.config, dateNow, timestamp);
    this.renderTargetIndicator(player); // Show auto-shoot target indicator

    this.ctx.restore();

    // Render minimap
    this.renderMinimap(gameState, playerId);

    this.ctx.restore(); // Restore pixelRatio scaling
  }

  renderWaitingMessage() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    // Use CSS pixels (window dimensions) for proper centering on high-DPI displays
    this.ctx.fillText('Connexion au serveur...', window.innerWidth / 2, window.innerHeight / 2);
  }

  renderFloor(config) {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, config.ROOM_WIDTH, config.ROOM_HEIGHT);
  }

  renderGrid(config) {
    // Check performance settings
    if (window.performanceSettings && !window.performanceSettings.shouldRenderGrid()) {
      return; // Skip grid rendering in performance mode
    }

    // Créer le canvas de grille si pas encore fait
    if (!this.gridCanvas) {
      this.createGridCanvas(config);
    }

    // Dessiner le canvas de grille pré-rendu (beaucoup plus rapide)
    this.ctx.drawImage(this.gridCanvas, 0, 0);
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

  renderPowerups(powerups, powerupTypes, config, now = Date.now()) {
    Object.values(powerups).forEach(powerup => {
      const type = powerupTypes[powerup.type];
      if (!type) return;

      const pulse = Math.sin(now / 200) * 3 + config.POWERUP_SIZE;

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
        machinegun: 'M',
        rocketlauncher: 'R'
      };

      this.ctx.fillText(symbols[powerup.type] || '?', powerup.x, powerup.y);
    });
  }

  renderLoot(loot, config, now = Date.now()) {
    Object.values(loot).forEach(item => {
      const rotation = (now / 500) % (Math.PI * 2);

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
    // Check performance settings
    if (window.performanceSettings && !window.performanceSettings.shouldRenderParticles()) {
      return; // Skip particles rendering in performance mode
    }

    Object.values(particles).forEach(particle => {
      // Viewport culling
      if (!this.camera.isInViewport(particle.x, particle.y, 50)) {
        return;
      }

      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = 0.7;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  renderPoisonTrails(poisonTrails, now = Date.now()) {
    Object.values(poisonTrails || {}).forEach(trail => {
      // Viewport culling
      if (!this.camera.isInViewport(trail.x, trail.y, trail.radius * 2)) {
        return;
      }

      // Effet de pulsation pour montrer que c'est toxique
      const pulseAmount = Math.sin(now / 300) * 0.1;
      const age = now - trail.createdAt;
      const fadeAmount = Math.max(0, 1 - (age / trail.duration));

      // Cercle extérieur (plus transparent)
      this.ctx.fillStyle = '#22ff22';
      this.ctx.globalAlpha = (0.15 + pulseAmount) * fadeAmount;
      this.ctx.beginPath();
      this.ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Cercle intérieur (plus visible)
      this.ctx.fillStyle = '#11dd11';
      this.ctx.globalAlpha = (0.3 + pulseAmount * 0.5) * fadeAmount;
      this.ctx.beginPath();
      this.ctx.arc(trail.x, trail.y, trail.radius * 0.6, 0, Math.PI * 2);
      this.ctx.fill();

      // Contour pulsant
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = (0.4 + pulseAmount) * fadeAmount;
      this.ctx.beginPath();
      this.ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.globalAlpha = 1;
    });
  }

  renderExplosions(explosions, now = Date.now()) {
    Object.values(explosions || {}).forEach(explosion => {
      const age = now - explosion.createdAt;
      const progress = age / explosion.duration;

      // Ne pas afficher si l'explosion est terminée
      if (progress >= 1) return;

      // Viewport culling
      if (!this.camera.isInViewport(explosion.x, explosion.y, explosion.radius * 2)) {
        return;
      }

      // Animation d'expansion
      const currentRadius = explosion.radius * (0.3 + progress * 0.7);

      // Fade out
      const alpha = 1 - progress;

      if (explosion.isRocket) {
        // Explosion de roquette - effet plus intense

        // Cercle extérieur rouge vif
        this.ctx.fillStyle = '#ff0000';
        this.ctx.globalAlpha = alpha * 0.5;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Cercle moyen orange
        this.ctx.fillStyle = '#ff8800';
        this.ctx.globalAlpha = alpha * 0.7;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius * 0.7, 0, Math.PI * 2);
        this.ctx.fill();

        // Cercle intérieur jaune brillant
        this.ctx.fillStyle = '#ffff00';
        this.ctx.globalAlpha = alpha * 0.9;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();

        // Centre blanc très brillant
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Contour rouge pulsant
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = alpha * 0.8;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Rayons de l'explosion (8 rayons)
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = alpha * 0.6;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const rayLength = currentRadius * 1.2;
          this.ctx.beginPath();
          this.ctx.moveTo(explosion.x, explosion.y);
          this.ctx.lineTo(
            explosion.x + Math.cos(angle) * rayLength,
            explosion.y + Math.sin(angle) * rayLength
          );
          this.ctx.stroke();
        }

      } else {
        // Explosion normale
        this.ctx.fillStyle = '#ff8800';
        this.ctx.globalAlpha = alpha * 0.6;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffff00';
        this.ctx.globalAlpha = alpha * 0.8;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, currentRadius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1;
    });
  }

  renderBullets(bullets, config) {
    Object.values(bullets).forEach(bullet => {
      // Viewport culling
      if (!this.camera.isInViewport(bullet.x, bullet.y, 50)) {
        return;
      }

      const bulletSize = bullet.size || config.BULLET_SIZE;
      this.ctx.fillStyle = bullet.color || '#ffff00';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = bullet.color || '#ffff00';
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bulletSize, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });
  }

  drawZombieSprite(zombie, timestamp) {
    this.ctx.save();
    this.ctx.translate(zombie.x, zombie.y);

    // Animation de marche (oscillation des bras et jambes)
    const walkCycle = Math.sin(timestamp / 200 + zombie.id * 100) * 0.2;
    const scale = zombie.isBoss ? 1.5 : 1;
    const baseSize = zombie.size / 25; // Normaliser par rapport à la taille par défaut (25)

    // Corps
    this.ctx.fillStyle = zombie.color;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = zombie.isBoss ? 3 : 1.5;

    // Jambes (arrière-plan)
    const legWidth = 6 * baseSize * scale;
    const legHeight = 12 * baseSize * scale;
    const legSpacing = 8 * baseSize * scale;

    // Jambe gauche
    this.ctx.save();
    this.ctx.translate(-legSpacing / 2, 10 * baseSize * scale);
    this.ctx.rotate(walkCycle);
    this.ctx.fillRect(-legWidth / 2, 0, legWidth, legHeight);
    this.ctx.strokeRect(-legWidth / 2, 0, legWidth, legHeight);
    this.ctx.restore();

    // Jambe droite
    this.ctx.save();
    this.ctx.translate(legSpacing / 2, 10 * baseSize * scale);
    this.ctx.rotate(-walkCycle);
    this.ctx.fillRect(-legWidth / 2, 0, legWidth, legHeight);
    this.ctx.strokeRect(-legWidth / 2, 0, legWidth, legHeight);
    this.ctx.restore();

    // Corps principal (torse) - rectangle simple pour compatibilité
    const bodyWidth = 18 * baseSize * scale;
    const bodyHeight = 20 * baseSize * scale;
    this.ctx.fillRect(-bodyWidth / 2, -5 * baseSize * scale, bodyWidth, bodyHeight);
    this.ctx.strokeRect(-bodyWidth / 2, -5 * baseSize * scale, bodyWidth, bodyHeight);

    // Bras
    const armWidth = 5 * baseSize * scale;
    const armHeight = 14 * baseSize * scale;
    const armOffset = bodyWidth / 2 + 2 * baseSize * scale;

    // Bras gauche
    this.ctx.save();
    this.ctx.translate(-armOffset, 0);
    this.ctx.rotate(-walkCycle * 1.5);
    this.ctx.fillRect(-armWidth / 2, 0, armWidth, armHeight);
    this.ctx.strokeRect(-armWidth / 2, 0, armWidth, armHeight);
    this.ctx.restore();

    // Bras droit
    this.ctx.save();
    this.ctx.translate(armOffset, 0);
    this.ctx.rotate(walkCycle * 1.5);
    this.ctx.fillRect(-armWidth / 2, 0, armWidth, armHeight);
    this.ctx.strokeRect(-armWidth / 2, 0, armWidth, armHeight);
    this.ctx.restore();

    // Tête
    const headRadius = 10 * baseSize * scale;
    this.ctx.beginPath();
    this.ctx.arc(0, -10 * baseSize * scale, headRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Yeux (rouges effrayants)
    const eyeSize = zombie.isBoss ? 4 * scale : 2.5 * scale;
    const eyeOffset = 4 * baseSize * scale;
    this.ctx.fillStyle = '#ff0000';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(-eyeOffset, -12 * baseSize * scale, eyeSize, 0, Math.PI * 2);
    this.ctx.arc(eyeOffset, -12 * baseSize * scale, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Bouche (grimace)
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(0, -6 * baseSize * scale, 4 * baseSize * scale, 0.2, Math.PI - 0.2);
    this.ctx.stroke();

    // Détails spéciaux selon le type
    if (zombie.type === 'tank') {
      // Armure sur les épaules et casque
      this.ctx.fillStyle = '#444';
      this.ctx.strokeStyle = '#222';
      this.ctx.lineWidth = 1;
      // Épaulières
      this.ctx.fillRect(-bodyWidth / 2 - 4, -3 * baseSize * scale, 8, 10);
      this.ctx.strokeRect(-bodyWidth / 2 - 4, -3 * baseSize * scale, 8, 10);
      this.ctx.fillRect(bodyWidth / 2 - 4, -3 * baseSize * scale, 8, 10);
      this.ctx.strokeRect(bodyWidth / 2 - 4, -3 * baseSize * scale, 8, 10);
      // Casque
      this.ctx.fillRect(-headRadius * 0.8, -16 * baseSize * scale, headRadius * 1.6, 4);
      this.ctx.strokeRect(-headRadius * 0.8, -16 * baseSize * scale, headRadius * 1.6, 4);
    } else if (zombie.type === 'fast') {
      // Traits de vitesse et posture penchée
      this.ctx.strokeStyle = zombie.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyWidth / 2 - 5 - i * 4, -5 + i * 4);
        this.ctx.lineTo(-bodyWidth / 2 - 12 - i * 4, -5 + i * 4);
        this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1;
    } else if (zombie.type === 'explosive') {
      // Taches/veines explosives sur le corps
      this.ctx.strokeStyle = '#ff00ff';
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.3; // Pulsation
      this.ctx.beginPath();
      this.ctx.moveTo(0, -5 * baseSize * scale);
      this.ctx.lineTo(-5, 0);
      this.ctx.moveTo(0, -5 * baseSize * scale);
      this.ctx.lineTo(5, 0);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    } else if (zombie.type === 'healer') {
      // Aura de soin
      this.ctx.strokeStyle = '#00ffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.globalAlpha = 0.4;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, headRadius + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    } else if (zombie.type === 'slower') {
      // Aura ralentissante violette
      this.ctx.strokeStyle = '#8800ff';
      this.ctx.lineWidth = 1.5;
      this.ctx.globalAlpha = 0.3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, headRadius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    } else if (zombie.type === 'poison') {
      // Aura toxique verte pulsante
      const pulseAmount = Math.sin(Date.now() / 200) * 0.15;
      this.ctx.strokeStyle = '#22ff22';
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.4 + pulseAmount;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, headRadius + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 0.25 + pulseAmount;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, headRadius + 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;

      // Gouttes de poison sur le corps
      this.ctx.fillStyle = '#00aa00';
      const dropPositions = [
        { x: -bodyWidth / 3, y: bodyHeight / 4 },
        { x: bodyWidth / 4, y: bodyHeight / 3 },
        { x: 0, y: -bodyHeight / 4 }
      ];
      dropPositions.forEach(pos => {
        this.ctx.beginPath();
        this.ctx.ellipse(pos.x, pos.y, 2 * scale, 3 * scale, 0, 0, Math.PI * 2);
        this.ctx.fill();
      });
    } else if (zombie.type === 'shooter') {
      // Fusil/Arme sur le zombie tireur
      this.ctx.fillStyle = '#333';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1;

      // Arme à feu (fusil) - en position de tir
      const gunLength = 15 * baseSize * scale;
      const gunWidth = 3 * baseSize * scale;

      // Position de l'arme (bras droit)
      this.ctx.save();
      this.ctx.translate(armOffset, 8 * baseSize * scale);

      // Canon
      this.ctx.fillRect(0, -gunWidth / 2, gunLength, gunWidth);
      this.ctx.strokeRect(0, -gunWidth / 2, gunLength, gunWidth);

      // Poignée
      this.ctx.fillRect(-3 * baseSize * scale, -gunWidth / 2, 5 * baseSize * scale, 8 * baseSize * scale);
      this.ctx.strokeRect(-3 * baseSize * scale, -gunWidth / 2, 5 * baseSize * scale, 8 * baseSize * scale);

      // Point rouge sur le canon (visée laser)
      this.ctx.fillStyle = '#ff3300';
      this.ctx.beginPath();
      this.ctx.arc(gunLength, 0, 2 * scale, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();

      // Bandana/Bandeau de munitions
      this.ctx.strokeStyle = '#ffaa00';
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.moveTo(-bodyWidth / 2, 2 * baseSize * scale);
      this.ctx.lineTo(bodyWidth / 2, 2 * baseSize * scale);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    } else if (zombie.isBoss) {
      // Couronne/Crâne pour le boss
      this.ctx.fillStyle = '#ff0000';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      // Points de la couronne
      this.ctx.beginPath();
      this.ctx.moveTo(-8 * scale, -18 * baseSize * scale);
      this.ctx.lineTo(-6 * scale, -22 * baseSize * scale);
      this.ctx.lineTo(-3 * scale, -18 * baseSize * scale);
      this.ctx.lineTo(0, -24 * baseSize * scale);
      this.ctx.lineTo(3 * scale, -18 * baseSize * scale);
      this.ctx.lineTo(6 * scale, -22 * baseSize * scale);
      this.ctx.lineTo(8 * scale, -18 * baseSize * scale);
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderZombies(zombies, timestamp = performance.now()) {
    Object.values(zombies).forEach(zombie => {
      // Viewport culling - ne rendre que les zombies visibles
      if (!this.camera.isInViewport(zombie.x, zombie.y, zombie.size * 2)) {
        return;
      }

      // Dessiner le sprite du zombie
      this.drawZombieSprite(zombie, timestamp);

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
    } else if (zombie.type === 'poison') {
      this.ctx.save();
      this.ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 200) * 0.15;
      this.ctx.strokeStyle = '#22ff22';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(zombie.x, zombie.y, zombie.size + 10, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.fillStyle = '#22ff22';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeText('☠', zombie.x, zombie.y);
      this.ctx.fillText('☠', zombie.x, zombie.y);
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

  // Fonction pour dessiner les sprites d'armes
  renderWeaponSprite(x, y, angle, weaponType, isCurrentPlayer) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    const primaryColor = isCurrentPlayer ? '#333333' : '#444444';
    const accentColor = isCurrentPlayer ? '#00ffff' : '#ffaa00';

    switch(weaponType) {
      case 'pistol':
        // Pistolet compact
        // Corps de l'arme
        this.ctx.fillStyle = primaryColor;
        this.ctx.fillRect(5, -3, 18, 6);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(5, -3, 18, 6);

        // Canon
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(23, -2, 8, 4);
        this.ctx.strokeRect(23, -2, 8, 4);

        // Poignée
        this.ctx.fillStyle = primaryColor;
        this.ctx.fillRect(5, 3, 6, 8);
        this.ctx.strokeRect(5, 3, 6, 8);

        // Détail accent
        this.ctx.fillStyle = accentColor;
        this.ctx.fillRect(15, -1, 3, 2);
        break;

      case 'shotgun':
        // Shotgun à double canon
        // Corps principal
        this.ctx.fillStyle = primaryColor;
        this.ctx.fillRect(5, -4, 25, 8);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(5, -4, 25, 8);

        // Double canon
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(30, -4, 12, 3);
        this.ctx.fillRect(30, 1, 12, 3);
        this.ctx.strokeRect(30, -4, 12, 3);
        this.ctx.strokeRect(30, 1, 12, 3);

        // Crosse
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(-5, -3, 10, 6);
        this.ctx.strokeRect(-5, -3, 10, 6);

        // Pompe
        this.ctx.fillStyle = accentColor;
        this.ctx.fillRect(12, -2, 8, 4);
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(12, -2, 8, 4);

        // Détails sur les canons
        this.ctx.fillStyle = '#ff6600';
        this.ctx.fillRect(40, -3, 2, 1);
        this.ctx.fillRect(40, 2, 2, 1);
        break;

      case 'machinegun':
        // Mitraillette
        // Corps principal
        this.ctx.fillStyle = primaryColor;
        this.ctx.fillRect(0, -5, 30, 10);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, -5, 30, 10);

        // Canon avec refroidissement
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(30, -3, 15, 6);
        this.ctx.strokeRect(30, -3, 15, 6);

        // Grilles de refroidissement
        for(let i = 0; i < 4; i++) {
          this.ctx.fillStyle = '#00ffff';
          this.ctx.fillRect(32 + i * 3, -2, 1, 4);
        }

        // Chargeur
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(10, 5, 8, 12);
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(10, 5, 8, 12);

        // Crosse pliable
        this.ctx.fillStyle = '#333';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -3);
        this.ctx.lineTo(-12, -5);
        this.ctx.lineTo(-12, 5);
        this.ctx.lineTo(-5, 3);
        this.ctx.stroke();

        // Viseur laser
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(45, 0, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Détails accent
        this.ctx.fillStyle = accentColor;
        this.ctx.fillRect(5, -3, 2, 6);
        this.ctx.fillRect(20, -3, 2, 6);
        break;

      case 'rocketlauncher':
        // Lance-roquettes imposant
        // Tube principal (large)
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, -7, 40, 14);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(0, -7, 40, 14);

        // Bandes de sécurité jaunes/noires
        for(let i = 0; i < 3; i++) {
          this.ctx.fillStyle = i % 2 === 0 ? '#ffff00' : '#000';
          this.ctx.fillRect(8 + i * 8, -6, 6, 12);
        }

        // Tube de visée supérieur
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(5, -10, 30, 3);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(5, -10, 30, 3);

        // Ouverture avant (tube de lancement)
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(40, -6, 8, 12);
        this.ctx.strokeRect(40, -6, 8, 12);

        // Bordure du tube de lancement
        this.ctx.fillStyle = '#ff4400';
        this.ctx.fillRect(40, -7, 2, 14);
        this.ctx.fillRect(46, -7, 2, 14);

        // Poignée avant
        this.ctx.fillStyle = '#333';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(15, 7);
        this.ctx.lineTo(15, 12);
        this.ctx.lineTo(20, 12);
        this.ctx.lineTo(20, 7);
        this.ctx.stroke();

        // Gâchette arrière
        this.ctx.fillStyle = primaryColor;
        this.ctx.fillRect(-3, 2, 5, 10);
        this.ctx.strokeRect(-3, 2, 5, 10);

        // Détails rouges (danger)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(38, -8, 3, 2);
        this.ctx.fillRect(38, 6, 3, 2);

        // Indicateur LED (prêt à tirer)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(10, 0, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Évents de recul
        this.ctx.fillStyle = '#666';
        for(let i = 0; i < 3; i++) {
          this.ctx.fillRect(-8 - i * 3, -4 + i * 2, 5, 2);
        }

        // Détails accent
        this.ctx.fillStyle = accentColor;
        this.ctx.fillRect(2, -5, 3, 10);
        break;

      default:
        // Arme par défaut (pistolet)
        this.ctx.fillStyle = primaryColor;
        this.ctx.fillRect(5, -3, 18, 6);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(5, -3, 18, 6);
    }

    this.ctx.restore();
  }

  drawPlayerSprite(player, isCurrentPlayer, timestamp) {
    this.ctx.save();
    this.ctx.translate(player.x, player.y);

    // Calculer la vélocité pour l'animation de marche
    const velocity = Math.sqrt((player.vx || 0) ** 2 + (player.vy || 0) ** 2);
    const isMoving = velocity > 0.5;

    // Animation de marche basée sur le mouvement
    const walkCycle = isMoving ? Math.sin(timestamp / 150) * 0.3 : 0;
    const baseSize = 20 / 20; // Normaliser par rapport à PLAYER_SIZE (20)

    // Couleurs du joueur
    const primaryColor = isCurrentPlayer ? '#0088ff' : '#ff8800';
    const secondaryColor = isCurrentPlayer ? '#0066cc' : '#cc6600';
    const borderColor = isCurrentPlayer ? '#00ffff' : '#ffaa00';

    this.ctx.fillStyle = primaryColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1.5;

    // Jambes (arrière-plan)
    const legWidth = 5 * baseSize;
    const legHeight = 10 * baseSize;
    const legSpacing = 7 * baseSize;

    // Jambe gauche
    this.ctx.save();
    this.ctx.translate(-legSpacing / 2, 8 * baseSize);
    this.ctx.rotate(walkCycle);
    this.ctx.fillStyle = secondaryColor;
    this.ctx.fillRect(-legWidth / 2, 0, legWidth, legHeight);
    this.ctx.strokeRect(-legWidth / 2, 0, legWidth, legHeight);
    // Pied
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(-legWidth / 2, legHeight - 2, legWidth, 2);
    this.ctx.restore();

    // Jambe droite
    this.ctx.save();
    this.ctx.translate(legSpacing / 2, 8 * baseSize);
    this.ctx.rotate(-walkCycle);
    this.ctx.fillStyle = secondaryColor;
    this.ctx.fillRect(-legWidth / 2, 0, legWidth, legHeight);
    this.ctx.strokeRect(-legWidth / 2, 0, legWidth, legHeight);
    // Pied
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(-legWidth / 2, legHeight - 2, legWidth, 2);
    this.ctx.restore();

    // Corps principal (torse)
    const bodyWidth = 16 * baseSize;
    const bodyHeight = 18 * baseSize;
    this.ctx.fillStyle = primaryColor;
    this.ctx.fillRect(-bodyWidth / 2, -4 * baseSize, bodyWidth, bodyHeight);
    this.ctx.strokeRect(-bodyWidth / 2, -4 * baseSize, bodyWidth, bodyHeight);

    // Détail du torse (rayure centrale)
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -4 * baseSize);
    this.ctx.lineTo(0, -4 * baseSize + bodyHeight);
    this.ctx.stroke();

    // Bras
    const armWidth = 4 * baseSize;
    const armHeight = 12 * baseSize;
    const armOffset = bodyWidth / 2 + 1 * baseSize;

    this.ctx.fillStyle = primaryColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1.5;

    // Bras gauche
    this.ctx.save();
    this.ctx.translate(-armOffset, 0);
    this.ctx.rotate(isMoving ? -walkCycle * 1.2 : -0.2);
    this.ctx.fillRect(-armWidth / 2, 0, armWidth, armHeight);
    this.ctx.strokeRect(-armWidth / 2, 0, armWidth, armHeight);
    // Main
    this.ctx.fillStyle = '#ffcc99';
    this.ctx.beginPath();
    this.ctx.arc(0, armHeight, armWidth / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    // Bras droit
    this.ctx.save();
    this.ctx.translate(armOffset, 0);
    this.ctx.rotate(isMoving ? walkCycle * 1.2 : 0.2);
    this.ctx.fillRect(-armWidth / 2, 0, armWidth, armHeight);
    this.ctx.strokeRect(-armWidth / 2, 0, armWidth, armHeight);
    // Main
    this.ctx.fillStyle = '#ffcc99';
    this.ctx.beginPath();
    this.ctx.arc(0, armHeight, armWidth / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    // Tête
    const headRadius = 8 * baseSize;
    this.ctx.fillStyle = '#ffcc99';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(0, -8 * baseSize, headRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Yeux
    const eyeSize = 2;
    const eyeOffset = 3 * baseSize;
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(-eyeOffset, -9 * baseSize, eyeSize, 0, Math.PI * 2);
    this.ctx.arc(eyeOffset, -9 * baseSize, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Pupilles
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(-eyeOffset, -9 * baseSize, eyeSize / 2, 0, Math.PI * 2);
    this.ctx.arc(eyeOffset, -9 * baseSize, eyeSize / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Bouche (sourire)
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, -6 * baseSize, 3 * baseSize, 0.2, Math.PI - 0.2);
    this.ctx.stroke();

    // Cheveux/Casque selon le joueur
    this.ctx.fillStyle = borderColor;
    this.ctx.beginPath();
    this.ctx.arc(0, -12 * baseSize, headRadius * 0.8, Math.PI, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  renderPlayers(players, currentPlayerId, config, dateNow = Date.now(), timestamp = performance.now()) {
    Object.entries(players).forEach(([pid, p]) => {
      const isCurrentPlayer = pid === currentPlayerId;
      if (!p.alive) return;

      // Speed effect
      if (p.speedBoost && dateNow < p.speedBoost) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00ffff';
      }

      // Draw enhanced player sprite
      this.drawPlayerSprite(p, isCurrentPlayer, timestamp);

      this.ctx.shadowBlur = 0;

      // Render weapon sprite
      const weaponType = p.weapon || 'pistol';
      this.renderWeaponSprite(p.x, p.y, p.angle, weaponType, isCurrentPlayer);

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

    // Scale context for Retina displays
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

    this.minimapCtx.restore(); // Restore pixelRatio scaling
  }
}

/* ============================================
   UI MANAGER
   ============================================ */

class UIManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.shopOpen = false;

    // Store handler references for cleanup
    this.handlers = {
      shopClose: () => this.hideShop()
    };

    this.shopCloseBtn = document.getElementById('shop-close-btn');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Shop close button
    if (this.shopCloseBtn) {
      this.shopCloseBtn.addEventListener('click', this.handlers.shopClose);
    }

    // Make buyItem global for onclick handlers
    window.buyItem = (itemId, category) => {
      if (window.networkManager) {
        window.networkManager.buyItem(itemId, category);
      }
    };
  }

  cleanup() {
    // Remove shop close button listener
    if (this.shopCloseBtn) {
      this.shopCloseBtn.removeEventListener('click', this.handlers.shopClose);
    }
  }

  update() {
    const player = this.gameState.getPlayer();
    if (!player) return;

    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    const healthBar = document.getElementById('health-bar');
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = Math.max(0, Math.round(player.health));

    // Low health warning (< 30%)
    if (healthPercent < 30) {
      healthBar.classList.add('low-health');
    } else {
      healthBar.classList.remove('low-health');
    }

    // XP and level
    if (player.level && player.xp !== undefined) {
      const xpNeeded = this.getXPForLevel(player.level);
      const xpPercent = (player.xp / xpNeeded) * 100;
      const xpBar = document.getElementById('xp-bar');
      document.getElementById('xp-fill').style.width = xpPercent + '%';
      document.getElementById('level-text').textContent = player.level;
      document.getElementById('xp-text').textContent = `${Math.floor(player.xp)}/${xpNeeded}`;

      // Near level up indicator (> 85%)
      if (xpPercent > 85) {
        xpBar.classList.add('near-levelup');
      } else {
        xpBar.classList.remove('near-levelup');
      }
    }

    // Stats
    document.getElementById('score-value').textContent = player.score;
    document.getElementById('wave-value').textContent = `${this.gameState.state.wave || 1}`;
    document.getElementById('gold-value').textContent = player.gold || 0;

    // Game over
    if (!player.alive) {
      document.getElementById('game-over').style.display = 'block';
      document.getElementById('final-score').textContent = (player.totalScore || player.score || 0).toLocaleString();
      document.getElementById('final-wave').textContent = `${this.gameState.state.wave || 1}`;
      document.getElementById('final-level').textContent = player.level || 1;
      document.getElementById('final-gold').textContent = (player.gold || 0).toLocaleString();

      // Sauvegarder dans le leaderboard (une seule fois)
      if (!this.deathRecorded && window.leaderboardSystem) {
        this.deathRecorded = true;
        window.leaderboardSystem.addEntry(player);
      }
    } else {
      // Réinitialiser le flag quand le joueur est vivant
      this.deathRecorded = false;
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
        if (window.networkManager) {
          window.networkManager.selectUpgrade(upgrade.id);
        }
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

    // Activer l'invincibilité tant que le shop est ouvert
    if (window.networkManager) {
      window.networkManager.shopOpened();
    }
  }

  hideShop() {
    this.shopOpen = false;
    document.getElementById('shop').style.display = 'none';

    // Désactiver l'invincibilité quand le shop se ferme
    if (window.networkManager) {
      window.networkManager.shopClosed();
    }
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
    this.respawnBtn = document.getElementById('respawn-btn');

    this.spawnProtectionInterval = null; // Store interval for cleanup

    // Store handler references for cleanup
    this.handlers = {
      keypress: (e) => {
        if (e.key === 'Enter') {
          this.startGame();
        }
      },
      startGame: () => this.startGame(),
      respawn: () => this.respawn()
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.nicknameInput) {
      this.nicknameInput.addEventListener('keypress', this.handlers.keypress);
    }

    if (this.startGameBtn) {
      this.startGameBtn.addEventListener('click', this.handlers.startGame);
    }

    if (this.respawnBtn) {
      this.respawnBtn.addEventListener('click', this.handlers.respawn);
    }
  }

  cleanup() {
    // Clear spawn protection interval
    if (this.spawnProtectionInterval) {
      clearInterval(this.spawnProtectionInterval);
      this.spawnProtectionInterval = null;
    }

    // Remove event listeners
    if (this.nicknameInput) {
      this.nicknameInput.removeEventListener('keypress', this.handlers.keypress);
    }

    if (this.startGameBtn) {
      this.startGameBtn.removeEventListener('click', this.handlers.startGame);
    }

    if (this.respawnBtn) {
      this.respawnBtn.removeEventListener('click', this.handlers.respawn);
    }
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

    // Validate nickname format (alphanumeric, spaces, underscores, hyphens only)
    const nicknameRegex = /^[\w\s-]+$/u;
    if (!nicknameRegex.test(nickname)) {
      alert('Votre pseudo ne peut contenir que des lettres, chiffres, espaces, tirets et underscores !');
      return;
    }

    // Hide nickname screen
    this.nicknameScreen.style.display = 'none';

    // Hide skins button and menu during gameplay
    if (window.hideSkinsButton) {
      window.hideSkinsButton();
    }
    const skinsMenu = document.getElementById('skins-menu');
    if (skinsMenu) {
      skinsMenu.style.display = 'none';
    }

    // Set player nickname
    this.playerController.setNickname(nickname);

    // Display player name
    const playerNameDisplay = document.getElementById('player-name-display');
    if (playerNameDisplay) {
      playerNameDisplay.textContent = `🎮 ${nickname}`;
    }

    // Show spawn protection
    this.showSpawnProtection();
  }

  showSpawnProtection() {
    const protectionDiv = document.getElementById('spawn-protection');
    const timerSpan = document.getElementById('protection-timer');

    if (!protectionDiv || !timerSpan) return; // Guard against missing elements

    protectionDiv.style.display = 'block';

    // Clear previous interval if exists
    if (this.spawnProtectionInterval) {
      clearInterval(this.spawnProtectionInterval);
    }

    this.spawnProtectionInterval = setInterval(() => {
      const remaining = Math.ceil((this.playerController.spawnProtectionEndTime - Date.now()) / 1000);

      if (remaining <= 0) {
        if (protectionDiv) protectionDiv.style.display = 'none';
        clearInterval(this.spawnProtectionInterval);
        this.spawnProtectionInterval = null;
        if (window.networkManager) {
          window.networkManager.endSpawnProtection();
        }
      } else {
        if (timerSpan) timerSpan.textContent = remaining;
      }
    }, CONSTANTS.SPAWN_PROTECTION.UPDATE_INTERVAL);
  }

  respawn() {
    this.playerController.respawn();

    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen) {
      gameOverScreen.style.display = 'none';
    }

    // Show nickname screen again
    if (this.nicknameInput) {
      this.nicknameInput.value = '';
      this.nicknameInput.focus();
    }
    if (this.nicknameScreen) {
      this.nicknameScreen.style.display = 'flex';
    }

    // Show skins button again in menu
    if (window.showSkinsButton) {
      window.showSkinsButton();
    }
  }
}

/* ============================================
   GAME ENGINE
   ============================================ */

class GameEngine {
  constructor() {
    // Store handler references for cleanup
    this.handlers = {
      resize: () => this.resizeCanvas(),
      mousemove: null,
      click: null
    };

    this.animationFrameId = null; // Store requestAnimationFrame ID for cleanup
    this.lastFrameTime = 0; // For FPS limiting
    this.frameTimeAccumulator = 0; // For consistent frame timing

    this.setupCanvas();
    this.initializeManagers();
    this.start();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  setupCanvas() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Resize canvas
    this.resizeCanvas();
    window.addEventListener('resize', this.handlers.resize);

    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', this.handlers.resize);
  }

  resizeCanvas() {
    const basePixelRatio = window.devicePixelRatio || 1;

    // Apply performance settings resolution scale
    const resolutionScale = window.performanceSettings ?
      window.performanceSettings.getResolutionScale() : 1.0;

    const pixelRatio = basePixelRatio * resolutionScale;

    // Set display size (CSS pixels)
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';

    // Set actual size in memory (scaled for Retina/high-DPI displays + performance)
    this.canvas.width = window.innerWidth * pixelRatio;
    this.canvas.height = window.innerHeight * pixelRatio;

    // Note: Pixel ratio scaling is applied in the render() method to avoid accumulation

    // Also resize minimap canvas
    this.resizeMinimapCanvas();
  }

  resizeMinimapCanvas() {
    if (!this.renderer || !this.renderer.minimapCanvas) return;

    const basePixelRatio = window.devicePixelRatio || 1;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let minimapSize = 200; // Default desktop size

    // Apply mobile size settings
    if (isMobile && window.performanceSettings) {
      const settings = window.performanceSettings.getSettings();
      const sizeMap = {
        'small': 50,
        'medium': 80,
        'large': 120
      };
      minimapSize = sizeMap[settings.minimapSize] || 80;
    }

    // Set canvas internal dimensions with pixel ratio
    this.renderer.minimapCanvas.width = minimapSize * basePixelRatio;
    this.renderer.minimapCanvas.height = minimapSize * basePixelRatio;
    // Minimap scaling is handled in renderMinimap()
  }

  initializeManagers() {
    // Global game state
    window.gameState = new GameStateManager();

    // Performance settings (must be initialized early)
    if (typeof PerformanceSettingsManager !== 'undefined') {
      window.performanceSettings = new PerformanceSettingsManager();
      window.gameEngine = this; // Make engine accessible for performance settings
    }

    // Managers
    window.inputManager = new InputManager();
    const camera = new CameraManager();
    window.networkManager = new NetworkManager(io());
    window.gameUI = new UIManager(window.gameState);
    window.audioManager = new AudioManager(); // Audio feedback
    window.comboSystem = new ComboSystem(); // Système de combos
    window.leaderboardSystem = new LeaderboardSystem(); // Système de classement
    window.toastManager = new ToastManager(); // Système de notifications

    // Mobile controls
    this.mobileControls = new MobileControlsManager();
    window.mobileControls = this.mobileControls; // Make globally accessible
    window.inputManager.setMobileControls(this.mobileControls);
    window.playerController = this.playerController = new PlayerController(window.inputManager, window.networkManager, window.gameState, camera);

    this.renderer = new Renderer(this.canvas, this.ctx, this.minimapCanvas, this.minimapCtx);
    this.renderer.setCamera(camera);

    this.nicknameManager = new NicknameManager(this.playerController);

    // Mouse events (only if not mobile)
    if (!this.mobileControls.isMobile) {
      this.handlers.mousemove = (e) => {
        window.inputManager.updateMouse(e.clientX, e.clientY);
      };
      this.handlers.click = () => {
        // Use CSS pixels for consistent shooting angle calculation
        this.playerController.shoot(window.innerWidth, window.innerHeight);
      };

      this.canvas.addEventListener('mousemove', this.handlers.mousemove);
      this.canvas.addEventListener('click', this.handlers.click);
    }
  }

  update() {
    // Use CSS pixels (window dimensions) instead of physical canvas dimensions
    // to ensure proper camera centering on high-DPI displays (mobile)
    this.playerController.update(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(window.gameState, window.gameState.playerId);
  }

  gameLoop(timestamp = 0) {
    // FPS limiting based on performance settings
    const targetFrameTime = window.performanceSettings ?
      window.performanceSettings.getTargetFrameTime() : (1000 / 60);

    const deltaTime = timestamp - this.lastFrameTime;

    // Only update/render if enough time has passed
    if (deltaTime >= targetFrameTime) {
      try {
        this.update();
        this.render();

        // Notify performance settings for FPS counting
        if (window.performanceSettings) {
          window.performanceSettings.onFrameRendered();
        }
      } catch (error) {
        console.error('Game loop error:', error);
        // Continue the game loop even if there's an error
      }

      this.lastFrameTime = timestamp - (deltaTime % targetFrameTime);
    }

    this.animationFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  /**
   * Called when performance settings change
   */
  onPerformanceSettingsChanged(settings) {
    // Resize canvas with new resolution scale
    this.resizeCanvas();

    // Update renderer settings
    if (this.renderer) {
      this.renderer.performanceSettings = settings;
    }

    console.log('Performance settings updated in game engine:', settings);
  }

  start() {
    console.log('🎮 Zombie Survival - Game Engine Started');
    this.gameLoop();
  }

  cleanup() {
    // Cancel animation frame to stop game loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove resize and orientation change event listeners
    window.removeEventListener('resize', this.handlers.resize);
    window.removeEventListener('orientationchange', this.handlers.resize);

    // Remove mouse event listeners (if desktop)
    if (this.handlers.mousemove) {
      this.canvas.removeEventListener('mousemove', this.handlers.mousemove);
    }
    if (this.handlers.click) {
      this.canvas.removeEventListener('click', this.handlers.click);
    }

    // Cleanup all managers
    if (window.inputManager && typeof window.inputManager.cleanup === 'function') {
      window.inputManager.cleanup();
    }

    if (window.gameUI && typeof window.gameUI.cleanup === 'function') {
      window.gameUI.cleanup();
    }

    if (this.nicknameManager && typeof this.nicknameManager.cleanup === 'function') {
      this.nicknameManager.cleanup();
    }

    if (this.mobileControls && typeof this.mobileControls.cleanup === 'function') {
      this.mobileControls.cleanup();
    }
  }
}

/* ============================================
   INSTRUCTIONS TOGGLE HANDLER
   ============================================ */

function initInstructionsToggle() {
  const instructionsPanel = document.getElementById('instructions');
  const instructionsToggle = document.getElementById('instructions-toggle');
  const instructionsHeader = document.getElementById('instructions-header');

  if (!instructionsPanel || !instructionsToggle || !instructionsHeader) {
    console.warn('Instructions elements not found');
    return;
  }

  // Toggle function
  const toggleInstructions = () => {
    instructionsPanel.classList.toggle('collapsed');

    // Update button icon
    if (instructionsPanel.classList.contains('collapsed')) {
      instructionsToggle.textContent = '▼';
    } else {
      instructionsToggle.textContent = '▲';
    }
  };

  // Add click event listeners
  instructionsHeader.addEventListener('click', toggleInstructions);

  // Prevent double-toggle when clicking the button directly
  instructionsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  console.log('✅ Instructions toggle initialized');
}

/* ============================================
   MINIMAP TOGGLE HANDLER (MOBILE)
   ============================================ */

function initMinimapToggle() {
  const minimap = document.getElementById('minimap');
  const minimapToggle = document.getElementById('minimap-toggle');

  if (!minimap || !minimapToggle) {
    console.warn('Minimap elements not found');
    return;
  }

  // Check if mobile
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Start with minimap hidden on mobile
    minimap.classList.add('hidden-mobile');

    // Toggle function
    minimapToggle.addEventListener('click', () => {
      minimap.classList.toggle('hidden-mobile');
      minimapToggle.classList.toggle('active');
    });

    console.log('✅ Minimap toggle initialized (mobile)');
  }
}

/* ============================================
   GAME INITIALIZATION
   ============================================ */

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initInstructionsToggle();
    initMinimapToggle();
    new GameEngine();
  });
} else {
  initInstructionsToggle();
  initMinimapToggle();
  new GameEngine();
}
