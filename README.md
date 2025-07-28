# Ultimate N-Dimensional Tic-Tac-Toe 3D

A comprehensive collection of Tic-Tac-Toe game variants with beautiful 3D graphics and AI opponents, now featuring true N-dimensional gameplay!

## Features

- **Classic 2D Tic-Tac-Toe** - Traditional game with unbeatable minimax AI
- **Ultimate Tic-Tac-Toe** - 9 mini-boards with strategic gameplay (must win 3 sub-boards in a row to win overall)
- **3D Tic-Tac-Toe** - Full 3x3x3 cube with 76 winning combinations
- **Ultimate 3D** - 9 cubes of 3x3x3 (243 total cells!) - must win 3 sub-cubes in a row to win overall
- **N-Dimensional Tic-Tac-Toe** - Play in 2D, 3D, 4D, or even 5D with intuitive visualization

## Game Modes

- **vs Computer** - Play against an intelligent AI opponent
- **2 Players** - Local multiplayer on the same device
- **Computer vs Computer** - Watch AI battle it out

## Technologies

- Three.js for 3D graphics
- Pure JavaScript for game logic
- Minimax algorithm for AI
- WebGL rendering with shadows and effects

## How to Play

1. Open `index.html` in a modern web browser
2. Select your preferred game variant
3. For N-Dimensional games:
   - Open `tictactoe-nd.html`
   - Choose dimensions (2-5) and board size (3-5)
   - Enable Ultimate mode for strategic meta-game play (must win 3 sub-boards in a row)
4. Choose game mode (vs Computer, 2 Players, AI vs AI)
5. Click cells to make moves
6. In 3D modes: drag to rotate, scroll to zoom
7. In 4D+: use dimension controls to navigate

## Controls

- **Click** - Make a move
- **Drag** - Rotate 3D view
- **Scroll** - Zoom in/out
- **Minimap** - Quick navigation in Ultimate 3D

## N-Dimensional Features

### 4D Visualization
- **Nested Cube Structure**: 3×3×3 arrangement of outer cubes, each containing cells from the 4th dimension
- Each outer cube has its own colored wireframe boundary showing the structure
- Clear labels showing outer cube coordinates
- True hypercube visualization - cubes within cubes

### 5D Visualization
- 3D cubes arranged in a 2D grid (3x3 for default size)
- First extra dimension determines row position
- Second extra dimension determines column position
- Slider to filter and view specific "planes" of the 5D space
- Minimap overview showing all dimensions at once

### Enhanced Visual Features
- Colored outlines for each sub-cube in higher dimensions
- Dimension labels clearly showing current view
- Smooth transitions and animations
- Minimap for overview navigation

## Coming Soon

- Even higher dimensions (6D+)
- Difficulty levels for AI
- Online multiplayer
- Custom winning line lengths

## License

MIT