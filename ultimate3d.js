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
let moveHistory = []; // Store recent moves for trail effect
let cubesWithWinLines = new Set(); // Track which cubes already have winning lines
let aiPaused = false; // Track if AI vs AI is paused
let cameraAnimating = false; // Track if camera is animating
let gameSpeed = 20; // Game speed (0-100 scale, where 20 is normal speed)
let frameCount = 0;
let lastFPSUpdate = Date.now();
let currentFPS = 0;

// Minimap 3D variables
let minimapScene, minimapCamera, minimapRenderer;
let minimapCubes = [];
let minimapMarks = []; // Store minimap X and O marks
let minimapRaycaster, minimapMouse;
let minimapControls;
let minimapZoom = 10; // Track minimap zoom level separately

// Constants
// Adjust sizes based on screen size
const screenSize = Math.min(window.innerWidth, window.innerHeight);
let sizeFactor = 1;
if (screenSize < 600) { // Mobile
    sizeFactor = 1.3;
} else if (screenSize < 1000) { // Tablet
    sizeFactor = 1.1;
}

const CUBE_SIZE = 3;
const CELL_SIZE = 0.4 * sizeFactor; // Bigger cells on smaller screens
const CELL_SPACING = 0.25;
const CUBE_SPACING = 1.0 / sizeFactor; // Minimal spacing between cubes
const TOTAL_CUBES = 27;
const DEBUG_MODE = false; // Set to true to enable console logging

// Convert speed (0-100) to delay multiplier
// 0 = very slow (10x delay), 20 = normal slow (2x), 50 = normal (1x), 100 = very fast (0.2x delay)
function getSpeedMultiplier() {
    if (gameSpeed === 0) return 10;
    if (gameSpeed <= 50) return 2 - (gameSpeed / 50) * 1; // 2x to 1x
    return 1 - ((gameSpeed - 50) / 50) * 0.8; // 1x to 0.2x
}

// Single color for all cubes
const CUBE_COLOR = 0x444444; // Dark gray for all cubes

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

// Generate meta-game winning combinations for 3x3x3 cube
function generateMetaWinningCombinations() {
    const combinations = [];
    
    // Helper function to convert layer,row,col to cube index
    const getCubeIndex = (layer, row, col) => layer * 9 + row * 3 + col;
    
    // Horizontal lines within each layer (3 per layer × 3 layers = 9 total)
    for (let layer = 0; layer < 3; layer++) {
        for (let row = 0; row < 3; row++) {
            combinations.push([
                getCubeIndex(layer, row, 0),
                getCubeIndex(layer, row, 1),
                getCubeIndex(layer, row, 2)
            ]);
        }
    }
    
    // Vertical lines within each layer (3 per layer × 3 layers = 9 total)
    for (let layer = 0; layer < 3; layer++) {
        for (let col = 0; col < 3; col++) {
            combinations.push([
                getCubeIndex(layer, 0, col),
                getCubeIndex(layer, 1, col),
                getCubeIndex(layer, 2, col)
            ]);
        }
    }
    
    // Through layers vertically (3×3 = 9 total)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            combinations.push([
                getCubeIndex(0, row, col),
                getCubeIndex(1, row, col),
                getCubeIndex(2, row, col)
            ]);
        }
    }
    
    // Diagonal lines within each layer (2 per layer × 3 layers = 6 total)
    for (let layer = 0; layer < 3; layer++) {
        // Main diagonal
        combinations.push([
            getCubeIndex(layer, 0, 0),
            getCubeIndex(layer, 1, 1),
            getCubeIndex(layer, 2, 2)
        ]);
        // Anti-diagonal
        combinations.push([
            getCubeIndex(layer, 0, 2),
            getCubeIndex(layer, 1, 1),
            getCubeIndex(layer, 2, 0)
        ]);
    }
    
    // Face diagonals through layers
    // XZ plane diagonals (2 per row × 3 rows = 6 total)
    for (let row = 0; row < 3; row++) {
        combinations.push([
            getCubeIndex(0, row, 0),
            getCubeIndex(1, row, 1),
            getCubeIndex(2, row, 2)
        ]);
        combinations.push([
            getCubeIndex(0, row, 2),
            getCubeIndex(1, row, 1),
            getCubeIndex(2, row, 0)
        ]);
    }
    
    // YZ plane diagonals (2 per col × 3 cols = 6 total)
    for (let col = 0; col < 3; col++) {
        combinations.push([
            getCubeIndex(0, 0, col),
            getCubeIndex(1, 1, col),
            getCubeIndex(2, 2, col)
        ]);
        combinations.push([
            getCubeIndex(0, 2, col),
            getCubeIndex(1, 1, col),
            getCubeIndex(2, 0, col)
        ]);
    }
    
    // Space diagonals (4 total - corner to corner through entire 3x3x3)
    combinations.push([
        getCubeIndex(0, 0, 0), // 0
        getCubeIndex(1, 1, 1), // 13
        getCubeIndex(2, 2, 2)  // 26
    ]);
    combinations.push([
        getCubeIndex(0, 0, 2), // 2
        getCubeIndex(1, 1, 1), // 13
        getCubeIndex(2, 2, 0)  // 24
    ]);
    combinations.push([
        getCubeIndex(0, 2, 0), // 6
        getCubeIndex(1, 1, 1), // 13
        getCubeIndex(2, 0, 2)  // 20
    ]);
    combinations.push([
        getCubeIndex(0, 2, 2), // 8
        getCubeIndex(1, 1, 1), // 13
        getCubeIndex(2, 0, 0)  // 18
    ]);
    
    return combinations;
}

// Meta-game winning combinations (3x3x3)
const metaWinningCombinations = generateMetaWinningCombinations();

// Initialize game state
function initGameState() {
    gameState = {
        boards: Array(27).fill(null).map(() => 
            Array(3).fill(null).map(() => 
                Array(3).fill(null).map(() => 
                    Array(3).fill(null)
                )
            )
        ),
        cubeWinners: Array(27).fill(null),
        activeCubes: null, // null means all cubes are active
        currentPlayer: 'X',
        gameWinner: null,
        gameOver: false,
        player1Score: 0,
        player2Score: 0,
        gameMode: 'single',
        disableAutoFocus: false // Auto-focus is ON by default
    };
}

