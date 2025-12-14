// =============================================================
// game.js - MAZE EATER PWA - Versión ARCADE COMPLETA
// =============================================================

// 1. CONFIGURACIÓN INICIAL Y CANVAS
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let tileSize;
let mazeEater;
let ghosts = [];
let powerModeTimer = 0; 
let isGameOver = false;

// VARIABLES DE NIVEL Y TRANSICIÓN
let totalDots = 0;          // Cuántos puntos hay en total
let dotsEaten = 0;          // Cuántos llevamos
let level = 1;              // Nivel actual
let isLevelTransition = false; // ¿Estamos en la animación de cambio de nivel?
let flashTimer = 0;         // Temporizador para el parpadeo
let flashCount = 0;         // Contador de parpadeos (hasta 5)
let showCharacters = true;  // Para el efecto de parpadeo (visible/invisible)

// 2. ESTRUCTURA DEL LABERINTO (Con túneles laterales abiertos)
// Nota: Los '0' en los bordes de la fila 9 son los túneles.
const initialMapLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 3, 1],
    [1, 2, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1],
    [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 1],
    [1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1],
    // TÚNEL: Fila 9 (índice 9). Los bordes (0) permiten el Warp.
    [0, 0, 0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 0, 0, 0, 0], 
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 2, 1],
    [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
    [1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1],
    [1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Copia del mapa para jugar
let map = [];

const ROWS = initialMapLayout.length;
const COLS = initialMapLayout[0].length;
let SPEED = 2; // Velocidad base

// Variables de Audio
let audioContext;
let hasAudio = false;

// ---------------------------------------------
// SISTEMA DE AUDIO
// ---------------------------------------------
function playEffect(frequency, duration, type = 'square') {
    if (!hasAudio) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = type; 
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) { console.log(e); }
}

// ---------------------------------------------
// CLASE SPECTRAL (FANTASMA)
// ---------------------------------------------
function Spectral(startCol, startRow, color) {
    this.initialCol = startCol;
    this.initialRow = startRow;
    this.col = startCol;
    this.row = startRow;
    this.x = startCol * tileSize + tileSize / 2;
    this.y = startRow * tileSize + tileSize / 2;
    this.color = color; 
    this.isFrightened = false; 
    this.speed = SPEED * 0.85; // Un poco más lentos que el jugador
    this.direction = 'up';
}

// ---------------------------------------------
// INICIALIZACIÓN DEL NIVEL
// ---------------------------------------------
function resetLevel(resetMap = false) {
    // Restaurar mapa si es nivel nuevo
    if (resetMap) {
        map = initialMapLayout.map(arr => arr.slice());
        dotsEaten = 0;
        totalDots = 0;
        // Contar puntos
        for(let r=0; r<ROWS; r++){
            for(let c=0; c<COLS; c++){
                if(map[r][c] === 2 || map[r][c] === 3) totalDots++;
            }
        }
    }

    // Reiniciar posiciones
    let startRow, startCol;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (initialMapLayout[r][c] === 4) {
                startRow = r;
                startCol = c;
                break;
            }
        }
    }

    mazeEater = {
        row: startRow,
        col: startCol,
        x: startCol * tileSize + tileSize / 2,
        y: startRow * tileSize + tileSize / 2,
        radius: tileSize * 0.4,
        direction: 'right', 
        requestedDirection: 'right', 
        mouthOpen: 0.2, 
        mouthSpeed: 0.1, 
        isMoving: false, 
		score: mazeEater ? mazeEater.score : 0 
    };

    // Reiniciar Fantasmas
    ghosts = [];
    ghosts.push(new Spectral(9, 9, '#FF0000')); // Rojo
    ghosts.push(new Spectral(10, 9, '#FFC0CB')); // Rosa
    ghosts.push(new Spectral(8, 9, '#00FFFF')); // Cian
    ghosts.push(new Spectral(11, 9, '#FFA500')); // Naranja
    
    // Ajustar velocidad por nivel (se pone más difícil)
    SPEED = 2 + (level * 0.2);
}

