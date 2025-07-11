function Zero(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        random: 1,
        xpos: 0,
        ypos: 0,
        xfood: 0,
        yfood: 0
      },
      name: 'ZeroAnt',
      color: '#404040', // Dark gray color
    };
  }

  // Helper function to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  const myBrain = antInfo.brains[0];
  let move = 0;
  let max = 0;

  // Constants from MyreKrig system
  const MaxSquareAnts = 100;
  const NewBaseFood = 50;
  const NewBaseAnts = 25;

  // Reset position if on base
  if (squareData[0].base) {
    myBrain.xpos = 0;
    myBrain.ypos = 0;
  }

  // Look for enemy teams to attack
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team) {
      if (squareData[i].base) {
        max = MaxSquareAnts + 1;
        move = i;
      } else if (squareData[i].numAnts > max) {
        max = squareData[i].numAnts;
        move = i;
      }
    }
  }

  // Handle food on current square
  if (squareData[0].numFood && !move) {
    if (squareData[0].numFood > squareData[0].numAnts) {
      myBrain.xfood = myBrain.xpos;
      myBrain.yfood = myBrain.ypos;
    }
    
    // Build base if enough resources
    if (squareData[0].numFood >= NewBaseFood && squareData[0].numAnts >= NewBaseAnts) {
      move = 16; // BUILDBASE flag
    } else if (myBrain.xpos) {
      move = (myBrain.xpos > 0) ? 3 : 1; // West or East
    } else {
      move = (myBrain.ypos > 0) ? 2 : 4; // North or South
    }
  } else {
    // Look for food in adjacent squares
    for (let i = 1; !move && i <= 4; i++) {
      if (squareData[i].numFood - squareData[i].numAnts > 0) {
        move = i;
      }
    }
    
    // Move toward known food location
    if (!move && (myBrain.xfood || myBrain.yfood)) {
      if (myBrain.xfood - myBrain.xpos) {
        move = (myBrain.xpos > myBrain.xfood) ? 3 : 1; // West or East
      } else if (myBrain.yfood - myBrain.ypos) {
        move = (myBrain.ypos > myBrain.yfood) ? 2 : 4; // North or South
      } else {
        myBrain.xfood = 0;
        myBrain.yfood = 0;
      }
    } else {
      // Share food information with other ants
      for (let i = 1; !move && i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].xfood || antInfo.brains[i].yfood) {
          myBrain.xfood = antInfo.brains[i].xfood;
          myBrain.yfood = antInfo.brains[i].yfood;
          
          if (myBrain.xfood !== myBrain.xpos) {
            move = (myBrain.xpos > myBrain.xfood) ? 3 : 1; // West or East
          } else {
            move = (myBrain.ypos > myBrain.yfood) ? 2 : 4; // North or South
          }
        }
      }
    }
    
    // Random movement if no direction found
    if (!move) {
      const last = myBrain.random % 5;
      move = (myBrain.random = (myBrain.random * 223 + 13) >>> 0) % 5;
      
      // Ensure movement is valid and different from last move
      while (!(move && (move === last || (move % 2 !== last % 2)))) {
        move = (myBrain.random = (myBrain.random * 223 + 13) >>> 0) % 5;
      }
    }
  }

  // Add carry flag for movement (except base building)
  if (move < 16) {
    move = move + 8; // Add CARRY flag
  } else {
    // Reset position when building base
    myBrain.xpos = 0;
    myBrain.ypos = 0;
  }

  // Update position tracking
  switch (move % 8) {
    case 0: 
      break;
    case 1: 
      myBrain.xpos++;
      break;
    case 2: 
      myBrain.ypos--;
      break;
    case 3: 
      myBrain.xpos--;
      break;
    case 4: 
      myBrain.ypos++;
      break;
  }
  
  return move;
}