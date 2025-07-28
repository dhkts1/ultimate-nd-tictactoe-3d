// Ultimate 3D Tic-Tac-Toe (9 cubes of 3x3x3)
let scene, camera, renderer, controls;
let cubes = [];
let cells = [];
let marks = [];
let gameState;
let raycaster, mouse;
let autoRotate = false;
let winningLines = [];
let activeHighlights = [];
let cubeOverlays = [];

// Constants
const CUBE_SIZE = 3;
const CELL_SIZE = 0.3;
const CELL_SPACING = 0.1;
const CUBE_SPACING = 1.5;
const TOTAL_CUBES = 9;

// Colors
const CUBE_COLORS = [
    0x667eea, 0x764ba2, 0x8b5cf6,
    0x4ecdc4, 0x45b7d1, 0x3b82f6,
    0xf093fb, 0xf5576c, 0xff6b6b
];

// Generate winning combinations for 3x3x3
const cubeWinningCombinations = [];
function generateCubeWinningCombinations() {
    // Horizontal lines (27 total)
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            cubeWinningCombinations.push([
                z * 9 + y * 3 + 0,
                z * 9 + y * 3 + 1,
                z * 9 + y * 3 + 2
            ]);
        }
    }
    
    // Vertical lines (27 total)
    for (let z = 0; z < 3; z++) {
        for (let x = 0; x < 3; x++) {
            cubeWinningCombinations.push([
                z * 9 + 0 * 3 + x,
                z * 9 + 1 * 3 + x,
                z * 9 + 2 * 3 + x
            ]);
        }
    }
    
    // Through layers (9 total)
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            cubeWinningCombinations.push([
                0 * 9 + y * 3 + x,
                1 * 9 + y * 3 + x,
                2 * 9 + y * 3 + x
            ]);
        }
    }
    
    // Face diagonals (12 total)
    for (let z = 0; z < 3; z++) {
        cubeWinningCombinations.push([z * 9 + 0, z * 9 + 4, z * 9 + 8]);
        cubeWinningCombinations.push([z * 9 + 2, z * 9 + 4, z * 9 + 6]);
    }
    
    for (let y = 0; y < 3; y++) {
        cubeWinningCombinations.push([0 * 9 + y * 3 + 0, 1 * 9 + y * 3 + 1, 2 * 9 + y * 3 + 2]);
        cubeWinningCombinations.push([0 * 9 + y * 3 + 2, 1 * 9 + y * 3 + 1, 2 * 9 + y * 3 + 0]);
    }
    
    for (let x = 0; x < 3; x++) {
        cubeWinningCombinations.push([0 * 9 + 0 * 3 + x, 1 * 9 + 1 * 3 + x, 2 * 9 + 2 * 3 + x]);
        cubeWinningCombinations.push([0 * 9 + 2 * 3 + x, 1 * 9 + 1 * 3 + x, 2 * 9 + 0 * 3 + x]);
    }
    
    // Space diagonals (4 total)
    cubeWinningCombinations.push([0, 13, 26]);
    cubeWinningCombinations.push([2, 13, 24]);
    cubeWinningCombinations.push([6, 13, 20]);
    cubeWinningCombinations.push([8, 13, 18]);
}

// Meta-game winning combinations (3x3)
const metaWinningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Initialize game state
function initGameState() {
    gameState = {
        boards: Array(9).fill(null).map(() => 
            Array(3).fill(null).map(() => 
                Array(3).fill(null).map(() => 
                    Array(3).fill(null)
                )
            )
        ),
        cubeWinners: Array(9).fill(null),
        activeCubes: null, // null means all cubes are active
        currentPlayer: 'X',
        gameWinner: null,
        gameOver: false,
        player1Score: 0,
        player2Score: 0,
        gameMode: 'single'
    };
}

