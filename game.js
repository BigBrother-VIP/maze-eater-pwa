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
            if (spectral.row >= 9 && spectral.row <= 11 && spectral.col >= 8 && spectral.col <= 12) {
                 spectral.direction = 'up';
            } else {
                // LÓGICA NORMAL (Aleatoria)
                const possibleDirs = []; 
                const checks = [
                    { dir: 'up', dRow: -1, dCol: 0 }, { dir: 'down', dRow: 1, dCol: 0 },
                    { dir: 'left', dCol: -1, dRow: 0 }, { dir: 'right', dCol: 1, dRow: 0 } 
                ];

                checks.forEach(check => {
                    const r = spectral.row + check.dRow;
                    const c = spectral.col + check.dCol;
                    // Permitir moverse a 0 (pasillo), 2 (punto), 3 (poder) y warp
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                        if (map[r][c] !== 1) possibleDirs.push(check.dir);
                    } else if (c < 0 || c >= COLS) { // Permitir entrar al warp
                        possibleDirs.push(check.dir);
                    }
                });

                // No regresar por donde vino
                let allowedDirs = possibleDirs.filter(dir => {
                    if (spectral.direction === 'up' && dir === 'down') return false;
                    if (spectral.direction === 'down' && dir === 'up') return false;
                    if (spectral.direction === 'left' && dir === 'right') return false;
                    if (spectral.direction === 'right' && dir === 'left') return false;
                    return true;
                });
                if (allowedDirs.length === 0) allowedDirs = possibleDirs;
                
                // Si hay intersección o tope, decidir
                spectral.direction = allowedDirs[Math.floor(Math.random() * allowedDirs.length)];
            }
        }

        // Mover
        let spd = spectral.speed;
        if (spectral.isFrightened) spd *= 0.6; // Más lento si huye

        switch (spectral.direction) {
            case 'up': spectral.y -= spd; break;
            case 'down': spectral.y += spd; break;
            case 'left': spectral.x -= spd; break;
            case 'right': spectral.x += spd; break;
        }

        // WARP FANTASMAS
        if (spectral.x < -tileSize) spectral.x = canvas.width + tileSize;
        if (spectral.x > canvas.width + tileSize) spectral.x = -tileSize;
    });
}

// ---------------------------------------------
// ACTUALIZAR POSICIÓN JUGADOR + WARP
// ---------------------------------------------
function updatePosition() {
    if (isLevelTransition) return;

    let nextX = mazeEater.x;
    let nextY = mazeEater.y;
    
    // --- 1. INTENTO DE CAMBIO DE DIRECCIÓN ---
    let currentDir = mazeEater.direction;
    if (mazeEater.requestedDirection !== currentDir) {
        const centerX = mazeEater.col * tileSize + tileSize / 2;
        const centerY = mazeEater.row * tileSize + tileSize / 2;
        const isAlignedX = Math.abs(mazeEater.y - centerY) < SPEED * 1.5;
        const isAlignedY = Math.abs(mazeEater.x - centerX) < SPEED * 1.5;
        let canTurn = false;
        
        if (mazeEater.requestedDirection === 'up' || mazeEater.requestedDirection === 'down') {
            if (isAlignedY && !checkWallCollision(mazeEater.x, mazeEater.y + (mazeEater.requestedDirection==='up'?-SPEED:SPEED), mazeEater.requestedDirection)) {
                mazeEater.x = centerX; canTurn = true;
            }
        } else if (mazeEater.requestedDirection === 'left' || mazeEater.requestedDirection === 'right') {
            if (isAlignedX && !checkWallCollision(mazeEater.x + (mazeEater.requestedDirection==='left'?-SPEED:SPEED), mazeEater.y, mazeEater.requestedDirection)) {
                mazeEater.y = centerY; canTurn = true;
            }
        }
        if (canTurn) { mazeEater.direction = mazeEater.requestedDirection; currentDir = mazeEater.direction; }
    }

    // --- 2. CÁLCULO DE SIGUIENTE POSICIÓN ---
    if (currentDir === 'up') nextY -= SPEED;
    else if (currentDir === 'down') nextY += SPEED;
    else if (currentDir === 'left') nextX -= SPEED;
    else if (currentDir === 'right') nextX += SPEED;
    
    // --- 3. WARP (TÚNEL) ---
    if (nextX < -tileSize/2) {
        mazeEater.x = canvas.width + tileSize/2;
        nextX = mazeEater.x;
    } else if (nextX > canvas.width + tileSize/2) {
        mazeEater.x = -tileSize/2;
        nextX = mazeEater.x;
    }
    
    // --- 4. VERIFICACIÓN DE PARED ---
    if (!checkWallCollision(nextX, nextY, currentDir)) {
        mazeEater.x = nextX;
        mazeEater.y = nextY;
        mazeEater.isMoving = true; 
    } else {
        // AJUSTE AUTOMÁTICO (SNAP) AL CENTRO
        mazeEater.x = mazeEater.col * tileSize + tileSize / 2;
        mazeEater.y = mazeEater.row * tileSize + tileSize / 2;
        mazeEater.isMoving = false;
    }
    
    // Actualizar grilla
    if (mazeEater.x >= 0 && mazeEater.x <= canvas.width) {
        mazeEater.col = Math.floor(mazeEater.x / tileSize);
    }
    mazeEater.row = Math.floor(mazeEater.y / tileSize);
}