// Initialize minimap 3D
function initMinimap() {
    // Minimap scene setup
    minimapScene = new THREE.Scene();
    minimapScene.background = null; // Transparent background

    // Minimap camera setup
    minimapCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    minimapCamera.position.set(7, 6, 7);
    minimapCamera.lookAt(0, 0, 0);

    // Minimap renderer setup
    minimapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const minimapContainer = document.getElementById('cube-minimap');
    
    // Ensure container has valid dimensions before setting size
    let minimapSize = Math.min(minimapContainer.offsetWidth, minimapContainer.offsetHeight) - 20;
    if (minimapSize <= 0) {
        minimapSize = 180; // Default size if container not ready
    }
    
    minimapRenderer.setSize(minimapSize, minimapSize);
    minimapRenderer.setClearColor(0x000000, 0);
    const minimapCanvas = minimapRenderer.domElement;
    minimapCanvas.style.cursor = 'pointer';
    minimapCanvas.style.width = '100%';
    minimapCanvas.style.height = '100%';
    document.getElementById('minimap-canvas-container').appendChild(minimapCanvas);
    
    // Add scroll event for minimap zoom
    minimapContainer.addEventListener('wheel', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Adjust minimap zoom
        const delta = event.deltaY > 0 ? 1.1 : 0.9;
        minimapZoom = Math.max(5, Math.min(20, minimapZoom * delta));
        
        // Update minimap camera position
        syncMinimapToMain();
    }, { passive: false });

    // Lighting for minimap
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    minimapScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 10, 5);
    minimapScene.add(directionalLight);

    // Create minimap cubes (much smaller and simpler)
    createMinimapCubes();
    
    // Initialize minimap interaction
    minimapRaycaster = new THREE.Raycaster();
    minimapMouse = new THREE.Vector2();
    
    // Disable minimap controls - it only syncs to main camera
    minimapControls = null;
}

// Create simplified cubes for minimap
function createMinimapCubes() {
    const cubeSize = 1.0;
    const spacing = 1.4;
    
    for (let i = 0; i < TOTAL_CUBES; i++) {
        // Calculate 3D position: layer, row, column (same logic as main game)
        const layer = Math.floor(i / 9);
        const row = Math.floor((i % 9) / 3);
        const col = i % 3;
        
        const cubeX = (col - 1) * spacing;
        const cubeY = (layer - 1) * spacing;
        const cubeZ = (row - 1) * spacing;
        
        // Create simple cube geometry
        const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const cubeMaterial = new THREE.MeshPhysicalMaterial({
            color: CUBE_COLOR,
            transparent: true,
            opacity: 0.15,
            metalness: 0.1,
            roughness: 0.4
        });

        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(cubeX, cubeY, cubeZ);
        cube.userData = { cubeIndex: i };
        
        // Add wireframe outline
        const edges = new THREE.EdgesGeometry(cubeGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x666666, 
            transparent: true, 
            opacity: 0.5 
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        cube.add(wireframe);
        
        minimapCubes.push(cube);
        minimapScene.add(cube);
    }
}

// Initialize Three.js
function init() {
    generateCubeWinningCombinations();
    initGameState();
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 50, 200); // Pushed fog much farther out

    // Camera setup - much closer default zoom
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000); // Increased far plane
    // Calculate the bounding box of all cubes
    // Each cube has size CUBE_SIZE * CELL_SIZE * 3 (3x3x3 cells)
    const cubeActualSize = CUBE_SIZE * CELL_SIZE * 3;
    // Total structure size: 3 cubes + 2 gaps between them
    const structureSize = cubeActualSize * 3 + CUBE_SPACING * CELL_SIZE * 3 * 2;
    
    // Since camera is positioned diagonally, we need to account for the diagonal view
    // The diagonal distance is sqrt(3) times larger
    const diagonalFactor = Math.sqrt(3);
    const effectiveSize = structureSize * diagonalFactor;
    
    // Calculate distance based on FOV
    const fov = camera.fov * Math.PI / 180;
    const aspect = window.innerWidth / window.innerHeight;
    
    // Use the smaller dimension to ensure it fits in both width and height
    const vFov = 2 * Math.atan(Math.tan(fov / 2) / aspect);
    const minFov = Math.min(fov, vFov);
    
    // Distance to fit the structure with safe padding
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    let paddingFactor = 1.4; // Safe default padding to ensure all cubes visible
    
    if (screenSize > 1400) { // Large monitors
        paddingFactor = 1.0; // Closer view for large screens
    } else if (screenSize > 800) { // Medium screens
        paddingFactor = 1.1; // Closer view for medium screens
    } else if (screenSize < 600) { // Mobile
        paddingFactor = 1.5; // Extra padding for mobile
    }
    
    const distance = (effectiveSize * paddingFactor) / (2 * Math.tan(minFov / 2));
    
    // Position camera diagonally
    camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
    camera.lookAt(0, 1, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Controls - slower zoom and closer default position
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 60;
    controls.zoomSpeed = 0.3;
    
    // Remove rotation limits - allow full rotation
    controls.minPolarAngle = 0; // Allow rotation to top
    controls.maxPolarAngle = Math.PI; // Allow rotation to bottom

    // Much brighter and more even lighting - no reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(20, 20, 10);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-20, 10, 10);
    scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight3.position.set(0, -10, -20);
    scene.add(directionalLight3);

    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create the 9 cubes
    createCubes();
    
    // Set controls target to the middle cube position for proper rotation center
    if (cubes[13]) {
        const middleCubePos = cubes[13].group.position.clone();
        controls.target.copy(middleCubePos);
        camera.lookAt(middleCubePos);
        controls.update();
    }

    // Platform removed to avoid hiding bottom cubes

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // Add touch support for mobile
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: false });
    
    setupUIListeners();

    // Initialize minimap
    initMinimap();
    
    // Add drag functionality to minimap
    addMinimapDragFunctionality();
    
    // Start animation
    animate();
}

