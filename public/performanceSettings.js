/**
 * PERFORMANCE SETTINGS SYSTEM
 * Manages performance modes and immersive UI for mobile
 * @version 1.0.0
 */

/* ============================================
   PERFORMANCE SETTINGS MANAGER
   ============================================ */

class PerformanceSettingsManager {
  constructor() {
    this.settings = {
      performanceMode: 'normal', // 'normal' or 'performance'
      resolutionScale: 1.0, // 1.0 = full resolution, 0.75 = 75%
      targetFPS: 60, // 60 or 30
      particlesEnabled: true,
      gridEnabled: true,
      shadowsEnabled: true,
      immersiveMode: false, // Hide non-essential UI
      minimapPosition: 'right' // 'right', 'left', 'hidden'
    };

    this.currentFPS = 60;
    this.frameCount = 0;
    this.lastFPSUpdate = Date.now();
    this.fpsHistory = [];
    this.autoAdjust = true;

    this.loadSettings();
    this.createUI();
    this.startFPSMonitoring();
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('zombieGamePerformanceSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
        this.applySettings();
      }
    } catch (e) {
      console.warn('Failed to load performance settings:', e);
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('zombieGamePerformanceSettings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save performance settings:', e);
    }
  }

  /**
   * Create the settings UI
   */
  createUI() {
    // Settings button (gear icon)
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = 'Paramètres';
    settingsBtn.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1001;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ff00;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(5px);
    `;

    settingsBtn.addEventListener('mouseenter', () => {
      settingsBtn.style.transform = 'scale(1.1) rotate(90deg)';
      settingsBtn.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
    });

    settingsBtn.addEventListener('mouseleave', () => {
      settingsBtn.style.transform = 'scale(1) rotate(0deg)';
      settingsBtn.style.boxShadow = 'none';
    });

    settingsBtn.addEventListener('click', () => this.toggleSettingsPanel());

    document.body.appendChild(settingsBtn);

    // Settings panel
    this.createSettingsPanel();

    // FPS counter
    this.createFPSCounter();

    // Immersive mode toggle button (for mobile)
    this.createImmersiveModeButton();
  }

  /**
   * Create the settings panel
   */
  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'performance-settings-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1002;
      background: rgba(10, 10, 30, 0.98);
      border: 3px solid #00ff00;
      border-radius: 15px;
      padding: 20px;
      width: min(90%, 400px);
      max-height: 80vh;
      overflow-y: auto;
      display: none;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
    `;

    panel.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #00ff00; margin: 0 0 10px 0; font-size: 24px;">⚙️ PARAMÈTRES</h2>
        <div id="fps-display-panel" style="color: #ffd700; font-size: 14px; margin-bottom: 10px;">
          FPS: <span id="current-fps">60</span> | Moyenne: <span id="avg-fps">60</span>
        </div>
      </div>

      <div class="settings-section">
        <h3 style="color: #ffd700; font-size: 18px; margin-bottom: 15px;">🚀 Mode Performance</h3>

        <div class="setting-item">
          <label style="color: #fff; display: block; margin-bottom: 5px;">
            <input type="radio" name="perfMode" value="normal" ${this.settings.performanceMode === 'normal' ? 'checked' : ''}>
            Mode Normal (Qualité maximale)
          </label>
          <label style="color: #fff; display: block; margin-bottom: 10px;">
            <input type="radio" name="perfMode" value="performance" ${this.settings.performanceMode === 'performance' ? 'checked' : ''}>
            Mode Performance (Optimisé pour appareils bas de gamme)
          </label>
        </div>

        <div class="setting-item" style="margin-top: 15px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">
            Résolution: <span id="resolution-value">${Math.round(this.settings.resolutionScale * 100)}%</span>
          </label>
          <input type="range" id="resolution-slider" min="50" max="100" value="${this.settings.resolutionScale * 100}"
                 style="width: 100%;">
          <p style="color: #aaa; font-size: 12px; margin: 5px 0 0 0;">
            Réduire la résolution améliore les performances
          </p>
        </div>

        <div class="setting-item" style="margin-top: 15px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">
            FPS Cible:
          </label>
          <label style="color: #fff; display: block;">
            <input type="radio" name="targetFPS" value="60" ${this.settings.targetFPS === 60 ? 'checked' : ''}>
            60 FPS (Fluide)
          </label>
          <label style="color: #fff; display: block; margin-bottom: 10px;">
            <input type="radio" name="targetFPS" value="30" ${this.settings.targetFPS === 30 ? 'checked' : ''}>
            30 FPS (Économie d'énergie)
          </label>
        </div>

        <div class="setting-item" style="margin-top: 15px;">
          <label style="color: #fff; display: block; margin-bottom: 10px;">
            <input type="checkbox" id="auto-adjust-checkbox" ${this.autoAdjust ? 'checked' : ''}>
            Ajustement automatique des performances
          </label>
          <p style="color: #aaa; font-size: 12px; margin: 0;">
            Ajuste automatiquement la qualité si les FPS chutent
          </p>
        </div>
      </div>

      <div class="settings-section" style="margin-top: 20px;">
        <h3 style="color: #ffd700; font-size: 18px; margin-bottom: 15px;">📱 Interface Mobile</h3>

        <div class="setting-item">
          <label style="color: #fff; display: block; margin-bottom: 10px;">
            <input type="checkbox" id="immersive-mode-checkbox" ${this.settings.immersiveMode ? 'checked' : ''}>
            Mode Immersif (Masquer UI non-essentielle)
          </label>
        </div>

        <div class="setting-item" style="margin-top: 15px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">
            Position de la Minimap:
          </label>
          <select id="minimap-position-select" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.5); color: #fff; border: 2px solid #00ff00; border-radius: 5px;">
            <option value="right" ${this.settings.minimapPosition === 'right' ? 'selected' : ''}>Droite</option>
            <option value="left" ${this.settings.minimapPosition === 'left' ? 'selected' : ''}>Gauche</option>
            <option value="hidden" ${this.settings.minimapPosition === 'hidden' ? 'selected' : ''}>Masquée</option>
          </select>
        </div>
      </div>

      <div class="settings-section" style="margin-top: 20px;">
        <h3 style="color: #ffd700; font-size: 18px; margin-bottom: 15px;">🎨 Effets Visuels</h3>

        <div class="setting-item">
          <label style="color: #fff; display: block; margin-bottom: 10px;">
            <input type="checkbox" id="particles-checkbox" ${this.settings.particlesEnabled ? 'checked' : ''}>
            Particules
          </label>
          <label style="color: #fff; display: block; margin-bottom: 10px;">
            <input type="checkbox" id="grid-checkbox" ${this.settings.gridEnabled ? 'checked' : ''}>
            Grille
          </label>
        </div>
      </div>

      <div style="margin-top: 20px; text-align: center;">
        <button id="apply-settings-btn" style="
          background: linear-gradient(135deg, #00ff00, #00cc00);
          color: #000;
          border: none;
          padding: 12px 30px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          margin-right: 10px;
          transition: all 0.3s ease;
        ">Appliquer</button>
        <button id="close-settings-btn" style="
          background: rgba(100, 100, 100, 0.8);
          color: #fff;
          border: none;
          padding: 12px 30px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        ">Fermer</button>
      </div>
    `;

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('apply-settings-btn').addEventListener('click', () => {
      this.updateSettingsFromUI();
      this.applySettings();
      this.saveSettings();
      this.hideSettingsPanel();
    });

    document.getElementById('close-settings-btn').addEventListener('click', () => {
      this.hideSettingsPanel();
    });

    // Real-time resolution slider update
    document.getElementById('resolution-slider').addEventListener('input', (e) => {
      document.getElementById('resolution-value').textContent = e.target.value + '%';
    });

    // Performance mode presets
    document.querySelectorAll('input[name="perfMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'performance') {
          document.getElementById('resolution-slider').value = 75;
          document.getElementById('resolution-value').textContent = '75%';
          document.querySelector('input[name="targetFPS"][value="30"]').checked = true;
          document.getElementById('particles-checkbox').checked = false;
          document.getElementById('grid-checkbox').checked = false;
        } else {
          document.getElementById('resolution-slider').value = 100;
          document.getElementById('resolution-value').textContent = '100%';
          document.querySelector('input[name="targetFPS"][value="60"]').checked = true;
          document.getElementById('particles-checkbox').checked = true;
          document.getElementById('grid-checkbox').checked = true;
        }
      });
    });
  }

  /**
   * Create FPS counter
   */
  createFPSCounter() {
    const counter = document.createElement('div');
    counter.id = 'fps-counter';
    counter.style.cssText = `
      position: fixed;
      top: 70px;
      right: 10px;
      z-index: 1001;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 8px 12px;
      color: #ffd700;
      font-family: monospace;
      font-size: 14px;
      font-weight: bold;
      backdrop-filter: blur(5px);
      display: none;
    `;
    counter.innerHTML = 'FPS: <span id="fps-value">60</span>';
    document.body.appendChild(counter);
  }

  /**
   * Create immersive mode toggle button (mobile)
   */
  createImmersiveModeButton() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    const btn = document.createElement('button');
    btn.id = 'immersive-mode-btn';
    btn.innerHTML = '🎬';
    btn.title = 'Mode Immersif';
    btn.style.cssText = `
      position: fixed;
      top: 70px;
      right: 10px;
      z-index: 1001;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ffff;
      border-radius: 50%;
      width: 45px;
      height: 45px;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(5px);
    `;

    btn.addEventListener('click', () => {
      this.settings.immersiveMode = !this.settings.immersiveMode;
      this.applyImmersiveMode();
      this.saveSettings();

      btn.style.background = this.settings.immersiveMode ?
        'rgba(0, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.8)';
      btn.style.borderColor = this.settings.immersiveMode ? '#00ffff' : '#00ffff';
    });

    document.body.appendChild(btn);

    // Apply initial state
    if (this.settings.immersiveMode) {
      btn.style.background = 'rgba(0, 255, 255, 0.3)';
      this.applyImmersiveMode();
    }
  }

  /**
   * Toggle settings panel
   */
  toggleSettingsPanel() {
    const panel = document.getElementById('performance-settings-panel');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      // Update FPS display
      document.getElementById('current-fps').textContent = Math.round(this.currentFPS);
      const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / Math.max(this.fpsHistory.length, 1);
      document.getElementById('avg-fps').textContent = Math.round(avgFPS);
    } else {
      panel.style.display = 'none';
    }
  }

  /**
   * Hide settings panel
   */
  hideSettingsPanel() {
    document.getElementById('performance-settings-panel').style.display = 'none';
  }

  /**
   * Update settings from UI
   */
  updateSettingsFromUI() {
    const perfMode = document.querySelector('input[name="perfMode"]:checked').value;
    const resolutionScale = parseInt(document.getElementById('resolution-slider').value) / 100;
    const targetFPS = parseInt(document.querySelector('input[name="targetFPS"]:checked').value);
    const particlesEnabled = document.getElementById('particles-checkbox').checked;
    const gridEnabled = document.getElementById('grid-checkbox').checked;
    const immersiveMode = document.getElementById('immersive-mode-checkbox').checked;
    const minimapPosition = document.getElementById('minimap-position-select').value;
    const autoAdjust = document.getElementById('auto-adjust-checkbox').checked;

    this.settings = {
      performanceMode: perfMode,
      resolutionScale,
      targetFPS,
      particlesEnabled,
      gridEnabled,
      shadowsEnabled: this.settings.shadowsEnabled,
      immersiveMode,
      minimapPosition
    };

    this.autoAdjust = autoAdjust;
  }

  /**
   * Apply settings to the game
   */
  applySettings() {
    // Apply resolution scale
    this.applyResolutionScale();

    // Apply immersive mode
    this.applyImmersiveMode();

    // Apply minimap position
    this.applyMinimapPosition();

    // Notify game of settings change
    if (window.gameEngine) {
      window.gameEngine.onPerformanceSettingsChanged(this.settings);
    }

    console.log('Performance settings applied:', this.settings);
  }

  /**
   * Apply resolution scale
   */
  applyResolutionScale() {
    if (!window.gameEngine) return;

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const basePixelRatio = window.devicePixelRatio || 1;
    const adjustedPixelRatio = basePixelRatio * this.settings.resolutionScale;

    // Set display size (CSS pixels)
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    // Set actual size in memory (scaled)
    canvas.width = window.innerWidth * adjustedPixelRatio;
    canvas.height = window.innerHeight * adjustedPixelRatio;

    console.log(`Resolution scale applied: ${this.settings.resolutionScale}x (${Math.round(adjustedPixelRatio * 100)}% of native)`);
  }

  /**
   * Apply immersive mode
   */
  applyImmersiveMode() {
    const stats = document.getElementById('stats');
    const instructions = document.getElementById('instructions');

    if (this.settings.immersiveMode) {
      // Hide non-essential UI in landscape mode on mobile
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isLandscape && isMobile) {
        if (stats) stats.style.opacity = '0.3';
        if (instructions) instructions.style.display = 'none';
      }
    } else {
      // Show all UI
      if (stats) stats.style.opacity = '1';
      if (instructions && !this.isMobile()) instructions.style.display = 'block';
    }
  }

  /**
   * Apply minimap position
   */
  applyMinimapPosition() {
    const minimap = document.getElementById('minimap');
    if (!minimap) return;

    minimap.style.transition = 'all 0.3s ease';

    if (this.settings.minimapPosition === 'hidden') {
      minimap.style.display = 'none';
    } else {
      minimap.style.display = 'block';

      if (this.settings.minimapPosition === 'left') {
        minimap.style.left = '0.5rem';
        minimap.style.right = 'auto';
      } else {
        minimap.style.right = '0.5rem';
        minimap.style.left = 'auto';
      }
    }
  }

  /**
   * Check if device is mobile
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Start FPS monitoring
   */
  startFPSMonitoring() {
    setInterval(() => {
      this.updateFPS();

      // Auto-adjust if enabled and FPS is low
      if (this.autoAdjust && this.currentFPS < 25) {
        this.autoAdjustPerformance();
      }
    }, 1000);
  }

  /**
   * Update FPS counter
   */
  updateFPS() {
    const now = Date.now();
    const delta = now - this.lastFPSUpdate;

    if (delta >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;

      // Update FPS history
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }

      // Update FPS counter display
      const fpsValue = document.getElementById('fps-value');
      if (fpsValue) {
        fpsValue.textContent = this.currentFPS;

        // Color based on FPS
        const counter = document.getElementById('fps-counter');
        if (this.currentFPS < 30) {
          counter.style.borderColor = '#ff0000';
          fpsValue.style.color = '#ff0000';
        } else if (this.currentFPS < 50) {
          counter.style.borderColor = '#ffaa00';
          fpsValue.style.color = '#ffaa00';
        } else {
          counter.style.borderColor = '#ffd700';
          fpsValue.style.color = '#ffd700';
        }
      }
    }
  }

  /**
   * Auto-adjust performance
   */
  autoAdjustPerformance() {
    console.warn('Low FPS detected, auto-adjusting performance...');

    // Reduce resolution if not already at minimum
    if (this.settings.resolutionScale > 0.5) {
      this.settings.resolutionScale = Math.max(0.5, this.settings.resolutionScale - 0.1);
      this.applyResolutionScale();
    }

    // Disable particles
    if (this.settings.particlesEnabled) {
      this.settings.particlesEnabled = false;
    }

    // Disable grid
    if (this.settings.gridEnabled) {
      this.settings.gridEnabled = false;
    }

    // Lower target FPS
    if (this.settings.targetFPS > 30) {
      this.settings.targetFPS = 30;
    }

    this.saveSettings();
    console.log('Performance auto-adjusted:', this.settings);
  }

  /**
   * Notify frame rendered (for FPS counting)
   */
  onFrameRendered() {
    this.frameCount++;
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Should render grid?
   */
  shouldRenderGrid() {
    return this.settings.gridEnabled;
  }

  /**
   * Should render particles?
   */
  shouldRenderParticles() {
    return this.settings.particlesEnabled;
  }

  /**
   * Get target frame time (ms)
   */
  getTargetFrameTime() {
    return 1000 / this.settings.targetFPS;
  }

  /**
   * Get resolution scale
   */
  getResolutionScale() {
    return this.settings.resolutionScale;
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.PerformanceSettingsManager = PerformanceSettingsManager;
}
