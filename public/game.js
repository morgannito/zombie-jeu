// Connexion au serveur
const socket = io();

// Canvas et contexte
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Minimap
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

// Redimensionner le canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Variables du jeu (Rogue-like)
let playerId = null;
let gameState = {
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
let config = {};
let weapons = {};
let powerupTypes = {};
let zombieTypes = {};
let shopItems = {};
let keys = {};
let mouse = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };
let shopOpen = false;

// Input clavier
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Input souris
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener('click', () => {
    const player = gameState.players[playerId];
    if (player && player.alive) {
        const angle = Math.atan2(
            mouse.y - canvas.height / 2,
            mouse.x - canvas.width / 2
        );
        socket.emit('shoot', { angle });
    }
});

// Bouton respawn
document.getElementById('respawn-btn').addEventListener('click', () => {
    socket.emit('respawn');
    document.getElementById('game-over').style.display = 'none';
});

// Initialisation depuis le serveur
socket.on('init', (data) => {
    playerId = data.playerId;
    config = data.config;
    weapons = data.weapons;
    powerupTypes = data.powerupTypes;
    zombieTypes = data.zombieTypes;
    shopItems = data.shopItems;
    console.log('Connecté au jeu! ID:', playerId);
});

// Mise à jour de l'état du jeu
socket.on('gameState', (state) => {
    gameState = state;
    updateUI();
});

// Boss spawned
socket.on('bossSpawned', (data) => {
    showBossAnnouncement(data.bossName);
});

// Level up
socket.on('levelUp', (data) => {
    showLevelUpNotification(data.newLevel);
});

// Porte ouverte - Afficher le shop
socket.on('doorOpened', () => {
    console.log('La porte est ouverte!');
    // Afficher le shop après avoir tué le boss
    setTimeout(() => {
        showShop();
    }, 1000);
});

// Changement de salle
socket.on('roomChanged', (data) => {
    showRoomAnnouncement(data.roomIndex + 1, data.totalRooms);
});

// Run complété
socket.on('runCompleted', (data) => {
    showRunCompleted(data.gold, data.level);
});

// Afficher annonce de boss
function showBossAnnouncement(bossName) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').textContent = 'BOSS !';
    announcement.querySelector('p').textContent = bossName;
    announcement.style.background = 'rgba(255, 0, 0, 0.9)';
    announcement.style.display = 'block';

    setTimeout(() => {
        announcement.style.display = 'none';
        announcement.style.background = 'rgba(255, 170, 0, 0.9)';
    }, 2500);
}

// Afficher level up
function showLevelUpNotification(newLevel) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').textContent = 'LEVEL UP!';
    announcement.querySelector('p').textContent = `Niveau ${newLevel}`;
    announcement.style.background = 'rgba(0, 200, 0, 0.9)';
    announcement.style.display = 'block';

    setTimeout(() => {
        announcement.style.display = 'none';
        announcement.style.background = 'rgba(255, 170, 0, 0.9)';
    }, 1500);
}

// Afficher changement de salle
function showRoomAnnouncement(roomNum, totalRooms) {
    const announcement = document.getElementById('wave-announcement');
    announcement.querySelector('h1').textContent = `Salle ${roomNum}/${totalRooms}`;
    announcement.querySelector('p').textContent = 'En avant!';
    announcement.style.display = 'block';

    setTimeout(() => {
        announcement.style.display = 'none';
    }, 2000);
}

// Run complété
function showRunCompleted(gold, level) {
    alert(`Run complété! Or gagné: ${gold}, Niveau atteint: ${level}`);
}

