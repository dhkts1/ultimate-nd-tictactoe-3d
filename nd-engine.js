/**
 * N-Dimensional Tic-Tac-Toe Game Engine
 * Supports games in arbitrary dimensions (e.g., 2D, 3D, 4D, etc.)
 */

class NDEngine {
  /**
   * Creates an N-dimensional game engine
   * @param {number[]} dimensions - Array defining size of each dimension (e.g., [3,3,3] for 3x3x3)
   */
  constructor(dimensions) {
    if (!Array.isArray(dimensions) || dimensions.length === 0) {
      throw new Error('Dimensions must be a non-empty array');
    }
    
    if (dimensions.some(d => !Number.isInteger(d) || d < 2)) {
      throw new Error('Each dimension must be an integer >= 2');
    }
    
    this.dimensions = [...dimensions];
    this.numDimensions = dimensions.length;
    this.totalCells = this.calculateTotalCells();
    this.winningCombinations = this.generateWinningCombinations();
  }

  /**
   * Calculates the total number of cells in the N-dimensional grid
   * @returns {number} Total number of cells
   */
  calculateTotalCells() {
    return this.dimensions.reduce((product, dim) => product * dim, 1);
  }

  /**
   * Converts N-dimensional coordinates to a flat index
   * @param {number[]} coords - N-dimensional coordinates
   * @returns {number} Flat index
   */
  coordsToIndex(coords) {
    if (!this.isValidPosition(coords)) {
      throw new Error(`Invalid coordinates: ${coords}`);
    }
    
    let index = 0;
    let multiplier = 1;
    
    // Convert from least significant to most significant dimension
    for (let i = this.numDimensions - 1; i >= 0; i--) {
      index += coords[i] * multiplier;
      multiplier *= this.dimensions[i];
    }
    
    return index;
  }

  /**
   * Converts a flat index to N-dimensional coordinates
   * @param {number} index - Flat index
   * @returns {number[]} N-dimensional coordinates
   */
  indexToCoords(index) {
    if (index < 0 || index >= this.totalCells) {
      throw new Error(`Index ${index} out of bounds (0-${this.totalCells - 1})`);
    }
    
    const coords = [];
    let remaining = index;
    
    // Extract coordinates from most significant to least significant dimension
    for (let i = this.numDimensions - 1; i >= 0; i--) {
      coords[i] = remaining % this.dimensions[i];
      remaining = Math.floor(remaining / this.dimensions[i]);
    }
    
    return coords;
  }

  /**
   * Checks if a position is valid within the grid
   * @param {number[]} coords - N-dimensional coordinates
   * @returns {boolean} True if position is valid
   */
  isValidPosition(coords) {
    if (!Array.isArray(coords) || coords.length !== this.numDimensions) {
      return false;
    }
    
    return coords.every((coord, i) => 
      Number.isInteger(coord) && coord >= 0 && coord < this.dimensions[i]
    );
  }

  /**
   * Generates all winning combinations for the N-dimensional grid
   * @returns {number[][]} Array of winning combinations (each as array of indices)
   */
  generateWinningCombinations() {
    const combinations = [];
    
    // Generate lines along each axis
    this.generateAxisLines(combinations);
    
    // Generate diagonals in 2D planes
    this.generate2DPlaneDiagonals(combinations);
    
    // Generate space diagonals through N dimensions
    if (this.numDimensions > 2) {
      this.generateSpaceDiagonals(combinations);
    }
    
    return combinations;
  }

  /**
   * Generates winning lines along each axis
   * @param {number[][]} combinations - Array to store combinations
   */
  generateAxisLines(combinations) {
    // For each dimension, generate lines along that axis
    for (let dim = 0; dim < this.numDimensions; dim++) {
      // Get all possible starting positions (where the varied dimension is 0)
      const startPositions = this.generatePositionsWithFixedDimension(dim, 0);
      
      for (const startPos of startPositions) {
        const line = [];
        const coords = [...startPos];
        
        // Create line by varying only the current dimension
        for (let i = 0; i < this.dimensions[dim]; i++) {
          coords[dim] = i;
          line.push(this.coordsToIndex([...coords]));
        }
        
        combinations.push(line);
      }
    }
  }

  /**
   * Generates diagonals in all 2D planes
   * @param {number[][]} combinations - Array to store combinations
   */
  generate2DPlaneDiagonals(combinations) {
    // For each pair of dimensions, generate diagonals in that plane
    for (let dim1 = 0; dim1 < this.numDimensions; dim1++) {
      for (let dim2 = dim1 + 1; dim2 < this.numDimensions; dim2++) {
        // Only generate diagonals if both dimensions have the same size
        if (this.dimensions[dim1] !== this.dimensions[dim2]) continue;
        
        const size = this.dimensions[dim1];
        
        // Get all positions where other dimensions are fixed
        const fixedDims = [];
        for (let d = 0; d < this.numDimensions; d++) {
          if (d !== dim1 && d !== dim2) {
            fixedDims.push(d);
          }
        }
        
        const fixedPositions = this.generateAllCombinations(fixedDims);
        
        for (const fixedPos of fixedPositions) {
          // Main diagonal (0,0), (1,1), (2,2), ...
          const mainDiag = [];
          // Anti-diagonal (0,n-1), (1,n-2), (2,n-3), ...
          const antiDiag = [];
          
          for (let i = 0; i < size; i++) {
            const coords = [...fixedPos];
            
            // Main diagonal
            coords[dim1] = i;
            coords[dim2] = i;
            mainDiag.push(this.coordsToIndex([...coords]));
            
            // Anti-diagonal
            coords[dim1] = i;
            coords[dim2] = size - 1 - i;
            antiDiag.push(this.coordsToIndex([...coords]));
          }
          
          combinations.push(mainDiag);
          combinations.push(antiDiag);
        }
      }
    }
  }

