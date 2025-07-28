// Ultimate Tic-Tac-Toe Game Logic
class UltimateTicTacToe {
    constructor() {
        // Game state: 9 boards, each with 9 cells
        this.boards = Array(9).fill(null).map(() => Array(9).fill(null));
        
        // Track which boards are won and by whom
        this.boardWinners = Array(9).fill(null);
        
        // Track which board is active (-1 means any board)
        this.activeBoard = -1;
        
        // Current player
        this.currentPlayer = 'X';
        
        // Game winner
        this.gameWinner = null;
        
        // Game mode: 'single' or 'two'
        this.gameMode = 'two';
        
        // Score tracking
        this.scores = {
            X: 0,
            O: 0,
            draws: 0
        };
        
        // Move history for AI analysis
        this.moveHistory = [];
        
        // Initialize UI
        this.initializeUI();
    }
    
    initializeUI() {
        // Create the game container
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.innerHTML = '';
        container.className = 'ultimate-container';
        
        // Create the main game board
        const gameBoard = document.createElement('div');
        gameBoard.className = 'ultimate-board';
        
        // Create 9 mini-boards
        for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
            const miniBoard = document.createElement('div');
            miniBoard.className = 'mini-board';
            miniBoard.dataset.board = boardIndex;
            
            // Add active class if this is the active board
            if (this.activeBoard === boardIndex || this.activeBoard === -1) {
                miniBoard.classList.add('active');
            }
            
            // Add won class if board is won
            if (this.boardWinners[boardIndex]) {
                miniBoard.classList.add('won', `won-${this.boardWinners[boardIndex]}`);
            }
            
            // Create 9 cells for each mini-board
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                const cell = document.createElement('div');
                cell.className = 'ultimate-cell';
                cell.dataset.board = boardIndex;
                cell.dataset.cell = cellIndex;
                
                // Add content if cell has a value
                if (this.boards[boardIndex][cellIndex]) {
                    cell.textContent = this.boards[boardIndex][cellIndex];
                    cell.classList.add('marked', this.boards[boardIndex][cellIndex].toLowerCase());
                }
                
                // Add click handler
                cell.addEventListener('click', () => this.handleCellClick(boardIndex, cellIndex));
                
                miniBoard.appendChild(cell);
            }
            
            // Add board winner overlay if board is won
            if (this.boardWinners[boardIndex]) {
                const overlay = document.createElement('div');
                overlay.className = 'board-winner-overlay';
                overlay.textContent = this.boardWinners[boardIndex];
                miniBoard.appendChild(overlay);
            }
            
