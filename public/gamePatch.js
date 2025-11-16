/**
 * GAME PATCH
 * Patche le jeu existant pour utiliser les nouveaux systèmes
 * Ce fichier doit être chargé APRÈS game.js
 * @version 1.0.0
 */

(function() {
  'use strict';

  console.log('Applying game patches for enhanced systems...');

  // Attendre que le jeu soit initialisé
  const patchInterval = setInterval(() => {
    if (window.GameEngine && window.Renderer && window.PlayerController) {
      clearInterval(patchInterval);
      applyPatches();
    }
  }, 100);

  function applyPatches() {
    console.log('Patching game systems...');

    // ===============================================
    // PATCH 1: Améliorer la boucle de jeu
    // ===============================================
    const originalGameLoop = GameEngine.prototype.gameLoop;
    GameEngine.prototype.gameLoop = function() {
      try {
        this.update();
        this.render();

        // Mise à jour des systèmes améliorés
        if (window.updateEnhancedSystems) {
          window.updateEnhancedSystems(16);
        }
      } catch (error) {
        console.error('Game loop error:', error);
      }
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    };

    // ===============================================
    // PATCH 2: Améliorer le rendu
    // ===============================================
    const originalRender = Renderer.prototype.render;
    Renderer.prototype.render = function(gameState, playerId) {
      // Rendu original
      originalRender.call(this, gameState, playerId);

      // Appliquer le screen shake
      if (window.enhancedEffects && window.enhancedEffects.screenShake) {
        this.ctx.save();
        window.enhancedEffects.screenShake.apply(this.ctx);
        this.ctx.restore();
      }

      // Rendu des effets améliorés (par dessus tout)
      if (window.renderEnhancedEffects) {
        this.ctx.save();
        // Retirer la transformation de la caméra pour les effets d'écran
        const pixelRatio = window.devicePixelRatio || 1;
        this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        window.renderEnhancedEffects(this.ctx, this.canvas.width, this.canvas.height);
        this.ctx.restore();
      }
    };

    // ===============================================
    // PATCH 3: Rendu personnalisé des joueurs
    // ===============================================
    const originalRenderPlayers = Renderer.prototype.renderPlayers;
    Renderer.prototype.renderPlayers = function(players, currentPlayerId, config) {
      Object.entries(players).forEach(([pid, p]) => {
        const isCurrentPlayer = pid === currentPlayerId;
        if (!p.alive) return;

        // Speed effect
        if (p.speedBoost && Date.now() < p.speedBoost) {
          this.ctx.shadowBlur = 20;
          this.ctx.shadowColor = '#00ffff';
        }

        // Utiliser le système de skins si disponible
        if (window.renderPlayer && window.skinManager) {
          window.renderPlayer(this.ctx, p.x, p.y, config.PLAYER_SIZE);
        } else {
          // Rendu par défaut
          this.ctx.fillStyle = isCurrentPlayer ? '#00ff00' : '#00aaff';
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, config.PLAYER_SIZE, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        }

        this.ctx.shadowBlur = 0;

        // Direction indicator (weapon)
        const weaponLength = config.PLAYER_SIZE + 15;
        this.ctx.strokeStyle = '#ffffff';
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
    };

    // ===============================================
    // PATCH 4: Rendu personnalisé des balles
    // ===============================================
    const originalRenderBullets = Renderer.prototype.renderBullets;
    Renderer.prototype.renderBullets = function(bullets, config) {
      Object.values(bullets).forEach(b => {
        // Utiliser le système de skins si disponible
        if (window.renderBullet && window.skinManager) {
          window.renderBullet(this.ctx, b.x, b.y, 4);
        } else {
          // Rendu par défaut
          this.ctx.fillStyle = b.color || '#fff';
          this.ctx.beginPath();
          this.ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    };

    // ===============================================
    // PATCH 5: Intercepter le tir pour les effets
    // ===============================================
    const originalShoot = PlayerController.prototype.shoot;
    PlayerController.prototype.shoot = function(canvasWidth, canvasHeight) {
      const result = originalShoot.call(this, canvasWidth, canvasHeight);

      // Effets lors du tir
      if (result && window.gameState) {
        const player = window.gameState.getPlayer();
        if (player) {
          const weaponType = player.weapon || 'pistol';
          if (window.onPlayerShoot) {
            window.onPlayerShoot(player.x, player.y, player.angle, weaponType);
          }
        }
      }

      return result;
    };

    // ===============================================
    // PATCH 6: Intercepter les événements réseau
    // ===============================================
    if (window.NetworkManager) {
      const setupNetworkHooks = () => {
        if (!window.networkManager || !window.networkManager.socket) {
          setTimeout(setupNetworkHooks, 100);
          return;
        }

        const socket = window.networkManager.socket;

        // Hook pour les mises à jour d'état
        socket.on('gameState', (state) => {
          const oldState = window.gameState ? window.gameState.state : null;

          // Détecter les événements
          if (oldState && state) {
            detectGameEvents(oldState, state);
          }

          // Mettre à jour les barres de progression
          if (window.updateHealthBar && state.players && window.gameState.playerId) {
            const player = state.players[window.gameState.playerId];
            if (player) {
              window.updateHealthBar(player.health, player.maxHealth);
              window.updateXPBar(player.xp, getXPForLevel(player.level + 1));
            }
          }
        });

        console.log('Network hooks installed');
      };

      setupNetworkHooks();
    }

    // ===============================================
    // FONCTION: Détection des événements de jeu
    // ===============================================
    function detectGameEvents(oldState, newState) {
      // Détecter la mort de zombies
      if (oldState.zombies && newState.zombies) {
        Object.keys(oldState.zombies).forEach(zid => {
          if (!newState.zombies[zid]) {
            const zombie = oldState.zombies[zid];
            if (window.onZombieDeath) {
              const color = getZombieColor(zombie.type);
              window.onZombieDeath(zombie.x, zombie.y, color);
            }
          }
        });
      }

      // Détecter la collecte de loot
      if (oldState.loot && newState.loot) {
        Object.keys(oldState.loot).forEach(lid => {
          if (!newState.loot[lid]) {
            const loot = oldState.loot[lid];
            if (loot.type === 'gold' && window.onGoldCollect) {
              window.onGoldCollect(loot.x, loot.y, loot.amount);
            } else if (loot.type === 'xp' && window.onXPGain) {
              window.onXPGain(loot.x, loot.y, loot.amount);
            }
          }
        });
      }

      // Détecter le level up
      const playerId = window.gameState.playerId;
      if (playerId && oldState.players && newState.players) {
        const oldPlayer = oldState.players[playerId];
        const newPlayer = newState.players[playerId];

        if (oldPlayer && newPlayer) {
          // Level up
          if (newPlayer.level > oldPlayer.level && window.onLevelUp) {
            window.onLevelUp(newPlayer.x, newPlayer.y, newPlayer.level);
          }

          // Dégâts reçus
          if (newPlayer.health < oldPlayer.health && window.onPlayerDamage) {
            const damage = oldPlayer.health - newPlayer.health;
            window.onPlayerDamage(newPlayer.x, newPlayer.y, damage);
          }

          // Heal
          if (newPlayer.health > oldPlayer.health && window.onPlayerHeal) {
            const heal = newPlayer.health - oldPlayer.health;
            window.onPlayerHeal(newPlayer.x, newPlayer.y, heal);
          }
        }
      }

      // Détecter l'apparition d'un boss
      if (oldState.zombies && newState.zombies) {
        Object.entries(newState.zombies).forEach(([zid, zombie]) => {
          if (!oldState.zombies[zid] && zombie.type === 'boss' && window.onBossSpawn) {
            window.onBossSpawn(zombie.x, zombie.y);
          }
        });
      }

      // Détecter le début du combat
      if (!oldState.zombies || Object.keys(oldState.zombies).length === 0) {
        if (newState.zombies && Object.keys(newState.zombies).length > 0 && window.onCombatStart) {
          window.onCombatStart();
        }
      }
    }

    // ===============================================
    // FONCTIONS UTILITAIRES
    // ===============================================
    function getZombieColor(type) {
      const colors = {
        normal: '#00ff00',
        fast: '#ffff00',
        tank: '#ff6600',
        explosive: '#ff00ff',
        healer: '#00ffff',
        slower: '#8800ff',
        boss: '#ff0000'
      };
      return colors[type] || '#00ff00';
    }

    function getXPForLevel(level) {
      return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    // ===============================================
    // PATCH 7: Ajouter des contrôles audio à l'UI
    // ===============================================
    function addAudioControls() {
      const controlsContainer = document.createElement('div');
      controlsContainer.id = 'audio-controls';
      controlsContainer.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 100;
        display: flex;
        gap: 10px;
      `;

      // Bouton musique
      const musicBtn = document.createElement('button');
      musicBtn.textContent = '🎵';
      musicBtn.title = 'Musique On/Off';
      musicBtn.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 2px solid #00ff00;
        cursor: pointer;
        font-size: 20px;
      `;

      musicBtn.addEventListener('click', () => {
        if (window.advancedAudio) {
          const enabled = window.advancedAudio.toggleMusic();
          musicBtn.style.opacity = enabled ? '1' : '0.5';
          musicBtn.textContent = enabled ? '🎵' : '🔇';
        }
      });

      // Bouton sons
      const soundBtn = document.createElement('button');
      soundBtn.textContent = '🔊';
      soundBtn.title = 'Sons On/Off';
      soundBtn.style.cssText = musicBtn.style.cssText;

      soundBtn.addEventListener('click', () => {
        if (window.advancedAudio) {
          const enabled = window.advancedAudio.toggleSound();
          soundBtn.style.opacity = enabled ? '1' : '0.5';
          soundBtn.textContent = enabled ? '🔊' : '🔇';
        }
      });

      controlsContainer.appendChild(musicBtn);
      controlsContainer.appendChild(soundBtn);
      document.body.appendChild(controlsContainer);
    }

    addAudioControls();

    console.log('✓ All patches applied successfully!');
  }
})();
