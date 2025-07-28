/**
 * N-Dimensional Tic-Tac-Toe Game
 * Uses NDEngine for game logic and Three.js for 3D visualization
 */

class NDTicTacToe {
    constructor(config) {
        this.config = config;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Game state
        this.board = [];
        this.currentPlayer = 'X';
        this.isGameActive = true;
        this.moveCount = 0;
        this.hoveredCell = null;
        this.selectedCells = new Map(); // For tracking selections in ultimate mode
        this.autoRotate = false;
        this.isOrthographic = false;
        
        // Ultimate mode specific state
        this.activeSubBoard = null; // Which sub-board must be played in
        this.subBoardWinners = []; // Track who won each sub-board
        this.subBoardMoveCount = []; // Track moves in each sub-board
        
        // Dimension slicing for 4D+ games
        this.dimensionSlices = new Array(Math.max(0, config.dimensions - 3)).fill(0);
        
        // Visual elements
        this.cellObjects = new Map();
        this.markObjects = new Map();
        this.winLineObjects = [];
        this.subBoardIndicators = new Map(); // Visual indicators for active sub-boards
        
        // Colors and materials
        this.colors = {
            X: 0x00ff00,
            O: 0xff0000,
            cell: [0x667eea, 0x764ba2, 0x8b5cf6, 0xf093fb, 0xfa709a],
            hover: 0xffd700,
            win: 0xffffff,
            activeBoard: 0x00ffff,
            wonBoard: { X: 0x00ff0080, O: 0xff000080 }
        };
        
        // AI settings
        this.aiDifficulty = config.gameMode === 'vs-computer' ? 'medium' : null;
        this.aiDelay = 500;
        
        this.init();
    }
    
    init() {
        console.log('Initializing NDTicTacToe with config:', this.config);
        
        // Create dimension array for engine
        let dimensions = new Array(this.config.dimensions).fill(this.config.size);
        
        // For ultimate mode, we don't change the engine dimensions
        // Instead we create 9 separate logical sub-boards within the same dimensional structure
        console.log('Creating NDEngine with dimensions:', dimensions);
        this.engine = new NDEngine(dimensions);
        console.log('Engine created:', this.engine);
        this.board = new Array(this.engine.totalCells).fill(null);
        
        // Initialize ultimate mode state
        if (this.config.ultimateMode) {
            // Ultimate mode always has 9 sub-boards arranged in a 3x3 meta-grid
            const numSubBoards = 9;
            
            this.subBoardWinners = new Array(numSubBoards).fill(null);
            this.subBoardMoveCount = new Array(numSubBoards).fill(0);
            this.activeSubBoard = null; // Start with any board playable
            
            // For ultimate mode, each sub-board has the same structure as the main board
            // Total cells = numSubBoards * cells_per_subboard
            this.board = new Array(this.engine.totalCells * numSubBoards).fill(null);
        }
        
        this.setupThreeJS();
        this.createBoard();
        this.setupEventListeners();
        
        // Start AI vs AI game if needed
        if (this.config.gameMode === 'ai-vs-ai') {
            setTimeout(() => this.makeAIMove(), this.aiDelay);
        }
    }
    
    setupThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
        // Calculate optimal camera distance based on board size
        const boardSize = this.calculateBoardSize();
        const cameraDistance = boardSize * 2;
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(cameraDistance, cameraDistance, cameraDistance);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight - 80);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const container = document.getElementById('game-container');
        console.log('Appending renderer to container:', container);
        
        // Insert the canvas after the game-ui but before other elements
        const gameUI = container.querySelector('.game-ui');
        if (gameUI && gameUI.nextSibling) {
            container.insertBefore(this.renderer.domElement, gameUI.nextSibling);
        } else {
            container.appendChild(this.renderer.domElement);
        }
        
        // Style the canvas
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '80px'; // Below the game UI
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = 'calc(100% - 80px)';
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = boardSize;
        this.controls.maxDistance = boardSize * 4;
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = 1.0;
        
        // Lighting
        this.setupLighting(boardSize);
        
        // Start animation loop
        this.animate();
    }
    
    setupLighting(boardSize) {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(boardSize, boardSize, boardSize);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = boardSize * 4;
        directionalLight.shadow.camera.left = -boardSize * 1.5;
        directionalLight.shadow.camera.right = boardSize * 1.5;
        directionalLight.shadow.camera.top = boardSize * 1.5;
        directionalLight.shadow.camera.bottom = -boardSize * 1.5;
        this.scene.add(directionalLight);
        
        // Add colored point lights for visual interest
        const lightPositions = [
            { pos: [boardSize, 0, 0], color: 0xff6b6b },
            { pos: [-boardSize, 0, 0], color: 0x4ecdc4 },
            { pos: [0, boardSize, 0], color: 0x45b7d1 },
            { pos: [0, -boardSize, 0], color: 0xf093fb }
        ];
        
        lightPositions.forEach(({ pos, color }) => {
            const light = new THREE.PointLight(color, 0.3, boardSize * 2);
            light.position.set(...pos);
            this.scene.add(light);
        });
    }
    
    calculateBoardSize() {
        // Calculate the spatial extent of the board
        if (this.config.ultimateMode) {
            // For ultimate mode, we have multiple sub-boards
            const spacing = 1.2;
            const cubeSize = this.config.size * spacing;
            const cubeSpacing = cubeSize + spacing * 2;
            
            if (this.config.dimensions === 2) {
                // Grid arrangement
                const gridSize = Math.ceil(Math.sqrt(this.config.size));
                return gridSize * cubeSpacing;
            } else if (this.config.dimensions === 3) {
                // Row arrangement - need to account for the full width
                // Sub-boards go from -6 to 6 (for 3 sub-boards)
                const totalWidth = (this.config.size - 1) * cubeSpacing + cubeSize;
                return totalWidth * 0.8; // Slightly less for better view
            } else if (this.config.dimensions === 4) {
                // For 4D ultimate, similar to 3D
                return cubeSpacing * 2.5;
            }
        }
        
        // For 4D+ dimensions, account for cube arrangement
        if (this.config.dimensions === 4) {
            // 4D cubes are arranged in a 3D cube pattern
            const spacing = 1.2;
            const cubeSize = this.config.size * spacing;
            const cubeSpacing = cubeSize + spacing * 2;
            const totalSize = (this.config.size - 1) * cubeSpacing + cubeSize;
            return Math.max(cubeSize, totalSize);
        } else if (this.config.dimensions === 5) {
            // 5D cubes are arranged in a 2D grid
            const spacing = 1.2;
            const cubeSize = this.config.size * spacing;
            const cubeSpacing = cubeSize + spacing * 2;
            const gridSize = (this.config.size - 1) * cubeSpacing + cubeSize;
            return Math.max(cubeSize, gridSize * 0.8);
        }
        
        const visualDims = Math.min(this.config.dimensions, 3);
        return this.config.size * 1.2 * Math.sqrt(visualDims);
    }
    
    createBoard() {
        console.log('Creating board with', this.engine.totalCells, 'cells');
        const cellSize = 0.8;
        const spacing = 1.2;
        
        // Create grid helper for reference
        this.createGridHelper();
        console.log('Grid helper created');
        
        // For ultimate mode, create sub-board groups similar to 4D handling
        if (this.config.ultimateMode) {
            this.createUltimateModeBoard(cellSize, spacing);
        } else if (this.config.dimensions >= 4) {
            // For 4D+, create sub-cube containers
            this.createHighDimensionalBoard(cellSize, spacing);
        } else {
            // Standard board creation
            for (let i = 0; i < this.engine.totalCells; i++) {
                const coords = this.engine.indexToCoords(i);
                
                // Map N-D coordinates to 3D space
                const position3D = this.mapToVisualSpace(coords);
                
                // Create cell
                const cell = this.createCell(position3D, cellSize, coords);
                cell.userData = {
                    index: i,
                    coords: coords,
                    occupied: false
                };
                
                this.cellObjects.set(i, cell);
                this.scene.add(cell);
            }
        }
        
        // Add dimension labels and minimap if needed
        if (this.config.dimensions > 3 && !this.config.ultimateMode) {
            this.addDimensionLabels();
            this.createMinimap();
        }
        
        // Update visual indicators for ultimate mode
        if (this.config.ultimateMode) {
            this.updateSubBoardIndicators();
        }
    }
    
    createCell(position, size, coords) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Color based on position for visual distinction
        const colorIndex = coords.reduce((sum, c, i) => sum + c * i, 0) % this.colors.cell.length;
        const baseColor = this.colors.cell[colorIndex];
        
        const material = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.1,
            metalness: 0.2,
            roughness: 0.3,
            transparent: true,
            opacity: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0
        });
        
        const cell = new THREE.Mesh(geometry, material);
        cell.position.copy(position);
        cell.castShadow = true;
        cell.receiveShadow = true;
        
        // Add outline
        const outlineGeometry = new THREE.BoxGeometry(size * 1.02, size * 1.02, size * 1.02);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        cell.add(outline);
        
        return cell;
    }
    
    createUltimateModeBoard(cellSize, spacing) {
        // Create sub-board groups for ultimate mode
        this.subBoardGroups = [];
        const cubeSize = this.config.size * spacing;
        const cubeSpacing = cubeSize + spacing * 2;
        
        // Ultimate mode always has 9 sub-boards arranged in a 3x3 meta-grid
        const numSubBoards = 9;
        
        // Create a group for each sub-board
        for (let subBoardIndex = 0; subBoardIndex < numSubBoards; subBoardIndex++) {
            const group = new THREE.Group();
            group.userData = { subBoardIndex: subBoardIndex };
            
            // Position sub-boards in a 3x3 meta-grid pattern
            const metaRow = Math.floor(subBoardIndex / 3);  // 0, 1, or 2
            const metaCol = subBoardIndex % 3;              // 0, 1, or 2
            
            // Position in 3x3 grid with proper spacing
            group.position.x = (metaCol - 1) * cubeSpacing; // -cubeSpacing, 0, +cubeSpacing
            group.position.z = (metaRow - 1) * cubeSpacing; // -cubeSpacing, 0, +cubeSpacing
            group.position.y = 0;
            
            // Add bounding box for each sub-board
            const boxGeometry = new THREE.BoxGeometry(
                cubeSize + 0.2,
                this.config.dimensions === 2 ? 0.1 : cubeSize + 0.2,
                cubeSize + 0.2
            );
            const boxMaterial = new THREE.MeshBasicMaterial({
                color: this.colors.cell[subBoardIndex % this.colors.cell.length],
                wireframe: true,
                transparent: true,
                opacity: 0.2
            });
            const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);
            boundingBox.userData = {
                isSubBoardIndicator: true,
                subBoardIndex: subBoardIndex
            };
            group.add(boundingBox);
            
            // Store the indicator for later updates
            this.subBoardIndicators.set(subBoardIndex, boundingBox);
            
            this.subBoardGroups.push(group);
            this.scene.add(group);
        }
        
        // Create cells for all sub-boards  
        let globalIndex = 0;
        
        for (let subBoardIndex = 0; subBoardIndex < numSubBoards; subBoardIndex++) {
            for (let localIndex = 0; localIndex < this.engine.totalCells; localIndex++) {
                const localCoords = this.engine.indexToCoords(localIndex);
                
                // Create position relative to sub-board group (local coordinates)
                const position = new THREE.Vector3();
                
                // Map local coordinates to position within the sub-board
                if (localCoords.length >= 1) {
                    position.x = (localCoords[0] - (this.config.size - 1) / 2) * spacing;
                }
                if (localCoords.length >= 2) {
                    position.y = (localCoords[1] - (this.config.size - 1) / 2) * spacing;
                }
                if (localCoords.length >= 3) {
                    position.z = (localCoords[2] - (this.config.size - 1) / 2) * spacing;
                }
                
                // Create cell
                const cell = this.createCell(position, cellSize, localCoords);
                cell.userData = {
                    index: globalIndex,
                    localIndex: localIndex,
                    coords: localCoords,
                    occupied: false,
                    subBoardIndex: subBoardIndex
                };
                
                this.cellObjects.set(globalIndex, cell);
                
                // Add cell to its sub-board group
                this.subBoardGroups[subBoardIndex].add(cell);
                
                globalIndex++;
            }
        }
    }
    
    createHighDimensionalBoard(cellSize, spacing) {
        // Create sub-cube groups for organization
        this.subCubeGroups = [];
        
        if (this.config.dimensions === 4) {
            // Create nested cube structure: 3x3x3 outer cubes, each containing 3x3x3 cells
            const cubeSize = this.config.size * spacing;
            const cubeSpacing = cubeSize + spacing * 2;
            const size = this.config.size;
            
            // Create outer cube groups in 3x3x3 arrangement
            for (let outerIndex = 0; outerIndex < size * size * size; outerIndex++) {
                const group = new THREE.Group();
                group.userData = { outerCubeIndex: outerIndex };
                
                // Convert outer cube index to 3D coordinates for 3x3x3 arrangement
                const outerZ = Math.floor(outerIndex / (size * size));
                const outerY = Math.floor((outerIndex % (size * size)) / size);
                const outerX = outerIndex % size;
                
                // Position outer cube groups in 3D cube pattern
                group.position.x = (outerX - (size - 1) / 2) * cubeSpacing;
                group.position.y = (outerY - (size - 1) / 2) * cubeSpacing;
                group.position.z = (outerZ - (size - 1) / 2) * cubeSpacing;
                
                // Add colored bounding box for each outer cube
                const boxGeometry = new THREE.BoxGeometry(cubeSize + 0.2, cubeSize + 0.2, cubeSize + 0.2);
                const boxMaterial = new THREE.MeshBasicMaterial({
                    color: this.colors.cell[outerIndex % this.colors.cell.length],
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3
                });
                const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);
                group.add(boundingBox);
                
                this.subCubeGroups.push(group);
                this.scene.add(group);
            }
        } else if (this.config.dimensions === 5) {
            // Create a grid of 3D cubes
            for (let v = 0; v < this.config.size; v++) {
                for (let w = 0; w < this.config.size; w++) {
                    const group = new THREE.Group();
                    group.userData = { dimension4: v, dimension5: w };
                    
                    // Add colored bounding box
                    const cubeSize = this.config.size * spacing;
                    const boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                    const colorIndex = (v * this.config.size + w) % this.colors.cell.length;
                    const boxMaterial = new THREE.MeshBasicMaterial({
                        color: this.colors.cell[colorIndex],
                        wireframe: true,
                        transparent: true,
                        opacity: 0.15
                    });
                    const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);
                    group.add(boundingBox);
                    
                    this.subCubeGroups.push(group);
                    this.scene.add(group);
                }
            }
        }
        
        // Create cells for all dimensions
        for (let i = 0; i < this.engine.totalCells; i++) {
            const coords = this.engine.indexToCoords(i);
            
            // Create cell with local position within its outer cube
            const localPosition = new THREE.Vector3();
            
            // For 4D, position cells within outer cubes based on 4th dimension
            if (this.config.dimensions === 4) {
                // coords[3] determines position within the outer cube
                // Since we have only 3 values (0,1,2), arrange them in a line
                localPosition.x = (coords[3] - (this.config.size - 1) / 2) * spacing * 0.3;
                localPosition.y = 0;
                localPosition.z = 0;
            } else {
                // Map first 3 dimensions to local position within outer cube
                if (coords.length >= 1) {
                    localPosition.x = (coords[0] - (this.config.size - 1) / 2) * spacing;
                }
                if (coords.length >= 2) {
                    localPosition.y = (coords[1] - (this.config.size - 1) / 2) * spacing;
                }
                if (coords.length >= 3) {
                    localPosition.z = (coords[2] - (this.config.size - 1) / 2) * spacing;
                }
            }
            
            const cell = this.createCell(localPosition, cellSize, coords);
            cell.userData = {
                index: i,
                coords: coords,
                occupied: false
            };
            
            this.cellObjects.set(i, cell);
            
            // Add cell to the appropriate outer cube group
            if (this.config.dimensions === 4) {
                // Map 4D coordinates to the correct outer cube
                // For 3x3x3x3, we need to map to a 3x3x3 arrangement of outer cubes
                // coords[0,1,2] determine position within outer cube
                // coords[3] determines which "layer" but we arrange all in 3D
                
                // Convert the full 4D coordinate to an outer cube index
                const outerCubeIndex = coords[0] * 9 + coords[1] * 3 + coords[2];
                
                if (this.subCubeGroups[outerCubeIndex]) {
                    this.subCubeGroups[outerCubeIndex].add(cell);
                } else {
                    this.scene.add(cell);
                }
            } else {
                this.scene.add(cell);
            }
        }
    }
    
    createMinimap() {
        // Create a minimap showing all dimensions at once
        const minimapSize = 150;
        const minimapGeometry = new THREE.PlaneGeometry(minimapSize, minimapSize);
        const minimapMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const minimap = new THREE.Mesh(minimapGeometry, minimapMaterial);
        minimap.position.set(-window.innerWidth / 4, window.innerHeight / 4, -100);
        minimap.lookAt(this.camera.position);
        
        // Add minimap to a separate scene/camera for HUD effect
        // For now, we'll add visual indicators to the main scene
        
        // Create overview visualization
        const overviewGroup = new THREE.Group();
        overviewGroup.position.set(0, this.calculateBoardSize() * 1.5, 0);
        
        // Add small representations of each sub-cube
        const miniCubeSize = 0.5;
        const miniSpacing = 0.8;
        
        if (this.config.dimensions === 4) {
            const size = this.config.size;
            for (let w = 0; w < size * size * size; w++) {
                // Convert linear index to 3D coordinates
                const cubeZ = Math.floor(w / (size * size));
                const cubeY = Math.floor((w % (size * size)) / size);
                const cubeX = w % size;
                
                const miniCube = new THREE.Mesh(
                    new THREE.BoxGeometry(miniCubeSize, miniCubeSize, miniCubeSize),
                    new THREE.MeshBasicMaterial({
                        color: this.colors.cell[w % this.colors.cell.length],
                        transparent: true,
                        opacity: 0.6
                    })
                );
                miniCube.position.x = (cubeX - (size - 1) / 2) * miniSpacing;
                miniCube.position.y = (cubeY - (size - 1) / 2) * miniSpacing;
                miniCube.position.z = (cubeZ - (size - 1) / 2) * miniSpacing;
                overviewGroup.add(miniCube);
            }
        } else if (this.config.dimensions === 5) {
            for (let v = 0; v < this.config.size; v++) {
                for (let w = 0; w < this.config.size; w++) {
                    const miniCube = new THREE.Mesh(
                        new THREE.BoxGeometry(miniCubeSize, miniCubeSize, miniCubeSize),
                        new THREE.MeshBasicMaterial({
                            color: this.colors.cell[(v * this.config.size + w) % this.colors.cell.length],
                            transparent: true,
                            opacity: 0.6
                        })
                    );
                    miniCube.position.x = (w - (this.config.size - 1) / 2) * miniSpacing;
                    miniCube.position.z = (v - (this.config.size - 1) / 2) * miniSpacing;
                    overviewGroup.add(miniCube);
                }
            }
        }
        
        overviewGroup.userData.isMinimap = true;
        this.scene.add(overviewGroup);
    }
    
    /**
     * Gets the sub-board index for a given cell index (for ultimate mode)
     * @param {number} cellIndex - The global cell index
     * @returns {number} The sub-board index (0-8)
     */
    getSubBoardIndex(cellIndex) {
        if (!this.config.ultimateMode) return 0;
        
        // Each sub-board contains engine.totalCells cells
        // So sub-board index = floor(cellIndex / engine.totalCells)
        return Math.floor(cellIndex / this.engine.totalCells);
    }
    
    /**
     * Gets the position within a sub-board for a given cell index
     * @param {number} cellIndex - The global cell index
     * @returns {number[]} The coordinates within the sub-board
     */
    getSubBoardPosition(cellIndex) {
        if (!this.config.ultimateMode) return this.engine.indexToCoords(cellIndex);
        
        // Get the local index within the sub-board
        const localIndex = cellIndex % this.engine.totalCells;
        return this.engine.indexToCoords(localIndex);
    }
    
    /**
     * Checks if a cell is playable based on ultimate mode rules
     * @param {number} cellIndex - The cell index
     * @returns {boolean} Whether the cell can be played
     */
    isCellPlayable(cellIndex) {
        // Validate cell index
        if (cellIndex < 0 || cellIndex >= this.board.length) return false;
        
        // Cell must be empty
        if (this.board[cellIndex]) return false;
        
        if (!this.config.ultimateMode) return true;
        
        const subBoardIndex = this.getSubBoardIndex(cellIndex);
        
        // Validate sub-board index
        if (subBoardIndex < 0 || subBoardIndex >= 9) return false;
        
        // If sub-board is already won, can't play there
        if (this.subBoardWinners[subBoardIndex]) return false;
        
        // If no active sub-board restriction, can play anywhere (that's not won)
        if (this.activeSubBoard === null) return true;
        
        // Otherwise, must play in the active sub-board
        return subBoardIndex === this.activeSubBoard;
    }
    
    mapToVisualSpace(coords) {
        const spacing = 1.2;
        const position = new THREE.Vector3();
        
        // Handle ultimate mode visualization
        if (this.config.ultimateMode) {
            const cubeSize = this.config.size * spacing;
            const cubeSpacing = cubeSize + spacing * 2;
            
            // First coordinate is the sub-board index in ultimate mode
            const subBoardIndex = coords[0];
            const effectiveDims = this.config.dimensions; // Original dimensions
            const subBoardCoords = coords.slice(1); // Coordinates within sub-board
            
            // Arrange sub-boards based on effective dimensions
            if (effectiveDims === 2) {
                // For 2D ultimate: arrange sub-boards in a grid
                const gridSize = Math.ceil(Math.sqrt(this.config.size));
                const row = Math.floor(subBoardIndex / gridSize);
                const col = subBoardIndex % gridSize;
                position.x = (col - (gridSize - 1) / 2) * cubeSpacing;
                position.z = (row - (gridSize - 1) / 2) * cubeSpacing;
            } else if (effectiveDims === 3) {
                // For 3D ultimate: arrange sub-boards in a row
                const totalWidth = (this.config.size - 1) * cubeSpacing;
                position.x = subBoardIndex * cubeSpacing - totalWidth / 2;
            }
            
            // Map the sub-board coordinates
            const localSpacing = spacing;
            if (subBoardCoords.length >= 1) {
                position.x += (subBoardCoords[0] - (this.config.size - 1) / 2) * localSpacing;
            }
            if (subBoardCoords.length >= 2) {
                position.y += (subBoardCoords[1] - (this.config.size - 1) / 2) * localSpacing;
            }
            if (subBoardCoords.length >= 3) {
                position.z += (subBoardCoords[2] - (this.config.size - 1) / 2) * localSpacing;
            }
        } else {
            // Non-ultimate mode handling
            // For 4D+ games, calculate sub-cube offset
            if (this.config.dimensions >= 4) {
                const cubeSize = this.config.size * spacing;
                const cubeSpacing = cubeSize + spacing * 2;
                
                if (this.config.dimensions === 4) {
                    // 4D: Nested cube structure - outer 3x3x3 arrangement of cubes
                    // Each outer cube contains inner 3x3x3 cells
                    // coords[3] determines which outer cube (0-26)
                    // coords[0-2] determine position within that outer cube
                    
                    const outerCubeIndex = coords[3];
                    const size = this.config.size;
                    
                    // Convert outer cube index to 3D coordinates in the outer arrangement
                    const outerZ = Math.floor(outerCubeIndex / (size * size));
                    const outerY = Math.floor((outerCubeIndex % (size * size)) / size);
                    const outerX = outerCubeIndex % size;
                    
                    // Position the outer cube
                    position.x += (outerX - (size - 1) / 2) * cubeSpacing;
                    position.y += (outerY - (size - 1) / 2) * cubeSpacing;
                    position.z += (outerZ - (size - 1) / 2) * cubeSpacing;
                } else if (this.config.dimensions === 5) {
                    // 5D: Arrange cubes in a 2D grid
                    const cubeRow = coords[3];
                    const cubeCol = coords[4];
                    const totalWidth = (this.config.size - 1) * cubeSpacing;
                    position.x = cubeCol * cubeSpacing - totalWidth / 2;
                    position.z = cubeRow * cubeSpacing - totalWidth / 2;
                }
            }
            
            // Map first 3 dimensions within each sub-cube
            const localSpacing = spacing;
            if (coords.length >= 1) {
                position.x += (coords[0] - (this.config.size - 1) / 2) * localSpacing;
            }
            if (coords.length >= 2) {
                position.y += (coords[1] - (this.config.size - 1) / 2) * localSpacing;
            }
            if (coords.length >= 3) {
                position.z += (coords[2] - (this.config.size - 1) / 2) * localSpacing;
            }
        }
        
        return position;
    }
    
    isCellVisible(coords) {
        // For 4D games, show all slices
        if (this.config.dimensions === 4) return true;
        
        // For 5D games, check if we're viewing the correct "plane" of 3D cubes
        if (this.config.dimensions === 5) {
            // Only check the last dimension for slicing
            return coords[4] === this.dimensionSlices[1] || this.dimensionSlices[1] === -1;
        }
        
        // For 3D and below, always visible
        return true;
    }
    
    
    updateSubBoardIndicators() {
        if (!this.config.ultimateMode || !this.subBoardGroups) return;
        
        this.subBoardIndicators.forEach((indicator, index) => {
            const group = this.subBoardGroups[index];
            
            // Update color and opacity based on state
            if (this.subBoardWinners[index]) {
                // Sub-board is won
                indicator.material.color.setHex(
                    this.subBoardWinners[index] === 'X' ? this.colors.X : this.colors.O
                );
                indicator.material.opacity = 0.3;
                
                // Create a solid fill for won sub-boards if not already created
                if (!group.userData.wonOverlay) {
                    const fillGeometry = indicator.geometry.clone();
                    const fillMaterial = new THREE.MeshPhysicalMaterial({
                        color: this.subBoardWinners[index] === 'X' ? this.colors.X : this.colors.O,
                        transparent: true,
                        opacity: 0.1,
                        metalness: 0.2,
                        roughness: 0.3
                    });
                    const wonOverlay = new THREE.Mesh(fillGeometry, fillMaterial);
                    group.add(wonOverlay);
                    group.userData.wonOverlay = wonOverlay;
                    
                    // Add a large 3D mark in the center
                    const largeMark = this.create3DMark(this.subBoardWinners[index]);
                    largeMark.scale.set(2.5, 2.5, 2.5);
                    group.add(largeMark);
                    group.userData.wonMark = largeMark;
                }
            } else if (this.activeSubBoard === index) {
                // This is the active sub-board
                indicator.material.color.setHex(this.colors.activeBoard);
                indicator.material.opacity = 0.5;
                
                // Add pulsing effect to the entire group
                const scale = 1 + Math.sin(Date.now() * 0.003) * 0.02;
                group.scale.set(scale, scale, scale);
            } else if (this.activeSubBoard !== null) {
                // Not the active sub-board
                indicator.material.color.setHex(0x444444);
                indicator.material.opacity = 0.1;
                group.scale.set(1, 1, 1);
            } else {
                // No active sub-board (free play)
                indicator.material.color.setHex(0x666666);
                indicator.material.opacity = 0.3;
                group.scale.set(1, 1, 1);
            }
        });
    }
    
    createGridHelper() {
        const size = this.config.size * 1.2;
        const divisions = this.config.size;
        
        // Create grid planes for each visible dimension pair
        const gridColor = 0x444444;
        
        if (this.config.dimensions <= 3) {
            // Standard grid helpers for 2D/3D
            if (this.config.dimensions >= 2) {
                // XY plane
                const gridXY = new THREE.GridHelper(size, divisions, gridColor, gridColor);
                gridXY.rotation.x = Math.PI / 2;
                gridXY.material.opacity = 0.2;
                gridXY.material.transparent = true;
                this.scene.add(gridXY);
            }
            
            if (this.config.dimensions >= 3) {
                // XZ plane
                const gridXZ = new THREE.GridHelper(size, divisions, gridColor, gridColor);
                gridXZ.material.opacity = 0.2;
                gridXZ.material.transparent = true;
                this.scene.add(gridXZ);
                
                // YZ plane
                const gridYZ = new THREE.GridHelper(size, divisions, gridColor, gridColor);
                gridYZ.rotation.z = Math.PI / 2;
                gridYZ.material.opacity = 0.2;
                gridYZ.material.transparent = true;
                this.scene.add(gridYZ);
            }
        } else {
            // For 4D+, create grid helpers for each sub-cube
            // This is handled in createHighDimensionalBoard with bounding boxes
        }
    }
    
    addDimensionLabels() {
        // Remove old labels
        const oldLabels = this.scene.children.filter(child => 
            child.userData && child.userData.isDimensionLabel
        );
        oldLabels.forEach(label => this.scene.remove(label));
        
        if (this.config.dimensions === 4) {
            // Add labels for each outer cube showing its coordinates
            const cubeSize = this.config.size * 1.2;
            const cubeSpacing = cubeSize + 2.4;
            const size = this.config.size;
            
            for (let outerIndex = 0; outerIndex < size * size * size; outerIndex++) {
                // Convert outer cube index to 3D coordinates
                const outerZ = Math.floor(outerIndex / (size * size));
                const outerY = Math.floor((outerIndex % (size * size)) / size);
                const outerX = outerIndex % size;
                
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 64;
                const context = canvas.getContext('2d');
                
                context.font = 'Bold 16px Arial';
                context.fillStyle = '#667eea';
                context.textAlign = 'center';
                context.fillText(`Cube (${outerX},${outerY},${outerZ})`, 128, 40);
                
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ 
                    map: texture, 
                    transparent: true 
                });
                const sprite = new THREE.Sprite(spriteMaterial);
                
                // Position label above each outer cube
                sprite.position.set(
                    (outerX - (size - 1) / 2) * cubeSpacing,
                    (outerY - (size - 1) / 2) * cubeSpacing + cubeSize * 0.8,
                    (outerZ - (size - 1) / 2) * cubeSpacing
                );
                sprite.scale.set(2.5, 0.6, 1);
                sprite.userData.isDimensionLabel = true;
                
                this.scene.add(sprite);
            }
        } else if (this.config.dimensions === 5) {
            // Add grid labels for 5D
            const cubeSize = this.config.size * 1.2;
            const cubeSpacing = cubeSize + 2.4;
            
            for (let row = 0; row < this.config.size; row++) {
                for (let col = 0; col < this.config.size; col++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 64;
                    const context = canvas.getContext('2d');
                    
                    context.font = 'Bold 20px Arial';
                    context.fillStyle = '#667eea';
                    context.textAlign = 'center';
                    context.fillText(`(${row + 1}, ${col + 1})`, 128, 40);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMaterial = new THREE.SpriteMaterial({ 
                        map: texture, 
                        transparent: true 
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    const totalWidth = (this.config.size - 1) * cubeSpacing;
                    sprite.position.set(
                        col * cubeSpacing - totalWidth / 2,
                        cubeSize * 0.8,
                        row * cubeSpacing - totalWidth / 2
                    );
                    sprite.scale.set(2.5, 0.625, 1);
                    sprite.userData.isDimensionLabel = true;
                    
                    this.scene.add(sprite);
                }
            }
        }
    }
    
    create3DMark(player) {
        const group = new THREE.Group();
        
        if (player === 'X') {
            // Create 3D X
            const barGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.08);
            const material = new THREE.MeshPhysicalMaterial({
                color: this.colors.X,
                emissive: this.colors.X,
                emissiveIntensity: 0.3,
                metalness: 0.5,
                roughness: 0.2
            });
            
            const bar1 = new THREE.Mesh(barGeometry, material);
            bar1.rotation.z = Math.PI / 4;
            bar1.castShadow = true;
            
            const bar2 = new THREE.Mesh(barGeometry, material);
            bar2.rotation.z = -Math.PI / 4;
            bar2.castShadow = true;
            
            group.add(bar1, bar2);
        } else {
            // Create 3D O
            const torusGeometry = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
            const material = new THREE.MeshPhysicalMaterial({
                color: this.colors.O,
                emissive: this.colors.O,
                emissiveIntensity: 0.3,
                metalness: 0.5,
                roughness: 0.2
            });
            
            const torus = new THREE.Mesh(torusGeometry, material);
            torus.castShadow = true;
            group.add(torus);
        }
        
        return group;
    }
    
    setupEventListeners() {
        // Mouse events
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Control buttons
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        document.getElementById('auto-rotate').addEventListener('click', () => this.toggleAutoRotate());
        document.getElementById('perspective-toggle').addEventListener('click', () => this.togglePerspective());
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update hovering
        this.updateHover();
    }
    
    updateHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all cell objects
        const cells = Array.from(this.cellObjects.values());
        const intersects = this.raycaster.intersectObjects(cells);
        
        // Reset previous hover
        if (this.hoveredCell) {
            const prevCell = this.cellObjects.get(this.hoveredCell);
            if (prevCell && !prevCell.userData.occupied) {
                prevCell.material.emissiveIntensity = 0.1;
                prevCell.scale.set(1, 1, 1);
            }
        }
        
        // Set new hover
        if (intersects.length > 0 && this.isGameActive) {
            const cell = intersects[0].object;
            const cellIndex = cell.userData.index;
            
            if (this.isCellPlayable(cellIndex)) {
                this.hoveredCell = cellIndex;
                cell.material.emissiveIntensity = 0.3;
                cell.scale.set(1.1, 1.1, 1.1);
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.hoveredCell = null;
                this.renderer.domElement.style.cursor = 'not-allowed';
            }
        } else {
            this.hoveredCell = null;
            this.renderer.domElement.style.cursor = 'default';
        }
    }
    
    onMouseClick() {
        if (!this.isGameActive || 
            (this.config.gameMode === 'vs-computer' && this.currentPlayer === 'O') ||
            this.config.gameMode === 'ai-vs-ai') {
            return;
        }
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const cells = Array.from(this.cellObjects.values());
        const intersects = this.raycaster.intersectObjects(cells);
        
        if (intersects.length > 0) {
            const cell = intersects[0].object;
            const index = cell.userData.index;
            
            if (this.isCellPlayable(index)) {
                this.makeMove(index);
            }
        }
    }
    
    makeMove(index) {
        if (!this.isGameActive || !this.isCellPlayable(index)) return;
        
        // Update board state
        this.board[index] = this.currentPlayer;
        this.moveCount++;
        
        // Update ultimate mode state
        if (this.config.ultimateMode) {
            const subBoardIndex = this.getSubBoardIndex(index);
            this.subBoardMoveCount[subBoardIndex]++;
            
            // Determine next active sub-board based on position within current sub-board
            const subBoardPos = this.getSubBoardPosition(index);
            let nextSubBoard;
            
            if (this.config.dimensions === 2) {
                // For 2D ultimate: position (x,y) maps to sub-board at meta-position (x,y)
                const x = subBoardPos[0];
                const y = subBoardPos[1];
                nextSubBoard = y * 3 + x; // Convert 2D position to sub-board index (0-8)
            } else if (this.config.dimensions === 3) {
                // For 3D ultimate: use XZ position to determine next sub-board
                const x = subBoardPos[0];
                const z = subBoardPos[2];
                nextSubBoard = z * 3 + x; // Convert XZ position to sub-board index (0-8)
            } else {
                // For higher dimensions, use first two coordinates
                const x = subBoardPos[0] % 3;
                const y = subBoardPos[1] % 3;
                nextSubBoard = y * 3 + x;
            }
            
            // Ensure nextSubBoard is within valid range (0-8)
            nextSubBoard = Math.max(0, Math.min(8, nextSubBoard));
            
            // Set active sub-board for next player
            if (this.subBoardWinners[nextSubBoard] || this.isSubBoardFull(nextSubBoard)) {
                // If sent to completed sub-board, can play anywhere
                this.activeSubBoard = null;
            } else {
                this.activeSubBoard = nextSubBoard;
            }
        }
        
        // Update visual
        const cell = this.cellObjects.get(index);
        if (cell) {
            cell.userData.occupied = true;
            
            // Add mark
            const mark = this.create3DMark(this.currentPlayer);
            
            // For ultimate mode, position mark relative to cell within its group
            if (this.config.ultimateMode && this.subBoardGroups) {
                const subBoardIndex = this.getSubBoardIndex(index);
                mark.position.copy(cell.position);
                this.subBoardGroups[subBoardIndex].add(mark);
            } else {
                mark.position.copy(cell.position);
                this.scene.add(mark);
            }
            
            this.markObjects.set(index, mark);
            
            // Animate mark appearance
            mark.scale.set(0, 0, 0);
            this.animateScale(mark, { x: 1, y: 1, z: 1 }, 300);
        }
        
        // Update UI
        this.updateGameStatus();
        
        // Check for win in ultimate mode
        if (this.config.ultimateMode) {
            const subBoardIndex = this.getSubBoardIndex(index);
            const subBoardWinner = this.checkSubBoardWinner(subBoardIndex);
            
            if (subBoardWinner && !this.subBoardWinners[subBoardIndex]) {
                this.subBoardWinners[subBoardIndex] = subBoardWinner;
                // Update visual indicators will handle the win visualization
                this.updateSubBoardIndicators();
                
                // Check if this wins the overall game
                const overallWinner = this.checkUltimateWinner();
                if (overallWinner) {
                    this.handleWin(overallWinner);
                    return;
                }
            }
        }
        
        // Check for regular win
        const winner = this.checkWinner();
        if (winner) {
            this.handleWin(winner);
            return;
        }
        
        // Check for draw
        if (this.moveCount >= this.engine.totalCells || this.isGameDraw()) {
            this.handleDraw();
            return;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateGameStatus();
        
        // Update visual indicators for ultimate mode
        if (this.config.ultimateMode) {
            this.updateSubBoardIndicators();
        }
        
        // Make AI move if needed
        if (this.config.gameMode === 'vs-computer' && this.currentPlayer === 'O') {
            setTimeout(() => this.makeAIMove(), this.aiDelay);
        } else if (this.config.gameMode === 'ai-vs-ai') {
            setTimeout(() => this.makeAIMove(), this.aiDelay);
        }
    }
    
    /**
     * Checks if a sub-board is full
     * @param {number} subBoardIndex - The sub-board index (0-8)
     * @returns {boolean} Whether the sub-board is full
     */
    isSubBoardFull(subBoardIndex) {
        if (!this.config.ultimateMode) return false;
        
        const startIndex = subBoardIndex * this.engine.totalCells;
        const endIndex = startIndex + this.engine.totalCells;
        
        for (let i = startIndex; i < endIndex; i++) {
            if (!this.board[i]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Checks if the game is a draw
     * @returns {boolean} Whether the game is drawn
     */
    isGameDraw() {
        if (this.config.ultimateMode) {
            // In ultimate mode, game is draw if all 9 sub-boards are won/full
            // and no player has won the overall game
            for (let i = 0; i < 9; i++) {
                if (!this.subBoardWinners[i] && !this.isSubBoardFull(i)) {
                    return false;
                }
            }
            return !this.checkUltimateWinner();
        }
        return this.moveCount >= this.engine.totalCells;
    }
    
    /**
     * Checks for a winner in a specific sub-board
     * @param {number} subBoardIndex - The sub-board to check (0-8)
     * @returns {string|null} The winner ('X', 'O') or null
     */
    checkSubBoardWinner(subBoardIndex) {
        if (!this.config.ultimateMode) return null;
        
        const startIndex = subBoardIndex * this.engine.totalCells;
        
        // Check each winning combination within this sub-board
        for (const combination of this.engine.winningCombinations) {
            // Map local combination indices to global indices for this sub-board
            const globalCombination = combination.map(localIndex => startIndex + localIndex);
            const marks = globalCombination.map(globalIndex => this.board[globalIndex]);
            
            if (marks[0] && marks.every(mark => mark === marks[0])) {
                return marks[0];
            }
        }
        
        return null;
    }
    
    /**
     * Checks for a winner in the ultimate game (winning sub-boards in a row)
     * @returns {string|null} The winner ('X', 'O') or null
     */
    checkUltimateWinner() {
        if (!this.config.ultimateMode) return null;
        
        // Check for 3-in-a-row among the 9 sub-boards arranged in a 3x3 grid
        const winPatterns = [
            // Rows
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            // Columns  
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            // Diagonals
            [0, 4, 8], [2, 4, 6]
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.subBoardWinners[a] && 
                this.subBoardWinners[a] === this.subBoardWinners[b] && 
                this.subBoardWinners[a] === this.subBoardWinners[c]) {
                return this.subBoardWinners[a];
            }
        }
        
        return null;
    }
    
    
    checkWinner() {
        // In ultimate mode, we check for ultimate winner separately
        if (this.config.ultimateMode) {
            return this.checkUltimateWinner();
        }
        
        // Regular win checking for non-ultimate modes
        for (const combination of this.engine.winningCombinations) {
            const marks = combination.map(index => this.board[index]);
            
            if (marks[0] && marks.every(mark => mark === marks[0])) {
                this.winningCombination = combination;
                return marks[0];
            }
        }
        return null;
    }
    
    handleWin(winner) {
        this.isGameActive = false;
        const status = document.getElementById('game-status');
        status.textContent = `Player ${winner} Wins!`;
        status.style.background = winner === 'X' ? 
            'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';
        
        // Highlight winning combination
        this.highlightWinningCombination();
        
        // Celebration animation
        this.celebrateWin(winner);
    }
    
    handleDraw() {
        this.isGameActive = false;
        const status = document.getElementById('game-status');
        status.textContent = "It's a Draw!";
        status.style.background = 'rgba(255, 255, 0, 0.2)';
    }
    
    highlightWinningCombination() {
        if (!this.winningCombination) return;
        
        // Get positions of winning cells
        const positions = this.winningCombination.map(index => {
            const cell = this.cellObjects.get(index);
            return cell ? cell.position.clone() : null;
        }).filter(pos => pos !== null);
        
        if (positions.length < 2) return;
        
        // Create line geometry through winning positions
        const curve = new THREE.CatmullRomCurve3(positions);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({
            color: this.colors.win,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.winLineObjects.push(line);
        
        // Also make winning cells glow
        this.winningCombination.forEach(index => {
            const cell = this.cellObjects.get(index);
            if (cell) {
                cell.material.emissive = new THREE.Color(this.colors.win);
                cell.material.emissiveIntensity = 0.5;
                this.animateScale(cell, { x: 1.2, y: 1.2, z: 1.2 }, 500);
            }
        });
    }
    
    celebrateWin(winner) {
        // Create particle effect
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const color = new THREE.Color(winner === 'X' ? this.colors.X : this.colors.O);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 10;
            positions[i3 + 1] = (Math.random() - 0.5) * 10;
            positions[i3 + 2] = (Math.random() - 0.5) * 10;
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const particleSystem = new THREE.Points(particles, material);
        this.scene.add(particleSystem);
        
        // Animate particles
        const startTime = Date.now();
        const animateParticles = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > 3000) {
                this.scene.remove(particleSystem);
                return;
            }
            
            const positions = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.02;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.material.opacity = 0.8 * (1 - elapsed / 3000);
            
            requestAnimationFrame(animateParticles);
        };
        animateParticles();
    }
    
    makeAIMove() {
        if (!this.isGameActive) return;
        
        const move = this.calculateAIMove();
        if (move !== null) {
            this.makeMove(move);
        }
    }
    
    calculateAIMove() {
        // Get available moves
        const availableMoves = [];
        for (let i = 0; i < this.board.length; i++) {
            if (this.isCellPlayable(i)) {
                availableMoves.push(i);
            }
        }
        
        if (availableMoves.length === 0) return null;
        
        // Simple AI strategy with different difficulty levels
        switch (this.aiDifficulty) {
            case 'easy':
                // Random move
                return availableMoves[Math.floor(Math.random() * availableMoves.length)];
                
            case 'medium':
                // Try to win, block opponent, or take center/corners
                return this.calculateMediumAIMove(availableMoves);
                
            case 'hard':
                // Minimax algorithm (simplified for performance)
                return this.calculateHardAIMove(availableMoves);
                
            default:
                return this.calculateMediumAIMove(availableMoves);
        }
    }
    
    calculateMediumAIMove(availableMoves) {
        // Check if AI can win
        for (const move of availableMoves) {
            this.board[move] = this.currentPlayer;
            if (this.checkWinner() === this.currentPlayer) {
                this.board[move] = null;
                return move;
            }
            this.board[move] = null;
        }
        
        // Check if need to block opponent
        const opponent = this.currentPlayer === 'X' ? 'O' : 'X';
        for (const move of availableMoves) {
            this.board[move] = opponent;
            if (this.checkWinner() === opponent) {
                this.board[move] = null;
                return move;
            }
            this.board[move] = null;
        }
        
        // Prefer center and corners
        if (this.config.ultimateMode) {
            // For ultimate mode, look for center cells within each sub-board
            const centerMoves = availableMoves.filter(move => {
                const localIndex = move % this.engine.totalCells;
                const centerIndex = Math.floor(this.engine.totalCells / 2);
                return localIndex === centerIndex;
            });
            if (centerMoves.length > 0) {
                return centerMoves[Math.floor(Math.random() * centerMoves.length)];
            }
            
            // Try corners within sub-boards
            const cornerMoves = availableMoves.filter(move => {
                const localIndex = move % this.engine.totalCells;
                const coords = this.engine.indexToCoords(localIndex);
                return coords.every(c => c === 0 || c === this.config.size - 1);
            });
            if (cornerMoves.length > 0) {
                return cornerMoves[Math.floor(Math.random() * cornerMoves.length)];
            }
        } else {
            // Regular mode logic
            const centerIndex = Math.floor(this.engine.totalCells / 2);
            if (availableMoves.includes(centerIndex)) {
                return centerIndex;
            }
            
            // Try corners
            const cornerMoves = availableMoves.filter(move => {
                const coords = this.engine.indexToCoords(move);
                return coords.every(c => c === 0 || c === this.config.size - 1);
            });
            if (cornerMoves.length > 0) {
                return cornerMoves[Math.floor(Math.random() * cornerMoves.length)];
            }
        }
        
        // Random move
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    
    calculateHardAIMove(availableMoves) {
        // Simplified minimax for performance on large boards
        let bestScore = -Infinity;
        let bestMove = availableMoves[0];
        
        for (const move of availableMoves) {
            this.board[move] = this.currentPlayer;
            const score = this.minimax(0, false, -Infinity, Infinity, 3); // Limited depth
            this.board[move] = null;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    minimax(depth, isMaximizing, alpha, beta, maxDepth) {
        const winner = this.checkWinner();
        
        if (winner === this.currentPlayer) return 10 - depth;
        if (winner === (this.currentPlayer === 'X' ? 'O' : 'X')) return depth - 10;
        if (this.moveCount + depth >= this.board.length || depth >= maxDepth) return 0;
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            for (let i = 0; i < this.board.length; i++) {
                if (!this.board[i]) {
                    this.board[i] = this.currentPlayer;
                    const score = this.minimax(depth + 1, false, alpha, beta, maxDepth);
                    this.board[i] = null;
                    maxScore = Math.max(score, maxScore);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            const opponent = this.currentPlayer === 'X' ? 'O' : 'X';
            for (let i = 0; i < this.board.length; i++) {
                if (!this.board[i]) {
                    this.board[i] = opponent;
                    const score = this.minimax(depth + 1, true, alpha, beta, maxDepth);
                    this.board[i] = null;
                    minScore = Math.min(score, minScore);
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break;
                }
            }
            return minScore;
        }
    }
    
    updateDimensionSlice(dimension, slice) {
        if (dimension < 4 || dimension > this.config.dimensions) return;
        
        this.dimensionSlices[dimension - 4] = slice;
        
        // For 5D games, update visibility based on the slice
        if (this.config.dimensions === 5 && dimension === 5) {
            this.cellObjects.forEach((cell, index) => {
                const coords = this.engine.indexToCoords(index);
                const isVisible = this.isCellVisible(coords);
                
                cell.visible = isVisible;
                const mark = this.markObjects.get(index);
                if (mark) {
                    mark.visible = isVisible;
                }
            });
            
            // Update win lines visibility
            this.winLineObjects.forEach(line => {
                // Check if line is in visible slice
                line.visible = true; // For simplicity, keep all win lines visible
            });
        }
        
        // Update dimension labels
        this.addDimensionLabels();
    }
    
    updateDimensionLabels() {
        // Remove old labels
        const oldLabels = this.scene.children.filter(child => 
            child instanceof THREE.Sprite && child.material.map
        );
        oldLabels.forEach(label => this.scene.remove(label));
        
        // Add new labels
        this.addDimensionLabels();
    }
    
    updateGameStatus() {
        const status = document.getElementById('game-status');
        const moveCountEl = document.getElementById('move-count');
        
        if (this.isGameActive) {
            let playerName = `Player ${this.currentPlayer}`;
            if (this.config.gameMode === 'vs-computer') {
                playerName = this.currentPlayer === 'X' ? 'Your' : "Computer's";
            } else if (this.config.gameMode === 'ai-vs-ai') {
                playerName = `AI ${this.currentPlayer}'s`;
            }
            
            let statusText = `${playerName} Turn`;
            
            // Add sub-board info for ultimate mode
            if (this.config.ultimateMode) {
                if (this.activeSubBoard !== null) {
                    statusText += ` - Must play in sub-board ${this.activeSubBoard + 1}`;
                } else {
                    statusText += ` - Can play in any open sub-board`;
                }
            }
            
            status.textContent = statusText;
        }
        
        moveCountEl.textContent = `Moves: ${this.moveCount}`;
    }
    
    resetView() {
        const boardSize = this.calculateBoardSize();
        const cameraDistance = boardSize * 2;
        
        this.camera.position.set(cameraDistance, cameraDistance, cameraDistance);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        this.controls.autoRotate = this.autoRotate;
        
        const button = document.getElementById('auto-rotate');
        button.textContent = this.autoRotate ? 'Stop Rotation' : 'Auto Rotate';
    }
    
    togglePerspective() {
        this.isOrthographic = !this.isOrthographic;
        
        if (this.isOrthographic) {
            const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = this.calculateBoardSize() * 3;
            
            this.camera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                frustumSize / -2,
                0.1,
                1000
            );
        } else {
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
        }
        
        this.resetView();
        this.controls.object = this.camera;
        
        const button = document.getElementById('perspective-toggle');
        button.textContent = this.isOrthographic ? 'Perspective View' : 'Orthographic View';
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight - 80; // Account for game UI
        
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = width / height;
        } else {
            const aspect = width / height;
            const frustumSize = this.calculateBoardSize() * 3;
            this.camera.left = frustumSize * aspect / -2;
            this.camera.right = frustumSize * aspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = frustumSize / -2;
        }
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animateScale(object, targetScale, duration) {
        const startScale = {
            x: object.scale.x,
            y: object.scale.y,
            z: object.scale.z
        };
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            object.scale.x = startScale.x + (targetScale.x - startScale.x) * easeProgress;
            object.scale.y = startScale.y + (targetScale.y - startScale.y) * easeProgress;
            object.scale.z = startScale.z + (targetScale.z - startScale.z) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Update sub-board indicators animation
        if (this.config.ultimateMode && this.activeSubBoard !== null) {
            this.updateSubBoardIndicators();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        // Clean up Three.js resources
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        this.controls.dispose();
        
        // Remove renderer from DOM
        const container = document.getElementById('game-container');
        if (container && this.renderer.domElement.parentElement === container) {
            container.removeChild(this.renderer.domElement);
        }
    }
}

// Initialize game when called from HTML
function initializeNDGame(config) {
    // Clean up any existing game instance
    if (window.gameInstance) {
        window.gameInstance.dispose();
    }
    
    // Create new game instance
    window.gameInstance = new NDTicTacToe(config);
    
    // Update UI based on game mode
    const status = document.getElementById('game-status');
    if (config.gameMode === 'vs-computer') {
        status.textContent = 'Your Turn (X)';
    } else if (config.gameMode === 'two-players') {
        status.textContent = 'Player X\'s Turn';
    } else if (config.gameMode === 'ai-vs-ai') {
        status.textContent = 'AI Battle Started!';
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NDTicTacToe, initializeNDGame };
}

// Export to window for browser usage
window.NDTicTacToe = NDTicTacToe;
window.initializeNDGame = initializeNDGame;