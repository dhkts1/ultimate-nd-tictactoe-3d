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
        
        // Dimension slicing for 4D+ games
        this.dimensionSlices = new Array(Math.max(0, config.dimensions - 3)).fill(0);
        
        // Visual elements
        this.cellObjects = new Map();
        this.markObjects = new Map();
        this.winLineObjects = [];
        
        // Colors and materials
        this.colors = {
            X: 0x00ff00,
            O: 0xff0000,
            cell: [0x667eea, 0x764ba2, 0x8b5cf6, 0xf093fb, 0xfa709a],
            hover: 0xffd700,
            win: 0xffffff
        };
        
        // AI settings
        this.aiDifficulty = config.gameMode === 'vs-computer' ? 'medium' : null;
        this.aiDelay = 500;
        
        this.init();
    }
    
    init() {
        console.log('Initializing NDTicTacToe with config:', this.config);
        
        // Create dimension array for engine
        const dimensions = new Array(this.config.dimensions).fill(this.config.size);
        if (this.config.ultimateMode) {
            dimensions.unshift(this.config.size); // Add extra dimension for ultimate mode
        }
        
        console.log('Creating NDEngine with dimensions:', dimensions);
        this.engine = new NDEngine(dimensions);
        console.log('Engine created:', this.engine);
        this.board = new Array(this.engine.totalCells).fill(null);
        
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
        
        // Create cells
        for (let i = 0; i < this.engine.totalCells; i++) {
            const coords = this.engine.indexToCoords(i);
            
            // Check if cell should be visible based on dimension slices
            if (!this.isCellVisible(coords)) continue;
            
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
        
        // Add dimension labels if needed
        if (this.config.dimensions > 3) {
            this.addDimensionLabels();
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
    
    mapToVisualSpace(coords) {
        const spacing = 1.2;
        const position = new THREE.Vector3();
        
        // Map first 3 dimensions directly to x, y, z
        const visualDims = Math.min(this.config.dimensions, 3);
        
        if (visualDims >= 1) {
            position.x = (coords[0] - (this.config.size - 1) / 2) * spacing;
        }
        if (visualDims >= 2) {
            position.y = (coords[1] - (this.config.size - 1) / 2) * spacing;
        }
        if (visualDims >= 3) {
            position.z = (coords[2] - (this.config.size - 1) / 2) * spacing;
        }
        
        // For dimensions > 3, apply offset based on higher dimension values
        if (this.config.dimensions > 3) {
            const offset = new THREE.Vector3();
            for (let d = 3; d < this.config.dimensions; d++) {
                const dimOffset = (coords[d] - this.dimensionSlices[d - 3]) * spacing * 3;
                // Distribute higher dimensions in a spiral pattern
                const angle = (d - 3) * Math.PI / 2;
                offset.x += dimOffset * Math.cos(angle);
                offset.z += dimOffset * Math.sin(angle);
            }
            position.add(offset);
        }
        
        return position;
    }
    
    isCellVisible(coords) {
        // For dimensions > 3, check if cell is in current slice
        if (this.config.dimensions <= 3) return true;
        
        for (let d = 3; d < this.config.dimensions; d++) {
            if (coords[d] !== this.dimensionSlices[d - 3]) {
                return false;
            }
        }
        return true;
    }
    
    createGridHelper() {
        const size = this.config.size * 1.2;
        const divisions = this.config.size;
        
        // Create grid planes for each visible dimension pair
        const gridColor = 0x444444;
        
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
    }
    
    addDimensionLabels() {
        // Add labels for higher dimensions
        const labelSprites = [];
        
        for (let d = 4; d <= this.config.dimensions; d++) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const context = canvas.getContext('2d');
            
            context.font = 'Bold 30px Arial';
            context.fillStyle = '#667eea';
            context.textAlign = 'center';
            context.fillText(`Dimension ${d}: ${this.dimensionSlices[d - 4] + 1}`, 128, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true 
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(0, this.config.size * 1.5 + (d - 4) * 0.8, 0);
            sprite.scale.set(4, 1, 1);
            
            this.scene.add(sprite);
            labelSprites.push(sprite);
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
            if (!cell.userData.occupied) {
                this.hoveredCell = cell.userData.index;
                cell.material.emissiveIntensity = 0.3;
                cell.scale.set(1.1, 1.1, 1.1);
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.renderer.domElement.style.cursor = 'not-allowed';
            }
        } else {
            this.hoveredCell = null;
            this.renderer.domElement.style.cursor = 'default';
        }
    }
    
    onMouseClick(event) {
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
            
            if (!this.board[index]) {
                this.makeMove(index);
            }
        }
    }
    
    makeMove(index) {
        if (!this.isGameActive || this.board[index]) return;
        
        // Update board state
        this.board[index] = this.currentPlayer;
        this.moveCount++;
        
        // Update visual
        const cell = this.cellObjects.get(index);
        if (cell) {
            cell.userData.occupied = true;
            
            // Add mark
            const mark = this.create3DMark(this.currentPlayer);
            mark.position.copy(cell.position);
            this.scene.add(mark);
            this.markObjects.set(index, mark);
            
            // Animate mark appearance
            mark.scale.set(0, 0, 0);
            this.animateScale(mark, { x: 1, y: 1, z: 1 }, 300);
        }
        
        // Update UI
        this.updateGameStatus();
        
        // Check for win
        const winner = this.checkWinner();
        if (winner) {
            this.handleWin(winner);
            return;
        }
        
        // Check for draw
        if (this.moveCount >= this.engine.totalCells) {
            this.handleDraw();
            return;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateGameStatus();
        
        // Make AI move if needed
        if (this.config.gameMode === 'vs-computer' && this.currentPlayer === 'O') {
            setTimeout(() => this.makeAIMove(), this.aiDelay);
        } else if (this.config.gameMode === 'ai-vs-ai') {
            setTimeout(() => this.makeAIMove(), this.aiDelay);
        }
    }
    
    checkWinner() {
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
            if (!this.board[i]) {
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
        if (this.moveCount + depth >= this.engine.totalCells || depth >= maxDepth) return 0;
        
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
        
        // Update visibility of cells
        this.cellObjects.forEach((cell, index) => {
            const coords = this.engine.indexToCoords(index);
            const isVisible = this.isCellVisible(coords);
            
            cell.visible = isVisible;
            const mark = this.markObjects.get(index);
            if (mark) {
                mark.visible = isVisible;
            }
        });
        
        // Update dimension labels
        this.updateDimensionLabels();
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
            status.textContent = `${playerName} Turn`;
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