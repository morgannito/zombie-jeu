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

// Variables du jeu
let playerId = null;
let gameState = {
    players: {},
    zombies: {},
    bullets: {},
    powerups: {},
    particles: {},
    wave: 1
};
let config = {};
let weapons = {};
let powerupTypes = {};
let keys = {};
let mouse = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };
let currentWave = 1;

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
    console.log('Connecté au jeu! ID:', playerId);
});

// Mise à jour de l'état du jeu
socket.on('gameState', (state) => {
    gameState = state;
    updateUI();
});

// Nouvelle vague
socket.on('newWave', (wave) => {
    currentWave = wave;
    showWaveAnnouncement(wave);
});

// Afficher l'annonce de vague
function showWaveAnnouncement(wave) {
    const announcement = document.getElementById('wave-announcement');
    document.getElementById('wave-number').textContent = wave;
    announcement.style.display = 'block';

    setTimeout(() => {
        announcement.style.display = 'none';
    }, 2000);
}

// Mise à jour de l'interface
function updateUI() {
    const player = gameState.players[playerId];

    if (player) {
        // Barre de vie
        const healthPercent = (player.health / config.PLAYER_MAX_HEALTH) * 100;
        document.getElementById('health-fill').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = Math.max(0, Math.round(player.health));

        // Score
        document.getElementById('score-value').textContent = player.score;

        // Arme
        const weaponName = weapons[player.weapon]?.name || 'Pistolet';
        document.getElementById('weapon-value').textContent = weaponName;

        // Game Over
        if (!player.alive) {
            document.getElementById('game-over').style.display = 'block';
            document.getElementById('final-score').textContent = player.score;
            document.getElementById('final-wave').textContent = gameState.wave;
        }
    }

    // Vague
    document.getElementById('wave-value').textContent = gameState.wave;

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
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normaliser le vecteur diagonal
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    // Appliquer le boost de vitesse
    let speed = config.PLAYER_SPEED;
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

// Rendu du jeu
function render() {
    // Effacer le canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const player = gameState.players[playerId];
    if (!player) return;

    // Caméra centrée sur le joueur
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Grille de fond
    drawGrid();

    // Dessiner les limites du monde
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, config.WORLD_WIDTH, config.WORLD_HEIGHT);

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

        // Icône ou texte
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

    // Dessiner les zombies
    for (let zombieId in gameState.zombies) {
        const zombie = gameState.zombies[zombieId];

        // Corps du zombie
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, config.ZOMBIE_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // Bordure plus sombre
        ctx.strokeStyle = '#008800';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Yeux rouges
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(zombie.x - 8, zombie.y - 5, 3, 0, Math.PI * 2);
        ctx.arc(zombie.x + 8, zombie.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Bouche
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y + 5, 6, 0, Math.PI);
        ctx.stroke();

        // Barre de vie zombie
        if (zombie.maxHealth) {
            const healthPercent = zombie.health / zombie.maxHealth;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(zombie.x - 20, zombie.y - 35, 40 * healthPercent, 5);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(zombie.x - 20, zombie.y - 35, 40, 5);
        }
    }

    // Dessiner les joueurs
    for (let pid in gameState.players) {
        const p = gameState.players[pid];
        const isCurrentPlayer = pid === playerId;

        if (!p.alive) continue;

        // Effet de vitesse
        let glowColor = isCurrentPlayer ? '#0088ff' : '#ff8800';
        if (p.speedBoost && Date.now() < p.speedBoost) {
            glowColor = '#00ffff';
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
        ctx.lineWidth = 2;
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

        // Nom du joueur
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            isCurrentPlayer ? 'Vous' : 'Joueur',
            p.x,
            p.y - config.PLAYER_SIZE - 15
        );

        // Barre de vie
        const healthPercent = p.health / config.PLAYER_MAX_HEALTH;
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

// Grille de fond
function drawGrid() {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    const gridSize = 50;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, camera.y);
        ctx.lineTo(x, camera.y + canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(camera.x, y);
        ctx.lineTo(camera.x + canvas.width, y);
        ctx.stroke();
    }
}

// Dessiner la minimap
function drawMinimap() {
    if (!config.WORLD_WIDTH) return;

    const mapWidth = minimap.width;
    const mapHeight = minimap.height;
    const scaleX = mapWidth / config.WORLD_WIDTH;
    const scaleY = mapHeight / config.WORLD_HEIGHT;

    // Fond
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Bordure du monde
    minimapCtx.strokeStyle = '#ff0000';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, mapWidth, mapHeight);

    // Zombies
    minimapCtx.fillStyle = '#00ff00';
    for (let zombieId in gameState.zombies) {
        const zombie = gameState.zombies[zombieId];
        minimapCtx.beginPath();
        minimapCtx.arc(zombie.x * scaleX, zombie.y * scaleY, 2, 0, Math.PI * 2);
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

    // Joueur actuel (toujours en dernier pour être au-dessus)
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
}

// Boucle de jeu
function gameLoop() {
    updatePlayerPosition();
    render();
    requestAnimationFrame(gameLoop);
}

// Démarrer le jeu
gameLoop();
