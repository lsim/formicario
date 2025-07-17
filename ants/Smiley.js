function Smiley(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        xPos: 0,
        yPos: 0,
        targetX: 0,
        targetY: 0,
        state: 0, // 0=uninitialized, 1=search, 2=return, 3=guard, 4=base, 5=newbase, 6=predraw, 7=draw
        food: 0,
        rnd: 0,
        direction: 0,
        // Base ant fields (when state=4)
        f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, // Food direction tracking
        radius: 0,
        count: 0,
        firstbase: 0
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
  const NEW_BASE_ANT = 5;
  const PRE_DRAW_ANT = 6;
  const DRAW_ANT = 7;
  
  const BASERANGE = 96;

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

  function smileyRandom(brain, squareData) {
    // Simplified version of complex C random function without Math API
    let r = brain.xPos ^ brain.yPos ^ brain.targetX ^ brain.targetY;
    r ^= (squareData[0].numAnts << 8) | squareData[0].numFood;
    brain.rnd = (brain.rnd * 3 + 1) & 7;
    // Simplified linear congruential generator
    r = (r * 1588635695 + 1117695901) >>> 0;
    return r;
  }
  
  function randomInt(brain, squareData, min, max) {
    const rand = smileyRandom(brain, squareData);
    return min + (rand % (max - min + 1));
  }

  const myBrain = antInfo.brains[0];
  let direction = 0;

  // Direction offset arrays
  const xOffset = [0, 1, 0, -1, 0];
  const yOffset = [0, 0, -1, 0, 1];

  switch (myBrain.state) {
    case UNINITIALIZED:
      // Critical: In C, first 4 bytes are initialized with random data
      // In C: mem->n.rnd=mem->n.xpos; mem->n.xpos=0;
      // This means xpos initially contains random data that becomes the seed
      const randomBytes = antInfo.random;
      myBrain.rnd = randomBytes & 0xFF; // Use random data as seed like C version
      myBrain.xPos = 0; // Position starts at 0 after saving seed
      myBrain.yPos = 0;
      myBrain.direction = 0;
      
      // For base ants, the union means f1-f4 are the same memory as xpos,ypos,food
      // So they also get initialized with random data from the first 4 bytes
      myBrain.f1 = (randomBytes) & 0xFF;
      myBrain.f2 = (randomBytes >> 8) & 0xFF;  
      myBrain.f3 = (randomBytes >> 16) & 0xFF;
      myBrain.f4 = (randomBytes >> 24) & 0xFF;
      
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
            myBrain.targetX = randomInt(myBrain, squareData, -16, 16);
            myBrain.targetY = randomInt(myBrain, squareData, -16, 16);
            myBrain.direction = randomInt(myBrain, squareData, 0, 1);
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
      // Base ant coordinates other ants (complex logic from C version)
      myBrain.count++;
      
      // Check for other base ants
      let otherBaseAnts = 0;
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].state === BASE_ANT) otherBaseAnts++;
      }
      
      if (otherBaseAnts > 0) {
        // Someone else is base ant, become searcher
        myBrain.state = SEARCH_AND_DESTROY;
        myBrain.xPos = myBrain.yPos = myBrain.targetX = myBrain.targetY = myBrain.food = 0;
      } else if (squareData[0].base) {
        // We have a base
        if (myBrain.count > 550) {
          // Reset after long time
          myBrain.f1 = myBrain.f2 = myBrain.f3 = myBrain.f4 = myBrain.f5 = myBrain.f6 = 0;
          myBrain.radius = 0;
          myBrain.count = 0;
        } else if (myBrain.count > 400) {
          // Create new base expansion
          let baseX = 0, baseY = 0;
          switch (myBrain.f1) {
            case 1: baseX = BASERANGE * 0.5; baseY = BASERANGE * 0.866; break;
            case 2: baseX = BASERANGE; baseY = 0; break;
            case 3: baseX = BASERANGE * 0.5; baseY = -BASERANGE * 0.866; break;
            case 4: baseX = -BASERANGE * 0.5; baseY = -BASERANGE * 0.866; break;
            case 5: baseX = -BASERANGE; baseY = 0; break;
            case 6: baseX = -BASERANGE * 0.5; baseY = BASERANGE * 0.866; break;
          }
          
          // Send new base ants
          for (let i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === UNINITIALIZED) {
              antInfo.brains[i].state = NEW_BASE_ANT;
              antInfo.brains[i].xPos = -baseX;
              antInfo.brains[i].yPos = -baseY;
            }
          }
        } else if (myBrain.count === 100) {
          // Decide base expansion after 100 turns
          myBrain.radius = (myBrain.radius / 100) | 0;
          if (myBrain.radius > BASERANGE * 0.7) {
            const maxFood = [myBrain.f1,myBrain.f2,myBrain.f3,myBrain.f4,myBrain.f5,myBrain.f6]
              .reduce((max, val, idx) => val > max.val ? {val, idx: idx+1} : max, {val: 0, idx: 0});
            
            if (maxFood.val > BASERANGE + 10) {
              myBrain.f1 = maxFood.idx;
              myBrain.count = 400; // Start base creation
            } else {
              // Reset counters
              myBrain.f1 = myBrain.f2 = myBrain.f3 = myBrain.f4 = myBrain.f5 = myBrain.f6 = 0;
              myBrain.radius = 0;
              myBrain.count = 0;
            }
          } else {
            myBrain.f1 = myBrain.f2 = myBrain.f3 = myBrain.f4 = myBrain.f5 = myBrain.f6 = 0;
            myBrain.radius = 0;
            myBrain.count = 0;
          }
        } else {
          // Initialize new ants and track food directions
          let newAnts = 0;
          for (let i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === UNINITIALIZED) {
              antInfo.brains[i].state = SEARCH_AND_DESTROY;
              antInfo.brains[i].xPos = 0;
              antInfo.brains[i].yPos = 0;
              
              // Assign search pattern in a circle (simplified from C version)
              const d = (myBrain.count + newAnts) % 20;
              if (d < 5) { 
                antInfo.brains[i].targetX = 3; 
                antInfo.brains[i].targetY = 2 - d; 
              } else if (d < 10) { 
                antInfo.brains[i].targetX = 2 - (d - 5); 
                antInfo.brains[i].targetY = -3; 
              } else if (d < 15) { 
                antInfo.brains[i].targetX = -3; 
                antInfo.brains[i].targetY = -2 + (d - 10); 
              } else { 
                antInfo.brains[i].targetX = -2 + (d - 15); 
                antInfo.brains[i].targetY = 3; 
              }
              
              antInfo.brains[i].direction = (myBrain.count + i) & 1;
              newAnts++;
            }
          }
        }
      }
      break;
      
    case NEW_BASE_ANT:
      // Gather at new base location
      if (myBrain.xPos === 0 && myBrain.yPos === 0) {
        if (!squareData[0].base) {
          direction = 16; // Build base
          // Check if enough ants for base
          let newBaseAnts = 1;
          for (let i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === NEW_BASE_ANT) newBaseAnts++;
          }
          if (newBaseAnts > 25) { // NewBaseAnts threshold
            myBrain.targetX = myBrain.targetY = myBrain.food = 0;
            myBrain.state = SEARCH_AND_DESTROY;
            direction = 0;
          }
        } else {
          myBrain.state = SEARCH_AND_DESTROY;
        }
      } else {
        // Move toward base location with food
        direction = walk(myBrain.xPos, myBrain.yPos, myBrain.targetX, myBrain.targetY) | 8;
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