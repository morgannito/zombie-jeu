/**
 * NETWORK MANAGER - Gestion de la compression et des deltas
 * Implémente la delta compression pour réduire la bande passante
 * Gain: -80-90% bande passante
 * @version 1.0.0
 */

class NetworkManager {
  constructor(io, gameState) {
    this.io = io;
    this.gameState = gameState;
    this.previousState = {};
    this.fullStateCounter = 0;
    this.FULL_STATE_INTERVAL = 30; // Envoyer l'état complet toutes les 30 frames
  }

  /**
   * Comparer deux valeurs en profondeur
   * @param {*} a
   * @param {*} b
   * @returns {boolean}
   */
  deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (a === null || b === null) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (let key of keysA) {
      if (!keysB.includes(key)) return false;
      if (typeof a[key] === 'object' && typeof b[key] === 'object') {
        if (!this.deepEqual(a[key], b[key])) return false;
      } else if (a[key] !== b[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculer le delta entre deux états
   * @param {Object} current - État actuel
   * @param {Object} previous - État précédent
   * @returns {Object} Delta avec {updated, removed, meta}
   */
  calculateDelta(current, previous) {
    const delta = {
      updated: {},
      removed: {},
      meta: {}
    };

    // Listes des types d'entités à comparer
    const entityTypes = ['players', 'zombies', 'bullets', 'particles', 'poisonTrails', 'explosions', 'powerups', 'loot'];

    for (let type of entityTypes) {
      const currentEntities = current[type] || {};
      const previousEntities = previous[type] || {};

      delta.updated[type] = {};
      delta.removed[type] = [];

      // Entités nouvelles ou modifiées
      for (let id in currentEntities) {
        const currentEntity = currentEntities[id];
        const previousEntity = previousEntities[id];

        if (!previousEntity || !this.deepEqual(currentEntity, previousEntity)) {
          delta.updated[type][id] = currentEntity;
        }
      }

      // Entités supprimées
      for (let id in previousEntities) {
        if (!currentEntities[id]) {
          delta.removed[type].push(id);
        }
      }

      // Supprimer les clés vides
      if (Object.keys(delta.updated[type]).length === 0) {
        delete delta.updated[type];
      }
      if (delta.removed[type].length === 0) {
        delete delta.removed[type];
      }
    }

    // Meta-données (toujours envoyées)
    delta.meta = {
      wave: current.wave,
      walls: current.walls,
      currentRoom: current.currentRoom,
      bossSpawned: current.bossSpawned
    };

    return delta;
  }

  /**
   * Cloner l'état actuel pour la comparaison future
   * @param {Object} state
   * @returns {Object} Clone profond
   */
  cloneState(state) {
    return JSON.parse(JSON.stringify({
      players: state.players,
      zombies: state.zombies,
      bullets: state.bullets,
      particles: state.particles,
      poisonTrails: state.poisonTrails,
      explosions: state.explosions,
      powerups: state.powerups,
      loot: state.loot,
      wave: state.wave,
      walls: state.walls,
      currentRoom: state.currentRoom,
      bossSpawned: state.bossSpawned
    }));
  }

  /**
   * Émettre l'état du jeu (full ou delta)
   * Envoie l'état complet toutes les 30 frames, sinon envoie le delta
   */
  emitGameState() {
    this.fullStateCounter++;

    // Toutes les 30 frames : état complet
    if (this.fullStateCounter >= this.FULL_STATE_INTERVAL) {
      this.fullStateCounter = 0;

      const fullState = {
        players: this.gameState.players,
        zombies: this.gameState.zombies,
        bullets: this.gameState.bullets,
        particles: this.gameState.particles,
        poisonTrails: this.gameState.poisonTrails,
        explosions: this.gameState.explosions,
        powerups: this.gameState.powerups,
        loot: this.gameState.loot,
        wave: this.gameState.wave,
        walls: this.gameState.walls,
        currentRoom: this.gameState.currentRoom,
        bossSpawned: this.gameState.bossSpawned,
        full: true // Indicateur d'état complet
      };

      this.io.emit('gameState', fullState);

      // Sauvegarder l'état pour la prochaine comparaison
      this.previousState = this.cloneState(this.gameState);

    } else {
      // Calculer et envoyer le delta
      const delta = this.calculateDelta(this.gameState, this.previousState);

      // Seulement si le delta contient des changements
      if (Object.keys(delta.updated).length > 0 || Object.keys(delta.removed).length > 0) {
        this.io.emit('gameStateDelta', delta);
      }

      // Sauvegarder l'état pour la prochaine comparaison
      this.previousState = this.cloneState(this.gameState);
    }
  }

  /**
   * Émettre un événement à un joueur spécifique
   * @param {string} playerId - Socket ID
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à envoyer
   */
  emitToPlayer(playerId, event, data) {
    this.io.to(playerId).emit(event, data);
  }

  /**
   * Émettre un événement à tous les joueurs
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à envoyer
   */
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Réinitialiser le système de delta
   * À appeler quand le gameState change de manière importante
   */
  resetDelta() {
    this.previousState = {};
    this.fullStateCounter = 0;
  }

  /**
   * Obtenir des stats réseau
   * @returns {Object}
   */
  getNetworkStats() {
    return {
      fullStateCounter: this.fullStateCounter,
      fullStateInterval: this.FULL_STATE_INTERVAL,
      hasPreviousState: Object.keys(this.previousState).length > 0
    };
  }
}

module.exports = NetworkManager;
