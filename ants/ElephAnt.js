function ElephAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        random: 12345, // Initial seed
        baseX: 0,
        baseY: 0,
        count: 0,
        currentX: 0,
        currentY: 0,
        gotoBaseFlag: 0
      },
      name: 'ElephAnt',
      color: '#808080', // Gray color for elephant
    };
  }

  // Helper function for random direction (avoiding Math API)
  function goRandomDirection(randomSeed, count) {
    let seed = randomSeed;
    let counter = count;
    
    for (let i = counter; i > 1; i--) {
      seed = (seed * randomSeed) & 0xFFFFFFFF; // Keep it as 32-bit
    }
    
    return (seed % 5) + 1;
  }

  const myBrain = antInfo.brains[0];
  myBrain.count++;
  
  // Initialize random seed if not set
  if (!myBrain.random) {
    myBrain.random = antInfo.random || 12345;
  }

  let selectedDirection = 0;

  // Direction constants
  const RIGHT = 1;
  const LEFT = 3;
  const UP = 4;
  const DOWN = 2;
  const UP_WITH_FOOD = 12;
  const RIGHT_WITH_FOOD = 9;
  const LEFT_WITH_FOOD = 11;
  const DOWN_WITH_FOOD = 10;

  // If ant is on a base, set base coordinates and explore
  if (squareData[0].base === 1) {
    myBrain.baseX = 0;
    myBrain.baseY = 0;
    myBrain.currentX = 0;
    myBrain.currentY = 0;
    myBrain.gotoBaseFlag = 0;
    
    selectedDirection = goRandomDirection(myBrain.random, myBrain.count);
    
    switch (selectedDirection) {
      case RIGHT:
        myBrain.currentX += 1;
        return selectedDirection;
      case LEFT:
        myBrain.currentX -= 1;
        return selectedDirection;
      case UP:
        myBrain.currentY += 1;
        return selectedDirection;
      case DOWN:
        myBrain.currentY -= 1;
        return selectedDirection;
    }
  }

  // If not on base and no food, explore randomly
  if (squareData[0].numFood === 0 && squareData[0].base === 0) {
    myBrain.gotoBaseFlag = 0;
    selectedDirection = goRandomDirection(myBrain.random, myBrain.count);
    
    switch (selectedDirection) {
      case RIGHT:
        myBrain.currentX += 1;
        return selectedDirection;
      case LEFT:
        myBrain.currentX -= 1;
        return selectedDirection;
      case UP:
        myBrain.currentY += 1;
        return selectedDirection;
      case DOWN:
        myBrain.currentY -= 1;
        return selectedDirection;
    }
  }

  // Found food and alone - start returning to base
  if (squareData[0].numFood !== 0 && squareData[0].numAnts === 1 && 
      squareData[0].base === 0 && myBrain.gotoBaseFlag === 0) {
    myBrain.gotoBaseFlag = 1;
    
    if (myBrain.currentX > myBrain.baseX) {
      selectedDirection = LEFT_WITH_FOOD;
      myBrain.currentX -= 1;
      return selectedDirection;
    }
    if (myBrain.currentX < myBrain.baseX) {
      selectedDirection = RIGHT_WITH_FOOD;
      myBrain.currentX += 1;
      return selectedDirection;
    }
    if (myBrain.currentX === myBrain.baseX && myBrain.currentY < myBrain.baseY) {
      selectedDirection = UP_WITH_FOOD;
      myBrain.currentY += 1;
      return selectedDirection;
    }
    if (myBrain.currentX === myBrain.baseX && myBrain.currentY > myBrain.baseY) {
      selectedDirection = DOWN_WITH_FOOD;
      myBrain.currentY -= 1;
      return selectedDirection;
    }
  }

  // Continue returning to base with food
  if (myBrain.gotoBaseFlag === 1) {
    if (myBrain.currentX > myBrain.baseX) {
      selectedDirection = LEFT_WITH_FOOD;
      myBrain.currentX -= 1;
      return selectedDirection;
    }
    if (myBrain.currentX < myBrain.baseX) {
      selectedDirection = RIGHT_WITH_FOOD;
      myBrain.currentX += 1;
      return selectedDirection;
    }
    if (myBrain.currentX === myBrain.baseX && myBrain.currentY < myBrain.baseY) {
      selectedDirection = UP_WITH_FOOD;
      myBrain.currentY += 1;
      return selectedDirection;
    }
    if (myBrain.currentX === myBrain.baseX && myBrain.currentY > myBrain.baseY) {
      selectedDirection = DOWN_WITH_FOOD;
      myBrain.currentY -= 1;
      return selectedDirection;
    }
  }

  return selectedDirection;
}