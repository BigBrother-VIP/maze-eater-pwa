// =============================================================
// game.js - MAZE EATER PWA - Versión FINAL AJUSTADA
// =============================================================

// 1. CONFIGURACIÓN INICIAL Y CANVAS
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let tileSize; // Tamaño de cada celda
let mazeEater; // Jugador
let ghosts = []; // Enemigos
let powerModeTimer = 0; 
let isGameOver = false; 

// 2. ESTRUCTURA DEL LABERINTO (MATRIZ CORREGIDA)
const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 3, 1],
    [1, 2, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1],
    [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 1],
    // --- ZONA DE FANTASMAS (ABIERTA) ---
    [1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 1], 
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1], 
    [1, 1, 1, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 2, 1], 
    // ------------------------------------
    [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const ROWS = map.length;
const COLS = map[0].length;
const SPEED = 2; 

// Variables de Audio
let audioContext;
let hasAudio = false;

// ---------------------------------------------
// SISTEMA DE AUDIO
// ---------------------------------------------
function playEffect(frequency, duration) {
    if (!hasAudio) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'square'; 
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
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
    this.speed = SPEED * 0.9; 
    this.direction = 'up';
}

// ---------------------------------------------
// INICIALIZACIÓN DE OBJETOS
// ---------------------------------------------
function initMazeEater() {
    let startRow, startCol;
    // Buscar posición inicial
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 4) {
                startRow = r;
                startCol = c;
                map[r][c] = 0; 
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
		score: 0
    };

    // Crear Fantasmas (En la zona de salida R9, C9-11)
    ghosts = []; // Limpiar por si acaso
    ghosts.push(new Spectral(9, 9, '#FF0000')); // Rojo
    ghosts.push(new Spectral(10, 9, '#FFC0CB')); // Rosa
    ghosts.push(new Spectral(8, 9, '#00FFFF')); // Cian
    ghosts.push(new Spectral(11, 9, '#FFA500')); // Naranja
}

