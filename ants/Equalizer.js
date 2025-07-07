function Equalizer(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        state: 0
      },
      name: 'Equalizer',
      color: '#00FF00', // Green color
    };
  }

  function warCheck(fields) {
    if (fields[1].team && fields[1].team !== fields[0].team) return 1;
    if (fields[2].team && fields[2].team !== fields[0].team) return 2;
    if (fields[3].team && fields[3].team !== fields[0].team) return 3;
    if (fields[4].team && fields[4].team !== fields[0].team) return 4;
    return 0;
  }

  function foodCheck(fields) {
    if (fields[0].numFood) return 0;
    if (fields[1].numFood) return 1;
    if (fields[3].numFood) return 3;
    return 5;
  }

  const myBrain = antInfo.brains[0];
  let result;

  // Check for enemies first
  result = warCheck(squareData);
  if (result) {
    if (myBrain.state === 255 || myBrain.state === 252) {
      myBrain.state = 10 + result;
    }
    return result;
  }

  // Handle combat retreat states
  if (myBrain.state > 10 && myBrain.state < 15) {
    const temp = myBrain.state - 10;
    myBrain.state = 255;
    if (temp === 1) return 3;
    if (temp === 2) return 4;
    if (temp === 3) return 1;
    if (temp === 4) return 2;
  }

  // At base but not special state
  if (squareData[0].base && myBrain.state !== 252) {
    myBrain.state = 1;
    return 1;
  }

  // Delay states
  if (myBrain.state < 2 && myBrain.state > 0) {
    myBrain.state--;
    return 0;
  }

  // Initial expansion
  if (squareData[0].numAnts > 2 && myBrain.state === 0) {
    return 1;
  }

  // Two ants initialization
  if (squareData[0].numAnts === 2 && myBrain.state === 0 && antInfo.brains[1].state === 0) {
    myBrain.state = 246;
    antInfo.brains[1].state = 255;
    return 4;
  }

  // Patrol state
  if (myBrain.state === 70) {
    result = foodCheck(squareData);
    if (result === 0 && squareData[0].numAnts === 1) {
      return 12; // Return with food
    }
    if (result < 5 && result > 0 && squareData[result].numAnts === 0) {
      return result;
    }
    return 2;
  }

  // Search states
  if (myBrain.state < 247 && myBrain.state > 79) {
    result = foodCheck(squareData);
    if (result === 0 && squareData[0].numAnts === 1) {
      myBrain.state = 246;
      return 10; // Return home with food
    }
    
    // Coordinate with other ants
    if (result === 0 && squareData[0].numAnts === 3 && squareData[4].numAnts === 0) {
      if (antInfo.brains[1].state !== 255) {
        antInfo.brains[1].state = 246;
      } else if (antInfo.brains.length > 2) {
        antInfo.brains[2].state = 246;
      }
    }
    
    if (result < 5 && result > 0 && squareData[result].numAnts === 0) {
      myBrain.state = 246;
      return result;
    }
    
    if (myBrain.state === 80) {
      myBrain.state = 70;
      return 1;
    }
    
    myBrain.state--;
    return 4;
  }

  // Found food state
  if (myBrain.state === 255) {
    if (squareData[0].numFood) {
      myBrain.state = 252;
      return 11; // Pick up food
    }
    return 0;
  }

  // Carrying food state
  if (myBrain.state === 252) {
    myBrain.state = 255;
    return 1;
  }

  return 0;
}