// Initialize Three.js
function init() {
    generateCubeWinningCombinations();
    initGameState();
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 50;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(20, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    const secondaryLight = new THREE.DirectionalLight(0x4ecdc4, 0.3);
    secondaryLight.position.set(-10, -10, -10);
    scene.add(secondaryLight);

    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create the 9 cubes
    createCubes();

    // Create platform
    createPlatform();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
    setupUIListeners();

    // Start animation
    animate();
}

// Create the 9 cubes
function createCubes() {
    const cubeContainer = new THREE.Group();
    
    for (let i = 0; i < TOTAL_CUBES; i++) {
        const cubeGroup = new THREE.Group();
        const cubeX = (i % 3 - 1) * (CUBE_SIZE + CUBE_SPACING) * CELL_SIZE * 3;
        const cubeY = 0;
        const cubeZ = (Math.floor(i / 3) - 1) * (CUBE_SIZE + CUBE_SPACING) * CELL_SIZE * 3;
        
        cubeGroup.position.set(cubeX, cubeY, cubeZ);
        cubeGroup.userData = { cubeIndex: i };
        
        // Create cells for this cube
        const cubeCells = [];
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    const cellGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    const cellMaterial = new THREE.MeshPhysicalMaterial({
                        color: CUBE_COLORS[i],
                        emissive: CUBE_COLORS[i],
                        emissiveIntensity: 0.05,
                        metalness: 0.2,
                        roughness: 0.3,
                        transparent: true,
                        opacity: 0.3,
                        clearcoat: 1,
                        clearcoatRoughness: 0
                    });

                    const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                    cell.position.x = (x - 1) * (CELL_SIZE + CELL_SPACING);
                    cell.position.y = (y - 1) * (CELL_SIZE + CELL_SPACING);
                    cell.position.z = (z - 1) * (CELL_SIZE + CELL_SPACING);
                    cell.castShadow = true;
                    cell.receiveShadow = true;
                    
                    const cellIndex = z * 9 + y * 3 + x;
                    cell.userData = { 
                        cubeIndex: i, 
                        cellIndex: cellIndex,
                        x: x,
                        y: y,
                        z: z,
                        occupied: false 
                    };
                    
                    cubeCells.push(cell);
                    cubeGroup.add(cell);
                    
                    // Add edge lines
                    const edges = new THREE.EdgesGeometry(cellGeometry);
                    const lineMaterial = new THREE.LineBasicMaterial({ 
                        color: 0x222222,
                        linewidth: 1
                    });
                    const line = new THREE.LineSegments(edges, lineMaterial);
                    cell.add(line);
                }
            }
        }
        
        // Add cube boundary
        const boundaryGeometry = new THREE.BoxGeometry(
            3 * CELL_SIZE + 2.5 * CELL_SPACING,
            3 * CELL_SIZE + 2.5 * CELL_SPACING,
            3 * CELL_SIZE + 2.5 * CELL_SPACING
        );
        const boundaryMaterial = new THREE.MeshBasicMaterial({
            color: CUBE_COLORS[i],
            wireframe: true,
            transparent: true,
            opacity: 0.1
        });
        const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        cubeGroup.add(boundary);
        
        cubes.push({ group: cubeGroup, cells: cubeCells });
        cells.push(...cubeCells);
        cubeContainer.add(cubeGroup);
    }
    
    scene.add(cubeContainer);
}

// Create platform
function createPlatform() {
    const platformGeometry = new THREE.BoxGeometry(20, 0.2, 20);
    const platformMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.2
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -2;
    platform.receiveShadow = true;
    scene.add(platform);
}

// Create 3D X mark
function create3DX() {
    const group = new THREE.Group();
    const barGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.8, CELL_SIZE * 0.1, CELL_SIZE * 0.1);
    const xMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x667eea,
        emissive: 0x667eea,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.2
    });

    const bar1 = new THREE.Mesh(barGeometry, xMaterial);
    bar1.rotation.z = Math.PI / 4;
    bar1.castShadow = true;

    const bar2 = new THREE.Mesh(barGeometry, xMaterial);
    bar2.rotation.z = -Math.PI / 4;
    bar2.castShadow = true;

    group.add(bar1);
    group.add(bar2);
    
    return group;
}