// Create the 27 cubes
function createCubes() {
    const cubeContainer = new THREE.Group();
    
    for (let i = 0; i < TOTAL_CUBES; i++) {
        const cubeGroup = new THREE.Group();
        // Calculate 3D position: layer, row, column
        const layer = Math.floor(i / 9);
        const row = Math.floor((i % 9) / 3);
        const col = i % 3;
        
        const cubeX = (col - 1) * (CUBE_SIZE + CUBE_SPACING) * CELL_SIZE * 3;
        const cubeY = (layer - 1) * (CUBE_SIZE + CUBE_SPACING) * CELL_SIZE * 3 + 1;
        const cubeZ = (row - 1) * (CUBE_SIZE + CUBE_SPACING) * CELL_SIZE * 3;
        
        // Debug cube positioning
        if (DEBUG_MODE) console.log(`Cube ${i}: layer=${layer}, row=${row}, col=${col} -> position=(${cubeX.toFixed(2)}, ${cubeY.toFixed(2)}, ${cubeZ.toFixed(2)})`);
        
        cubeGroup.position.set(cubeX, cubeY, cubeZ);
        cubeGroup.userData = { cubeIndex: i };
        
        // Create cells for this cube
        const cubeCells = [];
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    const cellGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    const cellMaterial = new THREE.MeshPhysicalMaterial({
                        color: CUBE_COLOR,
                        emissive: CUBE_COLOR,
                        emissiveIntensity: 0.1,
                        metalness: 0.3,
                        roughness: 0.2,
                        transparent: true,
                        opacity: 0.4,
                        clearcoat: 1,
                        clearcoatRoughness: 0
                    });

                    const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                    cell.position.x = (x - 1) * (CELL_SIZE + CELL_SPACING);
                    cell.position.y = (y - 1) * (CELL_SIZE + CELL_SPACING);
                    cell.position.z = (z - 1) * (CELL_SIZE + CELL_SPACING);
                    // Shadows disabled for better visibility
                    
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
                }
            }
        }
        
        // Removed invisible boundary mesh that was showing wireframe triangles
        
        cubes.push({ group: cubeGroup, cells: cubeCells });
        cells.push(...cubeCells);
        cubeContainer.add(cubeGroup);
    }
    
    scene.add(cubeContainer);
}

// Platform function removed - was hiding bottom cubes

// Create 3D X mark
function create3DX() {
    const group = new THREE.Group();
    const barGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.15, CELL_SIZE * 0.15);
    const xMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x008800, // Darker green for X
        emissive: 0x00aa00,
        emissiveIntensity: 0.4, // Less bright
        metalness: 0.1,
        roughness: 0.1,
        transparent: false // Fully opaque
    });

    const bar1 = new THREE.Mesh(barGeometry, xMaterial);
    bar1.rotation.z = Math.PI / 4;

    const bar2 = new THREE.Mesh(barGeometry, xMaterial);
    bar2.rotation.z = -Math.PI / 4;

    group.add(bar1);
    group.add(bar2);
    
    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(CELL_SIZE * 1.1, CELL_SIZE * 0.2, CELL_SIZE * 0.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x008800,
        transparent: true,
        opacity: 0.5
    });
    
    const glow1 = new THREE.Mesh(glowGeometry, glowMaterial);
    glow1.rotation.z = Math.PI / 4;
    const glow2 = new THREE.Mesh(glowGeometry, glowMaterial);
    glow2.rotation.z = -Math.PI / 4;
    
    group.add(glow1);
    group.add(glow2);
    
    return group;
}

// Create 3D O mark
function create3DO() {
    const torusGeometry = new THREE.TorusGeometry(CELL_SIZE * 0.35, CELL_SIZE * 0.12, 12, 20);
    const oMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcc0000, // Darker red for O
        emissive: 0xaa0000,
        emissiveIntensity: 0.4, // Less bright
        metalness: 0.1,
        roughness: 0.1,
        transparent: false // Fully opaque
    });

    const torus = new THREE.Mesh(torusGeometry, oMaterial);
    
    // Add glow effect for O
    const glowTorusGeometry = new THREE.TorusGeometry(CELL_SIZE * 0.4, CELL_SIZE * 0.15, 8, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.3
    });
    const glowTorus = new THREE.Mesh(glowTorusGeometry, glowMaterial);
    
    const group = new THREE.Group();
    group.add(torus);
    group.add(glowTorus);
    
    return group;
}

// Determine next cube based on cell position
function determineNextCube(cellIndex) {
    // Convert cell index back to x,y,z coordinates within the cube
    const cellZ = Math.floor(cellIndex / 9);
    const cellY = Math.floor((cellIndex % 9) / 3);
    const cellX = cellIndex % 3;
    
    // Map cell coordinates to cube coordinates:
    // Cell x (left-right within cube) -> Cube col (left-right overall)
    // Cell y (up-down within cube) -> Cube layer (bottom-top overall)  
    // Cell z (front-back within cube) -> Cube row (front-back overall)
    const targetCol = cellX;
    const targetLayer = cellY;
    const targetRow = cellZ;
    
    const targetCube = targetLayer * 9 + targetRow * 3 + targetCol;
    
    if (DEBUG_MODE) console.log(`Cell ${cellIndex} at (x=${cellX}, y=${cellY}, z=${cellZ}) -> Cube ${targetCube} at (layer=${targetLayer}, row=${targetRow}, col=${targetCol})`);
    
    return targetCube;
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
    
    // Don't allow moves during camera animation
    if (cameraAnimating) {
        if (DEBUG_MODE) console.log('Move blocked - camera is animating');
        return;
    }
    
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
    
    // Add to move history for trail effect
    moveHistory.unshift({
        cubeIndex: cubeIndex,
        cellIndex: cellIndex,
        player: gameState.currentPlayer,
        mark: mark,
        timestamp: Date.now()
    });
    
    // Keep only last 6 moves for trail
    if (moveHistory.length > 6) {
        moveHistory.pop();
    }
    
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
    updateMinimap();
    
    // Auto-focus on active cube
    if (gameState.activeCubes !== null && !gameState.disableAutoFocus) {
        focusOnCube(gameState.activeCubes); // Focus on the active cube
    }
    
    // Computer move
    if (!gameState.gameOver) {
        if (DEBUG_MODE) console.log('Checking for computer move. Mode:', gameState.gameMode, 'Player:', gameState.currentPlayer, 'AI Paused:', aiPaused);
        if (gameState.gameMode === 'single' && gameState.currentPlayer === 'O') {
            setTimeout(computerMove, 1200 * getSpeedMultiplier());
        } else if (gameState.gameMode === 'ai-vs-ai' && !aiPaused) {
            // Continue AI vs AI game
            if (DEBUG_MODE) console.log('Scheduling AI vs AI move');
            setTimeout(computerMove, 1500 * getSpeedMultiplier()); // 1.5 second delay for AI vs AI
        }
    }
}

