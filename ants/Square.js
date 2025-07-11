function Square(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        mem: 0 // Single byte memory like C version
      },
      name: 'Square',
      color: '#00FFFF', // Cyan color from C implementation
    };
  }

  const MaxSquareAnts = 100;
  const myBrain = antInfo.brains[0];

  // Check for enemies first
  for (let i = 1; i < 5; i++) {
    if (squareData[i].team) return i;
    
    // Check for bases
    if (squareData[i].base && i !== ((myBrain.mem >> 6) ^ 2) + 1) {
      if (!squareData[0].numFood) myBrain.mem += 3;
      if (squareData[i].numAnts > MaxSquareAnts) return (i & 3) + 1;
      if (((1 + myBrain.mem) >> 6) + 1 !== i) return i + 8;
    }
  }
  
  // If we have food, carry it home
  if (squareData[0].numFood) {
    myBrain.mem++;
    return (myBrain.mem >> 6) + 9;
  }
  
  // Look for food without ants
  for (let i = 1; i < 5; i++) {
    if (squareData[i].numFood && !squareData[i].numAnts &&
        !squareData[((myBrain.mem + 1) >> 6) + 1].numFood) {
      return i;
    }
  }
  
  // Default movement
  myBrain.mem++;
  return (myBrain.mem >> 6) + 1;
}