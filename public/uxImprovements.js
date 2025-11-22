/**
 * UX Improvements Module
 * Handles: Share, Ping Monitor, Tutorial, Colorblind Mode, Help System
 */

class UXImprovements {
  constructor() {
    this.pingHistory = [];
    this.maxPingHistory = 10;
    this.currentColorblindMode = 'none';
    this.tutorialShown = localStorage.getItem('tutorial_shown') === 'true';

    this.init();
  }

  init() {
    this.setupShareButton();
    this.setupHelpModal();
    this.setupColorblindMode();
    this.setupKeyboardShortcuts();
    this.setupPingMonitor();

    // Show tutorial for first-time users
    if (!this.tutorialShown) {
      this.showTutorial();
    }

    console.log('✅ UX Improvements initialized');
  }

  /* ============================================
     SHARE FUNCTIONALITY
     ============================================ */
  setupShareButton() {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', () => this.shareGame());
  }

  async shareGame(score = null) {
    const shareData = {
      title: '🧟 Zombie Survival',
      text: score
        ? `J'ai atteint le score de ${score} sur Zombie Survival ! Peux-tu faire mieux ?`
        : 'Jeu de survie zombie multijoueur gratuit ! Essaie de survivre aux vagues de zombies !',
      url: window.location.href
    };

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('✅ Game shared successfully');
        this.showToast('Merci d\'avoir partagé !', 'success');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          this.fallbackShare();
        }
      }
    } else {
      this.fallbackShare();
    }
  }

  fallbackShare() {
    // Fallback: Copy link to clipboard
    const url = window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => {
          this.showToast('Lien copié dans le presse-papier ! 📋', 'success');
        })
        .catch(() => {
          this.showShareModal(url);
        });
    } else {
      this.showShareModal(url);
    }
  }

  showShareModal(url) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(20, 20, 40, 0.98);
      border: 3px solid #00ff00;
      border-radius: 15px;
      padding: 30px;
      z-index: 10000;
      max-width: 500px;
      text-align: center;
    `;

    modal.innerHTML = `
      <h3 style="color: #00ff00; margin-bottom: 15px;">🔗 Partager le jeu</h3>
      <input type="text" value="${url}" readonly style="
        width: 100%;
        padding: 10px;
        border: 2px solid #00ff00;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 14px;
        margin-bottom: 15px;
      ">
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="copy-url-btn" style="
          background: linear-gradient(135deg, #00ff00, #00cc00);
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        ">📋 Copier</button>
        <button id="close-share-modal" style="
          background: #ff0000;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        ">Fermer</button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('copy-url-btn').onclick = () => {
      const input = modal.querySelector('input');
      input.select();
      document.execCommand('copy');
      this.showToast('Lien copié ! 📋', 'success');
      document.body.removeChild(modal);
    };

    document.getElementById('close-share-modal').onclick = () => {
      document.body.removeChild(modal);
    };
  }

  /* ============================================
     PING MONITOR
     ============================================ */
  setupPingMonitor() {
    this.updatePing(0); // Initial state

    // If socket.io is available, monitor ping
    if (typeof io !== 'undefined') {
      setInterval(() => this.measurePing(), 5000);
    }
  }

  measurePing() {
    // This will be called from the game when socket is available
    const socket = window.socket;
    if (!socket) return;

    const start = Date.now();
    socket.volatile.emit('ping');

    const timeoutId = setTimeout(() => {
      this.updatePing(999); // Timeout
    }, 5000);

    socket.once('pong', () => {
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      this.updatePing(latency);
    });
  }

  updatePing(latency) {
    const pingValue = document.getElementById('ping-value');
    const qualityIndicator = document.getElementById('quality-indicator');

    if (!pingValue || !qualityIndicator) return;

    // Add to history
    this.pingHistory.push(latency);
    if (this.pingHistory.length > this.maxPingHistory) {
      this.pingHistory.shift();
    }

    // Calculate average
    const avgPing = Math.round(
      this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length
    );

    pingValue.textContent = avgPing;

    // Update quality indicator
    qualityIndicator.classList.remove('excellent', 'good', 'fair', 'poor', 'disconnected');

    if (avgPing === 0) {
      qualityIndicator.classList.add('disconnected');
    } else if (avgPing < 50) {
      qualityIndicator.classList.add('excellent');
    } else if (avgPing < 100) {
      qualityIndicator.classList.add('good');
    } else if (avgPing < 200) {
      qualityIndicator.classList.add('fair');
    } else {
      qualityIndicator.classList.add('poor');
    }
  }

  /* ============================================
     HELP MODAL & TUTORIAL
     ============================================ */
  setupHelpModal() {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeBtn = document.getElementById('help-close-btn');
    const dontShowCheckbox = document.getElementById('dont-show-tutorial');

    if (!helpBtn || !helpModal) return;

    helpBtn.addEventListener('click', () => this.showHelp());
    closeBtn?.addEventListener('click', () => this.hideHelp());

    // Tab switching
    const tabs = document.querySelectorAll('.help-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        this.switchHelpTab(targetTab);
      });
    });

    // Don't show again checkbox
    dontShowCheckbox?.addEventListener('change', (e) => {
      if (e.target.checked) {
        localStorage.setItem('tutorial_shown', 'true');
        this.tutorialShown = true;
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpModal.style.display !== 'none') {
        this.hideHelp();
      }
    });
  }

  showHelp() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
      helpModal.style.display = 'flex';
    }
  }

  hideHelp() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
      helpModal.style.display = 'none';
    }
  }

  showTutorial() {
    // Show tutorial automatically for first-time players
    setTimeout(() => {
      this.showHelp();
    }, 1000);
  }

  switchHelpTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.help-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.help-tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`tab-${tabName}`);

    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedContent.classList.add('active');
    }
  }

  /* ============================================
     COLORBLIND MODE
     ============================================ */
  setupColorblindMode() {
    const colorblindBtn = document.getElementById('colorblind-toggle');
    if (!colorblindBtn) return;

    // Load saved preference
    const savedMode = localStorage.getItem('colorblind_mode') || 'none';
    this.applyColorblindMode(savedMode);

    colorblindBtn.addEventListener('click', () => this.cycleColorblindMode());
  }

  cycleColorblindMode() {
    const modes = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
    const currentIndex = modes.indexOf(this.currentColorblindMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    this.applyColorblindMode(nextMode);

    const modeNames = {
      none: 'Normal',
      protanopia: 'Protanopie (Rouge)',
      deuteranopia: 'Deutéranopie (Vert)',
      tritanopia: 'Tritanopie (Bleu)'
    };

    this.showToast(`Mode couleur: ${modeNames[nextMode]} 🎨`, 'info');
  }

  applyColorblindMode(mode) {
    this.currentColorblindMode = mode;
    localStorage.setItem('colorblind_mode', mode);

    // Remove all colorblind classes
    document.body.classList.remove(
      'colorblind-protanopia',
      'colorblind-deuteranopia',
      'colorblind-tritanopia'
    );

    // Apply new mode
    if (mode !== 'none') {
      document.body.classList.add(`colorblind-${mode}`);
    }
  }

  /* ============================================
     KEYBOARD SHORTCUTS
     ============================================ */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch(e.key.toLowerCase()) {
        case 'f':
          // Fullscreen toggle
          this.toggleFullscreen();
          break;
        case 'm':
          // Mute toggle (if audio system exists)
          this.toggleMute();
          break;
        case 'h':
          // Show help
          if (!e.ctrlKey && !e.metaKey) {
            this.showHelp();
            e.preventDefault();
          }
          break;
        case '?':
          // Show help (alternative)
          this.showHelp();
          e.preventDefault();
          break;
      }
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen error:', err);
      });
      this.showToast('Mode plein écran activé', 'info');
    } else {
      document.exitFullscreen();
      this.showToast('Mode plein écran désactivé', 'info');
    }
  }

  toggleMute() {
    // Try to access the global audio system
    if (window.AudioSystem) {
      window.AudioSystem.toggleMute();
    } else if (window.audioSystem) {
      window.audioSystem.toggleMute();
    } else {
      console.log('Audio system not available');
    }
  }

  /* ============================================
     TOAST NOTIFICATIONS
     ============================================ */
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, duration);
  }

  /* ============================================
     PUBLIC API FOR GAME INTEGRATION
     ============================================ */

  // Call this when player dies to share their score
  onGameOver(score, wave, level) {
    // Auto-show share dialog with score after a short delay
    setTimeout(() => {
      if (score > 100) { // Only suggest sharing for decent scores
        this.shareGame(score);
      }
    }, 2000);
  }

  // Call this when socket connects
  onSocketConnect(socket) {
    this.measurePing();
  }

  // Call this periodically from game loop
  update() {
    // Can add periodic updates here if needed
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.uxImprovements = new UXImprovements();
    console.log('✅ UX Improvements ready');
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UXImprovements;
}