// Check if a cube has a winner
function checkCubeWinner(cubeIndex) {
    // If this cube already has a winner, don't check again
    if (gameState.cubeWinners[cubeIndex]) {
        return true;
    }
    
    const board = gameState.boards[cubeIndex];
    
    for (const combination of cubeWinningCombinations) {
        const positions = combination.map(idx => {
            const z = Math.floor(idx / 9);
            const y = Math.floor((idx % 9) / 3);
            const x = idx % 3;
            return board[z][y][x];
        });
        
        // Check for actual winning condition: all three positions must be the exact same player
        const player = positions[0];
        if ((player === 'X' || player === 'O') && 
            positions[1] === player && positions[2] === player) {
            
            // Debug log to check if this is a valid win
            if (DEBUG_MODE) console.log(`Valid win detected in cube ${cubeIndex} for player ${player}:`, positions, 'combination:', combination);
            
            // Yellow winning lines removed per user request
            return true;
        }
    }
    
    return false;
}

// Check cube winner for AI simulation (doesn't create visual lines)
function checkCubeWinnerSimulation(cubeIndex) {
    const board = gameState.boards[cubeIndex];
    
    for (const combination of cubeWinningCombinations) {
        const positions = combination.map(idx => {
            const z = Math.floor(idx / 9);
            const y = Math.floor((idx % 9) / 3);
            const x = idx % 3;
            return board[z][y][x];
        });
        
        // Check for actual winning condition: all three positions must be the exact same player
        const player = positions[0];
        if ((player === 'X' || player === 'O') && 
            positions[1] === player && positions[2] === player) {
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
            if (DEBUG_MODE) console.log(`Game won! Player ${winners[0]} won with cubes: ${combination.join(', ')}`);
            if (DEBUG_MODE) console.log(`Cube winners state:`, gameState.cubeWinners);
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
    overlay.position.y = 0;
    cube.group.add(overlay);
    cubeOverlays.push(overlay);
    
    // Light up the entire cube in player's color
    const cubeColor = winner === 'X' ? 0x0066ff : 0xff3333; // Blue for X, Red for O
    cube.cells.forEach(cell => {
        cell.material.emissive.setHex(cubeColor);
        cell.material.emissiveIntensity = 0.3;
        cell.material.opacity = 0.6;
    });
    
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


// Update active cube highlights
function updateActiveHighlights() {
    // Remove old highlights
    activeHighlights.forEach(highlight => {
        if (highlight.parent) {
            highlight.parent.remove(highlight);
        }
    });
    activeHighlights = [];
    
    if (DEBUG_MODE) console.log('Active cubes:', gameState.activeCubes);
    
    // Highlight active cubes - only show outline on the specific active cube
    if (gameState.activeCubes !== null) {
        // Only one cube is active - highlight it
        if (DEBUG_MODE) console.log('Highlighting cube:', gameState.activeCubes);
        highlightCube(gameState.activeCubes);
    } else {
        if (DEBUG_MODE) console.log('No cube highlighted - can play anywhere');
    }
}

// Highlight a cube
function highlightCube(cubeIndex) {
    const cube = cubes[cubeIndex];
    
    if (DEBUG_MODE) console.log('Adding highlight to cube:', cubeIndex);
    
    // Only add wireframe border (no cell brightening)
    const frameGeometry = new THREE.BoxGeometry(
        3 * CELL_SIZE + 3 * CELL_SPACING,
        3 * CELL_SIZE + 3 * CELL_SPACING,
        3 * CELL_SIZE + 3 * CELL_SPACING
    );
    const frameEdges = new THREE.EdgesGeometry(frameGeometry);
    const frameMaterial = new THREE.LineBasicMaterial({
        color: gameState.currentPlayer === 'X' ? 0x00ff00 : 0xff3333, // Green for X, Red for O
        linewidth: 4, // Thicker lines
        transparent: true,
        opacity: 0.9
    });
    const frame = new THREE.LineSegments(frameEdges, frameMaterial);
    cube.group.add(frame);
    activeHighlights.push(frame);
    
    if (DEBUG_MODE) console.log('Total active highlights now:', activeHighlights.length);
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
    if (DEBUG_MODE) console.log('computerMove() called. Mode:', gameState.gameMode, 'Player:', gameState.currentPlayer, 'Paused:', aiPaused);
    
    // Check if camera is animating
    if (cameraAnimating) {
        // Check again in a bit
        if (!gameState.gameOver) {
            setTimeout(computerMove, 200 * getSpeedMultiplier());
        }
        return;
    }
    
    // Only check aiPaused for AI vs AI mode
    if (gameState.gameMode === 'ai-vs-ai' && aiPaused) {
        return;
    }
    
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
    
    if (DEBUG_MODE) console.log('Valid moves found:', validMoves.length, 'Active cube:', gameState.activeCubes);
    
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
    if (DEBUG_MODE) console.log('Making move:', move);
    makeMove(move.cube, move.cell);
}

// Helper functions for AI strategy
function findGameWinningMove(moves) {
    for (const move of moves) {
        // Simulate the move
        const oldPlayer = gameState.currentPlayer;
        const z = Math.floor(move.cell / 9);
        const y = Math.floor((move.cell % 9) / 3);
        const x = move.cell % 3;
        
        gameState.boards[move.cube][z][y][x] = oldPlayer;
        
        // Check if this wins the cube using a separate function that doesn't create visual lines
        if (checkCubeWinnerSimulation(move.cube)) {
            gameState.cubeWinners[move.cube] = oldPlayer;
            
            // Check if this wins the game
            const gameWon = checkGameWinner();
            
            // Undo the move
            gameState.cubeWinners[move.cube] = null;
            gameState.boards[move.cube][z][y][x] = null;
            
            if (gameWon) return move;
        } else {
            // Undo the move
            gameState.boards[move.cube][z][y][x] = null;
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


// Camera controls
// Focus on center while rotating to face the active cube
function focusOnCenter() {
    if (gameState.activeCubes === null) return;
    
    // Set camera animating flag
    cameraAnimating = true;
    
    // Always focus on the middle cube (cube 13)
    const middleCubePosition = cubes[13].group.position.clone();
    const activeCube = cubes[gameState.activeCubes];
    const activeCubePosition = activeCube.group.position.clone();
    
    // Calculate CURRENT camera spherical coordinates relative to middle cube
    const currentOffset = camera.position.clone().sub(middleCubePosition);
    const currentRadius = currentOffset.length();
    const currentAzimuth = Math.atan2(currentOffset.x, currentOffset.z);
    const currentElevation = Math.asin(currentOffset.y / currentRadius);
    
    // Calculate TARGET spherical coordinates based on active cube position
    const cubeOffset = activeCubePosition.clone().sub(middleCubePosition);
    
    // Get cube position in grid
    const layer = Math.floor(gameState.activeCubes / 9);
    const row = Math.floor((gameState.activeCubes % 9) / 3);
    const col = gameState.activeCubes % 3;
    
    // Target azimuth - position camera on same side as active cube
    let targetAzimuth = Math.atan2(cubeOffset.x, cubeOffset.z);
    
    // For middle column cubes (col=1), add extra rotation to see them better
    if (col === 1) {
        // Middle column - rotate more to the side
        if (row === 0) { // Back row
            targetAzimuth += 0.5; // Rotate more to side
        } else if (row === 2) { // Front row
            targetAzimuth -= 0.5; // Rotate more to other side
        }
        // Middle row, middle col stays as is
    }
    
    // Target elevation - more extreme for bottom/top layer cubes
    let targetElevation;
    
    if (layer === 0) { // Bottom layer - need camera much lower
        targetElevation = -1.0; // Even lower for better view
        // For middle row of bottom layer, go even lower
        if (row === 1) targetElevation = -1.2;
    } else if (layer === 1) { // Middle layer
        targetElevation = 0.1;
    } else { // Top layer
        targetElevation = 0.8; // Higher for top layer
        // For middle row of top layer, go even higher
        if (row === 1) targetElevation = 1.0;
    }
    
    // Ensure we take the shortest path around the sphere
    const azimuthDiff = targetAzimuth - currentAzimuth;
    if (azimuthDiff > Math.PI) targetAzimuth -= 2 * Math.PI;
    else if (azimuthDiff < -Math.PI) targetAzimuth += 2 * Math.PI;
    
    // Smooth animation with spherical interpolation
    const duration = 600; // Smoother animation
    const startTime = Date.now();
    const startAzimuth = currentAzimuth;
    const startElevation = currentElevation;
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const p = easeInOut(progress);
        
        // Interpolate spherical coordinates
        const azimuth = startAzimuth + (targetAzimuth - startAzimuth) * p;
        const elevation = startElevation + (targetElevation - startElevation) * p;
        
        // Convert to cartesian coordinates (maintaining constant radius)
        const newPosition = new THREE.Vector3(
            currentRadius * Math.cos(elevation) * Math.sin(azimuth),
            currentRadius * Math.sin(elevation),
            currentRadius * Math.cos(elevation) * Math.cos(azimuth)
        ).add(middleCubePosition);
        
        camera.position.copy(newPosition);
        controls.target.copy(middleCubePosition);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete - add 300ms delay before allowing moves
            setTimeout(() => {
                cameraAnimating = false;
            }, 300);
        }
    }
    
    animate();
}

function focusOnCube(cubeIndex) {
    if (DEBUG_MODE) console.log('focusOnCube called for cube:', cubeIndex, 'Auto-focus disabled?', gameState.disableAutoFocus);
    if (gameState.disableAutoFocus) return;
    
    // Don't start a new animation if one is already in progress
    if (cameraAnimating) {
        if (DEBUG_MODE) console.log('Camera animation already in progress, skipping');
        return;
    }
    
    // Safety check for cubes
    if (!cubes[cubeIndex] || !cubes[13]) {
        console.error('Cubes not properly initialized');
        return;
    }
    
    const cube = cubes[cubeIndex];
    const cubePosition = cube.group.position.clone();
    
    // Set camera animating flag
    cameraAnimating = true;
    
    // Get middle cube position
    const middleCubePos = cubes[13].group.position.clone(); // Center cube
    
    // Get current camera distance from middle cube to maintain zoom
    const currentDistance = camera.position.distanceTo(middleCubePos);
    const deltaX = cubePosition.x - middleCubePos.x;
    const deltaZ = cubePosition.z - middleCubePos.z;
    const deltaY = cubePosition.y - middleCubePos.y;
    
    // Calculate spherical coordinates to position camera very close to the active cube
    // The camera moves on the sphere towards the active cube position
    const direction = new THREE.Vector3(deltaX, deltaY, deltaZ).normalize();
    
    // Use the direction to calculate spherical angles
    let theta = Math.atan2(direction.x, direction.z);
    
    // Calculate phi based on the layer to get really close
    const layer = Math.floor(cubeIndex / 9);
    let phi;
    
    // Calculate the angle to position camera
    const dirLength = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    
    // Calculate optimal camera position in 3D space
    // We want to position camera so active cube is closest with middle cube visible behind
    
    // Check if it's the middle cube of middle layer (cube 13)
    if (cubeIndex === 13) {
        // Center cube - maintain current camera angle
        theta = Math.atan2(camera.position.x - middleCubePos.x, camera.position.z - middleCubePos.z);
        phi = Math.PI / 3;
    } else {
        // Calculate direction vector from middle to active cube
        const dir = new THREE.Vector3(deltaX, deltaY, deltaZ).normalize();
        
        // Convert to spherical coordinates
        // Position camera on the same side as the cube for closest view
        theta = Math.atan2(dir.x, dir.z);
        
        // Calculate phi based on the full 3D direction
        // This accounts for the Y component properly
        const horizontalDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        phi = Math.atan2(horizontalDist, dir.y);
        
        // No limits on phi - allow full rotation
        // phi can now be any value from 0 to PI
        
        // Add offset to position camera more to the right and above
        theta += Math.PI / 6; // 30 degree horizontal offset to the right
        
        // Adjust phi to position camera higher (more top-down view)
        phi -= 0.15; // Move camera up by reducing phi
        
        // For cubes far from center, add layer-specific adjustments
        if (layer === 0) {
            phi -= 0.1; // Even higher for bottom layer
        } else if (layer === 2) {
            phi += 0.1; // Slightly lower for top layer
        }
    }
    
    // Calculate new camera position on sphere at current distance
    const targetCameraPos = new THREE.Vector3(
        middleCubePos.x + currentDistance * Math.sin(phi) * Math.sin(theta),
        middleCubePos.y + currentDistance * Math.cos(phi),
        middleCubePos.z + currentDistance * Math.sin(phi) * Math.cos(theta)
    );
    
    // Animate camera rotation with speed-based duration
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    // Calculate angular distance for speed-based animation
    const startDir = new THREE.Vector3().subVectors(startPos, middleCubePos).normalize();
    const targetDir = new THREE.Vector3().subVectors(targetCameraPos, middleCubePos).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, startDir.dot(targetDir))));
    
    // If we're already at the target, don't animate
    if (angle < 0.01 || startPos.distanceTo(targetCameraPos) < 0.1) {
        if (DEBUG_MODE) console.log('Camera already at target position, skipping animation');
        cameraAnimating = false;
        return;
    }
    
    // Speed in radians per second (45 degrees per second)
    const rotationSpeed = Math.PI / 4;
    const duration = (angle / rotationSpeed) * 1000; // Convert to milliseconds
    
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Faster easing
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const p = easeOut(progress);
        
        // Animate camera position along the sphere surface
        // Use spherical interpolation to maintain constant radius
        const startRadius = startPos.distanceTo(middleCubePos);
        const targetRadius = targetCameraPos.distanceTo(middleCubePos);
        const currentRadius = startRadius + (targetRadius - startRadius) * p;
        
        // Normalize positions relative to center and interpolate
        const startDir = new THREE.Vector3().subVectors(startPos, middleCubePos);
        const targetDir = new THREE.Vector3().subVectors(targetCameraPos, middleCubePos);
        
        // Safety check for zero vectors
        if (startDir.lengthSq() < 0.001 || targetDir.lengthSq() < 0.001) {
            console.error('Invalid camera direction vectors');
            cameraAnimating = false;
            return;
        }
        
        startDir.normalize();
        targetDir.normalize();
        
        // Proper spherical interpolation to avoid jumping
        const currentDir = new THREE.Vector3();
        
        // Use spherical linear interpolation (slerp) for smooth rotation
        const dot = startDir.dot(targetDir);
        
        // Clamp dot product to valid range
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const theta = Math.acos(clampedDot);
        
        // If angle is very small, use simple lerp
        if (theta < 0.001) {
            currentDir.copy(startDir);
        } else if (Math.abs(theta - Math.PI) < 0.001) {
            // Vectors are opposite (180 degrees)
            // Find a perpendicular vector to interpolate through
            const perpendicular = new THREE.Vector3();
            if (Math.abs(startDir.x) < 0.9) {
                perpendicular.crossVectors(startDir, new THREE.Vector3(1, 0, 0));
            } else {
                perpendicular.crossVectors(startDir, new THREE.Vector3(0, 1, 0));
            }
            perpendicular.normalize();
            
            // Use two-step interpolation through perpendicular
            const halfwayAngle = Math.PI / 2;
            if (p < 0.5) {
                // First half: from start to perpendicular
                const localP = p * 2;
                const sinTheta = Math.sin(halfwayAngle);
                currentDir.copy(startDir).multiplyScalar(Math.sin(halfwayAngle * (1 - localP)) / sinTheta);
                currentDir.add(perpendicular.clone().multiplyScalar(Math.sin(halfwayAngle * localP) / sinTheta));
            } else {
                // Second half: from perpendicular to target
                const localP = (p - 0.5) * 2;
                const sinTheta = Math.sin(halfwayAngle);
                currentDir.copy(perpendicular).multiplyScalar(Math.sin(halfwayAngle * (1 - localP)) / sinTheta);
                currentDir.add(targetDir.clone().multiplyScalar(Math.sin(halfwayAngle * localP) / sinTheta));
            }
        } else {
            // Normal slerp
            const sinTheta = Math.sin(theta);
            const a = Math.sin((1 - p) * theta) / sinTheta;
            const b = Math.sin(p * theta) / sinTheta;
            currentDir.copy(startDir).multiplyScalar(a);
            currentDir.add(targetDir.clone().multiplyScalar(b));
        }
        
        currentDir.normalize();
        
        // Set camera position at constant radius
        if (DEBUG_MODE && progress > 0.95) {
            console.log('Camera animation near complete:', {
                currentRadius,
                currentDir: currentDir.toArray(),
                middleCubePos: middleCubePos.toArray(),
                cameraPosBefore: camera.position.toArray()
            });
        }
        
        camera.position.copy(middleCubePos).addScaledVector(currentDir, currentRadius);
        
        // Safety check for camera position
        if (!isFinite(camera.position.x) || !isFinite(camera.position.y) || !isFinite(camera.position.z)) {
            console.error('Invalid camera position calculated:', camera.position);
            camera.position.set(10, 10, 10);
        }
        
        // Keep camera always looking at middle cube
        controls.target.copy(middleCubePos);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete - add 300ms delay before allowing moves
            if (DEBUG_MODE) console.log('Camera animation complete, waiting 300ms before allowing moves');
            setTimeout(() => {
                cameraAnimating = false;
                if (DEBUG_MODE) console.log('Camera cooldown complete, moves allowed');
            }, 300);
        }
    }
    
    animate();
}

