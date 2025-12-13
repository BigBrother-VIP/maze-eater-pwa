// =============================================================
// game.js - MAZE EATER PWA - Versión FINAL con Correcciones de Movimiento
// =============================================================

// 1. CONFIGURACIÓN INICIAL Y CANVAS
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let tileSize; // Tamaño de cada celda del laberinto (adaptable)
let mazeEater; // Objeto del jugador
let ghosts = []; // Arreglo para almacenar a nuestros 4 enemigos Spectrales
let powerModeTimer = 0; // Temporizador para el modo de "caza"
let isGameOver = false; // Controla si el juego ha terminado

// 2. ESTRUCTURA DEL LABERINTO (MATRIZ)
// 0 = Camino, 1 = Pared, 2 = Punto, 3 = Punto de Poder, 4 = Posición de inicio de Maze Eater
const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 3, 1],
    [1, 2, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1],
    [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 1],
    // --- CORRECCIÓN CRÍTICA DEL MAPA: Abrimos la puerta de la jaula (R8, C9-C10) ---
    [1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 1], 
    // La puerta se abre aquí para que los fantasmas salgan: '2' en lugar de '1'
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1], 
    // La jaula de los fantasmas (R9)
    [1, 1, 1, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 2, 1], 
    // -----------------------------------------------------------------------------------
    [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Posición de inicio (4)
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const ROWS = map.length;
const COLS = map[0].length;
const SPEED = 2; // Velocidad de movimiento del jugador

// Variable para almacenar el contexto de audio
let audioContext;
let hasAudio = false;

// ---------------------------------------------
// FUNCIÓN PARA GENERAR SONIDO DE COMER (TONO)
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
// CONSTRUCTOR DEL OBJETO SPECTRAL (ENEMIGO)
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

// 3. OBJETOS DEL JUGADOR (MAZE EATER)
function initMazeEater() {
    let startRow, startCol;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 4) {
                startRow = r;
                startCol = c;
                map[r][c] = 0; // Cambiar el '4' a pasillo vacío
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

    // --- INICIALIZACIÓN DE LOS SPECTRALES (ENEMIGOS) ---
    ghosts.push(new Spectral(9, 9, '#FF0000')); // Rojo: Posición inicial ajustada a la salida
    ghosts.push(new Spectral(10, 9, '#FFC0CB')); // Rosa
    ghosts.push(new Spectral(8, 9, '#00FFFF')); // Cian
    ghosts.push(new Spectral(11, 9, '#FFA500')); // Naranja

} // Cierre de initMazeEater

// 4. FUNCIÓN PARA DIBUJAR A MAZE EATER
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
// FUNCIÓN PARA DIBUJAR A LOS SPECTRALES
// ---------------------------------------------
function drawSpectrales() {
    ghosts.forEach(spectral => {
        // Asegurar que la posición del píxel esté sincronizada con la posición del grid
        spectral.x = spectral.col * tileSize + tileSize / 2;
        spectral.y = spectral.row * tileSize + tileSize / 2;
        
        ctx.beginPath();
        
        ctx.fillStyle = spectral.isFrightened ? '#0000FF' : spectral.color; 
        
        ctx.arc(spectral.x, spectral.y, tileSize * 0.4, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.closePath();
        
        ctx.fillRect(spectral.x - tileSize * 0.4, spectral.y, tileSize * 0.8, tileSize * 0.4);
    });
}

// 5. FUNCIÓN DE COLISIÓN Y MOVIMIENTO
function checkWallCollision(x, y, dir) {
    const nextTileX = Math.floor(x / tileSize);
    const nextTileY = Math.floor(y / tileSize);

    let targetCol = nextTileX;
    let targetRow = nextTileY;

    if (dir === 'up') targetRow--;
    else if (dir === 'down') targetRow++;
    else if (dir === 'left') targetCol--;
    else if (dir === 'right') targetCol++;

    if (targetRow >= 0 && targetRow < ROWS && targetCol >= 0 && targetCol < COLS) {
        return map[targetRow][targetCol] === 1; // Devuelve true si hay pared
    }
    return true; 
}

// ---------------------------------------------
// FUNCIÓN AUXILIAR PARA OBTENER DIRECCIONES VÁLIDAS
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

// ---------------------------------------------
// FUNCIÓN PARA MOVER A LOS SPECTRALES (IA BÁSICA)
// ---------------------------------------------
function moveSpectrales() {
    ghosts.forEach(spectral => {
        // Tolerancia de centrado (menos estricta para fantasmas)
        const tolerance = tileSize * 0.3;
        const isCentered = (Math.abs(spectral.x - (spectral.col * tileSize + tileSize / 2)) < tolerance) && 
                           (Math.abs(spectral.y - (spectral.row * tileSize + tileSize / 2)) < tolerance);
        
        if (isCentered) {
            // Actualizar la posición del grid
            spectral.col = Math.floor(spectral.x / tileSize);
            spectral.row = Math.floor(spectral.y / tileSize);

            const possibleDirs = getPossibleDirections(spectral.row, spectral.col);

            // Regla: Evitar dar marcha atrás
            let allowedDirs = possibleDirs.filter(dir => {
                if (spectral.direction === 'up' && dir === 'down') return false;
                if (spectral.direction === 'down' && dir === 'up') return false;
                if (spectral.direction === 'left' && dir === 'right') return false;
                if (spectral.direction === 'right' && dir === 'left') return false;
                return true;
            });
            
            if (allowedDirs.length === 0) {
                allowedDirs = possibleDirs; 
            }
            
            const newDirection = allowedDirs[Math.floor(Math.random() * allowedDirs.length)];
            spectral.direction = newDirection;
        }

        // Mover al Spectral en la dirección actual
        switch (spectral.direction) {
            case 'up': spectral.y -= spectral.speed; break;
            case 'down': spectral.y += spectral.speed; break;
            case 'left': spectral.x -= spectral.speed; break;
            case 'right': spectral.x += spectral.speed; break;
        }

    });
}

function updatePosition() {
    let nextX = mazeEater.x;
    let nextY = mazeEater.y;
    
    // --- CORRECCIÓN CRÍTICA DE GIRO Y CENTRADO ---
    let currentDir = mazeEater.direction;
    if (mazeEater.requestedDirection !== currentDir) {
        
        const centerX = mazeEater.col * tileSize + tileSize / 2;
        const centerY = mazeEater.row * tileSize + tileSize / 2;
        
        // La tolerancia debe ser igual a la velocidad para asegurar que el giro ocurre justo cuando se entra al tile
        const isAlignedX = Math.abs(mazeEater.y - centerY) < SPEED;
        const isAlignedY = Math.abs(mazeEater.x - centerX) < SPEED;

        if (mazeEater.requestedDirection === 'up' || mazeEater.requestedDirection === 'down') {
            // Si intenta girar verticalmente, DEBE estar alineado en el eje X
            if (isAlignedY && !checkWallCollision(mazeEater.x, mazeEater.y - SPEED, mazeEater.requestedDirection)) {
                mazeEater.direction = mazeEater.requestedDirection;
                currentDir = mazeEater.direction;
                mazeEater.x = centerX; // FORZAR CENTRADO EN EL EJE X
            }
        } else if (mazeEater.requestedDirection === 'left' || mazeEater.requestedDirection === 'right') {
            // Si intenta girar horizontalmente, DEBE estar alineado en el eje Y
            if (isAlignedX && !checkWallCollision(mazeEater.x + SPEED, mazeEater.y, mazeEater.requestedDirection)) {
                mazeEater.direction = mazeEater.requestedDirection;
                currentDir = mazeEater.direction;
                mazeEater.y = centerY; // FORZAR CENTRADO EN EL EJE Y
            }
        }
    }
    // -------------------------------------------------------------

    // Mover en la dirección actual
    if (currentDir === 'up') nextY -= SPEED;
    else if (currentDir === 'down') nextY += SPEED;
    else if (currentDir === 'left') nextX -= SPEED;
    else if (currentDir === 'right') nextX += SPEED;
    
    // Verificar colisión ANTES de mover
    if (!checkWallCollision(nextX, nextY, currentDir)) {
        mazeEater.x = nextX;
        mazeEater.y = nextY;
        mazeEater.isMoving = true; 
    } else {
        mazeEater.isMoving = false;
    }
    
    // Actualizar la posición de Maze Eater en el grid
    mazeEater.col = Math.floor(mazeEater.x / tileSize);
    mazeEater.row = Math.floor(mazeEater.y / tileSize);
}

// ---------------------------------------------
// FUNCIÓN PARA REVISAR Y COMER PUNTOS
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
        powerModeTimer = 300; // 5 segundos de modo poder
        ghosts.forEach(spectral => {
            spectral.isFrightened = true; 
        });
    }
}