// ---------------------------------------------
// COMER PUNTOS Y REVISAR NIVEL
// ---------------------------------------------
function checkIfEating() {
    if (isLevelTransition) return;

    // Protección contra índices fuera de rango (por el warp)
    if (mazeEater.row < 0 || mazeEater.row >= ROWS || mazeEater.col < 0 || mazeEater.col >= COLS) return;

    const tileValue = map[mazeEater.row][mazeEater.col];

    if (tileValue === 2) { 
        map[mazeEater.row][mazeEater.col] = 0; 
        mazeEater.score += 10; 
        dotsEaten++;
        playEffect(440, 0.05); 
    } else if (tileValue === 3) { 
        map[mazeEater.row][mazeEater.col] = 0; 
        mazeEater.score += 50; 
        dotsEaten++;
        playEffect(880, 0.1, 'sawtooth'); 
        powerModeTimer = 400; // Tiempo de vulnerabilidad
        ghosts.forEach(spectral => { spectral.isFrightened = true; });
    }

    // --- REVISAR SI TERMINÓ EL NIVEL ---
    if (dotsEaten >= totalDots) {
        startLevelTransition();
    }
}

// ---------------------------------------------
// TRANSICIÓN DE NIVEL (PARPADEO)
// ---------------------------------------------
function startLevelTransition() {
    isLevelTransition = true;
    flashCount = 0;
    flashTimer = 0;
    playEffect(1200, 0.5, 'sine'); // Sonido de victoria de nivel
}

function updateLevelTransition() {
    flashTimer++;
    // Cambiar visibilidad cada 15 frames
    if (flashTimer % 15 === 0) {
        showCharacters = !showCharacters;
        flashCount++;
        // Hacer un pitido
        playEffect(600, 0.05);
    }

    // Después de 10 cambios (5 parpadeos completos)
    if (flashCount >= 10) {
        level++;
        isLevelTransition = false;
        showCharacters = true;
        resetLevel(true); // Reiniciar mapa y posiciones
    }
}

// ---------------------------------------------
// COLISIONES CON ENEMIGOS
// ---------------------------------------------
function checkGhostCollision() {
    if (isLevelTransition) return;

    ghosts.forEach(spectral => {
        const dx = mazeEater.x - spectral.x;
        const dy = mazeEater.y - spectral.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < tileSize * 0.8) {
            // Si está asustado -> EL FANTASMA MUERE
            if (spectral.isFrightened) {
                mazeEater.score += 200;
                playEffect(150, 0.2, 'sawtooth'); // Sonido de comer fantasma
                // Regresar a casa
                spectral.x = spectral.initialCol * tileSize + tileSize / 2;
                spectral.y = spectral.initialRow * tileSize + tileSize / 2;
                spectral.col = spectral.initialCol;
                spectral.row = spectral.initialRow;
                spectral.isFrightened = false;
            } else {
                // Si NO está asustado -> JUGADOR PIERDE
                isGameOver = true;
                playEffect(100, 1, 'sawtooth'); // Sonido muerte
            }
        }
    });
}

