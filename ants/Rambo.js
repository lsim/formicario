function Rambo(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {}, // No brain state needed for this simple strategy
      name: 'Rambo',
      color: '#FF0000', // Red color from the C implementation
    };
  }

  // Aggressive strategy: prioritize attacking bases, then largest enemy groups

  // First priority: Look for enemy bases to attack
  for (let i = 1; i < 5; i++) {
    if (squareData[i].base && squareData[i].team > 0) {
      return i; // Move toward enemy base immediately
    }
  }

  // Second priority: Find the square with the most enemy ants
  let maxAnts = 0;
  let bestDirection = 0;

  for (let i = 1; i < 5; i++) {
    if (squareData[i].team > 0 && squareData[i].numAnts > maxAnts) {
      maxAnts = squareData[i].numAnts;
      bestDirection = i;
    }
  }

  return bestDirection; // Move toward largest enemy group, or stay (0) if no enemies
}