// Mise à jour de l'interface
function updateUI() {
    const player = gameState.players[playerId];

    if (player) {
        // Barre de vie
        const healthPercent = (player.health / player.maxHealth) * 100;
        document.getElementById('health-fill').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = Math.max(0, Math.round(player.health));

        // Score et stats
        document.getElementById('score-value').textContent = player.score;
        document.getElementById('wave-value').textContent = `${gameState.currentRoom + 1}/${gameState.totalRooms}`;

        // Niveau et XP
        if (player.level) {
            document.getElementById('weapon-value').textContent = `Lvl ${player.level} | ${player.gold} gold`;
        }

        // Game Over
        if (!player.alive) {
            document.getElementById('game-over').style.display = 'block';
            document.getElementById('final-score').textContent = player.score;
            document.getElementById('final-wave').textContent = `${gameState.currentRoom + 1}/${gameState.totalRooms}`;
        }
    }

    // Nombre de joueurs
    document.getElementById('players-count').textContent = Object.keys(gameState.players).length;

    // Nombre de zombies
    document.getElementById('zombies-count').textContent = Object.keys(gameState.zombies).length;
}

// Mouvement du joueur
function updatePlayerPosition() {
    const player = gameState.players[playerId];
    if (!player || !player.alive) return;

    let dx = 0;
    let dy = 0;

    // WASD ou flèches
    if (keys['w'] || keys['arrowup'] || keys['z']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft'] || keys['q']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normaliser le vecteur diagonal
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    // Appliquer les multiplicateurs de vitesse
    let speed = config.PLAYER_SPEED;

    // Multiplicateur permanent
    speed *= (player.speedMultiplier || 1);

    // Boost temporaire
    if (player.speedBoost && Date.now() < player.speedBoost) {
        speed *= 1.5;
    }

    // Calculer la nouvelle position
    const newX = player.x + dx * speed;
    const newY = player.y + dy * speed;

    // Angle de visée
    const angle = Math.atan2(
        mouse.y - canvas.height / 2,
        mouse.x - canvas.width / 2
    );

    // Envoyer au serveur
    socket.emit('playerMove', {
        x: newX,
        y: newY,
        angle: angle
    });
}

// Rendu du jeu (Rogue-like)
function render() {
    // Effacer le canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const player = gameState.players[playerId];
    if (!player) return;

    // Caméra centrée sur le joueur
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Sol de la salle
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, config.ROOM_WIDTH, config.ROOM_HEIGHT);

    // Grille de sol
    drawFloorGrid();

    // Dessiner les murs
    ctx.fillStyle = '#2d2d44';
    for (let wall of gameState.walls) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

        // Bordure de mur
        ctx.strokeStyle = '#3d3d54';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }

    // Dessiner les portes
    for (let door of gameState.doors) {
        if (door.active) {
            ctx.fillStyle = '#00ff00';
        } else {
            ctx.fillStyle = '#ff0000';
        }
        ctx.fillRect(door.x, door.y, door.width, door.height);

        // Symbole porte
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(door.active ? '▲' : '✖', door.x + door.width / 2, door.y + 15);
    }

    // Dessiner les power-ups
    for (let powerupId in gameState.powerups) {
        const powerup = gameState.powerups[powerupId];
        const type = powerupTypes[powerup.type];

        if (!type) continue;

        // Effet de pulsation
        const pulse = Math.sin(Date.now() / 200) * 3 + config.POWERUP_SIZE;

        // Cercle du power-up
        ctx.fillStyle = type.color;
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Bordure
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icône
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let symbol = '?';
        if (powerup.type === 'health') symbol = '+';
        else if (powerup.type === 'speed') symbol = '»';
        else if (powerup.type === 'shotgun') symbol = 'S';
        else if (powerup.type === 'machinegun') symbol = 'M';

        ctx.fillText(symbol, powerup.x, powerup.y);
    }

    // Dessiner le loot (pièces d'or)
    for (let lootId in gameState.loot) {
        const loot = gameState.loot[lootId];

        // Rotation
        const rotation = (Date.now() / 500) % (Math.PI * 2);

        ctx.save();
        ctx.translate(loot.x, loot.y);
        ctx.rotate(rotation);

        // Pièce d'or
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(0, 0, config.LOOT_SIZE, config.LOOT_SIZE * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff8c00';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    // Dessiner les particules
    for (let particleId in gameState.particles) {
        const particle = gameState.particles[particleId];
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Dessiner les balles
    for (let bulletId in gameState.bullets) {
        const bullet = gameState.bullets[bulletId];
        ctx.fillStyle = bullet.color || '#ffff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color || '#ffff00';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, config.BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Dessiner les zombies (par type)
    for (let zombieId in gameState.zombies) {
        const zombie = gameState.zombies[zombieId];

        // Corps du zombie (couleur selon type)
        ctx.fillStyle = zombie.color;
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, zombie.size, 0, Math.PI * 2);
        ctx.fill();

        // Bordure
        ctx.strokeStyle = '#000';
        ctx.lineWidth = zombie.isBoss ? 4 : 2;
        ctx.stroke();

        // Yeux rouges
        const eyeSize = zombie.isBoss ? 6 : 3;
        const eyeOffset = zombie.size * 0.3;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(zombie.x - eyeOffset, zombie.y - 5, eyeSize, 0, Math.PI * 2);
        ctx.arc(zombie.x + eyeOffset, zombie.y - 5, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Barre de vie
        if (zombie.maxHealth) {
            const healthPercent = zombie.health / zombie.maxHealth;
            const barWidth = zombie.size * 1.6;
            const barY = zombie.y - zombie.size - 10;

            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(zombie.x - barWidth / 2, barY, barWidth * healthPercent, 5);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(zombie.x - barWidth / 2, barY, barWidth, 5);
        }

        // Nom si boss
        if (zombie.isBoss) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText('BOSS', zombie.x, zombie.y - zombie.size - 25);
            ctx.fillText('BOSS', zombie.x, zombie.y - zombie.size - 25);
        }
    }

    // Dessiner les joueurs
    for (let pid in gameState.players) {
        const p = gameState.players[pid];
        const isCurrentPlayer = pid === playerId;

        if (!p.alive) continue;

        // Effet de vitesse
        if (p.speedBoost && Date.now() < p.speedBoost) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ffff';
        }

        // Corps du joueur
        ctx.fillStyle = isCurrentPlayer ? '#0088ff' : '#ff8800';
        ctx.beginPath();
        ctx.arc(p.x, p.y, config.PLAYER_SIZE, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bordure
        ctx.strokeStyle = isCurrentPlayer ? '#00ffff' : '#ffaa00';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Direction de visée (arme)
        const weaponLength = config.PLAYER_SIZE * 2;
        ctx.strokeStyle = isCurrentPlayer ? '#00ffff' : '#ffaa00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(
            p.x + Math.cos(p.angle) * weaponLength,
            p.y + Math.sin(p.angle) * weaponLength
        );
        ctx.stroke();

        // Nom et niveau du joueur
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        const playerLabel = isCurrentPlayer ? `Vous (Lv${p.level || 1})` : `Joueur (Lv${p.level || 1})`;
        ctx.strokeText(playerLabel, p.x, p.y - config.PLAYER_SIZE - 15);
        ctx.fillText(playerLabel, p.x, p.y - config.PLAYER_SIZE - 15);

        // Barre de vie
        const healthPercent = p.health / p.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(p.x - 20, p.y + config.PLAYER_SIZE + 5, 40 * healthPercent, 5);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 20, p.y + config.PLAYER_SIZE + 5, 40, 5);
    }

    ctx.restore();

    // Dessiner la minimap
    drawMinimap();
}