  /**
   * Generates space diagonals through N dimensions
   * @param {number[][]} combinations - Array to store combinations
   */
  generateSpaceDiagonals(combinations) {
    // Check if all dimensions have the same size (required for space diagonals)
    const size = this.dimensions[0];
    if (!this.dimensions.every(d => d === size)) {
      return; // Space diagonals only exist when all dimensions are equal
    }
    
    // Generate all possible space diagonals
    // Each dimension can go in positive (+1) or negative (-1) direction
    const numDiagonals = Math.pow(2, this.numDimensions);
    
    for (let diagType = 0; diagType < numDiagonals; diagType++) {
      const diagonal = [];
      
      for (let step = 0; step < size; step++) {
        const coords = [];
        
        for (let dim = 0; dim < this.numDimensions; dim++) {
          // Check if this dimension goes forward or backward
          const goesForward = (diagType & (1 << dim)) !== 0;
          coords[dim] = goesForward ? step : (size - 1 - step);
        }
        
        diagonal.push(this.coordsToIndex(coords));
      }
      
      combinations.push(diagonal);
    }
  }

  /**
   * Generates all positions where a specific dimension is fixed
   * @param {number} fixedDim - Dimension to fix
   * @param {number} fixedValue - Value for the fixed dimension
   * @returns {number[][]} Array of coordinate arrays
   */
  generatePositionsWithFixedDimension(fixedDim, fixedValue) {
    const positions = [];
    const coords = new Array(this.numDimensions).fill(0);
    coords[fixedDim] = fixedValue;
    
    const generate = (dim) => {
      if (dim === this.numDimensions) {
        positions.push([...coords]);
        return;
      }
      
      if (dim === fixedDim) {
        generate(dim + 1);
      } else {
        for (let i = 0; i < this.dimensions[dim]; i++) {
          coords[dim] = i;
          generate(dim + 1);
        }
      }
    };
    
    generate(0);
    return positions;
  }

  /**
   * Generates all possible combinations for given dimensions
   * @param {number[]} dims - Dimensions to vary
   * @returns {number[][]} Array of coordinate arrays
   */
  generateAllCombinations(dims) {
    const positions = [];
    const coords = new Array(this.numDimensions).fill(0);
    
    const generate = (dimIndex) => {
      if (dimIndex === dims.length) {
        positions.push([...coords]);
        return;
      }
      
      const dim = dims[dimIndex];
      for (let i = 0; i < this.dimensions[dim]; i++) {
        coords[dim] = i;
        generate(dimIndex + 1);
      }
    };
    
    generate(0);
    return positions;
  }

  /**
   * Gets all neighboring cells of a given position
   * @param {number[]} coords - N-dimensional coordinates
   * @param {boolean} includeDiagonals - Whether to include diagonal neighbors
   * @returns {number[][]} Array of neighbor coordinates
   */
  getNeighbors(coords, includeDiagonals = true) {
    if (!this.isValidPosition(coords)) {
      throw new Error(`Invalid coordinates: ${coords}`);
    }
    
    const neighbors = [];
    const maxDistance = includeDiagonals ? this.numDimensions : 1;
    
    // Generate all possible offsets
    const generateOffsets = (dim, offset) => {
      if (dim === this.numDimensions) {
        // Check if this is a valid neighbor (not the center cell)
        const distance = offset.reduce((sum, val) => sum + Math.abs(val), 0);
        if (distance > 0 && distance <= maxDistance) {
          const neighborCoords = coords.map((c, i) => c + offset[i]);
          if (this.isValidPosition(neighborCoords)) {
            neighbors.push(neighborCoords);
          }
        }
        return;
      }
      
      for (let delta = -1; delta <= 1; delta++) {
        offset[dim] = delta;
        generateOffsets(dim + 1, offset);
      }
    };
    
    generateOffsets(0, new Array(this.numDimensions).fill(0));
    return neighbors;
  }

  /**
   * Calculates Manhattan distance between two positions
   * @param {number[]} coords1 - First position
   * @param {number[]} coords2 - Second position
   * @returns {number} Manhattan distance
   */
  manhattanDistance(coords1, coords2) {
    if (!this.isValidPosition(coords1) || !this.isValidPosition(coords2)) {
      throw new Error('Invalid coordinates');
    }
    
    return coords1.reduce((sum, c1, i) => sum + Math.abs(c1 - coords2[i]), 0);
  }

  /**
   * Calculates Euclidean distance between two positions
   * @param {number[]} coords1 - First position
   * @param {number[]} coords2 - Second position
   * @returns {number} Euclidean distance
   */
  euclideanDistance(coords1, coords2) {
    if (!this.isValidPosition(coords1) || !this.isValidPosition(coords2)) {
      throw new Error('Invalid coordinates');
    }
    
    const sumSquares = coords1.reduce((sum, c1, i) => {
      const diff = c1 - coords2[i];
      return sum + diff * diff;
    }, 0);
    
    return Math.sqrt(sumSquares);
  }

  /**
   * Gets information about the game configuration
   * @returns {object} Game configuration info
   */
  getGameInfo() {
    return {
      dimensions: [...this.dimensions],
      numDimensions: this.numDimensions,
      totalCells: this.totalCells,
      numWinningCombinations: this.winningCombinations.length,
      winningLineLength: Math.max(...this.dimensions)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NDEngine;
}