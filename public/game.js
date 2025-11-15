// Connexion au serveur
const socket = io();

// Canvas et contexte
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    bullets: {}
};
let config = {};
let keys = {};
let mouse = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };

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
    console.log('Connecté au jeu! ID:', playerId);
});

// Mise à jour de l'état du jeu
socket.on('gameState', (state) => {
    gameState = state;
    updateUI();
});

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

        // Game Over
        if (!player.alive) {
            document.getElementById('game-over').style.display = 'block';
            document.getElementById('final-score').textContent = player.score;
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
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normaliser le vecteur diagonal
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    // Calculer la nouvelle position
    const newX = player.x + dx * config.PLAYER_SPEED;
    const newY = player.y + dy * config.PLAYER_SPEED;

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

    // Dessiner les balles
    for (let bulletId in gameState.bullets) {
        const bullet = gameState.bullets[bulletId];
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, config.BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dessiner les zombies
    for (let zombieId in gameState.zombies) {
        const zombie = gameState.zombies[zombieId];

        // Corps du zombie
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(zombie.x, zombie.y, config.ZOMBIE_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // Yeux rouges
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(zombie.x - 8, zombie.y - 5, 3, 0, Math.PI * 2);
        ctx.arc(zombie.x + 8, zombie.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Barre de vie zombie
        const healthPercent = zombie.health / config.ZOMBIE_HEALTH;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(zombie.x - 20, zombie.y - 35, 40 * healthPercent, 5);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(zombie.x - 20, zombie.y - 35, 40, 5);
    }

    // Dessiner les joueurs
    for (let pid in gameState.players) {
        const p = gameState.players[pid];
        const isCurrentPlayer = pid === playerId;

        if (!p.alive) continue;

        // Corps du joueur
        ctx.fillStyle = isCurrentPlayer ? '#0088ff' : '#ff8800';
        ctx.beginPath();
        ctx.arc(p.x, p.y, config.PLAYER_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // Direction de visée
        ctx.strokeStyle = isCurrentPlayer ? '#00ffff' : '#ffaa00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(
            p.x + Math.cos(p.angle) * config.PLAYER_SIZE * 2,
            p.y + Math.sin(p.angle) * config.PLAYER_SIZE * 2
        );
        ctx.stroke();

        // Nom du joueur
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            isCurrentPlayer ? 'Vous' : 'Joueur',
            p.x,
            p.y - config.PLAYER_SIZE - 10
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

// Boucle de jeu
function gameLoop() {
    updatePlayerPosition();
    render();
    requestAnimationFrame(gameLoop);
}

// Démarrer le jeu
gameLoop();