function viewAllCubes() {
    const duration = 1000;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const targetPos = new THREE.Vector3(20, 10, 20);
    const targetCenter = new THREE.Vector3(0, 1, 0); // Center of the 3D structure
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const p = easeInOut(progress);
        
        camera.position.lerpVectors(startPos, targetPos, p);
        controls.target.lerpVectors(startTarget, targetCenter, p);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Rotate camera to view last move from behind on the same plane
function rotateToLastMove() {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[0];
    const cube = cubes[lastMove.cubeIndex];
    const cubePosition = cube.group.position.clone();
    
    // Get the layer of the last move cube
    const layer = Math.floor(lastMove.cubeIndex / 9);
    const row = Math.floor((lastMove.cubeIndex % 9) / 3);
    const col = lastMove.cubeIndex % 3;
    
    // Position camera behind the cube on the same Y plane (layer)
    const distance = 8;
    let targetPosition = cubePosition.clone();
    
    // Position behind the cube based on its row/col position
    // For middle positions, slightly offset to avoid direct alignment
    const behindX = col === 0 ? distance : col === 2 ? -distance : distance * 0.7;
    const behindZ = row === 0 ? -distance : row === 2 ? distance : distance * 0.7;
    
    targetPosition.add(new THREE.Vector3(behindX, 0, behindZ));
    
    // Animate to position
    const duration = 600;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const p = easeOut(progress);
        
        camera.position.lerpVectors(startPos, targetPosition, p);
        controls.target.lerpVectors(startTarget, cubePosition, p);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// UI functions
function updateUI() {
    // Only update the current player indicator
    const playerIndicator = document.getElementById('current-player-indicator');
    const playerSymbol = document.getElementById('current-player-symbol');
    
    // Update current player indicator
    if (playerIndicator && playerSymbol) {
        if (DEBUG_MODE) console.log('Updating player indicator to:', gameState.currentPlayer);
        playerSymbol.textContent = gameState.currentPlayer;
        
        // Remove previous classes
        playerIndicator.classList.remove('player-x', 'player-o');
        
        if (gameState.gameOver) {
            playerIndicator.style.display = 'none';
        } else {
            playerIndicator.style.display = 'flex';
            playerIndicator.classList.add(gameState.currentPlayer === 'X' ? 'player-x' : 'player-o');
        }
    } else {
        if (DEBUG_MODE) console.log('Player indicator elements not found:', {playerIndicator, playerSymbol});
    }
}

function updateMinimap() {
    if (DEBUG_MODE) console.log(`Updating 3D minimap. Active cubes: ${gameState.activeCubes}`);
    
    if (minimapCubes.length === 0) {
        if (DEBUG_MODE) console.log('No minimap cubes found - minimap may not be initialized yet');
        return;
    }
    
    minimapCubes.forEach((cube, cubeIndex) => {
        // Reset cube to default state
        cube.material.color.setHex(CUBE_COLOR);
        cube.material.emissive.setHex(0x000000);
        cube.material.emissiveIntensity = 0;
        cube.scale.set(1, 1, 1);
        
        // Show won cubes with their colors
        if (gameState.cubeWinners[cubeIndex]) {
            if (gameState.cubeWinners[cubeIndex] === 'X') {
                cube.material.color.setHex(0x66aa66); // Softer green for X
                cube.material.emissive.setHex(0x00ff00);
                cube.material.emissiveIntensity = 0.1;
            } else {
                cube.material.color.setHex(0xaa6666); // Softer red for O
                cube.material.emissive.setHex(0xff3333);
                cube.material.emissiveIntensity = 0.1;
            }
        }
        
        // Highlight active cube with player color if it's not won
        if (gameState.activeCubes === cubeIndex && !gameState.cubeWinners[cubeIndex]) {
            const highlightColor = gameState.currentPlayer === 'X' ? 0x66aa66 : 0xaa6666; // Softer colors
            cube.material.color.setHex(highlightColor);
            cube.material.emissive.setHex(gameState.currentPlayer === 'X' ? 0x00ff00 : 0xff3333);
            cube.material.emissiveIntensity = 0.15;
            cube.scale.set(1.1, 1.1, 1.1); // Slightly larger
            if (DEBUG_MODE) console.log(`3D Minimap highlighting next legal move cube ${cubeIndex}`);
        }
    });
    
    // Render the minimap
    if (minimapRenderer) {
        minimapRenderer.render(minimapScene, minimapCamera);
    }
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
    
    // Clear move history
    moveHistory = [];
    
    // Clear cubes with win lines tracking  
    cubesWithWinLines.clear();
    
    // Reset game state
    initGameState();
    // Default to single player mode since we removed the UI labels
    gameState.gameMode = 'single';
    
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
            document.getElementById('controls').style.display = 'flex';
            document.getElementById('cube-minimap').style.display = 'grid';
            document.getElementById('left-panel').style.display = 'flex';
            
            // Show/hide pause button based on mode
            const pauseBtn = document.getElementById('pause-ai-btn');
            if (gameState.gameMode === 'ai-vs-ai') {
                pauseBtn.style.display = 'flex';
                aiPaused = false; // Start playing by default
                document.getElementById('pause-icon').textContent = '⏸'; // Show pause symbol when playing
            } else {
                pauseBtn.style.display = 'none';
            }
            
            updateUI();
            updateMinimap();
            updateActiveHighlights();
            
            // Start AI vs AI game automatically after 1 second
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
        document.getElementById('controls').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('cube-minimap').style.display = 'none';
        document.getElementById('left-panel').style.display = 'none';
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
        controls.autoRotateSpeed = 0.5; // Slower rotation
        document.getElementById('auto-rotate-btn').textContent = autoRotate ? 'Stop Rotation' : 'Auto Rotate';
    });

    // Auto focus button - initialize with correct text and color
    const autoFocusBtn = document.getElementById('disable-auto-focus-btn');
    autoFocusBtn.textContent = 'Auto Focus';
    // Set initial color based on state (auto-focus is ON by default)
    autoFocusBtn.style.background = gameState.disableAutoFocus ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.3)';
    autoFocusBtn.style.color = gameState.disableAutoFocus ? 'rgba(255, 255, 255, 0.5)' : '#667eea';
    autoFocusBtn.style.borderColor = gameState.disableAutoFocus ? 'rgba(255, 255, 255, 0.3)' : '#667eea';
    
    autoFocusBtn.addEventListener('click', () => {
        gameState.disableAutoFocus = !gameState.disableAutoFocus;
        if (gameState.disableAutoFocus) {
            autoFocusBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            autoFocusBtn.style.color = 'rgba(255, 255, 255, 0.5)';
            autoFocusBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        } else {
            autoFocusBtn.style.background = 'rgba(102, 126, 234, 0.3)';
            autoFocusBtn.style.color = '#667eea';
            autoFocusBtn.style.borderColor = '#667eea';
        }
    });
    
    // Pause AI button
    const pauseAIBtn = document.getElementById('pause-ai-btn');
    const pauseIcon = document.getElementById('pause-icon');
    pauseAIBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        aiPaused = !aiPaused;
        pauseIcon.textContent = aiPaused ? '▶' : '⏸'; // Play or pause symbol
        
        // If resuming, trigger next move
        if (!aiPaused && gameState.gameMode === 'ai-vs-ai' && !gameState.gameOver) {
            setTimeout(computerMove, 500 * getSpeedMultiplier());
        }
    });
    
    
    // Speed control
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    
    speedSlider.addEventListener('input', (e) => {
        gameSpeed = parseInt(e.target.value);
        speedDisplay.textContent = gameSpeed;
    });
    
    // Settings toggle
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    
    settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (settingsPanel.style.display === 'none' || settingsPanel.style.display === '') {
            settingsPanel.style.display = 'flex';
            settingsToggle.style.opacity = '1';
        } else {
            settingsPanel.style.display = 'none';
            settingsToggle.style.opacity = '0.8';
        }
    });
    
    // Click outside to close settings
    document.addEventListener('click', (e) => {
        const controls = document.getElementById('controls');
        if (!controls.contains(e.target) && settingsPanel.style.display === 'flex') {
            settingsPanel.style.display = 'none';
            settingsToggle.style.opacity = '0.8';
        }
    });
    
    // Prevent settings panel clicks from bubbling
    settingsPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });


    // Minimap clicks
    document.querySelectorAll('.minimap-cube').forEach((elem, idx) => {
        elem.addEventListener('click', () => {
            focusOnCube(idx);
        });
    });
}

