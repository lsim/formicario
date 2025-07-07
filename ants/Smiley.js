function Smiley(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        xPos: 0,
        yPos: 0,
        targetX: 0,
        targetY: 0,
        state: 0, // 0=uninitialized, 1=search, 2=return, 3=guard, 4=base
        food: 0,
        rnd: 0,
        direction: 0
      },
      name: 'Smiley',
      color: '#ff8000', // Orange color
    };
  }

  // Constants
  const UNINITIALIZED = 0;
  const SEARCH_AND_DESTROY = 1;
  const RETURN_FOOD = 2;
  const GUARD = 3;
  const BASE_ANT = 4;

  // Helper functions (avoiding Math API)
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  function distance(x1, y1, x2, y2) {
    return abs(x1 - x2) + abs(y1 - y2);
  }

  function walk(x1, y1, x2, y2) {
    if (distance(x1, y1, x2, y2) === 0) return 0;
    
    if (abs(x1 - x2) > abs(y1 - y2)) {
      if (x2 > x1) return 1; // East
      else return 3; // West
    } else {
      if (y2 > y1) return 4; // North
      else return 2; // South
    }
  }

  function randomInt(brain, min, max) {
    brain.rnd = (brain.rnd * 3 + 1) & 7; // Simple RNG
    return min + (brain.rnd % (max - min + 1));
  }

  const myBrain = antInfo.brains[0];
  let direction = 0;

  // Direction offset arrays
  const xOffset = [0, 1, 0, -1, 0];
  const yOffset = [0, 0, -1, 0, 1];

  switch (myBrain.state) {
    case UNINITIALIZED:
      myBrain.rnd = antInfo.random & 0xFF;
      myBrain.xPos = 0;
      myBrain.yPos = 0;
      myBrain.direction = 0;
      
      // Check if we should be base ant
      let existingBaseAnts = 0;
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].state === BASE_ANT) {
          existingBaseAnts++;
        }
      }
      
      // Check for activity around us
      let activity = 0;
      for (let i = 1; i < 5; i++) {
        if (squareData[i].numAnts > 0) activity++;
      }
      
      if (existingBaseAnts === 0 && activity === 0) {
        myBrain.state = BASE_ANT;
      } else {
        myBrain.state = SEARCH_AND_DESTROY;
      }
      break;

    case SEARCH_AND_DESTROY:
      // Found food and not at home?
      if (squareData[0].numFood > 0 && (myBrain.xPos !== 0 || myBrain.yPos !== 0)) {
        // Check how many ants are already returning food
        let returningAnts = 0;
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === RETURN_FOOD) {
            returningAnts++;
          }
        }
        
        // If more food than returning ants, join them
        if (squareData[0].numFood > returningAnts) {
          myBrain.targetX = myBrain.xPos;
          myBrain.targetY = myBrain.yPos;
          myBrain.state = RETURN_FOOD;
          myBrain.food = squareData[0].numFood - returningAnts;
        }
      } else {
        // At target or need new target
        if (myBrain.xPos === myBrain.targetX && myBrain.yPos === myBrain.targetY) {
          if (myBrain.xPos === 0 && myBrain.yPos === 0) {
            // At home, pick new random target
            myBrain.targetX = randomInt(myBrain, -16, 16);
            myBrain.targetY = randomInt(myBrain, -16, 16);
            myBrain.direction = randomInt(myBrain, 0, 1);
          } else {
            // At target, expand search in spiral pattern
            if (myBrain.direction) {
              myBrain.targetX = myBrain.xPos + myBrain.yPos;
              myBrain.targetY = myBrain.yPos - myBrain.xPos;
            } else {
              myBrain.targetX = myBrain.xPos - myBrain.yPos;
              myBrain.targetY = myBrain.yPos + myBrain.xPos;
            }
          }
        } else {
          // Move toward target
          direction = walk(myBrain.xPos, myBrain.yPos, myBrain.targetX, myBrain.targetY);
          
          // Check for nearby food
          if (myBrain.xPos !== 0 || myBrain.yPos !== 0) {
            for (let i = 1; i < 5; i++) {
              if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
                if (myBrain.xPos + xOffset[i] !== 0 || myBrain.yPos + yOffset[i] !== 0) {
                  direction = i;
                }
              }
            }
          }
        }
      }
      break;

    case RETURN_FOOD:
      // Return home with food
      direction = walk(myBrain.xPos, myBrain.yPos, 0, 0) + 8; // +8 for carrying food
      
      // Share food location with searching ants
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].state === SEARCH_AND_DESTROY && myBrain.food > 2) {
          antInfo.brains[i].targetX = myBrain.targetX - (myBrain.xPos - antInfo.brains[i].xPos);
          antInfo.brains[i].targetY = myBrain.targetY - (myBrain.yPos - antInfo.brains[i].yPos);
          antInfo.brains[i].food = myBrain.food - 3;
          myBrain.food -= 3;
        }
      }
      
      // If no more food at source, switch back to searching
      if (squareData[0].numFood === 0) {
        myBrain.state = SEARCH_AND_DESTROY;
      }
      break;

    case GUARD:
      myBrain.targetX--; // Guard countdown
      if (myBrain.targetX <= 0) {
        myBrain.state = SEARCH_AND_DESTROY;
        myBrain.targetX = myBrain.xPos;
        myBrain.targetY = myBrain.yPos;
      } else if (myBrain.xPos !== 0 || myBrain.yPos !== 0) {
        // Check for food while guarding
        for (let i = 0; i < 5; i++) {
          if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
            direction = i;
            myBrain.state = RETURN_FOOD;
            myBrain.targetX = myBrain.xPos + xOffset[i];
            myBrain.targetY = myBrain.yPos + yOffset[i];
            myBrain.food = squareData[i].numFood;
          }
        }
      }
      break;

    case BASE_ANT:
      // Base ant coordinates other ants
      let newAnts = 0;
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].state === UNINITIALIZED) {
          antInfo.brains[i].state = SEARCH_AND_DESTROY;
          antInfo.brains[i].xPos = 0;
          antInfo.brains[i].yPos = 0;
          
          // Assign search pattern in a circle
          const angle = newAnts * 8; // Spread ants around
          antInfo.brains[i].targetX = angle % 4 - 2;
          antInfo.brains[i].targetY = (angle >> 2) % 4 - 2;
          antInfo.brains[i].direction = newAnts & 1;
          newAnts++;
        }
      }
      break;
  }

  // Check for enemies and switch to guard mode
  for (let i = 1; i < 5; i++) {
    if (squareData[i].team > 0 && squareData[i].team !== squareData[0].team) {
      direction = i;
      myBrain.state = GUARD;
      myBrain.targetX = 1500; // Guard for 1500 turns
    }
  }

  // Update position tracking
  if (direction > 0 && direction < 5) {
    myBrain.xPos += xOffset[direction];
    myBrain.yPos += yOffset[direction];
  }

  return direction;
}