// ---------------------------------------------
// FUNCIÓN PARA REVISAR COLISIÓN CON SPECTRALES
// ---------------------------------------------
function checkGhostCollision() {
    ghosts.forEach(spectral => {
        const dx = mazeEater.x - spectral.x;
        const dy = mazeEater.y - spectral.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const collisionRadius = tileSize * 0.8; 

        if (distance < collisionRadius) {
            
            if (spectral.isFrightened) {
                mazeEater.score += 200;
                playEffect(1000, 0.2); 
                
                // Manda al Spectral de vuelta a su posición inicial (R9 C9-C11)
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
// FUNCIÓN PARA DIBUJAR LA PUNTUACIÓN Y LA UI
// ---------------------------------------------
function drawUI() {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold ' + (tileSize * 0.8) + 'px Arial'; 
    ctx.textAlign = 'left';
    ctx.fillText('Puntuación: ' + mazeEater.score, tileSize / 2, tileSize);
}
// ---------------------------------------------
// FUNCIÓN PARA MOSTRAR LA PANTALLA DE FIN DEL JUEGO
// ---------------------------------------------
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
// 6. FUNCIÓN DE DIBUJO DEL MAPA
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
            } 
            else if (tileValue === 2) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 8, 0, Math.PI * 2);
                ctx.fill();
            }
            else if (tileValue === 3) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
                ctx.fill();
            }
            else {
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }
}

