// =============================================================
// game.js - MAZE EATER PWA - Versión Final Corregida y Funcional
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
    // --- CORRECCIÓN CRÍTICA DEL MAPA: Se abre el camino para los fantasmas (Rows 7-9) ---
    // Esta línea (R8) ahora tiene puntos (2) donde estaba la pared, para permitir la salida
    [1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 1], 
    // Esta línea (R9) ahora es pasillo (2) para conectar la jaula con el pasillo de arriba
    [1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1], 
    // La jaula de los fantasmas (R10)
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
    
    // Crear el tono (oscilador)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configuración del tono
    oscillator.type = 'square'; // Un tono tipo "retro"
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Ajuste de volumen (Gain) para evitar clicks
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

    // Iniciar y detener el tono
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
    this.color = color; // Color individual
    this.isFrightened = false; // ¿Está en modo de miedo?
    this.speed = SPEED * 0.9; // Ligeramente más lentos que Maze Eater
    this.direction = 'up';
}

// 3. OBJETOS DEL JUGADOR (MAZE EATER)
function initMazeEater() {
    // Buscar la posición inicial (el '4' en el mapa)
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
        // Posiciones en el grid (matriz)
        row: startRow,
        col: startCol,
        // Posiciones reales en pixeles
        x: startCol * tileSize + tileSize / 2,
        y: startRow * tileSize + tileSize / 2,
        radius: tileSize * 0.4,
        direction: 'right', // Dirección inicial
        requestedDirection: 'right', // Dirección que el usuario pide
        mouthOpen: 0.2, // Apertura inicial de la boca
        mouthSpeed: 0.1, // Velocidad de animación de la boca
        isMoving: false, 
		score: 0
    };

    // --- INICIALIZACIÓN DE LOS SPECTRALES (ENEMIGOS) ---
    // Posiciones en el grid (alrededor de la "cárcel" fantasma en la línea 10 de la matriz)
    ghosts.push(new Spectral(9, 10, '#FF0000')); // Rojo
    ghosts.push(new Spectral(10, 10, '#FFC0CB')); // Rosa
    ghosts.push(new Spectral(8, 10, '#00FFFF')); // Cian
    ghosts.push(new Spectral(11, 10, '#FFA500')); // Naranja

} // Cierre de initMazeEater

// 4. FUNCIÓN PARA DIBUJAR A MAZE EATER
function drawMazeEater() {
    // Calcular el ángulo de la boca y la dirección
    let angleStart, angleEnd, rotation = 0;
    // Animación de la boca (abre y cierra)
    if (mazeEater.isMoving) { // SOLO ANIMA SI SE ESTÁ MOVIENDO
        // Animación solo si se está moviendo	
		if (mazeEater.mouthOpen > 0.4 || mazeEater.mouthOpen < 0.05) {
			mazeEater.mouthSpeed *= -1;
    }
    mazeEater.mouthOpen += mazeEater.mouthSpeed;
	} else {
        // Si está quieto, la boca se mantiene en una apertura mínima
        mazeEater.mouthOpen = 0.05; // Boca casi cerrada para que parezca que está cerrado
    }
    // Determinar la rotación según la dirección
    switch (mazeEater.direction) {
        case 'up': rotation = 270 * Math.PI / 180; break;
        case 'down': rotation = 90 * Math.PI / 180; break;
        case 'left': rotation = 180 * Math.PI / 180; break;
        case 'right': rotation = 0; break;
    }

    // Calcular los ángulos de la boca
    angleStart = mazeEater.mouthOpen * Math.PI + rotation;
    angleEnd = (2 * Math.PI - mazeEater.mouthOpen * Math.PI) + rotation;
    
    // DIBUJO
    ctx.fillStyle = '#A020F0'; // Color Violeta del personaje
    ctx.beginPath();
    // Arco: x, y, radio, ángulo inicial, ángulo final
    ctx.arc(mazeEater.x, mazeEater.y, mazeEater.radius, angleStart, angleEnd, false);
    ctx.lineTo(mazeEater.x, mazeEater.y); // Cierra la boca al centro
    ctx.fill();
    ctx.closePath();
}

