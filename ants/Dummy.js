function Dummy(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        randSeed: 0,
        posX: 0,
        posY: 0,
        destX: 0,
        destY: 0,
        foodX: 0,
        foodY: 0,
        radius: 0,
        foodAmount: 0,
        rank: 0,
        hasFood: 0
      },
      name: 'Dummy',
      color: '#888888', // Gray color for dummy
    };
  }

  // Constants
  const INITIAL_RADIUS = 40;
  const RADIUS_STEP = 30;
  const ROOKIE = 0;
  const SOLDIER = 1;

  // Helper functions
  function getRand(brain) {
    brain.randSeed = ((brain.randSeed * 1103515245 + 12345) >>> 16) & 65535;
    return brain.randSeed;
  }

  function destReached(brain) {
    return brain.posX === brain.destX && brain.posY === brain.destY;
  }

  function gotoAdjSqr(brain, direction) {
    if (direction & 1) {
      if (direction === 1) {
        brain.posX++;
        return 1;
      } else {
        brain.posX--;
        return 3;
      }
    } else {
      if (direction === 4) {
        brain.posY++;
        return 4;
      } else {
        brain.posY--;
        return 2;
      }
    }
  }

  function gotoDest(brain) {
    if (brain.posX !== brain.destX) {
      if (brain.posX < brain.destX) {
        brain.posX++;
        return 1 | brain.hasFood;
      } else {
        brain.posX--;
        return 3 | brain.hasFood;
      }
    } else {
      if (brain.posY < brain.destY) {
        brain.posY++;
        return 4 | brain.hasFood;
      } else {
        brain.posY--;
        return 2 | brain.hasFood;
      }
    }
  }

  const myBrain = antInfo.brains[0];

  // Initialize random seed if not set
  if (myBrain.randSeed === 0) {
    myBrain.randSeed = myBrain.random & 0xFFFF;
  }

  // Check for enemies first - become soldier if enemies nearby
  for (let i = 1; i < 5; i++) {
    if (squareData[i].team && squareData[i].team !== squareData[0].team) {
      myBrain.rank = SOLDIER;
      return gotoAdjSqr(myBrain, i);
    }
  }

  // Soldier behavior - mostly stay put but occasionally become rookie again
  if (myBrain.rank === SOLDIER) {
    if (getRand(myBrain) & 255) {
      return 0; // Stay put
    } else {
      myBrain.rank = ROOKIE;
    }
  }

  // At base (position 0,0)
  if (!myBrain.posX && !myBrain.posY) {
    // Check if another ant already knows about our food location
    if (myBrain.foodAmount) {
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].foodAmount && 
            antInfo.brains[i].foodX === myBrain.foodX && 
            antInfo.brains[i].foodY === myBrain.foodY && 
            antInfo.brains[i].foodAmount < myBrain.foodAmount) {
          myBrain.foodAmount = 0;
          break;
        }
      }
      if (myBrain.foodAmount === 0) return 0;
    }

    myBrain.hasFood = 0;

    // Look for food information from other ants
    for (let i = 1; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].foodAmount > 0) {
        myBrain.destX = antInfo.brains[i].foodX;
        myBrain.destY = antInfo.brains[i].foodY;
        antInfo.brains[i].foodAmount--;
        return gotoDest(myBrain);
      }
    }

    // No known food - expand search radius and pick random destination
    if (myBrain.radius) {
      myBrain.radius += RADIUS_STEP;
    } else {
      myBrain.radius = INITIAL_RADIUS;
    }

    if (getRand(myBrain) & 1) {
      myBrain.destX = (getRand(myBrain) % (myBrain.radius << 1)) - myBrain.radius;
      myBrain.destY = (myBrain.randSeed & 2) ? myBrain.radius : -myBrain.radius;
    } else {
      myBrain.destX = (myBrain.randSeed & 2) ? myBrain.radius : -myBrain.radius;
      myBrain.destY = (getRand(myBrain) % (myBrain.radius << 1)) - myBrain.radius;
    }
    
    return gotoDest(myBrain);
  }

  // If carrying food, go home
  if (myBrain.hasFood) {
    return gotoDest(myBrain);
  }

  // Check current square for food
  if (squareData[0].numFood >= squareData[0].numAnts) {
    myBrain.hasFood = 8; // Set carry food flag
    if (myBrain.destX !== myBrain.posX || myBrain.destY !== myBrain.posY) {
      myBrain.foodAmount = squareData[0].numFood - 1;
    }
    myBrain.destX = 0;
    myBrain.destY = 0;
    myBrain.foodX = myBrain.posX;
    myBrain.foodY = myBrain.posY;
    return gotoDest(myBrain);
  }

  // Check adjacent squares for food
  for (let i = 1; i < 5; i++) {
    if (squareData[i].numFood > squareData[i].numAnts) {
      return gotoAdjSqr(myBrain, i);
    }
  }

  // If reached destination, clear it
  if (destReached(myBrain)) {
    myBrain.destX = 0;
    myBrain.destY = 0;
  }

  return gotoDest(myBrain);
}