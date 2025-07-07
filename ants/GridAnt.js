function GridAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        rnd: 12345,
        xpos: 0,
        ypos: 0,
        xtarget: 0,
        ytarget: 0,
        food: 0,
        state: 0, // 0=uninit, 1=patrol, 2=return, 3=guard, 4=goto, 5=lineguard, 6=square, 7=shoot
        dir: 0
      },
      name: 'GridAnt',
      color: '#ff8000', // Orange color from C implementation
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

  function random(brain) {
    // Linear congruential generator
    const a = 1588635695;
    const m = 4294967291;
    const q = 2;
    const r = 1117695901;
    
    brain.rnd = a * (brain.rnd % q) - r * floor(brain.rnd / q);
    if (brain.rnd < 0) brain.rnd += m;
    return brain.rnd / m;
  }

  function randomInt(brain, min, max) {
    return floor(random(brain) * (max - min + 1)) + min;
  }

  function fuzzyWalk(brain, x1, y1, x2, y2) {
    if (randomInt(brain, -abs(x1 - x2), abs(y1 - y2)) < 0) {
      if (x2 > x1) return 1;
      else if (x1 > x2) return 3;
      else if (y2 > y1) return 4;
      else if (y1 > y2) return 2;
      else return 0;
    } else {
      if (y2 > y1) return 4;
      else if (y1 > y2) return 2;
      else if (x2 > x1) return 1;
      else if (x1 > x2) return 3;
      else return 0;
    }
  }

  // Constants
  const UNINITIALIZED = 0;
  const PATROL = 1;
  const RETURN_FOOD = 2;
  const GUARD = 3;
  const GOTO_XTYT = 4;
  const LINE_GUARD = 5;
  const SQUARE_PATROL = 6;
  const SHOOT = 7;

  const xOffset = [0, 1, 0, -1, 0];
  const yOffset = [0, 0, -1, 0, 1];

  const myBrain = antInfo.brains[0];
  let direction = 0;

  // Initialize random seed if needed
  if (!myBrain.rnd) {
    myBrain.rnd = antInfo.random || 12345;
  }

  switch (myBrain.state) {
    case UNINITIALIZED: {
      myBrain.dir = (myBrain.rnd & 3) + 1;
      myBrain.state = PATROL;
      myBrain.ytarget = 0;
      myBrain.xtarget = -((myBrain.rnd >> 7) & 1) * 42;
      
      if (randomInt(myBrain, 1, 4) === 1) {
        myBrain.xtarget = 0;
        myBrain.food = 0;
        myBrain.state = SHOOT;
      }
      break;
    }

    case PATROL: {
      if (squareData[0].numFood > 0 && (myBrain.xpos !== 0 || myBrain.ypos !== 0)) {
        let returningAnts = 0;
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === RETURN_FOOD) {
            returningAnts++;
          }
        }
        
        if (squareData[0].numFood > returningAnts) {
          myBrain.xtarget = myBrain.xpos;
          myBrain.ytarget = myBrain.ypos;
          myBrain.state = RETURN_FOOD;
          myBrain.food = squareData[0].numFood - returningAnts;
        }
      } else {
        if (myBrain.xtarget === 0 && myBrain.ytarget === 0) {
          myBrain.dir = ((myBrain.rnd >> 27) & 3) + 1;
        }
        
        if (myBrain.xtarget >= myBrain.ytarget) {
          myBrain.xtarget = 0;
          if (myBrain.ytarget <= 3) {
            myBrain.ytarget += 3;
          } else {
            myBrain.ytarget += 6;
          }
          
          if (myBrain.rnd & 4) {
            myBrain.dir++;
            if (myBrain.dir > 4) myBrain.dir = 1;
          } else {
            myBrain.dir--;
            if (myBrain.dir < 1) myBrain.dir = 4;
          }
        }
        
        myBrain.xtarget++;
        direction = myBrain.dir;
        
        // Check for nearby food
        if (myBrain.xpos !== 0 || myBrain.ypos !== 0) {
          for (let i = 1; i < 5; i++) {
            if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
              if (myBrain.xpos + xOffset[i] !== 0 || myBrain.ypos + yOffset[i] !== 0) {
                direction = i;
              }
            }
          }
        }
      }
      break;
    }

    case RETURN_FOOD: {
      if (myBrain.xpos === 0 && myBrain.ypos === 0) {
        myBrain.state = GOTO_XTYT;
      } else {
        let returningAnts = 1;
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === RETURN_FOOD) {
            returningAnts++;
          }
        }
        
        if (returningAnts > squareData[0].numFood) {
          myBrain.state = PATROL;
          myBrain.xtarget = 0;
          myBrain.ytarget = 0;
          myBrain.food = 0;
        } else {
          direction = fuzzyWalk(myBrain, myBrain.xpos, myBrain.ypos, 0, 0) + 8;
          
          // Share food location with other ants
          for (let i = 1; i < antInfo.brains.length; i++) {
            if ((antInfo.brains[i].state === PATROL || 
                 antInfo.brains[i].state === UNINITIALIZED || 
                 antInfo.brains[i].state === GOTO_XTYT) && myBrain.food > 2) {
              antInfo.brains[i].state = GOTO_XTYT;
              antInfo.brains[i].xtarget = myBrain.xtarget;
              antInfo.brains[i].ytarget = myBrain.ytarget;
              antInfo.brains[i].food = myBrain.food - 3;
              myBrain.food -= 3;
            }
          }
        }
      }
      break;
    }

    case GOTO_XTYT: {
      if (myBrain.xpos !== myBrain.xtarget || myBrain.ypos !== myBrain.ytarget) {
        direction = fuzzyWalk(myBrain, myBrain.xpos, myBrain.ypos, myBrain.xtarget, myBrain.ytarget);
        
        if (myBrain.xpos !== 0 || myBrain.ypos !== 0) {
          for (let i = 0; i < 5; i++) {
            if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
              if (myBrain.xpos + xOffset[i] !== 0 || myBrain.ypos + yOffset[i] !== 0) {
                direction = i;
                myBrain.state = RETURN_FOOD;
                myBrain.xtarget = myBrain.xpos + xOffset[i];
                myBrain.ytarget = myBrain.ypos + yOffset[i];
                myBrain.food = squareData[i].numFood;
              }
            }
          }
        }
      } else {
        myBrain.state = UNINITIALIZED;
      }
      break;
    }

    case GUARD: {
      myBrain.xtarget--;
      if ((myBrain.xtarget % 20) === 0) {
        direction = fuzzyWalk(myBrain, myBrain.xpos, myBrain.ypos, myBrain.xpos * 2, myBrain.ypos * 2);
      }
      
      if (myBrain.xtarget === 0) {
        myBrain.state = PATROL;
        myBrain.xtarget = 0;
        myBrain.ytarget = 0;
        direction = 0;
      } else if (myBrain.xpos !== 0 || myBrain.ypos !== 0) {
        for (let i = 0; i < 5; i++) {
          if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
            if (myBrain.xpos + xOffset[i] !== 0 || myBrain.ypos + yOffset[i] !== 0) {
              direction = i;
              myBrain.state = RETURN_FOOD;
              myBrain.xtarget = myBrain.xpos + xOffset[i];
              myBrain.ytarget = myBrain.ypos + yOffset[i];
              myBrain.food = squareData[i].numFood;
            }
          }
        }
      }
      break;
    }

    case SHOOT: {
      const SL = 999;
      const i = randomInt(myBrain, 0, SL * 4 - 1);
      let newXT = -(SL - 1) / 2 + i;
      let newYT = (SL + 1) / 2;
      let adjustedI = i;
      
      if (newXT > (SL - 1) / 2) {
        adjustedI -= SL;
        newXT = newYT;
        newYT = (SL - 1) / 2 - adjustedI;
      }
      if (newYT < -(SL - 1) / 2) {
        adjustedI -= SL;
        newYT = -newXT;
        newXT = (SL - 1) / 2 - adjustedI;
      }
      if (newXT < -(SL - 1) / 2) {
        adjustedI -= SL;
        newXT = newYT;
        newYT = -(SL - 1) / 2 + adjustedI;
      }
      
      myBrain.state = GOTO_XTYT;
      myBrain.xtarget = newXT + myBrain.xpos;
      myBrain.ytarget = newYT + myBrain.ypos;
      break;
    }
  }

  // Attack enemies
  for (let i = 1; i < 5; i++) {
    if (squareData[i].team > 0 && squareData[i].team !== squareData[0].team) {
      direction = i;
      myBrain.state = GUARD;
      myBrain.xtarget = 1500;
    }
  }

  // Update position tracking with overflow check
  const d = distance(myBrain.xpos, myBrain.ypos, 0, 0);
  if ((squareData[direction & 7].numAnts >= 255 - d * 5 && d < 4) ||
      (squareData[direction & 7].numAnts >= 255)) {
    return 0; // Wait
  }
  
  if (direction > 0 && direction < 5) {
    myBrain.xpos += xOffset[direction & 7];
    myBrain.ypos += yOffset[direction & 7];
  }

  return direction;
}