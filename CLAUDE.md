# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a web-based Tic-Tac-Toe game collection featuring multiple game variants with 3D graphics using Three.js. The project is a pure frontend application with no build process required.

## Architecture
- **index.html** - Main entry point with game mode selection
- **game.js** - Classic 2D Tic-Tac-Toe logic and AI
- **ultimate.html/js** - Ultimate Tic-Tac-Toe (9 mini-boards)
- **tictactoe3d.html/js** - 3D Tic-Tac-Toe (3x3x3 cube)
- **ultimate3d.html/js** - Ultimate 3D variant (27 cubes in 3x3x3 structure)
- **nd-engine.js** - N-dimensional game engine (in development)

## Key Implementation Details
- Uses minimax algorithm for AI opponents in 2D variant
- Strategic AI with multi-level decision making for 3D variants (game-winning → game-blocking → cube-winning → cube-blocking → strategic positioning)
- Three.js for 3D rendering with WebGL and OrbitControls
- No external dependencies except Three.js (loaded from CDN)
- Each game variant has its own HTML file that can run standalone
- Winning combinations: 2D (8), 3D single cube (76), Ultimate 3D meta-game (49)

## Game Logic Patterns
- State management follows `makeMove() → updateGameState() → checkWinner() → updateUI() → switchPlayer()` pattern
- Ultimate variants use `activeCubes` to track where next move must be played
- 3D rendering uses emissive materials for X/O marks with glow effects

## Development Commands
```bash
# No build process needed - just open HTML files directly in browser
# For local development with live reload:
npx serve .
```