// 3D Tic-Tac-Toe Game (3x3x3)
let scene, camera, renderer, controls;
let board = [];
let marks = [];
let currentPlayer = 'X';
let isGameActive = true;
let gameMode = 'single';
let player1Score = 0;
let player2Score = 0;
let hoveredCell = null;
let raycaster, mouse;
let autoRotate = false;
let winLine = null;

// All possible winning combinations in 3D (76 total)
const winningCombinations = [];

// Generate winning combinations
function generateWinningCombinations() {
    // Horizontal lines (9 per layer × 3 layers = 27)
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            winningCombinations.push([
                z * 9 + y * 3 + 0,
                z * 9 + y * 3 + 1,
                z * 9 + y * 3 + 2
            ]);
        }
    }
    
    // Vertical lines (9 per layer × 3 layers = 27)
    for (let z = 0; z < 3; z++) {
        for (let x = 0; x < 3; x++) {
            winningCombinations.push([
                z * 9 + 0 * 3 + x,
                z * 9 + 1 * 3 + x,
                z * 9 + 2 * 3 + x
            ]);
        }
    }
    
    // Through layers (9 lines)
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            winningCombinations.push([
                0 * 9 + y * 3 + x,
                1 * 9 + y * 3 + x,
                2 * 9 + y * 3 + x
            ]);
        }
    }
    
    // Face diagonals (6 faces × 2 diagonals = 12)
    // XY plane diagonals (3 layers)
    for (let z = 0; z < 3; z++) {
        winningCombinations.push([z * 9 + 0, z * 9 + 4, z * 9 + 8]);
        winningCombinations.push([z * 9 + 2, z * 9 + 4, z * 9 + 6]);
    }
    
    // XZ plane diagonals (3 rows)
    for (let y = 0; y < 3; y++) {
        winningCombinations.push([0 * 9 + y * 3 + 0, 1 * 9 + y * 3 + 1, 2 * 9 + y * 3 + 2]);
        winningCombinations.push([0 * 9 + y * 3 + 2, 1 * 9 + y * 3 + 1, 2 * 9 + y * 3 + 0]);
    }
    
    // YZ plane diagonals (3 columns)
    for (let x = 0; x < 3; x++) {
        winningCombinations.push([0 * 9 + 0 * 3 + x, 1 * 9 + 1 * 3 + x, 2 * 9 + 2 * 3 + x]);
        winningCombinations.push([0 * 9 + 2 * 3 + x, 1 * 9 + 1 * 3 + x, 2 * 9 + 0 * 3 + x]);
    }
    
    // Space diagonals (4 corner to corner)
    winningCombinations.push([0, 13, 26]); // (0,0,0) to (2,2,2)
    winningCombinations.push([2, 13, 24]); // (2,0,0) to (0,2,2)
    winningCombinations.push([6, 13, 20]); // (0,2,0) to (2,0,2)
    winningCombinations.push([8, 13, 18]); // (2,2,0) to (0,0,2)
}

// Initialize Three.js
function init() {
    // Generate winning combinations
    generateWinningCombinations();
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 8, 20);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(6, 6, 6);
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
    controls.minDistance = 5;
    controls.maxDistance = 15;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 30;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Add colored lights for each layer
    const layerColors = [0xff6b6b, 0x4ecdc4, 0x45b7d1];
    for (let i = 0; i < 3; i++) {
        const light = new THREE.PointLight(layerColors[i], 0.3, 10);
        light.position.set(0, (i - 1) * 2.5, 5);
        scene.add(light);
    }

    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create board
    createBoard();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);

    // UI event listeners
    setupUIListeners();

    // Start animation
    animate();
}

// Create the 3x3x3 game board
function createBoard() {
    const cellGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const layerColors = [
        new THREE.Color(0x667eea), // Bottom layer - blue
        new THREE.Color(0x764ba2), // Middle layer - purple
        new THREE.Color(0x8b5cf6)  // Top layer - violet
    ];

    // Create wireframe cube to show boundaries
    const cubeGeometry = new THREE.BoxGeometry(3.5, 3.5, 3.5);
    const cubeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const wireframeCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(wireframeCube);

    // Create cells for 3x3x3 grid
    for (let z = 0; z < 3; z++) {
        board[z] = [];
        for (let y = 0; y < 3; y++) {
            board[z][y] = [];
            for (let x = 0; x < 3; x++) {
                const cellMaterial = new THREE.MeshPhysicalMaterial({
                    color: layerColors[z],
                    emissive: layerColors[z],
                    emissiveIntensity: 0.1,
                    metalness: 0.2,
                    roughness: 0.3,
                    transparent: true,
                    opacity: 0.3,
                    clearcoat: 1,
                    clearcoatRoughness: 0
                });

                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.x = (x - 1) * 1.2;
                cell.position.y = (y - 1) * 1.2;
                cell.position.z = (z - 1) * 1.2;
                cell.castShadow = true;
                cell.receiveShadow = true;
                cell.userData = { x, y, z, index: z * 9 + y * 3 + x, occupied: false };
                
                board[z][y][x] = cell;
                scene.add(cell);
            }
        }
    }

    // Add layer indicators
    const textLoader = new THREE.FontLoader();
    const layerLabels = ['Bottom', 'Middle', 'Top'];
    
    // Create simple layer indicators using sprites
    for (let z = 0; z < 3; z++) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.font = 'Bold 40px Arial';
        context.fillStyle = layerColors[z].getStyle();
        context.textAlign = 'center';
        context.fillText(layerLabels[z], 128, 45);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(3, (z - 1) * 1.2, 0);
        sprite.scale.set(2, 0.5, 1);
        scene.add(sprite);
    }
}

