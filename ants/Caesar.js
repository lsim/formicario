function Caesar(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        xPos: 0,
        yPos: 0,
        xtarget: 0,
        ytarget: 0,
        food: 0,
        dir: 0,
        state: 0, // 0=uninitialized, 1=scout, 2=return, 3=guard, 4=base, 5=newbase, 6=patrol
        patrolDistance: 0,
        count: 0,
        firstBase: 1
      },
      name: 'Caesar',
      color: '#808080', // Gray color from C implementation
    };
  }

  // Helper functions (avoiding Math API)
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  function distance(x1, y1, x2, y2) {
    return abs(x1 - x2) + abs(y1 - y2);
  }

  function floor(n) {
    return n >= 0 ? (n | 0) : ((n | 0) - 1);
  }

  function sqrt(n) {
    if (n < 65536) {
      let r = 0x100; // 8 loops
      let t = 0;
      while (r > 0) {
        const tmp = t | ((r >>= 1) | 0);
        if (tmp * tmp <= n) t = tmp;
      }
      return t;
    } else {
      let r = 0x10000; // 16 loops  
      let t = 0;
      while (r > 0) {
        const tmp = t | ((r >>= 1) | 0);
        if (tmp * tmp <= n) t = tmp;
      }
      return t;
    }
  }

  function walk(x1, y1, x2, y2) {
    if (distance(x1, y1, x2, y2) === 0) return 0;
    if (abs(x1 - x2) > abs(y1 - y2)) {
      if (x2 > x1) return 1;
      else return 3;
    } else if (y2 > y1) {
      return 4;
    } else {
      return 2;
    }
  }

  function crossWalk(x1, y1, x2, y2) {
    if (abs(x2 - x1) > abs(y2 - y1)) {
      if (y2 > y1) return 4;
      else if (y2 < y1) return 2;
      else if (x2 > x1) return 1;
      else if (x2 < x1) return 3;
      else return 0;
    } else {
      if (x2 > x1) return 1;
      else if (x2 < x1) return 3;
      else if (y2 > y1) return 4;
      else if (y2 < y1) return 2;
      else return 0;
    }
  }

  function randomInt(brain, min, max) {
    brain.rnd = (brain.rnd * 3 + 1) & 7; // Simple RNG
    return min + (brain.rnd % (max - min + 1));
  }

  // Constants
  const UNINITIALIZED = 0;
  const SCOUT = 1;
  const RETURN_FOOD = 2;
  const GUARD = 3;
  const BASE = 4;
  const NEW_BASE = 5;
  const PATROL = 6;

  const xOffset = [0, 1, 0, -1, 0];
  const yOffset = [0, 0, -1, 0, 1];

  const myBrain = antInfo.brains[0];
  let direction = 0;
  let prevState = -1;

  // State machine with loops similar to C implementation
  while (myBrain.state !== prevState) {
    prevState = myBrain.state;
    direction = 0;

    switch (myBrain.state) {
      case UNINITIALIZED: {
        myBrain.xPos = 0;
        myBrain.yPos = 0;
        myBrain.xtarget = 0;
        myBrain.ytarget = 0;
        myBrain.food = 0;
        myBrain.dir = 0;
        
        let activity = 0;
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state !== UNINITIALIZED) activity++;
        }
        for (let i = 1; i < 5; i++) {
          if (squareData[i].numAnts > 0) activity++;
        }
        
        if (activity === 0) {
          myBrain.state = BASE;
          myBrain.patrolDistance = 0;
          myBrain.count = 0;
          myBrain.firstBase = 1;
        }
        break;
      }

      case SCOUT: {
        if (squareData[0].numFood > 0 && (myBrain.xPos !== 0 || myBrain.yPos !== 0)) {
          let returningAnts = 0;
          const myDistance = distance(myBrain.xPos, myBrain.yPos, 0, 0);
          
          for (let i = 1; i < antInfo.brains.length; i++) {
            switch (antInfo.brains[i].state) {
              case RETURN_FOOD:
                returningAnts++;
                break;
              case BASE:
                myBrain.xtarget -= myBrain.xPos;
                myBrain.ytarget -= myBrain.yPos;
                myBrain.xPos = 0;
                myBrain.yPos = 0;
                returningAnts = 200;
                i = antInfo.brains.length;
                break;
              case SCOUT:
              case PATROL:
              case GUARD:
                if (distance(antInfo.brains[i].xPos, antInfo.brains[i].yPos, 0, 0) < myDistance) {
                  myBrain.xtarget = myBrain.xtarget - (myBrain.xPos - antInfo.brains[i].xPos);
                  myBrain.ytarget = myBrain.ytarget - (myBrain.yPos - antInfo.brains[i].yPos);
                  myBrain.xPos = antInfo.brains[i].xPos;
                  myBrain.yPos = antInfo.brains[i].yPos;
                }
                break;
            }
          }
          
          if (squareData[0].numFood > returningAnts) {
            myBrain.xtarget = myBrain.xPos;
            myBrain.ytarget = myBrain.yPos;
            myBrain.state = RETURN_FOOD;
            myBrain.food = ((squareData[0].numFood - returningAnts) / 2) | 0;
          }
        } else {
          if (myBrain.xPos === myBrain.xtarget && myBrain.yPos === myBrain.ytarget) {
            if (myBrain.xPos === 0 && myBrain.yPos === 0) {
              myBrain.state = UNINITIALIZED;
            } else {
              let x, y;
              if (myBrain.food > 0) {
                x = randomInt(myBrain, myBrain.xtarget, myBrain.xtarget * 1.1);
                y = randomInt(myBrain, myBrain.ytarget, myBrain.ytarget * 1.1);
                myBrain.food = 0;
              } else if (myBrain.dir) {
                x = myBrain.xPos + myBrain.yPos; // 45 degrees clockwise
                y = myBrain.yPos - myBrain.xPos;
              } else {
                x = myBrain.xPos - myBrain.yPos; // 45 degrees counterclockwise
                y = myBrain.yPos + myBrain.xPos;
              }
              
              const radius = sqrt(myBrain.xPos * myBrain.xPos + myBrain.yPos * myBrain.yPos);
              x = ((x * 10 * (radius + 20)) / (14 * radius)) | 0;
              y = ((y * 10 * (radius + 20)) / (14 * radius)) | 0;
              myBrain.xtarget = x;
              myBrain.ytarget = y;
              myBrain.dir = randomInt(myBrain, 0, 1);
            }
          } else {
            direction = walk(myBrain.xPos, myBrain.yPos, myBrain.xtarget, myBrain.ytarget);
            if (myBrain.xtarget === 0 && myBrain.ytarget === 0) {
              direction |= 8;
            } else {
              if (myBrain.xPos !== 0 || myBrain.yPos !== 0) {
                for (let i = 1; i < 5; i++) {
                  if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
                    if (myBrain.xPos + xOffset[i] !== 0 && myBrain.yPos + yOffset[i] !== 0) {
                      direction = i;
                    }
                  }
                }
              }
            }
          }
        }
        break;
      }

      case RETURN_FOOD: {
        // Find closest home
        for (let i = 1; i < antInfo.brains.length; i++) {
          switch (antInfo.brains[i].state) {
            case BASE:
              myBrain.xtarget -= myBrain.xPos;
              myBrain.ytarget -= myBrain.yPos;
              myBrain.xPos = 0;
              myBrain.yPos = 0;
              break;
            case UNINITIALIZED:
              break;
            default:
              if (distance(antInfo.brains[i].xPos, antInfo.brains[i].yPos, 0, 0) < 
                  distance(myBrain.xPos, myBrain.yPos, 0, 0)) {
                myBrain.xtarget = myBrain.xtarget - (myBrain.xPos - antInfo.brains[i].xPos);
                myBrain.ytarget = myBrain.ytarget - (myBrain.yPos - antInfo.brains[i].yPos);
                myBrain.xPos = antInfo.brains[i].xPos;
                myBrain.yPos = antInfo.brains[i].yPos;
              }
              break;
          }
        }
        
        if (squareData[0].numFood > 0 && (myBrain.xPos !== 0 || myBrain.yPos !== 0)) {
          let returningAnts = 0;
          for (let i = 0; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === RETURN_FOOD) returningAnts++;
          }
          
          if (returningAnts > squareData[0].numFood) {
            myBrain.state = SCOUT;
          } else {
            direction = crossWalk(myBrain.xPos, myBrain.yPos, 0, 0) + 8;
            for (let i = 1; i < antInfo.brains.length; i++) {
              if (myBrain.food > 1) {
                antInfo.brains[i].xtarget = myBrain.xtarget - (myBrain.xPos - antInfo.brains[i].xPos);
                antInfo.brains[i].ytarget = myBrain.ytarget - (myBrain.yPos - antInfo.brains[i].yPos);
                antInfo.brains[i].xPos = myBrain.xPos;
                antInfo.brains[i].yPos = myBrain.yPos;
                antInfo.brains[i].state = SCOUT;
                const newFood = myBrain.food - 3;
                antInfo.brains[i].food = newFood;
                myBrain.food = newFood;
              }
            }
          }
        } else {
          myBrain.state = SCOUT;
        }
        break;
      }

      case GUARD: {
        myBrain.count--;
        if (myBrain.count === 0) {
          myBrain.state = SCOUT;
          myBrain.xtarget = myBrain.xPos;
          myBrain.ytarget = myBrain.yPos;
        } else if (myBrain.xPos !== 0 || myBrain.yPos !== 0) {
          // Draft more guards if necessary
          let guardCount = 1;
          let nonGuardIndex = 0;
          for (let i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state !== GUARD && antInfo.brains[i].state !== RETURN_FOOD) {
              nonGuardIndex = i;
            } else if (antInfo.brains[i].state === GUARD) {
              guardCount++;
            }
          }
          
          if (guardCount < 3 && nonGuardIndex !== 0 && myBrain.count > 500) {
            antInfo.brains[nonGuardIndex].state = GUARD;
            myBrain.count = floor(myBrain.count / 2);
            antInfo.brains[nonGuardIndex].count = myBrain.count;
          }
          
          // Check for food while guarding
          for (let i = 0; i < 5; i++) {
            if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood && squareData[i].numFood > 1) {
              if (myBrain.xPos + xOffset[i] !== 0 || myBrain.yPos + yOffset[i] !== 0) {
                direction = i;
                myBrain.state = RETURN_FOOD;
                myBrain.xtarget = myBrain.xPos + xOffset[i];
                myBrain.ytarget = myBrain.yPos + yOffset[i];
                myBrain.food = squareData[i].numFood;
              }
            }
          }
        } else {
          myBrain.state = UNINITIALIZED;
        }
        break;
      }

      case BASE: {
        // Count existing base ants
        let baseCount = 0;
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === BASE) baseCount++;
        }
        
        if (baseCount > 0) {
          myBrain.state = UNINITIALIZED;
          myBrain.xPos = 0;
          myBrain.yPos = 0;
          myBrain.xtarget = 0;
          myBrain.ytarget = 0;
          myBrain.food = 0;
          myBrain.dir = 0;
        } else {
          // Initialize new ants as patrol ants
          for (let i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === UNINITIALIZED) {
              antInfo.brains[i].xPos = 0;
              antInfo.brains[i].yPos = 0;
              
              const maxPatrol = (myBrain.patrolDistance * 2) / 3;
              const range = maxPatrol < 30 ? 30 : maxPatrol;
              
              antInfo.brains[i].xtarget = (((myBrain.count >> 3) | 0) % range) * 3 + 3;
              antInfo.brains[i].dir = myBrain.count & 1;
              antInfo.brains[i].food = (((myBrain.count & 6) >> 1) | 0) + 1;
              antInfo.brains[i].ytarget = 0;
              antInfo.brains[i].state = PATROL;
              
              myBrain.count++;
              if (myBrain.count > range * 8) {
                myBrain.count = 0;
              }
            }
          }
        }
        break;
      }

      case PATROL: {
        // Simple patrol logic - move in patterns around base
        if (squareData[0].numFood > 0 && (myBrain.xPos !== 0 || myBrain.yPos !== 0)) {
          let returningAnts = 0;
          for (let i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === RETURN_FOOD) returningAnts++;
          }
          
          if (squareData[0].numFood > returningAnts) {
            myBrain.xtarget = myBrain.xPos;
            myBrain.ytarget = myBrain.yPos;
            myBrain.state = RETURN_FOOD;
            myBrain.food = squareData[0].numFood - returningAnts;
          }
        } else {
          // Patrol movement pattern
          const patrolDir = myBrain.food;
          let nextDir = myBrain.dir ? (patrolDir % 4) + 1 : patrolDir - 1;
          if (nextDir < 1) nextDir += 4;
          if (nextDir > 4) nextDir -= 4;
          
          switch (myBrain.ytarget) {
            case 0: // going away from home
              direction = walk(myBrain.xPos, myBrain.yPos, 
                xOffset[patrolDir] * myBrain.xtarget, 
                yOffset[patrolDir] * myBrain.xtarget);
              if (direction === 0) myBrain.ytarget++;
              break;
            case 1: // first turn
              direction = walk(myBrain.xPos, myBrain.yPos,
                (xOffset[patrolDir] + xOffset[nextDir]) * myBrain.xtarget,
                (yOffset[patrolDir] + yOffset[nextDir]) * myBrain.xtarget);
              if (direction === 0) myBrain.ytarget++;
              break;
            case 2: // second turn 
              direction = walk(myBrain.xPos, myBrain.yPos,
                xOffset[nextDir] * myBrain.xtarget,
                yOffset[nextDir] * myBrain.xtarget);
              if (direction === 0) myBrain.ytarget++;
              break;
            case 3: // returning home
              direction = walk(myBrain.xPos, myBrain.yPos, 0, 0);
              if (direction === 0) myBrain.ytarget++;
              break;
            case 4:
              myBrain.state = UNINITIALIZED;
              if (myBrain.xPos !== 0 || myBrain.yPos !== 0) {
                myBrain.state = SCOUT;
              }
              break;
          }
          
          // Check for food while patrolling
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
        break;
      }
    }
  }

  // Ensure there's always a base ant
  if (squareData[0].base || (myBrain.xPos === 0 && myBrain.yPos === 0)) {
    let baseCount = 0;
    for (let i = 0; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].state === BASE) {
        baseCount++;
        break;
      }
    }
    
    if (baseCount === 0) {
      myBrain.state = BASE;
      direction = 0;
      myBrain.patrolDistance = 0;
      myBrain.count = 0;
      myBrain.firstBase = 0;
      
      for (let i = 1; i < 5; i++) {
        if (squareData[i].base) {
          direction = i;
          myBrain.state = UNINITIALIZED;
        }
      }
    }
  }

  // Attack enemies
  for (let i = 1; i < 5; i++) {
    if (squareData[i].team > 0 && squareData[i].team !== squareData[0].team) {
      direction = i;
      if (myBrain.state === BASE) {
        myBrain.xPos = 0;
        myBrain.yPos = 0;
      }
      myBrain.state = GUARD;
      myBrain.count = 1500;
    }
  }

  // Update position tracking
  if (direction > 0 && direction < 5) {
    myBrain.xPos += xOffset[direction];
    myBrain.yPos += yOffset[direction];
  }

  return direction;
}