// Create 3D O mark
function create3DO() {
    const torusGeometry = new THREE.TorusGeometry(CELL_SIZE * 0.3, CELL_SIZE * 0.08, 8, 16);
    const oMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf5576c,
        emissive: 0xf5576c,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.2
    });

    const torus = new THREE.Mesh(torusGeometry, oMaterial);
    torus.castShadow = true;
    
    return torus;
}

// Determine next cube based on cell position
function determineNextCube(cellIndex) {
    // Map cell position to cube position
    // Layer mapping: z=0 → cubes 0-2, z=1 → cubes 3-5, z=2 → cubes 6-8
    const z = Math.floor(cellIndex / 9);
    const y = Math.floor((cellIndex % 9) / 3);
    const x = cellIndex % 3;
    
    return z * 3 + x;
}

// Check if a move is valid
function isValidMove(cubeIndex, cellIndex) {
    // Check if game is over
    if (gameState.gameOver) return false;
    
    // Check if cube is already won
    if (gameState.cubeWinners[cubeIndex]) return false;
    
    // Check if cell is occupied
    const z = Math.floor(cellIndex / 9);
    const y = Math.floor((cellIndex % 9) / 3);
    const x = cellIndex % 3;
    if (gameState.boards[cubeIndex][z][y][x]) return false;
    
    // Check if move is in active cube
    if (gameState.activeCubes !== null && gameState.activeCubes !== cubeIndex) return false;
    
    return true;
}

// Make a move
function makeMove(cubeIndex, cellIndex) {
    if (!isValidMove(cubeIndex, cellIndex)) return;
    
    // Update game state
    const z = Math.floor(cellIndex / 9);
    const y = Math.floor((cellIndex % 9) / 3);
    const x = cellIndex % 3;
    gameState.boards[cubeIndex][z][y][x] = gameState.currentPlayer;
    
    // Create and place mark
    const mark = gameState.currentPlayer === 'X' ? create3DX() : create3DO();
    const cell = cubes[cubeIndex].cells[cellIndex];
    mark.position.copy(cell.position);
    cubes[cubeIndex].group.add(mark);
    marks.push(mark);
    
    // Animate mark
    animateMark(mark);
    
    // Update cell state
    cell.userData.occupied = true;
    cell.userData.player = gameState.currentPlayer;
    
    // Check if this wins the cube
    if (checkCubeWinner(cubeIndex)) {
        gameState.cubeWinners[cubeIndex] = gameState.currentPlayer;
        showCubeWinner(cubeIndex);
        
        // Check if this wins the game
        if (checkGameWinner()) {
            handleGameWin();
            return;
        }
    }
    
    // Check for draw
    if (checkGameDraw()) {
        handleGameDraw();
        return;
    }
    
    // Determine next cube
    const nextCube = determineNextCube(cellIndex);
    if (gameState.cubeWinners[nextCube]) {
        // If next cube is won, player can play anywhere
        gameState.activeCubes = null;
    } else {
        gameState.activeCubes = nextCube;
    }
    
    // Switch players
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    
    // Update UI
    updateUI();
    updateActiveHighlights();
    
    // Computer move
    if (!gameState.gameOver) {
        if (gameState.gameMode === 'single' && gameState.currentPlayer === 'O') {
            setTimeout(computerMove, 500);
        } else if (gameState.gameMode === 'ai-vs-ai') {
            setTimeout(computerMove, 1000); // 1 second delay for AI vs AI
        }
    }
}

// Check if a cube has a winner
function checkCubeWinner(cubeIndex) {
    const board = gameState.boards[cubeIndex];
    
    for (const combination of cubeWinningCombinations) {
        const positions = combination.map(idx => {
            const z = Math.floor(idx / 9);
            const y = Math.floor((idx % 9) / 3);
            const x = idx % 3;
            return board[z][y][x];
        });
        
        if (positions[0] && positions[0] === positions[1] && positions[0] === positions[2]) {
            // Create winning line for cube
            const cells = combination.map(idx => cubes[cubeIndex].cells[idx]);
            createCubeWinLine(cubeIndex, cells);
            return true;
        }
    }
    
    return false;
}