// Get cell from index
function getCellFromIndex(index) {
    const z = Math.floor(index / 9);
    const y = Math.floor((index % 9) / 3);
    const x = index % 3;
    return board[z][y][x];
}

// Create 3D X mark
function create3DX() {
    const group = new THREE.Group();
    const barGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.08);
    const xMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
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
    const torusGeometry = new THREE.TorusGeometry(0.25, 0.06, 8, 16);
    const oMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff0066,
        emissive: 0xff0066,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.2
    });

    const torus = new THREE.Mesh(torusGeometry, oMaterial);
    torus.castShadow = true;
    
    return torus;
}

// Mouse move handler
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const allCells = board.flat().flat();
    const intersects = raycaster.intersectObjects(allCells);

    // Reset all cells
    allCells.forEach(cell => {
        if (!cell.userData.occupied) {
            cell.material.opacity = 0.3;
            cell.material.emissiveIntensity = 0.1;
            cell.scale.set(1, 1, 1);
        }
    });

    // Highlight hovered cell
    if (intersects.length > 0 && !intersects[0].object.userData.occupied && isGameActive) {
        const cell = intersects[0].object;
        hoveredCell = cell;
        cell.material.opacity = 0.7;
        cell.material.emissiveIntensity = 0.3;
        cell.scale.set(1.1, 1.1, 1.1);
        renderer.domElement.style.cursor = 'pointer';
    } else {
        hoveredCell = null;
        renderer.domElement.style.cursor = 'default';
    }
}

// Mouse click handler
function onMouseClick() {
    if (!hoveredCell || !isGameActive || hoveredCell.userData.occupied) return;

    // Make move
    makeMove(hoveredCell.userData.index);
}

// Make a move
function makeMove(index) {
    const cell = getCellFromIndex(index);
    if (cell.userData.occupied) return;

    // Create mark
    const mark = currentPlayer === 'X' ? create3DX() : create3DO();
    mark.position.copy(cell.position);
    
    // Animate mark entry
    mark.scale.set(0, 0, 0);
    animateMark(mark);
    
    marks.push(mark);
    scene.add(mark);
    
    cell.userData.occupied = true;
    cell.userData.player = currentPlayer;

    // Check for winner
    if (checkWinner()) {
        handleWin();
        return;
    }

    // Check for draw
    if (checkDraw()) {
        handleDraw();
        return;
    }

    // Switch players
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();

    // Computer move in single player mode
    if (gameMode === 'single' && currentPlayer === 'O' && isGameActive) {
        setTimeout(computerMove, 500);
    }
}

// Animate mark appearance
function animateMark(mark) {
    const startScale = 0;
    const endScale = 1;
    const duration = 300;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out back for bouncy effect
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

// Check for winner
function checkWinner() {
    for (const combination of winningCombinations) {
        const cells = combination.map(index => getCellFromIndex(index));

        if (cells[0].userData.occupied &&
            cells[0].userData.player === cells[1].userData.player &&
            cells[0].userData.player === cells[2].userData.player) {
            
            createWinLine(cells);
            return true;
        }
    }
    return false;
}

// Create winning line
function createWinLine(cells) {
    const material = new THREE.LineBasicMaterial({
        color: 0xffff00,
        linewidth: 5
    });

    const points = cells.map(cell => cell.position.clone());
    
    // Create a tube for better visibility
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });
    winLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(winLine);

    // Animate winning cells
    cells.forEach(cell => {
        cell.material.emissive = new THREE.Color(0xffff00);
        cell.material.emissiveIntensity = 0.5;
    });
}

// Check for draw
function checkDraw() {
    const allCells = board.flat().flat();
    return allCells.every(cell => cell.userData.occupied);
}

// Handle win
function handleWin() {
    isGameActive = false;
    
    if (gameMode === 'single') {
        if (currentPlayer === 'X') {
            player1Score++;
            updateStatus('You win! 🎉');
        } else {
            player2Score++;
            updateStatus('Computer wins! 🤖');
        }
    } else {
        if (currentPlayer === 'X') {
            player1Score++;
            updateStatus('Player 1 wins! 🎉');
        } else {
            player2Score++;
            updateStatus('Player 2 wins! 🎉');
        }
    }
    
    updateScores();
    
    // Victory animation
    animateVictory();
}

