let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let isGameActive = true;
let player1Score = 0;
let player2Score = 0;
let gameMode = 'single'; // 'single' or 'two'

const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const statusElement = document.getElementById('status');
const player1ScoreElement = document.getElementById('player1-score');
const player2ScoreElement = document.getElementById('player2-score');
const player1LabelElement = document.getElementById('player1-label');
const player2LabelElement = document.getElementById('player2-label');
const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-btn');
const changeModeButton = document.getElementById('change-mode-btn');
const modeSelection = document.getElementById('mode-selection');
const gameInfo = document.getElementById('game-info');
const gameControls = document.getElementById('game-controls');
const modeBtns = document.querySelectorAll('.mode-btn');
const cells = document.querySelectorAll('.cell');

function isValidMove(index) {
    return board[index] === '' && isGameActive;
}

function makeMove(index, player) {
    board[index] = player;
    updateCellUI(index, player);
}

function updateCellUI(index, player) {
    const cell = cells[index];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
    cell.classList.add('disabled');
}

function checkWinner() {
    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return {
                winner: board[a],
                winningCells: combination
            };
        }
    }
    return { winner: null, winningCells: [] };
}

function checkDraw() {
    return board.every(cell => cell !== '') && !checkWinner().winner;
}

function handleGameOver(winner, winningCells) {
    isGameActive = false;
    
    if (winner) {
        if (gameMode === 'single') {
            if (winner === 'X') {
                statusElement.textContent = 'You win! 🎉';
                player1Score++;
                player1ScoreElement.textContent = player1Score;
            } else {
                statusElement.textContent = 'Computer wins! 🤖';
                player2Score++;
                player2ScoreElement.textContent = player2Score;
            }
        } else { // two player mode
            if (winner === 'X') {
                statusElement.textContent = 'Player 1 wins! 🎉';
                player1Score++;
                player1ScoreElement.textContent = player1Score;
            } else {
                statusElement.textContent = 'Player 2 wins! 🎉';
                player2Score++;
                player2ScoreElement.textContent = player2Score;
            }
        }
        
        winningCells.forEach(index => {
            cells[index].classList.add('winner');
        });
    } else {
        statusElement.textContent = "It's a draw! 🤝";
    }
    
    cells.forEach(cell => cell.classList.add('disabled'));
}

function evaluate() {
    const { winner } = checkWinner();
    if (winner === 'O') return 10;
    if (winner === 'X') return -10;
    if (checkDraw()) return 0;
    return null;
}

function minimax(board, depth, isMaximizing) {
    const score = evaluate();
    
    if (score !== null) {
        return score;
    }
    
    if (isMaximizing) {
        let maxScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'O';
                const score = minimax(board, depth + 1, false);
                board[i] = '';
                maxScore = Math.max(score, maxScore);
            }
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'X';
                const score = minimax(board, depth + 1, true);
                board[i] = '';
                minScore = Math.min(score, minScore);
            }
        }
        return minScore;
    }
}

function findBestMove() {
    let bestMove = -1;
    let bestScore = -Infinity;
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            const score = minimax(board, 0, false);
            board[i] = '';
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    return bestMove;
}

function computerMove() {
    if (!isGameActive) return;
    
    statusElement.textContent = 'Computer is thinking...';
    
    setTimeout(() => {
        const bestMove = findBestMove();
        if (bestMove !== -1) {
            makeMove(bestMove, 'O');
            
            const { winner, winningCells } = checkWinner();
            if (winner || checkDraw()) {
                handleGameOver(winner, winningCells);
            } else {
                currentPlayer = 'X';
                statusElement.textContent = 'Your turn (X)';
            }
        }
    }, 500);
}

function handleCellClick(e) {
    const index = parseInt(e.target.dataset.index);
    
    if (!isValidMove(index)) return;
    
    makeMove(index, currentPlayer);
    
    const { winner, winningCells } = checkWinner();
    if (winner || checkDraw()) {
        handleGameOver(winner, winningCells);
    } else {
        if (gameMode === 'single') {
            currentPlayer = 'O';
            statusElement.textContent = "Computer's turn (O)";
            computerMove();
        } else { // two player mode
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            const playerNum = currentPlayer === 'X' ? '1' : '2';
            statusElement.textContent = `Player ${playerNum}'s turn (${currentPlayer})`;
        }
    }
}

function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    isGameActive = true;
    
    if (gameMode === 'single') {
        statusElement.textContent = 'Your turn (X)';
    } else {
        statusElement.textContent = "Player 1's turn (X)";
    }
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'winner', 'disabled');
    });
}

function selectMode(mode) {
    gameMode = mode;
    
    // Update UI
    modeSelection.style.display = 'none';
    gameInfo.style.display = 'block';
    boardElement.style.display = 'grid';
    gameControls.style.display = 'flex';
    
    // Update labels
    if (mode === 'single') {
        player1LabelElement.textContent = 'You';
        player2LabelElement.textContent = 'Computer';
        statusElement.textContent = 'Your turn (X)';
    } else {
        player1LabelElement.textContent = 'Player 1 (X)';
        player2LabelElement.textContent = 'Player 2 (O)';
        statusElement.textContent = "Player 1's turn (X)";
    }
    
    // Reset scores when changing mode
    player1Score = 0;
    player2Score = 0;
    player1ScoreElement.textContent = '0';
    player2ScoreElement.textContent = '0';
    
    resetGame();
}

function changeMode() {
    // Show mode selection, hide game
    modeSelection.style.display = 'block';
    gameInfo.style.display = 'none';
    boardElement.style.display = 'none';
    gameControls.style.display = 'none';
    
    resetGame();
}

// Event listeners
cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

resetButton.addEventListener('click', resetGame);
changeModeButton.addEventListener('click', changeMode);

modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        if (mode === 'ultimate') {
            window.location.href = 'ultimate.html';
        } else if (mode === '3d') {
            window.location.href = 'tictactoe3d.html';
        } else if (mode === 'ultimate3d') {
            window.location.href = 'ultimate3d.html';
        } else {
            selectMode(mode);
        }
    });
});