// Check if someone won the game
function checkGameWinner() {
    for (const combination of metaWinningCombinations) {
        const winners = combination.map(idx => gameState.cubeWinners[idx]);
        
        if (winners[0] && winners[0] === winners[1] && winners[0] === winners[2]) {
            createGameWinLine(combination);
            return true;
        }
    }
    
    return false;
}

// Check for game draw
function checkGameDraw() {
    // Game is draw if all cubes are won or full
    for (let i = 0; i < TOTAL_CUBES; i++) {
        if (!gameState.cubeWinners[i]) {
            // Check if cube has empty cells
            const board = gameState.boards[i];
            for (let z = 0; z < 3; z++) {
                for (let y = 0; y < 3; y++) {
                    for (let x = 0; x < 3; x++) {
                        if (!board[z][y][x]) return false;
                    }
                }
            }
        }
    }
    return true;
}

// Show cube winner overlay
function showCubeWinner(cubeIndex) {
    const cube = cubes[cubeIndex];
    const winner = gameState.cubeWinners[cubeIndex];
    
    // Create large X or O overlay
    const overlay = winner === 'X' ? create3DX() : create3DO();
    overlay.scale.set(5, 5, 5);
    overlay.position.y = 2;
    cube.group.add(overlay);
    cubeOverlays.push(overlay);
    
    // Animate overlay
    animateCubeOverlay(overlay);
    
    // Update minimap
    updateMinimap();
}

// Create winning line for a cube
function createCubeWinLine(cubeIndex, cells) {
    const points = cells.map(cell => {
        const worldPos = new THREE.Vector3();
        cell.getWorldPosition(worldPos);
        return worldPos;
    });
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });
    const winLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(winLine);
    winningLines.push(winLine);
}

// Create winning line for the game
function createGameWinLine(cubeIndices) {
    const points = cubeIndices.map(idx => {
        const cube = cubes[idx];
        return cube.group.position.clone().add(new THREE.Vector3(0, 2, 0));
    });
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.8
    });
    const winLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(winLine);
    winningLines.push(winLine);
    
    // Animate winning line
    animateGameWinLine(winLine);
}

// Update active cube highlights
function updateActiveHighlights() {
    // Remove old highlights
    activeHighlights.forEach(highlight => scene.remove(highlight));
    activeHighlights = [];
    
    // Dim all cubes
    cubes.forEach(cube => {
        cube.cells.forEach(cell => {
            if (!cell.userData.occupied) {
                cell.material.opacity = 0.2;
                cell.material.emissiveIntensity = 0.02;
            }
        });
    });
    
    // Highlight active cubes
    if (gameState.activeCubes === null) {
        // All non-won cubes are active
        cubes.forEach((cube, idx) => {
            if (!gameState.cubeWinners[idx]) {
                highlightCube(idx);
            }
        });
    } else {
        // Only one cube is active
        highlightCube(gameState.activeCubes);
    }
}

// Highlight a cube
function highlightCube(cubeIndex) {
    const cube = cubes[cubeIndex];
    
    // Brighten cells
    cube.cells.forEach(cell => {
        if (!cell.userData.occupied) {
            cell.material.opacity = 0.4;
            cell.material.emissiveIntensity = 0.1;
        }
    });
    
    // Add glowing border
    const glowGeometry = new THREE.BoxGeometry(
        3 * CELL_SIZE + 3 * CELL_SPACING,
        3 * CELL_SIZE + 3 * CELL_SPACING,
        3 * CELL_SIZE + 3 * CELL_SPACING
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xf093fb,
        wireframe: true,
        transparent: true,
        opacity: 0.6
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    cube.group.add(glow);
    activeHighlights.push(glow);
}

// Mouse handlers
let hoveredCell = null;

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cells);

    // Reset hover state
    cells.forEach(cell => {
        if (!cell.userData.occupied && isValidMove(cell.userData.cubeIndex, cell.userData.cellIndex)) {
            cell.scale.set(1, 1, 1);
        }
    });

    // Apply hover effect
    if (intersects.length > 0) {
        const cell = intersects[0].object;
        if (!cell.userData.occupied && isValidMove(cell.userData.cubeIndex, cell.userData.cellIndex)) {
            hoveredCell = cell;
            cell.scale.set(1.1, 1.1, 1.1);
            renderer.domElement.style.cursor = 'pointer';
        } else {
            hoveredCell = null;
            renderer.domElement.style.cursor = 'default';
        }
    } else {
        hoveredCell = null;
        renderer.domElement.style.cursor = 'default';
    }
}