// Handle draw
function handleDraw() {
    isGameActive = false;
    updateStatus("It's a draw! 🤝");
}

// Victory animation
function animateVictory() {
    const duration = 3000;
    const startTime = Date.now();
    const startRotation = scene.rotation.y;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        scene.rotation.y = startRotation + progress * Math.PI * 2;
        
        // Also rotate on X axis for 3D effect
        scene.rotation.x = Math.sin(progress * Math.PI * 2) * 0.3;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            scene.rotation.y = startRotation;
            scene.rotation.x = 0;
        }
    }
    
    animate();
}

// Computer move (simplified for 3x3x3)
function computerMove() {
    const emptyCells = [];
    const allCells = board.flat().flat();
    
    allCells.forEach(cell => {
        if (!cell.userData.occupied) {
            emptyCells.push(cell);
        }
    });

    if (emptyCells.length === 0) return;

    // Simplified strategy for 3x3x3
    let bestMove = null;

    // 1. Try to win
    bestMove = findWinningMove('O');
    if (bestMove) {
        makeMove(bestMove.userData.index);
        return;
    }

    // 2. Block opponent
    bestMove = findWinningMove('X');
    if (bestMove) {
        makeMove(bestMove.userData.index);
        return;
    }

    // 3. Take center if available
    const centerCell = getCellFromIndex(13); // Center of the cube
    if (!centerCell.userData.occupied) {
        makeMove(13);
        return;
    }

    // 4. Take corners
    const corners = [0, 2, 6, 8, 18, 20, 24, 26];
    for (const corner of corners) {
        const cell = getCellFromIndex(corner);
        if (!cell.userData.occupied) {
            makeMove(corner);
            return;
        }
    }

    // 5. Random move
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    makeMove(randomCell.userData.index);
}

// Find winning move for player
function findWinningMove(player) {
    for (const combination of winningCombinations) {
        const cells = combination.map(index => getCellFromIndex(index));
        const playerCells = cells.filter(cell => cell.userData.occupied && cell.userData.player === player);
        const emptyCells = cells.filter(cell => !cell.userData.occupied);
        
        if (playerCells.length === 2 && emptyCells.length === 1) {
            return emptyCells[0];
        }
    }
    return null;
}

// Reset game
function resetGame() {
    // Remove marks
    marks.forEach(mark => scene.remove(mark));
    marks = [];

    // Remove win line
    if (winLine) {
        scene.remove(winLine);
        winLine = null;
    }

    // Reset board
    const allCells = board.flat().flat();
    allCells.forEach((cell, index) => {
        cell.userData.occupied = false;
        cell.userData.player = null;
        const z = Math.floor(index / 9);
        const layerColors = [
            new THREE.Color(0x667eea),
            new THREE.Color(0x764ba2),
            new THREE.Color(0x8b5cf6)
        ];
        cell.material.emissive = layerColors[z];
        cell.material.emissiveIntensity = 0.1;
        cell.material.opacity = 0.3;
        cell.scale.set(1, 1, 1);
    });

    currentPlayer = 'X';
    isGameActive = true;
    updateStatus();
}

// Update UI
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (message) {
        statusElement.textContent = message;
    } else {
        if (gameMode === 'single') {
            statusElement.textContent = currentPlayer === 'X' ? 'Your turn (X)' : "Computer's turn (O)";
        } else {
            statusElement.textContent = `Player ${currentPlayer === 'X' ? '1' : '2'}'s turn (${currentPlayer})`;
        }
    }
}

function updateScores() {
    document.getElementById('player1-score').textContent = player1Score;
    document.getElementById('player2-score').textContent = player2Score;
}

// Setup UI event listeners
function setupUIListeners() {
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            gameMode = e.target.dataset.mode;
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('game-info').style.display = 'flex';
            document.getElementById('controls').style.display = 'flex';
            document.getElementById('instructions').style.display = 'block';
            
            if (gameMode === 'single') {
                document.getElementById('player1-label').textContent = 'You';
                document.getElementById('player2-label').textContent = 'Computer';
            } else {
                document.getElementById('player1-label').textContent = 'Player 1';
                document.getElementById('player2-label').textContent = 'Player 2';
            }
            
            resetGame();
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
        player1Score = 0;
        player2Score = 0;
        updateScores();
        resetGame();
    });

    // Auto rotate button
    document.getElementById('rotate-btn').addEventListener('click', () => {
        autoRotate = !autoRotate;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 2;
        document.getElementById('rotate-btn').textContent = autoRotate ? 'Stop Rotation' : 'Auto Rotate';
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
    
    // Pulse hovered cell
    if (hoveredCell && !hoveredCell.userData.occupied) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.05 + 1;
        hoveredCell.scale.set(pulse, pulse, pulse);
    }
    
    renderer.render(scene, camera);
}

// Initialize the game
init();