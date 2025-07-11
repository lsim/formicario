function FormAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        r: 12345, // Random seed
        x: 0,     // X position
        y: 0,     // Y position  
        s: 0      // State
      },
      name: 'FormAnt',
      color: '#FF00FF', // Magenta color
    };
  }

  // Helper function for random number generation (avoiding Math API)
  function random(max, seed) {
    seed.r = (seed.r * 89423309 + 89449237) & 0xFFFFFFFF;
    return (((seed.r << 13) + (seed.r >> 19)) | 0) % max;
  }

  function abs(x) {
    return x >= 0 ? x : -x;
  }

  function sign(x) {
    return x < 0 ? -1 : x > 0 ? 1 : 0;
  }

  const myBrain = antInfo.brains[0];
  
  // Initialize random seed if needed
  if (!myBrain.r) {
    myBrain.r = antInfo.random || 12345;
  }

  // State management
  if (myBrain.s === 21) myBrain.s = 1;
  if (myBrain.s >= 2) myBrain.s--;
  
  // Reset position if at boundary
  if (!(myBrain.x % 64 || myBrain.y % 64)) {
    myBrain.x = myBrain.y = 0;
  }

  // Find closest ant to home
  for (let i = 1; i < antInfo.brains.length; i++) {
    if (abs(antInfo.brains[i].x) + abs(antInfo.brains[i].y) < abs(myBrain.x) + abs(myBrain.y)) {
      myBrain.x = antInfo.brains[i].x;
      myBrain.y = antInfo.brains[i].y;
    }
  }

  // Attack enemies
  for (let i = 1; i < 5; i++) {
    if (squareData[i].team && squareData[i].team !== squareData[0].team) {
      myBrain.s = 263;
      return i;
    }
  }

  // Delay state
  if (myBrain.s > 13) return 0;

  // At home position
  if (!myBrain.x && !myBrain.y) {
    myBrain.s = 0;
    
    // Create base if needed
    if (!squareData[0].base && squareData[0].numFood >= 100) { // NewBaseFood equivalent
      return 16;
    }
    
    // Look for nearby food
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numFood && myBrain.s < 2) {
        return i;
      }
    }
    
    return random(4, myBrain) + 1;
  }

  // Distance calculations
  const tx = myBrain.x * myBrain.x;
  const ty = myBrain.y * myBrain.y;
  
  if (tx + ty > 8192) myBrain.s = 1;
  if (tx + ty < 2457) myBrain.s = 0;

  // Found food
  if (squareData[0].numFood && myBrain.s < 2) {
    // Direct path home on axes
    if (abs(myBrain.x) <= 2 && !myBrain.y) {
      return 10 + sign(myBrain.x);
    }
    if (abs(myBrain.y) <= 2 && !myBrain.x) {
      return 11 + sign(myBrain.y);
    }
    
    // Multiple food items - choose best direction
    if (squareData[0].numFood > 1) {
      if (!myBrain.x) {
        return 11 + sign(myBrain.y);
      } else if (!myBrain.y) {
        return 10 + sign(myBrain.x);
      } else if (abs(myBrain.x) < abs(myBrain.y)) {
        return 10 + sign(myBrain.x);
      } else {
        return 11 + sign(myBrain.y);
      }
    } else {
      // Single food - look for nearby food first
      let d = 0;
      if (!myBrain.y) {
        if (squareData[4].numFood) d = 4;
        else if (squareData[2].numFood) d = 2;
        else if (squareData[2 - sign(myBrain.x)].numFood) d = 2 - sign(myBrain.x);
      } else if (!myBrain.x) {
        if (squareData[3].numFood) d = 3;
        else if (squareData[1].numFood) d = 1;
        else if (squareData[3 - sign(myBrain.y)].numFood) d = 3 - sign(myBrain.y);
      } else {
        if (squareData[3 - sign(myBrain.y)].numFood) d = 3 - sign(myBrain.y);
        else if (squareData[2 - sign(myBrain.x)].numFood) d = 2 - sign(myBrain.x);
      }
      
      if (d && squareData[d].numAnts < 255) { // MaxSquareAnts equivalent
        return d;
      }
      
      // Return home
      if (!myBrain.x) {
        return 11 + sign(myBrain.y);
      } else if (!myBrain.y) {
        return 10 + sign(myBrain.x);
      } else if (abs(myBrain.x) < abs(myBrain.y)) {
        return 10 + sign(myBrain.x);
      } else {
        return 11 + sign(myBrain.y);
      }
    }
  } else {
    // Search for food
    for (let i = 1; i < 5; i++) {
      const newX = myBrain.x + (i === 1 ? 1 : i === 3 ? -1 : 0);
      const newY = myBrain.y + (i === 2 ? -1 : i === 4 ? 1 : 0);
      
      if ((newX || newY) && squareData[i].numFood && myBrain.s < 2 && squareData[i].numAnts < 255) {
        return i;
      }
    }
    
    // Movement logic based on position
    if (abs(myBrain.x) <= 3 && abs(myBrain.y) <= 3 && myBrain.s < 2) {
      if (abs(myBrain.x) > abs(myBrain.y)) {
        return 2 - sign(myBrain.x);
      } else {
        return 3 - sign(myBrain.y);
      }
    }
    
    // Complex movement pattern
    if (!myBrain.x) {
      return squareData[2 + sign(myBrain.y)].numAnts ? 3 - sign(myBrain.y) : 2 + sign(myBrain.y);
    } else if (!myBrain.y) {
      return squareData[3 - sign(myBrain.x)].numAnts ? 2 - sign(myBrain.x) : 3 - sign(myBrain.x);
    } else if (myBrain.x > 0) {
      if (myBrain.y > 0) {
        if (myBrain.x > myBrain.y) {
          return myBrain.s === 1 ? 2 + random(2, myBrain) : 2;
        } else {
          return myBrain.s === 1 ? 3 : 2 + random(2, myBrain);
        }
      } else {
        if (myBrain.x > -myBrain.y) {
          return myBrain.s === 1 ? 2 : 1 + random(2, myBrain);
        } else {
          return myBrain.s === 1 ? 1 + random(2, myBrain) : 1;
        }
      }
    } else {
      if (myBrain.y > 0) {
        if (-myBrain.x > myBrain.y) {
          return myBrain.s === 1 ? 4 : 3 + random(2, myBrain);
        } else {
          return myBrain.s === 1 ? 3 + random(2, myBrain) : 3;
        }
      } else {
        if (-myBrain.x > -myBrain.y) {
          return myBrain.s === 1 ? (random(2, myBrain) ? 4 : 1) : 4;
        } else {
          return myBrain.s === 1 ? 1 : (random(2, myBrain) ? 4 : 1);
        }
      }
    }
  }
}