function onMouseClick() {
    // Don't allow clicks in AI vs AI mode
    if (gameState.gameMode === 'ai-vs-ai') return;
    
    if (hoveredCell && !gameState.gameOver) {
        makeMove(hoveredCell.userData.cubeIndex, hoveredCell.userData.cellIndex);
    }
}

// Computer AI with improved strategy
function computerMove() {
    const validMoves = [];
    
    // Find all valid moves
    for (let cubeIdx = 0; cubeIdx < TOTAL_CUBES; cubeIdx++) {
        if (gameState.cubeWinners[cubeIdx]) continue;
        if (gameState.activeCubes !== null && gameState.activeCubes !== cubeIdx) continue;
        
        for (let cellIdx = 0; cellIdx < 27; cellIdx++) {
            if (isValidMove(cubeIdx, cellIdx)) {
                validMoves.push({ cube: cubeIdx, cell: cellIdx });
            }
        }
    }
    
    if (validMoves.length === 0) return;
    
    // Improved strategy
    let bestMove = null;
    
    // 1. Try to win the game
    bestMove = findGameWinningMove(validMoves);
    if (bestMove) {
        makeMove(bestMove.cube, bestMove.cell);
        return;
    }
    
    // 2. Block opponent from winning the game
    bestMove = findGameBlockingMove(validMoves);
    if (bestMove) {
        makeMove(bestMove.cube, bestMove.cell);
        return;
    }
    
    // 3. Try to win a cube
    bestMove = findCubeWinningMove(validMoves);
    if (bestMove) {
        makeMove(bestMove.cube, bestMove.cell);
        return;
    }
    
    // 4. Block opponent from winning a cube
    bestMove = findCubeBlockingMove(validMoves);
    if (bestMove) {
        makeMove(bestMove.cube, bestMove.cell);
        return;
    }
    
    // 5. Strategic move - prefer center of cubes and avoid sending to bad positions
    bestMove = findStrategicMove(validMoves);
    if (bestMove) {
        makeMove(bestMove.cube, bestMove.cell);
        return;
    }
    
    // 6. Random move as fallback
    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    makeMove(move.cube, move.cell);
}

// Helper functions for AI strategy
function findGameWinningMove(moves) {
    for (const move of moves) {
        // Simulate the move
        const oldPlayer = gameState.currentPlayer;
        gameState.boards[move.cube][Math.floor(move.cell / 9)][Math.floor((move.cell % 9) / 3)][move.cell % 3] = oldPlayer;
        
        // Check if this wins the cube
        if (checkCubeWinner(move.cube)) {
            gameState.cubeWinners[move.cube] = oldPlayer;
            
            // Check if this wins the game
            const gameWon = checkGameWinner();
            
            // Undo the move
            gameState.cubeWinners[move.cube] = null;
            gameState.boards[move.cube][Math.floor(move.cell / 9)][Math.floor((move.cell % 9) / 3)][move.cell % 3] = null;
            
            if (gameWon) return move;
        } else {
            // Undo the move
            gameState.boards[move.cube][Math.floor(move.cell / 9)][Math.floor((move.cell % 9) / 3)][move.cell % 3] = null;
        }
    }
    return null;
}

function findGameBlockingMove(moves) {
    const opponent = gameState.currentPlayer === 'X' ? 'O' : 'X';
    const originalPlayer = gameState.currentPlayer;
    gameState.currentPlayer = opponent;
    
    const blockingMove = findGameWinningMove(moves);
    
    gameState.currentPlayer = originalPlayer;
    return blockingMove;
}