// 7. FUNCIÓN DE CONTROL DE TECLADO
function handleKeyDown(event) {
    // *** DESBLOQUEO DE AUDIO ***
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // ****************************

    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            mazeEater.requestedDirection = 'up';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            mazeEater.requestedDirection = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            mazeEater.requestedDirection = 'left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            mazeEater.requestedDirection = 'right';
            break;
    }
}

// 7.5. FUNCIONES DE CONTROL TÁCTIL
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(event) {
    event.preventDefault(); 
    // *** DESBLOQUEO DE AUDIO TÁCTIL ***
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // **********************************
    
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchEnd(event) {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const threshold = 15; // Mínimo de píxeles para ser considerado un swipe

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx > 0) {
            mazeEater.requestedDirection = 'right';
        } else {
            mazeEater.requestedDirection = 'left';
        }
    } else if (Math.abs(dy) > threshold) {
        if (dy > 0) {
            mazeEater.requestedDirection = 'down';
        } else {
            mazeEater.requestedDirection = 'up';
        }
    }

    touchStartX = 0;
    touchStartY = 0;
}
// ********************************************************************************************

// 8. BUCLE PRINCIPAL DEL JUEGO
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
                ghosts.forEach(spectral => {
                    spectral.isFrightened = false; 
                });
            }
        }
    } else {
        gameOver(); 
    }
    
    drawUI(); 
    requestAnimationFrame(gameLoop);
}

// 9. INICIALIZACIÓN: Esperar a que el HTML esté listo y empezar el loop
window.onload = () => {
    drawMap(); 

	if (window.AudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        hasAudio = true;
    }

    window.addEventListener('keydown', handleKeyDown);

    // *** LISTENERS PARA EL CONTROL TÁCTIL ***
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    requestAnimationFrame(gameLoop);
};

// 10. MANEJO DE CAMBIO DE TAMAÑO DE PANTALLA
window.addEventListener('resize', drawMap);