// Touch event handlers for mobile
let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };

function onTouchStart(event) {
    touchStartTime = Date.now();
    if (event.touches.length === 1) {
        touchStartPos.x = event.touches[0].clientX;
        touchStartPos.y = event.touches[0].clientY;
    }
}

function onTouchMove(event) {
    if (event.touches.length === 1) {
        // Update mouse position for hover effects
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
}

function onTouchEnd(event) {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;
    
    // Only register as a tap if it's a quick touch (less than 200ms) and hasn't moved much
    if (touchDuration < 200 && event.changedTouches.length === 1) {
        const touchEndPos = {
            x: event.changedTouches[0].clientX,
            y: event.changedTouches[0].clientY
        };
        
        const distance = Math.sqrt(
            Math.pow(touchEndPos.x - touchStartPos.x, 2) + 
            Math.pow(touchEndPos.y - touchStartPos.y, 2)
        );
        
        // If finger hasn't moved much, treat as a click
        if (distance < 10) {
            mouse.x = (touchEndPos.x / window.innerWidth) * 2 - 1;
            mouse.y = -(touchEndPos.y / window.innerHeight) * 2 + 1;
            onMouseClick();
        }
    }
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update minimap size
    const minimapContainer = document.getElementById('cube-minimap');
    if (minimapContainer && minimapRenderer) {
        let minimapSize = Math.min(minimapContainer.offsetWidth, minimapContainer.offsetHeight) - 20;
        if (minimapSize <= 0) {
            minimapSize = 180; // Default size if container not ready
        }
        minimapRenderer.setSize(minimapSize, minimapSize);
        minimapCamera.aspect = 1;
        minimapCamera.updateProjectionMatrix();
    }
}

// Update move trail highlighting
function updateMoveTrail() {
    const now = Date.now();
    
    moveHistory.forEach((move, index) => {
        const age = now - move.timestamp;
        const maxAge = 10000; // 10 seconds
        
        if (age > maxAge) return;
        
        // Calculate intensity based on recency (0 = most recent, higher = older)
        const intensity = Math.max(0, 1 - (index * 0.15) - (age / maxAge * 0.3));
        
        if (move.mark && move.mark.material) {
            // Apply trail effect based on player
            if (move.player === 'X') {
                move.mark.material.emissive.setHex(0x00ff00); // Green for X
                move.mark.material.emissiveIntensity = intensity * 0.8;
            } else {
                move.mark.material.emissive.setHex(0xff3333); // Red for O
                move.mark.material.emissiveIntensity = intensity * 0.8;
            }
        }
        
        // Highlight the cube containing recent moves
        const cube = cubes[move.cubeIndex];
        if (cube && index < 3) { // Only highlight last 3 moves' cubes
            cube.cells.forEach(cell => {
                if (!cell.userData.occupied) {
                    const baseOpacity = cell.material.opacity;
                    cell.material.emissiveIntensity = Math.max(
                        cell.material.emissiveIntensity,
                        intensity * 0.05
                    );
                }
            });
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    
    // Sync minimap to main camera only
    syncMinimapToMain();
    
    // Update move trail
    updateMoveTrail();
    
    // Animate marks
    marks.forEach((mark, index) => {
        mark.rotation.y += 0.01;
        mark.rotation.x += 0.005;
    });
    
    // Keep active highlights static at 75% opacity
    activeHighlights.forEach(highlight => {
        highlight.material.opacity = 0.75;
    });
    
    // Pulse hovered cell
    if (hoveredCell && !hoveredCell.userData.occupied) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.05 + 1;
        hoveredCell.scale.set(pulse, pulse, pulse);
    }
    
    renderer.render(scene, camera);
    
    // No minimap controls update needed - it's synced from main camera
    if (minimapRenderer && minimapScene && minimapCamera) {
        minimapRenderer.render(minimapScene, minimapCamera);
    }
}



// Sync minimap camera to main camera orientation only (not zoom)
function syncMinimapToMain() {
    if (!minimapCamera) return;
    
    // Get main camera's direction
    const mainDirection = camera.position.clone().sub(controls.target).normalize();
    
    // Use the separate minimap zoom level
    const newMinimapPosition = mainDirection.multiplyScalar(minimapZoom);
    
    minimapCamera.position.copy(newMinimapPosition);
    minimapCamera.lookAt(0, 0, 0);
    
    // Ensure the minimap maintains proper up direction
    minimapCamera.up.copy(camera.up);
}

// Add drag functionality to minimap
function addMinimapDragFunctionality() {
    const minimapContainer = document.getElementById('cube-minimap');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    minimapContainer.addEventListener('mousedown', function(e) {
        // Check if clicking on the minimap canvas itself (not for dragging)
        if (e.target.tagName === 'CANVAS') return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Get current position
        const rect = minimapContainer.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(minimapContainer);
        initialLeft = parseInt(computedStyle.left) || rect.left;
        initialTop = parseInt(computedStyle.top) || rect.top;
        
        // Prevent text selection while dragging
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // Calculate new position
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Update position
        minimapContainer.style.left = (initialLeft + deltaX) + 'px';
        minimapContainer.style.top = (initialTop + deltaY) + 'px';
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
}

// Initialize the game
init();