// ---------------------------------------------
// FUNCIÓN PARA DIBUJAR A LOS SPECTRALES
// ---------------------------------------------
function drawSpectrales() {
    ghosts.forEach(spectral => {
        // Ajustar posición en pixeles si el tamaño de tile cambió
        spectral.x = spectral.col * tileSize + tileSize / 2;
        spectral.y = spectral.row * tileSize + tileSize / 2;
        
        ctx.beginPath();
        
        // El color depende de si está asustado (modo de poder) o no
        ctx.fillStyle = spectral.isFrightened ? '#0000FF' : spectral.color; // Azul si está asustado
        
        // Dibujar el cuerpo (círculo)
        ctx.arc(spectral.x, spectral.y, tileSize * 0.4, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.closePath();
        
        // Dibujar un pequeño "pie" o base cuadrada para simular la forma arcade
        ctx.fillRect(spectral.x - tileSize * 0.4, spectral.y, tileSize * 0.8, tileSize * 0.4);
        
    });
}

// 5. FUNCIÓN DE COLISIÓN Y MOVIMIENTO
function checkWallCollision(x, y, dir) {
    const nextTileX = Math.floor(x / tileSize);
    const nextTileY = Math.floor(y / tileSize);

    // Ajustar la posición para verificar la celda adyacente
    let targetCol = nextTileX;
    let targetRow = nextTileY;

    if (dir === 'up') targetRow--;
    else if (dir === 'down') targetRow++;
    else if (dir === 'left') targetCol--;
    else if (dir === 'right') targetCol++;

    // Verificar si la celda objetivo es una pared (1)
    if (targetRow >= 0 && targetRow < ROWS && targetCol >= 0 && targetCol < COLS) {
        return map[targetRow][targetCol] === 1; // Devuelve true si hay pared
    }
    return true; // Asumir pared si está fuera de límites
}

// ---------------------------------------------
// FUNCIÓN AUXILIAR PARA OBTENER DIRECCIONES VÁLIDAS
// ---------------------------------------------
function getPossibleDirections(row, col) {
    const validDirections = []; 
    
    // Lista de movimientos posibles y sus cambios de coordenada
    const checks = [
        { dir: 'up', dRow: -1, dCol: 0 },
        { dir: 'down', dRow: 1, dCol: 0 },
        { dir: 'left', dCol: -1, dRow: 0 },
        { dir: 'right', dCol: 1, dRow: 0 } 
    ];

    checks.forEach(check => {
        const targetRow = row + check.dRow;
        const targetCol = col + check.dCol;

        // Asegurarse de que la celda esté dentro del mapa y NO sea una pared (1)
        if (targetRow >= 0 && targetRow < ROWS && targetCol >= 0 && targetCol < COLS) {
            // El fantasma puede moverse a cualquier pasillo (0, 2, 3)
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
        // Solo tomar una decisión cuando esté centrado en una celda
        const isCentered = (Math.abs(spectral.x - (spectral.col * tileSize + tileSize / 2)) < SPEED) && 
                           (Math.abs(spectral.y - (spectral.row * tileSize + tileSize / 2)) < SPEED);
        
        if (isCentered) {
            // Actualizar la posición del grid después de mover
            spectral.col = Math.floor(spectral.x / tileSize);
            spectral.row = Math.floor(spectral.y / tileSize);

            const possibleDirs = getPossibleDirections(spectral.row, spectral.col);

            // Regla 1: No dar marcha atrás inmediatamente (evita ir y venir en un pasillo)
            let allowedDirs = possibleDirs.filter(dir => {
                if (spectral.direction === 'up' && dir === 'down') return false;
                if (spectral.direction === 'down' && dir === 'up') return false;
                if (spectral.direction === 'left' && dir === 'right') return false;
                if (spectral.direction === 'right' && dir === 'left') return false;
                return true;
            });

            // Si solo queda una dirección, o si es una intersección, elegir una aleatoria entre las permitidas
            if (allowedDirs.length === 0) {
                // Caso extremo: Atrapado, forzar un cambio de 180 grados si es posible
                allowedDirs = possibleDirs; 
            }
            
            // Elegir una dirección aleatoria de las permitidas
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
    
    // Mover primero en la dirección solicitada (para hacer 'esquina')
    let currentDir = mazeEater.direction;
    if (mazeEater.requestedDirection !== currentDir) {
        // Intentar moverse en la dirección solicitada
        let tempX = mazeEater.x, tempY = mazeEater.y;
        
        if (mazeEater.requestedDirection === 'up') tempY -= SPEED;
        else if (mazeEater.requestedDirection === 'down') tempY += SPEED;
        else if (mazeEater.requestedDirection === 'left') tempX -= SPEED;
        else if (mazeEater.requestedDirection === 'right') tempX += SPEED;

        // Si no hay pared en la dirección solicitada, se cambia
        if (!checkWallCollision(tempX, tempY, mazeEater.requestedDirection)) {
             mazeEater.direction = mazeEater.requestedDirection;
             currentDir = mazeEater.direction;
        }
    }

    // Mover en la dirección actual
    if (currentDir === 'up') nextY -= SPEED;
    else if (currentDir === 'down') nextY += SPEED;
    else if (currentDir === 'left') nextX -= SPEED;
    else if (currentDir === 'right') nextX += SPEED;
    
    // Verificar colisión ANTES de mover
if (!checkWallCollision(nextX, nextY, currentDir)) {
        // Movimiento exitoso
        mazeEater.x = nextX;
        mazeEater.y = nextY;
        
        // --- CASO 1: SE MOVIÓ ---
        mazeEater.isMoving = true; 
    } else {
        // Si chocó o no se movió porque el movimiento es nulo
        // --- CASO 2: NO SE MOVIÓ ---
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
    // Usamos la posición del grid que ya se actualizó en updatePosition()
    const targetRow = mazeEater.row;
    const targetCol = mazeEater.col;

    const tileValue = map[targetRow][targetCol];

    if (tileValue === 2) { // Es un punto normal
        map[targetRow][targetCol] = 0; // Quitar el punto
        mazeEater.score += 10; // Sumar puntuación
        playEffect(440, 0.05); // Tono rápido para comer punto
    } else if (tileValue === 3) { // Es un punto de poder
        map[targetRow][targetCol] = 0; // Quitar el punto de poder
        mazeEater.score += 50; // Sumar puntuación
        playEffect(880, 0.1); // Tono más alto y largo para punto de poder
		// --- CÓDIGO PARA ACTIVAR EL MODO DE PODER ---
        powerModeTimer = 300; // 300 ciclos del juego (~5 segundos)
        ghosts.forEach(spectral => {
            spectral.isFrightened = true; // Cambia el estado a "asustado"
        });
        // ---------------------------------------------
    }
}

// ---------------------------------------------
// FUNCIÓN PARA REVISAR COLISIÓN CON SPECTRALES
// ---------------------------------------------
function checkGhostCollision() {
    ghosts.forEach(spectral => {
        // Distancia entre los centros de Maze Eater y el Spectral
        const dx = mazeEater.x - spectral.x;
        const dy = mazeEater.y - spectral.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // La colisión ocurre si la distancia es menor que la suma de sus radios.
        const collisionRadius = tileSize * 0.8; 

        if (distance < collisionRadius) {
            // ¡COLISIÓN DETECTADA!
            
            if (spectral.isFrightened) {
                // 1. COME AL SPECTRAL
                mazeEater.score += 200;
                playEffect(1000, 0.2); // Tono de victoria
                
                // Manda al Spectral de vuelta a su posición inicial
                spectral.x = spectral.initialCol * tileSize + tileSize / 2;
                spectral.y = spectral.initialRow * tileSize + tileSize / 2;
                spectral.col = spectral.initialCol;
                spectral.row = spectral.initialRow;
                spectral.isFrightened = false;
                
               } else {
                // 2. PIERDE VIDA / FIN DEL JUEGO
                isGameOver = true;
            }
        }
    });
}
// ---------------------------------------------
// FUNCIÓN PARA DIBUJAR LA PUNTUACIÓN Y LA UI
// ---------------------------------------------
function drawUI() {
    // Muestra la puntuación actual
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold ' + (tileSize * 0.8) + 'px Arial'; // Ajusta el tamaño de la fuente al tamaño del tile
    ctx.textAlign = 'left';
    ctx.fillText('Puntuación: ' + mazeEater.score, tileSize / 2, tileSize);
}
// ---------------------------------------------
// FUNCIÓN PARA MOSTRAR LA PANTALLA DE FIN DEL JUEGO
// ---------------------------------------------
function gameOver() {
    // Semi-transparencia negra para oscurecer el mapa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título de GAME OVER
    ctx.fillStyle = '#FF0000'; // Rojo
    ctx.font = 'bold ' + (tileSize * 1.5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡FIN DEL JUEGO!', canvas.width / 2, canvas.height / 2 - tileSize);
    
    // Puntuación Final
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold ' + (tileSize * 1) + 'px Arial';
    ctx.fillText('Puntuación final: ' + mazeEater.score, canvas.width / 2, canvas.height / 2 + tileSize/2);
    
    // Instrucción para reiniciar
    ctx.font = 'bold ' + (tileSize * 0.5) + 'px Arial';
    ctx.fillText('Refresca la página para jugar de nuevo.', canvas.width / 2, canvas.height / 2 + tileSize * 2);
}
// 6. FUNCIÓN DE DIBUJO DEL MAPA
function drawMap() {
    // Ajustar el tamaño del Canvas a su tamaño real CSS
    const canvasSize = Math.min(canvas.clientWidth, canvas.clientHeight);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Determinar el tamaño de cada tile (celda)
    tileSize = canvasSize / COLS;
    
    // Si es la primera vez, inicializa Maze Eater con el tileSize correcto
    if (!mazeEater) initMazeEater();
    mazeEater.radius = tileSize * 0.4; // Ajusta el radio si el tamaño cambia

    // Recorrer la matriz y dibujar
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tileValue = map[row][col];
            const x = col * tileSize;
            const y = row * tileSize;

            // Pared (1)
            if (tileValue === 1) {
                ctx.fillStyle = '#0000FF'; 
                ctx.fillRect(x, y, tileSize, tileSize);
            } 
            
            // Punto (2)
            else if (tileValue === 2) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Punto de Poder (3)
            else if (tileValue === 3) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Pasillo (0) - Limpia el espacio
            else {
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }
}

// 7. FUNCIÓN DE CONTROL DE TECLADO
function handleKeyDown(event) {
    // *** CORRECCIÓN DE AUDIO: Desbloquear el audio en el primer evento de usuario ***
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // ********************************************************************************

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

// 7.5. FUNCIONES DE CONTROL TÁCTIL (¡NUEVAS!)
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(event) {
    event.preventDefault(); // Evita el desplazamiento del navegador
    // *** CORRECCIÓN DE AUDIO: Desbloquear el audio en el primer evento de usuario TÁCTIL ***
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // ********************************************************************************
    
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

    // Determinar si el deslizamiento fue horizontal o vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        // Movimiento Horizontal (Izquierda/Derecha)
        if (dx > 0) {
            mazeEater.requestedDirection = 'right';
        } else {
            mazeEater.requestedDirection = 'left';
        }
    } else if (Math.abs(dy) > threshold) {
        // Movimiento Vertical (Arriba/Abajo)
        if (dy > 0) {
            mazeEater.requestedDirection = 'down';
        } else {
            mazeEater.requestedDirection = 'up';
        }
    }

    // Resetear las coordenadas
    touchStartX = 0;
    touchStartY = 0;
}
// ********************************************************************************************

// 8. BUCLE PRINCIPAL DEL JUEGO
function gameLoop() {
    // 1. Redibuja el mapa y los puntos (Limpia la pantalla)
    drawMap(); 

    if (!isGameOver) {
        // --- LÓGICA Y MOVIMIENTO: SOLO SI EL JUEGO ESTÁ ACTIVO ---
        
        // 2. Actualiza la posición y revisa colisiones con paredes
        updatePosition();
     
    	// 2.5. REVISA Y COME PUNTOS
    	checkIfEating(); 
     
    	// 2.7. Mueve a los Spectrales
    	moveSpectrales(); 

    	// 2.9. REVISA COLISIÓN CON SPECTRALES
        checkGhostCollision(); 
     
    	// 3. Dibuja a Maze Eater con la animación de la boca
        drawMazeEater();
     
    	// 3.5. Dibuja a los Spectrales
    	drawSpectrales(); 
    	
        // 4. GESTIÓN DEL MODO DE PODER
        if (powerModeTimer > 0) {
            powerModeTimer--;
            if (powerModeTimer === 0) {
                ghosts.forEach(spectral => {
                    spectral.isFrightened = false; // Desactiva el modo de miedo
                });
            }
        }
    } else {
        // --- FIN DEL JUEGO ---
        gameOver(); // Muestra la pantalla de fin del juego
    }
    
    // Dibuja la puntuación (siempre visible, incluso en GAME OVER)
    drawUI(); 

    // 5. Solicita el siguiente fotograma para la animación (SIEMPRE se debe ejecutar)
    requestAnimationFrame(gameLoop);
}

// 9. INICIALIZACIÓN: Esperar a que el HTML esté listo y empezar el loop
window.onload = () => {
    // 1. Inicializa y dibuja el mapa (configura tileSize y mazeEater)
    drawMap(); 

	// --- INICIALIZACIÓN DEL AUDIO ---
	if (window.AudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        hasAudio = true;
    }

    // 2. Agrega el listener para el teclado (control de juego)
    window.addEventListener('keydown', handleKeyDown);

    // 3. Agrega los listeners para el control táctil (¡NUEVO!)
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // 4. Comienza el bucle del juego
    requestAnimationFrame(gameLoop);
};

// 10. MANEJO DE CAMBIO DE TAMAÑO DE PANTALLA
window.addEventListener('resize', drawMap);
