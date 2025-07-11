function GOA(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        time: 0,
        foodX: 0,
        foodY: 0,
        numFood: 0,
        ringNo: 0,
        posX: 0,
        posY: 0,
        caution: 0,
        status: 0
      },
      name: 'GOA',
      color: '#4682B4', // Steel blue color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const DIR_Stand = 0, DIR_Left = 1, DIR_Down = 2, DIR_Right = 3, DIR_Up = 4;
  const BASESPACING = 64;
  const CAUTION = 20;
  const NewBaseFood = 20;

  const mem = antInfo.brains[0];

  function getDirectionForDeltaPosition(targetX, targetY) {
    if (mem.posX > targetX) return DIR_Left;
    if (mem.posX < targetX) return DIR_Right;
    if (mem.posY > targetY) return DIR_Down;
    return DIR_Up; // mem.posY < targetY
  }

  function move(dir, bringFood, createBase) {
    const finalDir = dir + (bringFood ? 8 : 0) + (createBase ? 16 : 0);
    
    switch (dir) {
      case DIR_Left:
        mem.posX--;
        break;
      case DIR_Right:
        mem.posX++;
        break;
      case DIR_Up:
        mem.posY++;
        break;
      case DIR_Down:
        mem.posY--;
        break;
    }
    
    return finalDir;
  }

  function getEmperor() {
    for (let i = 1; i < squareData[0].numAnts; i++) {
      if (antInfo.brains[i].status === 1) {
        return antInfo.brains[i];
      }
    }
    return null;
  }

  function shareKnowledge(to, from) {
    // Share food knowledge
    if (from.numFood > 1 && to.numFood <= 1) {
      to.foodX = from.foodX;
      to.foodY = from.foodY;
      to.numFood = from.numFood;
    }
    
    // Share caution
    if (from.caution !== 0 && to.caution === 0) {
      to.caution = from.caution;
    }
  }

  function selectNewDirection() {
    const ringSize = mem.ringNo * 3;
    const dirs = [
      0,1, 1,1, 1,0, 1,-1, 0,-1, -1,-1, -1,0, -1,1, 
      0,1, 1,1, 1,0, 1,-1, 0,-1, -1,-1
    ];

    mem.numFood = 1;

    // Scale directions by ring size
    for (let i = 0; i < dirs.length; i++) {
      dirs[i] *= ringSize;
    }

    const dirStart = mem.time & 0x03;
    
    // Reset food target
    mem.foodX = 0;
    mem.foodY = 0;

    // If at base, choose direction based on ring
    if (mem.posX === 0 && mem.posY === 0) {
      if (dirStart & 0x01) {
        mem.foodY = (dirStart & 0x02) ? -ringSize : ringSize;
      } else {
        mem.foodX = (dirStart & 0x02) ? -ringSize : ringSize;
      }
      return getDirectionForDeltaPosition(mem.foodX, mem.foodY);
    }

    // Find current position in pattern and move to next
    for (let i = dirStart * 2; i < dirStart * 2 + 7; i++) {
      const patternX = dirs[i * 2];
      const patternY = dirs[i * 2 + 1];
      
      if (mem.posX === patternX && mem.posY === patternY) {
        const nextI = (i + 1) * 2;
        if (nextI + 1 < dirs.length) {
          mem.foodX = dirs[nextI];
          mem.foodY = dirs[nextI + 1];
          return getDirectionForDeltaPosition(mem.foodX, mem.foodY);
        }
      }
    }

    // Nothing found, go to base
    mem.foodX = 0;
    mem.foodY = 0;
    return getDirectionForDeltaPosition(0, 0);
  }

  // Initialize new ants
  if (mem.status === 0) {
    mem.time &= 0x03; // Clear to random(4)
    mem.numFood = 0;
    mem.ringNo = 0;
    mem.status = -1; // Normal ant
  }

  mem.time++;

  // Emperor logic
  if (mem.status === 1) {
    if (mem.posX !== 0 || mem.posY !== 0) {
      mem.status = 0; // No longer emperor if moved
    }
    if (mem.time > 1500 || !squareData[0].base) {
      mem.time &= 3;
    }
  } else {
    // Share knowledge with other ants
    if (mem.numFood !== 0) {
      if (squareData[0].numAnts > 1) {
        shareKnowledge(antInfo.brains[1], mem);
      }
      if (squareData[0].numAnts > 2) {
        shareKnowledge(antInfo.brains[2], mem);
      }
    }
  }

  // Base switching logic for distant positions
  if (mem.posX >= (5 * BASESPACING / 8 | 0)) {
    mem.posX -= BASESPACING;
    mem.status = 0;
  } else if (mem.posX <= (-5 * BASESPACING / 8 | 0)) {
    mem.posX += BASESPACING;
    mem.status = 0;
  } else if (mem.posY >= (5 * BASESPACING / 8 | 0)) {
    mem.posY -= BASESPACING;
    mem.status = 0;
  } else if (mem.posY <= (-5 * BASESPACING / 8 | 0)) {
    mem.posY += BASESPACING;
    mem.status = 0;
  }

  if (mem.status === 0) {
    mem.foodX = 0;
    mem.foodY = 0;
    mem.numFood = 1; // Go to base unless something better happens
  }

  // Check for enemies
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team) {
      mem.caution = CAUTION;
      return move(i, false, false); // Attack enemy
    }
  }

  // Emperor stays put
  if (mem.status === 1) return 0;

  // Caution behavior after enemy encounters
  if (mem.caution) {
    if (mem.caution === 1) {
      mem.caution++; // Forever cautious
    } else {
      mem.caution--;
      return 0;
    }
  }

  // Base logic
  if (mem.posX === 0 && mem.posY === 0) {
    mem.caution = 0;
    
    const emperor = getEmperor();
    
    if (!emperor || squareData[0].numAnts < 3) {
      // Become emperor
      mem.status = 1;
      mem.ringNo = 0;
      mem.time &= 0x03;
      return 0;
    }

    mem.ringNo = ++emperor.ringNo;
    if (emperor.ringNo >= (emperor.time / 128 | 0) + (BASESPACING / 6 | 0) + 8) {
      emperor.ringNo = emperor.time / 128 | 0;
    }

    if (!squareData[0].base) {
      // On base field without base
      if (squareData[0].numFood >= NewBaseFood) {
        return move(0, false, true);
      }
    } else {
      // On base field with base
      if (squareData[0].numAnts < 5) {
        // Become emperor
        mem.status = 1;
        mem.ringNo = 0;
        mem.time &= 0x03;
        return 0;
      }

      if (mem.time > 100) {
        // Old enough for war
        if (emperor.time > 1000) {
          // War time
          mem.status = (mem.time % 4) + 2;
          mem.numFood = 0;
          return move(mem.status - 1, false, false);
        }
      }
    }
  } else {
    // Not at base
    if (squareData[0].numFood) {
      // Found food
      const availableFood = squareData[0].numFood - squareData[0].numAnts;
      if (availableFood > 0) {
        mem.foodX = mem.posX;
        mem.foodY = mem.posY;
        mem.numFood = availableFood;
      }
      return move(getDirectionForDeltaPosition(0, 0), true, false);
    }
  }

  // Check adjacent squares for food
  const currentPos = (mem.posX & 0xFF) | ((mem.posY & 0xFF) << 8);
  
  if (squareData[DIR_Left].numFood > squareData[DIR_Left].numAnts && currentPos !== 0x0001) {
    return move(DIR_Left, false, false);
  }
  if (squareData[DIR_Down].numFood > squareData[DIR_Down].numAnts && currentPos !== 0x0100) {
    return move(DIR_Down, false, false);
  }
  if (squareData[DIR_Right].numFood > squareData[DIR_Right].numAnts && currentPos !== 0x00ff) {
    return move(DIR_Right, false, false);
  }
  if (squareData[DIR_Up].numFood > squareData[DIR_Up].numAnts && currentPos !== 0xff00) {
    return move(DIR_Up, false, false);
  }

  // Check for known food position
  if (mem.numFood > 0) {
    if (mem.foodX === mem.posX && mem.foodY === mem.posY) {
      // Arrived at food location but no food
      mem.numFood = 0;
    } else {
      // Go to known food
      return move(getDirectionForDeltaPosition(mem.foodX, mem.foodY), false, false);
    }
  }

  // War ant behavior
  if (mem.status >= 2) {
    if (mem.time++ > 3000) {
      mem.status = 0;
      mem.time = mem.time & 0xFFFF; // Random value for reinit
    }
    if (squareData[0].numAnts < 4) return 0;
    return move(mem.status - 1, false, false);
  }

  // Search for food
  return move(selectNewDirection(), false, false);
}