// ---------------------------------------------
// DIBUJO DE MAZE EATER
// ---------------------------------------------
function drawMazeEater() {
    if (!showCharacters) return; // Si estamos titilando, no dibujar

    let angleStart, angleEnd, rotation = 0;

    if (mazeEater.isMoving && !isLevelTransition) { 
		if (mazeEater.mouthOpen > 0.4 || mazeEater.mouthOpen < 0.05) {
			mazeEater.mouthSpeed *= -1;
        }
        mazeEater.mouthOpen += mazeEater.mouthSpeed;
	} else {
        mazeEater.mouthOpen = 0.05; 
    }

    switch (mazeEater.direction) {
        case 'up': rotation = 270 * Math.PI / 180; break;
        case 'down': rotation = 90 * Math.PI / 180; break;
        case 'left': rotation = 180 * Math.PI / 180; break;
        case 'right': rotation = 0; break;
    }

    angleStart = mazeEater.mouthOpen * Math.PI + rotation;
    angleEnd = (2 * Math.PI - mazeEater.mouthOpen * Math.PI) + rotation;
    
    ctx.fillStyle = '#A020F0'; 
    ctx.beginPath();
    ctx.arc(mazeEater.x, mazeEater.y, mazeEater.radius, angleStart, angleEnd, false);
    ctx.lineTo(mazeEater.x, mazeEater.y); 
    ctx.fill();
    ctx.closePath();
}

// ---------------------------------------------
// DIBUJO DE FANTASMAS
// ---------------------------------------------
function drawSpectrales() {
    if (!showCharacters) return; // Si estamos titilando, no dibujar

    ghosts.forEach(spectral => {
        spectral.x = spectral.col * tileSize + tileSize / 2;
        spectral.y = spectral.row * tileSize + tileSize / 2;
        
        ctx.beginPath();
        // Si está asustado, parpadea azul y blanco antes de acabarse el tiempo
        let color = spectral.color;
        if (spectral.isFrightened) {
            color = (powerModeTimer < 100 && Math.floor(Date.now() / 100) % 2 === 0) ? '#FFFFFF' : '#0000FF';
        }

        ctx.fillStyle = color;
        ctx.arc(spectral.x, spectral.y, tileSize * 0.4, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.closePath();
        ctx.fillRect(spectral.x - tileSize * 0.4, spectral.y, tileSize * 0.8, tileSize * 0.4);
    });
}

// ---------------------------------------------
// COLISIONES CON PAREDES Y WARP
// ---------------------------------------------
function checkWallCollision(x, y, dir) {
    // WARP: Si nos salimos del mapa, NO es colisión (para permitir el paso)
    if (x < 0 || x > canvas.width) return false;

    const nextTileX = Math.floor(x / tileSize);
    const nextTileY = Math.floor(y / tileSize);

    let targetCol = nextTileX;
    let targetRow = nextTileY;

    if (dir === 'up') targetRow = Math.floor((y - tileSize/2) / tileSize);
    else if (dir === 'down') targetRow = Math.floor((y + tileSize/2) / tileSize);
    else if (dir === 'left') targetCol = Math.floor((x - tileSize/2) / tileSize);
    else if (dir === 'right') targetCol = Math.floor((x + tileSize/2) / tileSize);

    if (targetRow >= 0 && targetRow < ROWS && targetCol >= 0 && targetCol < COLS) {
        return map[targetRow][targetCol] === 1; // 1 es pared
    }
    return false; // Si está fuera (warp), permitir movimiento
}

// ---------------------------------------------
// IA DE FANTASMAS (MEJORADA: SALIDA DE JAULA)
// ---------------------------------------------
function moveSpectrales() {
    if (isLevelTransition) return; // No mover si cambiamos nivel

    ghosts.forEach(spectral => {
        // Tolerancia de centrado
        const tolerance = tileSize * 0.3;
        const isCentered = (Math.abs(spectral.x - (spectral.col * tileSize + tileSize / 2)) < tolerance) && 
                           (Math.abs(spectral.y - (spectral.row * tileSize + tileSize / 2)) < tolerance);
        
        if (isCentered) {
            spectral.col = Math.floor(spectral.x / tileSize);
            spectral.row = Math.floor(spectral.y / tileSize);

            // --- LÓGICA DE SALIDA DE JAULA ---
            // Si está dentro de la caja central (filas 9-11, columnas 8-12 aprox), forzar SUBIR
            if