            gameBoard.appendChild(miniBoard);
        }
        
        container.appendChild(gameBoard);
        
        // Update status display
        this.updateStatus();
    }
    
    handleCellClick(boardIndex, cellIndex) {
        // Check if game is over
        if (this.gameWinner) return;
        
        // Check if it's a valid move
        if (!this.isValidMove(boardIndex, cellIndex)) return;
        
        // Make the move
        this.makeMove(boardIndex, cellIndex);
        
        // Handle AI move if in single player mode
        if (this.gameMode === 'single' && this.currentPlayer === 'O' && !this.gameWinner) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }
    
    isValidMove(boardIndex, cellIndex) {
        // Check if cell is already taken
        if (this.boards[boardIndex][cellIndex]) return false;
        
        // Check if board is already won
        if (this.boardWinners[boardIndex]) return false;
        
        // Check if move is in the active board
        if (this.activeBoard !== -1 && this.activeBoard !== boardIndex) return false;
        
        return true;
    }
    
    makeMove(boardIndex, cellIndex) {
        // Place the move
        this.boards[boardIndex][cellIndex] = this.currentPlayer;
        
        // Update the cell display immediately
        const cell = document.querySelector(`[data-board="${boardIndex}"][data-cell="${cellIndex}"]`);
        if (cell) {
            cell.textContent = this.currentPlayer;
            cell.classList.add('marked', this.currentPlayer.toLowerCase());
        }
        
        // Add to move history
        this.moveHistory.push({ board: boardIndex, cell: cellIndex, player: this.currentPlayer });
        
        // Check if this wins the mini-board
        if (this.checkBoardWin(boardIndex)) {
            this.boardWinners[boardIndex] = this.currentPlayer;
            
            // Check if this wins the game
            if (this.checkGameWin()) {
                this.gameWinner = this.currentPlayer;
                this.scores[this.currentPlayer]++;
                this.updateStatus();
                this.initializeUI();
                return;
            }
        }
        
        // Check for draw
        if (this.checkGameDraw()) {
            this.gameWinner = 'draw';
            this.scores.draws++;
            this.updateStatus();
            this.initializeUI();
            return;
        }
        
        // Determine next active board
        this.setNextActiveBoard(cellIndex);
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        // Update UI
        this.initializeUI();
    }
    
    setNextActiveBoard(cellIndex) {
        // The next board is determined by the cell position
        const nextBoard = cellIndex;
        
        // Check if the board is playable
        if (this.boardWinners[nextBoard] || this.isBoardFull(nextBoard)) {
            // Player can play anywhere
            this.activeBoard = -1;
        } else {
            this.activeBoard = nextBoard;
        }
    }
    
    isBoardFull(boardIndex) {
        return this.boards[boardIndex].every(cell => cell !== null);
    }
    
    checkBoardWin(boardIndex) {
        const board = this.boards[boardIndex];
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return true;
            }
        }
        
        return false;
    }
    
    checkGameWin() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.boardWinners[a] && 
                this.boardWinners[a] === this.boardWinners[b] && 
                this.boardWinners[a] === this.boardWinners[c]) {
                return true;
            }
        }
        
        return false;
    }
    
    checkGameDraw() {
        // Game is a draw if all boards are either won or full
        for (let i = 0; i < 9; i++) {
            if (!this.boardWinners[i] && !this.isBoardFull(i)) {
                return false;
            }
        }
        return true;
    }
    
    makeAIMove() {
        // Get all valid moves
        const validMoves = this.getValidMoves();
        
        if (validMoves.length === 0) return;
        
        // Use a simplified strategy
        let bestMove = null;
        
        // 1. Try to win a board that would win the game
        bestMove = this.findWinningGameMove(validMoves);
        if (bestMove) {
            this.makeMove(bestMove.board, bestMove.cell);
            return;
        }
        
        // 2. Block opponent from winning the game
        bestMove = this.findBlockingGameMove(validMoves);
        if (bestMove) {
            this.makeMove(bestMove.board, bestMove.cell);
            return;
        }
        
        // 3. Try to win any board
        bestMove = this.findWinningBoardMove(validMoves);
        if (bestMove) {
            this.makeMove(bestMove.board, bestMove.cell);
            return;
        }
        
        // 4. Block opponent from winning a board
        bestMove = this.findBlockingBoardMove(validMoves);
        if (bestMove) {
            this.makeMove(bestMove.board, bestMove.cell);
            return;
        }
        
        // 5. Prefer center cells and avoid sending opponent to won boards
        bestMove = this.findStrategicMove(validMoves);
        if (bestMove) {
            this.makeMove(bestMove.board, bestMove.cell);
            return;
        }
        
        // 6. Random move as fallback
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        this.makeMove(randomMove.board, randomMove.cell);
    }
    
    getValidMoves() {
        const moves = [];
        
        for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
            // Skip if not the active board (unless any board is active)
            if (this.activeBoard !== -1 && this.activeBoard !== boardIndex) continue;
            
            // Skip won boards
            if (this.boardWinners[boardIndex]) continue;
            
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                if (!this.boards[boardIndex][cellIndex]) {
                    moves.push({ board: boardIndex, cell: cellIndex });
                }
            }
        }
        
        return moves;
    }
    
    findWinningGameMove(moves) {
        // Check if any move would win a board that wins the game
        for (const move of moves) {
            // Simulate the move
            this.boards[move.board][move.cell] = 'O';
            
            // Check if this wins the board
            if (this.checkBoardWin(move.board)) {
                // Temporarily mark board as won
                const oldWinner = this.boardWinners[move.board];
                this.boardWinners[move.board] = 'O';
                
                // Check if this wins the game
                const winsGame = this.checkGameWin();
                
                // Restore state
                this.boardWinners[move.board] = oldWinner;
                this.boards[move.board][move.cell] = null;
                
                if (winsGame) return move;
            } else {
                this.boards[move.board][move.cell] = null;
            }
        }
        
        return null;
    }
    
    findBlockingGameMove(moves) {
        // Check if opponent could win the game with their next move
        for (const move of moves) {
            // Simulate opponent's move
            this.boards[move.board][move.cell] = 'X';
            
            // Check if this wins the board for opponent
            if (this.checkBoardWin(move.board)) {
                // Temporarily mark board as won by opponent
                const oldWinner = this.boardWinners[move.board];
                this.boardWinners[move.board] = 'X';
                
                // Check if this wins the game for opponent
                const winsGame = this.checkGameWin();
                
                // Restore state
                this.boardWinners[move.board] = oldWinner;
                this.boards[move.board][move.cell] = null;
                
                if (winsGame) return move;
            } else {
                this.boards[move.board][move.cell] = null;
            }
        }
        
        return null;
    }
    
    findWinningBoardMove(moves) {
        // Find a move that wins any board
        for (const move of moves) {
            this.boards[move.board][move.cell] = 'O';
            const wins = this.checkBoardWin(move.board);
            this.boards[move.board][move.cell] = null;
            
            if (wins) return move;
        }
        
        return null;
    }
    
    findBlockingBoardMove(moves) {
        // Find a move that blocks opponent from winning a board
        for (const move of moves) {
            this.boards[move.board][move.cell] = 'X';
            const wins = this.checkBoardWin(move.board);
            this.boards[move.board][move.cell] = null;
            
            if (wins) return move;
        }
        
        return null;
    }
    
    findStrategicMove(moves) {
        // Score each move based on strategic value
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            let score = 0;
            
            // Prefer center of boards (cell 4)
            if (move.cell === 4) score += 3;
            
            // Prefer corners (cells 0, 2, 6, 8)
            if ([0, 2, 6, 8].includes(move.cell)) score += 2;
            
            // Avoid sending opponent to a board they can win
            const nextBoard = move.cell;
            if (nextBoard < 9 && !this.boardWinners[nextBoard] && !this.isBoardFull(nextBoard)) {
                // Check if opponent could win that board
                let opponentCanWin = false;
                for (let i = 0; i < 9; i++) {
                    if (!this.boards[nextBoard][i]) {
                        this.boards[nextBoard][i] = 'X';
                        if (this.checkBoardWin(nextBoard)) {
                            opponentCanWin = true;
                        }
                        this.boards[nextBoard][i] = null;
                        if (opponentCanWin) break;
                    }
                }
                if (opponentCanWin) score -= 5;
            }
            
            // Prefer boards that are strategically important for the meta-game
            if ([4].includes(move.board)) score += 2; // Center board
            if ([0, 2, 6, 8].includes(move.board)) score += 1; // Corner boards
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    updateStatus() {
        const statusElement = document.getElementById('status');
        if (!statusElement) return;
        
        if (this.gameWinner) {
            if (this.gameWinner === 'draw') {
                statusElement.textContent = "Game Draw!";
            } else {
                statusElement.textContent = `Player ${this.gameWinner} Wins!`;
            }
        } else {
            statusElement.textContent = `Player ${this.currentPlayer}'s Turn`;
            if (this.activeBoard !== -1) {
                statusElement.textContent += ` (Board ${this.activeBoard + 1})`;
            } else {
                statusElement.textContent += ' (Any Board)';
            }
        }
        
        // Update scores
        this.updateScores();
    }
    
    updateScores() {
        const scoresElement = document.getElementById('scores');
        if (!scoresElement) return;
        
        scoresElement.innerHTML = `
            <div class="score-item">Player X: ${this.scores.X}</div>
            <div class="score-item">Player O: ${this.scores.O}</div>
            <div class="score-item">Draws: ${this.scores.draws}</div>
        `;
    }
    
    reset() {
        // Reset game state
        this.boards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.boardWinners = Array(9).fill(null);
        this.activeBoard = -1;
        this.currentPlayer = 'X';
        this.gameWinner = null;
        this.moveHistory = [];
        
        // Reinitialize UI
        this.initializeUI();
    }
    
    setGameMode(mode) {
        this.gameMode = mode;
        this.reset();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ultimateGame = new UltimateTicTacToe();
    
    // Add event listeners for controls
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => window.ultimateGame.reset());
    }
    
    const singlePlayerBtn = document.getElementById('single-player-btn');
    if (singlePlayerBtn) {
        singlePlayerBtn.addEventListener('click', () => {
            window.ultimateGame.setGameMode('single');
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            singlePlayerBtn.classList.add('active');
        });
    }
    
    const twoPlayerBtn = document.getElementById('two-player-btn');
    if (twoPlayerBtn) {
        twoPlayerBtn.addEventListener('click', () => {
            window.ultimateGame.setGameMode('two');
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            twoPlayerBtn.classList.add('active');
        });
    }
});