function findCubeWinningMove(moves) {
    for (const move of moves) {
        const z = Math.floor(move.cell / 9);
        const y = Math.floor((move.cell % 9) / 3);
        const x = move.cell % 3;
        
        // Simulate the move
        gameState.boards[move.cube][z][y][x] = gameState.currentPlayer;
        
        // Check if this wins the cube
        const wins = checkCubeWinner(move.cube);
        
        // Undo the move
        gameState.boards[move.cube][z][y][x] = null;
        
        if (wins) return move;
    }
    return null;
}

function findCubeBlockingMove(moves) {
    const opponent = gameState.currentPlayer === 'X' ? 'O' : 'X';
    const originalPlayer = gameState.currentPlayer;
    gameState.currentPlayer = opponent;
    
    const blockingMove = findCubeWinningMove(moves);
    
    gameState.currentPlayer = originalPlayer;
    return blockingMove;
}

function findStrategicMove(moves) {
    // Score each move
    const scoredMoves = moves.map(move => {
        let score = 0;
        
        // Prefer center of cubes (cell 13)
        if (move.cell === 13) score += 3;
        
        // Prefer corners of center layer
        if ([9, 11, 15, 17].includes(move.cell)) score += 2;
        
        // Avoid sending opponent to a cube they're close to winning
        const nextCube = determineNextCube(move.cell);
        if (!gameState.cubeWinners[nextCube]) {
            const opponentThreats = countThreatsInCube(nextCube, gameState.currentPlayer === 'X' ? 'O' : 'X');
            score -= opponentThreats * 2;
        }
        
        // Prefer cubes where we have more marks
        const ourMarks = countMarksInCube(move.cube, gameState.currentPlayer);
        score += ourMarks;
        
        return { ...move, score };
    });
    
    // Sort by score and pick the best
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Return best move if it has positive score
    if (scoredMoves[0].score > 0) {
        return scoredMoves[0];
    }
    
    return null;
}

function countThreatsInCube(cubeIndex, player) {
    let threats = 0;
    const board = gameState.boards[cubeIndex];
    
    for (const combination of cubeWinningCombinations) {
        const positions = combination.map(idx => {
            const z = Math.floor(idx / 9);
            const y = Math.floor((idx % 9) / 3);
            const x = idx % 3;
            return board[z][y][x];
        });
        
        const playerCount = positions.filter(p => p === player).length;
        const emptyCount = positions.filter(p => !p).length;
        
        if (playerCount === 2 && emptyCount === 1) {
            threats++;
        }
    }
    
    return threats;
}

function countMarksInCube(cubeIndex, player) {
    let count = 0;
    const board = gameState.boards[cubeIndex];
    
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (board[z][y][x] === player) count++;
            }
        }
    }
    
    return count;
}