// ---------------------------------------------
// DIBUJO DE MAZE EATER
// ---------------------------------------------
function drawMazeEater() {
    let angleStart, angleEnd, rotation = 0;

    if (mazeEater.isMoving) { 
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
    ghosts.forEach(spectral => {
        // Sincronizar posición visual
        spectral.x = spectral.col * tileSize + tileSize / 2;
        spectral.y = spectral.row * tileSize + tileSize / 2;
        
        ctx.beginPath();
        ctx.fillStyle = spectral.isFrightened ? '#0000FF' : spectral.color; 
        ctx.arc(spectral.x, spectral.y, tileSize * 0.4, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.closePath();
        
        // Base cuadrada estilo retro
        ctx.fillRect(spectral.x - tileSize * 0.4, spectral.y, tileSize * 0.8, tileSize * 0.4);
    });
}

// ---------------------------------------------
// COLISIONES CON PAREDES
// ---------------------------------------------
function checkWallCollision(x, y, dir) {
    const nextTileX = Math.floor(x / tileSize);
    const nextTileY = Math.floor(y / tileSize);

    let targetCol = nextTileX;
    let targetRow = nextTileY;

    // Verificar el tile hacia donde nos dirigimos
    if (dir === 'up') targetRow = Math.floor((y - tileSize/2) / tileSize);
    else if (dir === 'down') targetRow = Math.floor((y + tileSize/2) / tileSize);
    else if (dir === 'left') targetCol = Math.floor((x - tileSize/2) / tileSize);
    else if (dir === 'right') targetCol = Math.floor((x + tileSize/2) / tileSize);

    if (targetRow >= 0 && targetRow < ROWS && targetCol >= 0 && targetCol < COLS) {
        return map[targetRow][targetCol] === 1; // 1 es pared
    }
    return true; 
}

// ---------------------------------------------
// IA BÁSICA DE FANTASMAS
// ---------------------------------------------
function getPossibleDirections(row, col) {
    const validDirections = []; 
    const checks = [
        { dir: 'up', dRow: -1, dCol: 0 },
        { dir: 'down', dRow: 1, dCol: 0 },
        { dir: 'left', dCol: -1, dRow: 0 },
        { dir: 'right', dCol: 1, dRow: 0 } 
    ];

    checks.forEach(check => {
        const targetRow = row + check.dRow;
        const targetCol = col + check.dCol;
        if (targetRow >= 0 && targetRow < ROWS && targetCol >= 0 && targetCol < COLS) {
            if (map[targetRow][targetCol] !== 1) {
                validDirections.push(check.dir);
            }
        }
    });
    return validDirections;
}

function moveSpectrales() {
    ghosts.forEach(spectral => {
        // Tolerancia para ver si está centrado
        const tolerance = tileSize * 0.3;
        const isCentered = (Math.abs(spectral.x - (spectral.col * tileSize + tileSize / 2)) < tolerance) && 
                           (Math.abs(spectral.y - (spectral.row * tileSize + tileSize / 2)) < tolerance);
        
        if (isCentered) {
            spectral.col = Math.floor(spectral.x / tileSize);
            spectral.row = Math.floor(spectral.y / tileSize);
            const possibleDirs = getPossibleDirections(spectral.row, spectral.col);

            let allowedDirs = possibleDirs.filter(dir => {
                // Evitar reversa inmediata
                if (spectral.direction === 'up' && dir === 'down') return false;
                if (spectral.direction === 'down' && dir === 'up') return false;
                if (spectral.direction === 'left' && dir === 'right') return false;
                if (spectral.direction === 'right' && dir === 'left') return false;
                return true;
            });
            if (allowedDirs.length === 0) allowedDirs = possibleDirs; 
            
            spectral.direction = allowedDirs[Math.floor(Math.random() * allowedDirs.length)];
        }

        // Mover
        switch (spectral.direction) {
            case 'up': spectral.y -= spectral.speed; break;
            case 'down': spectral.y += spectral.speed; break;
            case 'left': spectral.x -= spectral.speed; break;
            case 'right': spectral.x += spectral.speed; break;
        }
    });
}

// ---------------------------------------------
// ACTUALIZAR POSICIÓN (AQUÍ ESTÁ LA CORRECCIÓN CLAVE)
// ---------------------------------------------
function updatePosition() {
    let nextX = mazeEater.x;
    let nextY = mazeEater.y;
    
    // 1. INTENTO DE CAMBIO DE DIRECCIÓN (GIROS)
    let currentDir = mazeEater.direction;
    if (mazeEater.requestedDirection !== currentDir) {
        
        const centerX = mazeEater.col * tileSize + tileSize / 2;
        const centerY = mazeEater.row * tileSize + tileSize / 2;
        
        // Verificamos alineación con tolerancia
        const isAlignedX = Math.abs(mazeEater.y - centerY) < SPEED * 1.5;
        const isAlignedY = Math.abs(mazeEater.x - centerX) < SPEED * 1.5;

        // Intentar aplicar la nueva dirección
        let canTurn = false;
        
        if (mazeEater.requestedDirection === 'up' || mazeEater.requestedDirection === 'down') {
            if (isAlignedY && !checkWallCollision(mazeEater.x, mazeEater.y + (mazeEater.requestedDirection==='up'?-SPEED:SPEED), mazeEater.requestedDirection)) {
                mazeEater.x = centerX; // FORZAR CENTRADO X
                canTurn = true;
            }
        } else if (mazeEater.requestedDirection === 'left' || mazeEater.requestedDirection === 'right') {
            if (isAlignedX && !checkWallCollision(mazeEater.x + (mazeEater.requestedDirection==='left'?-SPEED:SPEED), mazeEater.y, mazeEater.requestedDirection)) {
                mazeEater.y = centerY; // FORZAR CENTRADO Y
                canTurn = true;
            }
        }

        if (canTurn) {
            mazeEater.direction = mazeEater.requestedDirection;
            currentDir = mazeEater.direction;
        }
    }

    // 2. CÁLCULO DE SIGUIENTE POSICIÓN
    if (currentDir === 'up') nextY -= SPEED;
    else if (currentDir === 'down') nextY += SPEED;
    else if (currentDir === 'left') nextX -= SPEED;
    else if (currentDir === 'right') nextX += SPEED;
    
    // 3. VERIFICACIÓN DE PARED Y "AJUSTE" (SNAP TO GRID)
    // Si el siguiente paso NO choca, avanzamos
    if (!checkWallCollision(nextX, nextY, currentDir)) {
        mazeEater.x = nextX;
        mazeEater.y = nextY;
        mazeEater.isMoving = true; 
    } else {
        // --- AQUÍ ESTÁ LA SOLUCIÓN AL "ESTANCAMIENTO" ---
        // Si choca, NO nos detenemos donde estamos. 
        // Forzamos la posición al centro exacto de la baldosa actual.
        // Esto hace que visualmente llegue hasta el tope.
        
        const idealX = mazeEater.col * tileSize + tileSize / 2;
        const idealY = mazeEater.row * tileSize + tileSize / 2;
        
        mazeEater.x = idealX;
        mazeEater.y = idealY;
        
        mazeEater.isMoving = false;
    }
    
    // Actualizar coordenadas de grilla
    mazeEater.col = Math.floor(mazeEater.x / tileSize);
    mazeEater.row = Math.floor(mazeEater.y / tileSize);
}

// ---------------------------------------------
// COMER PUNTOS
// ---------------------------------------------
function checkIfEating() {
    const targetRow = mazeEater.row;
    const targetCol = mazeEater.col;
    const tileValue = map[targetRow][targetCol];

    if (tileValue === 2) { 
        map[targetRow][targetCol] = 0; 
        mazeEater.score += 10; 
        playEffect(440, 0.05); 
    } else if (tileValue === 3) { 
        map[targetRow][targetCol] = 0; 
        mazeEater.score += 50; 
        playEffect(880, 0.1); 
        powerModeTimer = 300; 
        ghosts.forEach(spectral => { spectral.isFrightened = true; });
    }
}

// ---------------------------------------------
// COLISIONES CON ENEMIGOS
// ---------------------------------------------
function checkGhostCollision() {
    ghosts.forEach(spectral => {
        const dx = mazeEater.x - spectral.x;
        const dy = mazeEater.y - spectral.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < tileSize * 0.8) {
            if (spectral.isFrightened) {
                mazeEater.score += 200;
                playEffect(1000, 0.2); 
                spectral.x = spectral.initialCol * tileSize + tileSize / 2;
                spectral.y = spectral.initialRow * tileSize + tileSize / 2;
                spectral.col = spectral.initialCol;
                spectral.row = spectral.initialRow;
                spectral.isFrightened = false;
               } else {
                isGameOver = true;
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
    ctx.fillText('Puntuación: ' + mazeEater.score, tileSize / 2, tileSize);
}

function gameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FF0000'; 
    ctx.font = 'bold ' + (tileSize * 1.5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡FIN DEL JUEGO!', canvas.width / 2, canvas.height / 2 - tileSize);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold ' + (tileSize * 1) + 'px Arial';
    ctx.fillText('Puntuación final: ' + mazeEater.score, canvas.width / 2, canvas.height / 2 + tileSize/2);
    ctx.font = 'bold ' + (tileSize * 0.5) + 'px Arial';
    ctx.fillText('Refresca la página para jugar de nuevo.', canvas.width / 2, canvas.height / 2 + tileSize * 2);
}

// ---------------------------------------------
// DIBUJAR MAPA
// ---------------------------------------------
function drawMap() {
    const canvasSize = Math.min(canvas.clientWidth, canvas.clientHeight);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    tileSize = canvasSize / COLS;
    
    if (!mazeEater) initMazeEater();
    mazeEater.radius = tileSize * 0.4; 

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tileValue = map[row][col];
            const x = col * tileSize;
            const y = row * tileSize;

            if (tileValue === 1) {
                ctx.fillStyle = '#0000FF'; 
                ctx.fillRect(x, y, tileSize, tileSize);
            } else if (tileValue === 2) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 8, 0, Math.PI * 2);
                ctx.fill();
            } else if (tileValue === 3) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, tileSize, tileSize);
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
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const threshold = 15; 

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        mazeEater.requestedDirection = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > threshold) {
        mazeEater.requestedDirection = dy > 0 ? 'down' : 'up';
    }
    touchStartX = 0; touchStartY = 0;
}

// ---------------------------------------------
// LOOP PRINCIPAL
// ---------------------------------------------
function gameLoop() {
    drawMap(); 
    if (!isGameOver) {
        updatePosition();
    	checkIfEating(); 
    	moveSpectrales(); 
    	checkGhostCollision(); 
        drawMazeEater();
    	drawSpectrales(); 
        if (powerModeTimer > 0) {
            powerModeTimer--;
            if (powerModeTimer === 0) {
                ghosts.forEach(spectral => { spectral.isFrightened = false; });
            }
        }
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
