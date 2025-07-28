# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a web-based Tic-Tac-Toe game collection featuring multiple game variants with 3D graphics using Three.js. The project is a pure frontend application with no build process required.

## Architecture
- **index.html** - Main entry point with game mode selection
- **game.js** - Classic 2D Tic-Tac-Toe logic and AI
- **ultimate.html/js/css** - Ultimate Tic-Tac-Toe (9 mini-boards)
- **tictactoe3d.html/js** - 3D Tic-Tac-Toe (3x3x3 cube)
- **ultimate3d.html/js** - Ultimate 3D variant (9 cubes)
- **nd-engine.js** - N-dimensional game engine (in development)

## Key Implementation Details
- Uses minimax algorithm for AI opponents
- Three.js for 3D rendering with WebGL
- No external dependencies except Three.js (loaded from CDN)
- Each game variant has its own HTML file that can run standalone

## Development Commands
```bash
# No build process needed - just open HTML files in browser
# For local development with live reload:
python3 -m http.server 8000
# or
npx serve .
```

## GitHub Pages Deployment
The project structure is already compatible with GitHub Pages:
1. Enable GitHub Pages in repository settings
2. Select source branch (usually main)
3. The site will be available at: https://[username].github.io/tictactoo/