// CSS styles for Ultimate Tic-Tac-Toe
const ultimateStyles = `
<style>
.ultimate-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
}

.ultimate-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 15px;
    background-color: #333;
    padding: 15px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.mini-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 3px;
    background-color: #222;
    padding: 5px;
    border-radius: 5px;
    position: relative;
    transition: all 0.3s ease;
}

.mini-board.active {
    background-color: #2a4d3a;
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.mini-board.won {
    opacity: 0.7;
}

.cell {
    width: 40px;
    height: 40px;
    background-color: #444;
    border: none;
    border-radius: 3px;
    font-size: 24px;
    font-weight: bold;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.cell:hover:not(.taken) {
    background-color: #555;
    transform: scale(1.05);
}

.cell.taken {
    cursor: not-allowed;
    background-color: #333;
}

.board-winner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.8);
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 5px;
    pointer-events: none;
}

.mini-board.won-X .board-winner-overlay {
    color: #4CAF50;
}

.mini-board.won-O .board-winner-overlay {
    color: #2196F3;
}

#status {
    font-size: 24px;
    margin: 20px 0;
    font-weight: bold;
    color: #fff;
}

#scores {
    display: flex;
    gap: 20px;
    margin: 10px 0;
}

.score-item {
    font-size: 18px;
    color: #fff;
    padding: 5px 10px;
    background-color: #333;
    border-radius: 5px;
}

.controls {
    display: flex;
    gap: 10px;
    margin: 20px 0;
}

.mode-btn, #reset-btn {
    padding: 10px 20px;
    font-size: 16px;
    background-color: #444;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mode-btn:hover, #reset-btn:hover {
    background-color: #555;
    transform: translateY(-2px);
}

.mode-btn.active {
    background-color: #4CAF50;
}
</style>
`;

// Add styles to the document if not already present
if (!document.getElementById('ultimate-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'ultimate-styles';
    styleElement.innerHTML = ultimateStyles;
    document.head.appendChild(styleElement.firstElementChild);
}