// ---------------------------------------------
// INTERFAZ (UI)
// ---------------------------------------------
function drawUI() {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold ' + (tileSize * 0.8) + 'px Arial'; 
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + mazeEater.score, tileSize / 2, tileSize);
    ctx.textAlign = 'right';
    ctx.fillText('Nivel: ' + level, canvas.width - tileSize/2, tileSize);
}

function gameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FF0000'; 
    ctx.font = 'bold ' + (tileSize * 1.5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - tileSize);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold ' + (tileSize * 1) + 'px Arial';
    ctx.fillText('Final Score: ' + mazeEater.score, canvas.width / 2, canvas.height / 2 + tileSize/2);
    ctx.font = 'bold ' + (tileSize * 0.5) + 'px Arial';
    ctx.fillText('Refresca para jugar', canvas.width / 2, canvas.height / 2 + tileSize * 2);
}

// ---------------------------------------------
// DIBUJAR MAPA
// ---------------------------------------------
function drawMap() {
    const canvasSize = Math.min(canvas.clientWidth, canvas.clientHeight);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    tileSize = canvasSize / COLS;
    
    // Inicializar si es la primera vez
    if (!mazeEater) resetLevel(true);
    
    mazeEater.radius = tileSize * 0.4; 

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tileValue = map[row][col];
            const x = col * tileSize;
            const y = row * tileSize;

            if (tileValue === 1) {
                ctx.fillStyle = '#0000FF'; ctx.fillRect(x, y, tileSize, tileSize);
            } else if (tileValue === 2) {
                ctx.fillStyle = '#FFF'; ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 8, 0, Math.PI * 2); ctx.fill();
            } else if (tileValue === 3) {
                ctx.fillStyle = '#FFF'; ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = '#000'; ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }
}

// ---------------------------------------------
// CONTROLES
// ---------------------------------------------
function handleKeyDown(event) {
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    switch (event.key) {
        case 'ArrowUp': case 'w': case 'W': mazeEater.requestedDirection = 'up'; break;
        case 'ArrowDown': case 's': case 'S': mazeEater.requestedDirection = 'down'; break;
        case 'ArrowLeft': case 'a': case 'A': mazeEater.requestedDirection = 'left'; break;
        case 'ArrowRight': case 'd': case 'D': mazeEater.requestedDirection = 'right'; break;
    }
}

let touchStartX = 0;
let touchStartY = 0;
function handleTouchStart(event) {
    event.preventDefault(); 
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}
function handleTouchEnd(event) {
    if (!touchStartX || !touchStartY) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 15) mazeEater.requestedDirection = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dy) > 15) mazeEater.requestedDirection = dy > 0 ? 'down' : 'up';
    touchStartX = 0; touchStartY = 0;
}

// ---------------------------------------------
// LOOP PRINCIPAL
// ---------------------------------------------
function gameLoop() {
    drawMap(); 
    
    if (!isGameOver) {
        if (isLevelTransition) {
            updateLevelTransition();
        } else {
            updatePosition();
            checkIfEating(); 
            moveSpectrales(); 
            checkGhostCollision();
            
            if (powerModeTimer > 0) {
                powerModeTimer--;
                if (powerModeTimer === 0) ghosts.forEach(s => s.isFrightened = false);
            }
        }
        drawMazeEater();
        drawSpectrales(); 
    } else {
        gameOver(); 
    }
    drawUI(); 
    requestAnimationFrame(gameLoop);
}

window.onload = () => {
    drawMap(); 
	if (window.AudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        hasAudio = true;
    }
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    requestAnimationFrame(gameLoop);
};
window.addEventListener('resize', drawMap);