// Grille de sol
function drawFloorGrid() {
    ctx.strokeStyle = '#252541';
    ctx.lineWidth = 1;

    const gridSize = 50;

    for (let x = 0; x < config.ROOM_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, config.ROOM_HEIGHT);
        ctx.stroke();
    }

    for (let y = 0; y < config.ROOM_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(config.ROOM_WIDTH, y);
        ctx.stroke();
    }
}

// Dessiner la minimap (Rogue-like)
function drawMinimap() {
    if (!config.ROOM_WIDTH) return;

    const mapWidth = minimap.width;
    const mapHeight = minimap.height;
    const scaleX = mapWidth / config.ROOM_WIDTH;
    const scaleY = mapHeight / config.ROOM_HEIGHT;

    // Fond
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Murs
    minimapCtx.fillStyle = '#444';
    for (let wall of gameState.walls) {
        minimapCtx.fillRect(
            wall.x * scaleX,
            wall.y * scaleY,
            wall.width * scaleX,
            wall.height * scaleY
        );
    }

    // Zombies
    for (let zombieId in gameState.zombies) {
        const zombie = gameState.zombies[zombieId];
        minimapCtx.fillStyle = zombie.isBoss ? '#ff0000' : zombie.color;
        minimapCtx.beginPath();
        minimapCtx.arc(zombie.x * scaleX, zombie.y * scaleY, zombie.isBoss ? 6 : 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Loot
    minimapCtx.fillStyle = '#ffd700';
    for (let lootId in gameState.loot) {
        const loot = gameState.loot[lootId];
        minimapCtx.beginPath();
        minimapCtx.arc(loot.x * scaleX, loot.y * scaleY, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Power-ups
    minimapCtx.fillStyle = '#ffff00';
    for (let powerupId in gameState.powerups) {
        const powerup = gameState.powerups[powerupId];
        minimapCtx.beginPath();
        minimapCtx.arc(powerup.x * scaleX, powerup.y * scaleY, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Autres joueurs
    minimapCtx.fillStyle = '#ff8800';
    for (let pid in gameState.players) {
        if (pid === playerId) continue;
        const p = gameState.players[pid];
        if (!p.alive) continue;
        minimapCtx.beginPath();
        minimapCtx.arc(p.x * scaleX, p.y * scaleY, 4, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Joueur actuel
    const player = gameState.players[playerId];
    if (player && player.alive) {
        minimapCtx.fillStyle = '#0088ff';
        minimapCtx.beginPath();
        minimapCtx.arc(player.x * scaleX, player.y * scaleY, 5, 0, Math.PI * 2);
        minimapCtx.fill();

        // Direction
        minimapCtx.strokeStyle = '#00ffff';
        minimapCtx.lineWidth = 2;
        minimapCtx.beginPath();
        minimapCtx.moveTo(player.x * scaleX, player.y * scaleY);
        minimapCtx.lineTo(
            player.x * scaleX + Math.cos(player.angle) * 10,
            player.y * scaleY + Math.sin(player.angle) * 10
        );
        minimapCtx.stroke();
    }

    // Bordure
    minimapCtx.strokeStyle = '#00ff00';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, mapWidth, mapHeight);
}

// Afficher le shop
function showShop() {
    const player = gameState.players[playerId];
    if (!player || !player.alive) return;

    shopOpen = true;
    document.getElementById('shop').style.display = 'block';
    populateShop();
}

// Cacher le shop
function hideShop() {
    shopOpen = false;
    document.getElementById('shop').style.display = 'none';
}

// Bouton fermer le shop
document.getElementById('shop-close-btn').addEventListener('click', () => {
    hideShop();
});

// Populate le shop avec les items
function populateShop() {
    const player = gameState.players[playerId];
    if (!player) return;

    // Mettre à jour l'or affiché
    document.getElementById('shop-gold').textContent = player.gold || 0;

    // Populate les upgrades permanents
    const permanentContainer = document.getElementById('permanent-upgrades');
    permanentContainer.innerHTML = '';

    for (let key in shopItems.permanent) {
        const item = shopItems.permanent[key];
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

    // Populate les items temporaires
    const temporaryContainer = document.getElementById('temporary-items');
    temporaryContainer.innerHTML = '';

    for (let key in shopItems.temporary) {
        const item = shopItems.temporary[key];
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

// Acheter un item
window.buyItem = function(itemId, category) {
    socket.emit('buyItem', { itemId, category });
};

// Mise à jour du shop après achat
socket.on('shopUpdate', (data) => {
    if (data.success && shopOpen) {
        populateShop();
    }
});

// Boucle de jeu
function gameLoop() {
    updatePlayerPosition();
    render();
    requestAnimationFrame(gameLoop);
}

// Démarrer le jeu
gameLoop();