// Animation functions
function animateMark(mark) {
    const startScale = 0;
    const endScale = 1;
    const duration = 300;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        
        const scale = startScale + (endScale - startScale) * easeOutBack(progress);
        mark.scale.set(scale, scale, scale);
        mark.rotation.y = progress * Math.PI * 2;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function animateCubeOverlay(overlay) {
    const startScale = 0;
    const endScale = 5;
    const duration = 500;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutElastic = (t) => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        };
        
        const scale = startScale + (endScale - startScale) * easeOutElastic(progress);
        overlay.scale.set(scale, scale, scale);
        overlay.rotation.y = progress * Math.PI;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function animateGameWinLine(line) {
    const duration = 2000;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % duration) / duration;
        
        line.material.opacity = 0.5 + Math.sin(progress * Math.PI * 2) * 0.5;
        line.material.emissiveIntensity = 0.5 + Math.sin(progress * Math.PI * 2) * 0.3;
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Camera controls
function focusOnCube(cubeIndex) {
    const cube = cubes[cubeIndex];
    const targetPosition = cube.group.position.clone();
    targetPosition.add(new THREE.Vector3(3, 3, 3));
    
    // Animate camera
    const duration = 1000;
    const startPos = camera.position.clone();
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const p = easeInOut(progress);
        
        camera.position.lerpVectors(startPos, targetPosition, p);
        camera.lookAt(cube.group.position);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function viewAllCubes() {
    const duration = 1000;
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(15, 15, 15);
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const p = easeInOut(progress);
        
        camera.position.lerpVectors(startPos, targetPos, p);
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// UI functions
function updateUI() {
    const statusElement = document.getElementById('status');
    const activeCubeElement = document.getElementById('active-cube-info');
    
    if (gameState.gameOver) {
        if (gameState.gameWinner) {
            if (gameState.gameMode === 'single') {
                statusElement.textContent = gameState.gameWinner === 'X' ? 'You win! 🎉' : 'Computer wins! 🤖';
            } else if (gameState.gameMode === 'ai-vs-ai') {
                statusElement.textContent = gameState.gameWinner === 'X' ? 'Computer 1 wins! 🤖' : 'Computer 2 wins! 🤖';
            } else {
                statusElement.textContent = `Player ${gameState.gameWinner} wins! 🎉`;
            }
        } else {
            statusElement.textContent = "It's a draw! 🤝";
        }
        activeCubeElement.textContent = 'Game Over';
    } else {
        if (gameState.gameMode === 'single') {
            statusElement.textContent = gameState.currentPlayer === 'X' ? 'Your turn (X)' : "Computer's turn (O)";
        } else if (gameState.gameMode === 'ai-vs-ai') {
            statusElement.textContent = gameState.currentPlayer === 'X' ? "Computer 1's turn (X)" : "Computer 2's turn (O)";
        } else {
            statusElement.textContent = `Player ${gameState.currentPlayer}'s turn`;
        }
        
        if (gameState.activeCubes === null) {
            activeCubeElement.textContent = 'Play in any cube';
        } else {
            activeCubeElement.textContent = `Play in cube ${gameState.activeCubes + 1}`;
        }
    }
    
    document.getElementById('player1-score').textContent = gameState.player1Score;
    document.getElementById('player2-score').textContent = gameState.player2Score;
}

function updateMinimap() {
    const minimapCubes = document.querySelectorAll('.minimap-cube');
    minimapCubes.forEach((elem, idx) => {
        elem.classList.remove('active', 'won-x', 'won-o');
        
        if (gameState.activeCubes === idx) {
            elem.classList.add('active');
        }
        
        if (gameState.cubeWinners[idx]) {
            elem.classList.add(`won-${gameState.cubeWinners[idx].toLowerCase()}`);
            elem.setAttribute('data-winner', gameState.cubeWinners[idx]);
        } else {
            elem.setAttribute('data-winner', '');
        }
    });
}

// Game end handlers
function handleGameWin() {
    gameState.gameOver = true;
    gameState.gameWinner = gameState.currentPlayer;
    
    if (gameState.currentPlayer === 'X') {
        gameState.player1Score++;
    } else {
        gameState.player2Score++;
    }
    
    updateUI();
    
    // Victory animation
    const duration = 3000;
    const startTime = Date.now();
    const startRotation = scene.rotation.y;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        scene.rotation.y = startRotation + progress * Math.PI * 2;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            scene.rotation.y = startRotation;
        }
    }
    
    animate();
}

function handleGameDraw() {
    gameState.gameOver = true;
    updateUI();
}

// Reset game
function resetGame() {
    // Clear visual elements
    marks.forEach(mark => mark.parent.remove(mark));
    marks = [];
    
    winningLines.forEach(line => scene.remove(line));
    winningLines = [];
    
    cubeOverlays.forEach(overlay => overlay.parent.remove(overlay));
    cubeOverlays = [];
    
    activeHighlights.forEach(highlight => highlight.parent.remove(highlight));
    activeHighlights = [];
    
    // Reset game state
    initGameState();
    gameState.gameMode = document.getElementById('player2-label').textContent === 'Computer' ? 'single' : 'two';
    
    // Reset cells
    cells.forEach(cell => {
        cell.userData.occupied = false;
        cell.userData.player = null;
        cell.scale.set(1, 1, 1);
    });
    
    // Update UI
    updateUI();
    updateMinimap();
    updateActiveHighlights();
}

// Setup UI event listeners
function setupUIListeners() {
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            gameState.gameMode = e.target.dataset.mode;
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('game-info').style.display = 'flex';
            document.getElementById('controls').style.display = 'flex';
            document.getElementById('instructions').style.display = 'block';
            document.getElementById('cube-minimap').style.display = 'grid';
            document.getElementById('camera-controls').style.display = 'block';
            
            if (gameState.gameMode === 'single') {
                document.getElementById('player1-label').textContent = 'You';
                document.getElementById('player2-label').textContent = 'Computer';
            } else if (gameState.gameMode === 'ai-vs-ai') {
                document.getElementById('player1-label').textContent = 'Computer 1';
                document.getElementById('player2-label').textContent = 'Computer 2';
            } else {
                document.getElementById('player1-label').textContent = 'Player 1';
                document.getElementById('player2-label').textContent = 'Player 2';
            }
            
            updateUI();
            updateMinimap();
            updateActiveHighlights();
            
            // Start AI vs AI game automatically
            if (gameState.gameMode === 'ai-vs-ai') {
                setTimeout(computerMove, 1000);
            }
        });
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetGame);

    // Change mode button
    document.getElementById('change-mode-btn').addEventListener('click', () => {
        document.getElementById('mode-selection').style.display = 'block';
        document.getElementById('game-info').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('cube-minimap').style.display = 'none';
        document.getElementById('camera-controls').style.display = 'none';
        document.getElementById('help-panel').style.display = 'none';
        gameState.player1Score = 0;
        gameState.player2Score = 0;
        resetGame();
    });

    // Help button
    document.getElementById('help-btn').addEventListener('click', () => {
        const helpPanel = document.getElementById('help-panel');
        helpPanel.style.display = helpPanel.style.display === 'none' ? 'block' : 'none';
    });

    // Auto rotate button
    document.getElementById('auto-rotate-btn').addEventListener('click', () => {
        autoRotate = !autoRotate;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1;
        document.getElementById('auto-rotate-btn').textContent = autoRotate ? 'Stop Rotation' : 'Auto Rotate';
    });

    // Camera controls
    document.getElementById('view-all-btn').addEventListener('click', viewAllCubes);
    
    document.getElementById('focus-active-btn').addEventListener('click', () => {
        if (gameState.activeCubes !== null) {
            focusOnCube(gameState.activeCubes);
        }
    });

    document.getElementById('rotate-view-btn').addEventListener('click', () => {
        const angle = Math.PI / 2;
        const radius = 20;
        const currentAngle = Math.atan2(camera.position.z, camera.position.x);
        const newAngle = currentAngle + angle;
        
        const targetPos = new THREE.Vector3(
            radius * Math.cos(newAngle),
            camera.position.y,
            radius * Math.sin(newAngle)
        );
        
        const duration = 500;
        const startPos = camera.position.clone();
        const startTime = Date.now();
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            camera.position.lerpVectors(startPos, targetPos, progress);
            camera.lookAt(0, 0, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    });

    // Minimap clicks
    document.querySelectorAll('.minimap-cube').forEach((elem, idx) => {
        elem.addEventListener('click', () => {
            focusOnCube(idx);
        });
    });
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    
    // Animate marks
    marks.forEach((mark, index) => {
        mark.rotation.y += 0.01;
        mark.rotation.x += 0.005;
    });
    
    // Animate active highlights
    activeHighlights.forEach(highlight => {
        highlight.material.opacity = 0.3 + Math.sin(Date.now() * 0.003) * 0.3;
    });
    
    // Pulse hovered cell
    if (hoveredCell && !hoveredCell.userData.occupied) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.05 + 1;
        hoveredCell.scale.set(pulse, pulse, pulse);
    }
    
    renderer.render(scene, camera);
}

// Initialize the game
init();