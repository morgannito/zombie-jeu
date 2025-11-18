/**
 * ZOMBIE MANAGER - Gestion du spawn et de la logique des zombies
 * Gère le spawn, les vagues, les boss et l'escalade de difficulté
 * @version 1.0.0
 */

class ZombieManager {
  constructor(gameState, config, zombieTypes, checkWallCollision, io = null) {
    this.gameState = gameState;
    this.config = config;
    this.zombieTypes = zombieTypes;
    this.checkWallCollision = checkWallCollision;
    this.io = io;
    this.zombieSpawnTimer = null;
  }

  /**
   * Calculer le nombre de zombies à spawner par batch selon la vague
   * @returns {number}
   */
  getZombiesPerBatch() {
    if (this.gameState.wave <= 2) {
      return 2; // Vagues 1-2 : 2 zombies à la fois
    } else if (this.gameState.wave <= 5) {
      return 3; // Vagues 3-5 : 3 zombies à la fois
    } else if (this.gameState.wave <= 8) {
      return 5; // Vagues 6-8 : 5 zombies à la fois
    } else if (this.gameState.wave <= 12) {
      return 7; // Vagues 9-12 : 7 zombies à la fois
    } else {
      return 10; // Vagues 13+ : 10 zombies à la fois (CHAOS!)
    }
  }

  /**
   * Spawner un seul zombie (fonction utilitaire)
   * @returns {boolean} true si le spawn a réussi
   */
  spawnSingleZombie() {
    // Position aléatoire dans la salle (éviter les murs)
    let x, y;
    let attempts = 0;
    do {
      x = 100 + Math.random() * (this.config.ROOM_WIDTH - 200);
      y = 100 + Math.random() * (this.config.ROOM_HEIGHT - 200);
      attempts++;
    } while (this.checkWallCollision(x, y, this.config.ZOMBIE_SIZE) && attempts < 50);

    if (attempts >= 50) return false; // Pas de place disponible

    // Choisir un type de zombie avec pondération progressive selon la vague
    let types;
    if (this.gameState.wave <= 3) {
      types = ['normal', 'normal', 'normal', 'normal', 'fast', 'fast', 'tank'];
    } else if (this.gameState.wave <= 6) {
      types = ['normal', 'normal', 'fast', 'fast', 'tank', 'tank', 'healer', 'slower', 'poison', 'shooter'];
    } else if (this.gameState.wave <= 10) {
      types = ['normal', 'fast', 'fast', 'tank', 'tank', 'healer', 'slower', 'slower', 'poison', 'poison', 'shooter', 'shooter'];
    } else {
      types = ['fast', 'fast', 'tank', 'tank', 'tank', 'healer', 'healer', 'slower', 'slower', 'poison', 'poison', 'shooter', 'shooter', 'shooter'];
    }
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = this.zombieTypes[typeKey];

    const zombieId = this.gameState.nextZombieId++;

    // Multiplicateur de difficulté selon la vague
    const waveMultiplier = 1 + (this.gameState.wave - 1) * 0.15;
    const zombieHealth = Math.floor(type.health * waveMultiplier);
    const zombieDamage = Math.floor(type.damage * waveMultiplier);
    const zombieSpeed = Math.min(type.speed * (1 + (this.gameState.wave - 1) * 0.04), type.speed * 1.8);
    const zombieGold = Math.floor(type.gold * waveMultiplier);
    const zombieXP = Math.floor(type.xp * waveMultiplier);

    this.gameState.zombies[zombieId] = {
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

    this.gameState.zombiesSpawnedThisWave++;
    return true;
  }

  /**
   * Spawn des zombies en groupes (MODE INFINI avec vagues)
   */
  spawnZombie() {
    if (Object.keys(this.gameState.zombies).length >= this.config.MAX_ZOMBIES) {
      return;
    }

    // Limiter le spawn selon la vague actuelle
    const zombiesForThisWave = this.config.ZOMBIES_PER_ROOM + (this.gameState.wave - 1) * 7;

    if (this.gameState.zombiesSpawnedThisWave >= zombiesForThisWave) {
      // Spawner le boss si pas encore fait
      if (!this.gameState.bossSpawned && Object.keys(this.gameState.zombies).length === 0) {
        this.spawnBoss();
      }
      return;
    }

    // Spawner plusieurs zombies à la fois (batch spawning)
    const batchSize = this.getZombiesPerBatch();
    let spawned = 0;

    for (let i = 0; i < batchSize; i++) {
      if (Object.keys(this.gameState.zombies).length >= this.config.MAX_ZOMBIES) break;
      if (this.gameState.zombiesSpawnedThisWave >= zombiesForThisWave) break;

      if (this.spawnSingleZombie()) {
        spawned++;
      }
    }
  }

  /**
   * Spawner un boss zombie
   */
  spawnBoss() {
    const type = this.zombieTypes.boss;

    // Le boss devient plus fort à chaque vague
    const waveMultiplier = 1 + (this.gameState.wave - 1) * 0.20;
    const bossHealth = Math.floor(type.health * waveMultiplier);
    const bossDamage = Math.floor(type.damage * waveMultiplier);
    const bossGold = Math.floor(type.gold * waveMultiplier);
    const bossXP = Math.floor(type.xp * waveMultiplier);

    // Centre de la salle
    const x = this.config.ROOM_WIDTH / 2;
    const y = this.config.ROOM_HEIGHT / 2;

    const zombieId = this.gameState.nextZombieId++;

    this.gameState.zombies[zombieId] = {
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

    this.gameState.bossSpawned = true;

    // Émettre l'événement de boss spawned si io est disponible
    if (this.io) {
      this.io.emit('bossSpawned', {
        bossName: `${type.name} (Vague ${this.gameState.wave})`,
        bossHealth: bossHealth,
        wave: this.gameState.wave
      });
    }
  }

  /**
   * Calculer l'intervalle de spawn selon la vague
   * @returns {number} Intervalle en ms
   */
  getSpawnInterval() {
    const baseInterval = this.config.ZOMBIE_SPAWN_INTERVAL;
    const reduction = Math.min((this.gameState.wave - 1) * 50, 600);
    return Math.max(baseInterval - reduction, 400);
  }

  /**
   * Démarrer le spawner de zombies
   */
  startZombieSpawner() {
    if (this.zombieSpawnTimer) {
      clearInterval(this.zombieSpawnTimer);
    }
    this.zombieSpawnTimer = setInterval(() => {
      this.spawnZombie();
    }, this.getSpawnInterval());
  }

  /**
   * Relancer le timer quand une nouvelle vague commence
   * CORRECTION: Recalculer l'intervalle avec la nouvelle vague
   */
  restartZombieSpawner() {
    if (this.zombieSpawnTimer) {
      clearInterval(this.zombieSpawnTimer);
    }
    // Recalculer l'intervalle selon la vague actuelle
    this.zombieSpawnTimer = setInterval(() => {
      this.spawnZombie();
    }, this.getSpawnInterval());
  }

  /**
   * Arrêter le spawner
   */
  stopZombieSpawner() {
    if (this.zombieSpawnTimer) {
      clearInterval(this.zombieSpawnTimer);
      this.zombieSpawnTimer = null;
    }
  }
}

module.exports = ZombieManager;
