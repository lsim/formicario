function BlackHole(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {}, // Empty brain - this ant needs no state
      name: 'BlackHole',
      color: '#000000', // Black color as specified in C code
    };
  }

  // Constants
  const N = 25; // NewBaseAnts from the C code

  // Check for enemies first - high priority
  if (!squareData[3].base) {
    for (let i = 4; i >= 1; i--) {
      if (squareData[i].team) {
        return i;
      }
    }
  }

  // Base movement logic
  if (squareData[1].base && squareData[1].numAnts < N) return 9; // Move east with food
  if (squareData[2].base) return 10; // Move south with food
  
  if (squareData[3].base) {
    if (squareData[3].numAnts < N || squareData[0].numAnts > 1) {
      return 11; // Move west with food
    } else {
      return 0; // Stay put
    }
  }
  
  if (squareData[4].base) return 12; // Move north with food

  // Food handling
  if (squareData[0].numFood >= squareData[0].numAnts) return 9; // Move east with food

  // Look for food if not on base
  if (!squareData[0].base) {
    for (let i = 4; i >= 1; i--) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        return i;
      }
    }
    return 3; // Default move west
  }

  // Default behavior when on base
  if (!squareData[1].numAnts && squareData[0].numAnts > N) return 3; // Move west

  return 0; // Stay put
}