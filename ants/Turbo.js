function Turbo(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        counter: 0 // Simple counter like C version
      },
      name: 'Turbo',
      color: '#00AAAA', // Teal color from C implementation
    };
  }

  const myBrain = antInfo.brains[0];
  
  // Ultra-simple logic: increment counter and move with food
  myBrain.counter++;
  return ((myBrain.counter >> 6) & 3) + 9; // Direction 1-4 + CARRY flag (8) + 1
}