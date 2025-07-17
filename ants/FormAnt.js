function FormAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        r: 1,        // random seed
        x: 0,        // x position
        y: 0,        // y position  
        s: 0         // state variable
      },
      name: 'FormAnt',
      color: '#800080' // Purple color
    };
  }

  var mem = antInfo.brains[0];
  
  // Random number generator - equivalent to FAR function
  function getRandomDirection(maxVal) {
    mem.r = (mem.r * 89423309 + 89449237) >>> 0;
    return (((mem.r << 13) + (mem.r >>> 19)) >>> 0) % maxVal;
  }
  
  // Helper function for absolute value
  function abs(x) {
    return x >= 0 ? x : -x;
  }
  
  // Helper function for sign
  function sign(x) {
    return x < 0 ? -1 : x > 0 ? 1 : 0;
  }
  
  // Main algorithm (deobfuscated from PornAnt)
  function formAntLogic(squareData, mem) {
    var i, d, tx, ty;
    
    // State management
    if (mem.s === 21) mem.s = 1;
    if (mem.s >= 2) mem.s--;
    
    // Reset position if at grid boundary (64x64 grid reset)
    if (!(mem.x % 64 || mem.y % 64)) {
      mem.x = 0;
      mem.y = 0;
    }
    
    // Find closest teammate ant position (coordination behavior)
    for (i = 1; i < antInfo.brains.length; i++) {
      var otherAnt = antInfo.brains[i];
      if ((abs(otherAnt.x) + abs(otherAnt.y)) < (abs(mem.x) + abs(mem.y))) {
        mem.x = otherAnt.x;
        mem.y = otherAnt.y;
      }
    }
    
    // Enemy detection - attack immediately
    for (i = 1; i < 5; i++) {
      if (squareData[i].team && squareData[i].team !== squareData[0].team) {
        mem.s = 263; // High state value for combat
        return i;
      }
    }
    
    // Don't move if state is too high
    if (mem.s > 13) return 0;
    
    // Base behavior - at origin
    if (!mem.x && !mem.y) {
      mem.s = 0;
      
      // Build base if conditions are right
      if (!squareData[0].base && squareData[0].numFood >= 50) { // NewBaseFood
        return 16;
      }
      
      // Look for nearby food
      for (i = 1; i < 5; i++) {
        if (squareData[i].numFood && mem.s < 2) {
          return i;
        }
      }
      
      // Random exploration from base
      return getRandomDirection(4) + 1;
    }
    
    // Distance-based state management
    tx = mem.x * mem.x;
    ty = mem.y * mem.y;
    if (tx + ty > 8192) mem.s = 1;  // Far from base
    if (tx + ty < 2457) mem.s = 0;  // Close to base
    
    // Food collection behavior
    if (squareData[0].numFood && mem.s < 2) {
      // Close to base - return with food
      if (abs(mem.x) <= 2 && !mem.y) {
        return 10 + sign(mem.x); // 9, 10, or 11 (west, stay, east with food)
      }
      if (abs(mem.y) <= 2 && !mem.x) {
        return 11 + sign(mem.y); // 10, 11, or 12 (north, stay, south with food)
      }
      
      // Multiple food pieces - choose direction towards base
      if (squareData[0].numFood > 1) {
        if (!mem.x) {
          return 11 + sign(mem.y);
        } else if (!mem.y) {
          return 10 + sign(mem.x);
        } else if (abs(mem.x) < abs(mem.y)) {
          return 10 + sign(mem.x);
        } else {
          return 11 + sign(mem.y);
        }
      } else {
        // Single food piece - complex direction logic for nearby food
        d = 0;
        if (!mem.y) {
          if (squareData[4].numFood) d = 4;
          else if (squareData[2].numFood) d = 2;
          else if (squareData[2 - sign(mem.x)].numFood) d = 2 - sign(mem.x);
        } else if (!mem.x) {
          if (squareData[3].numFood) d = 3;
          else if (squareData[1].numFood) d = 1;
          else if (squareData[3 - sign(mem.y)].numFood) d = 3 - sign(mem.y);
        } else {
          if (squareData[3 - sign(mem.y)].numFood) d = 3 - sign(mem.y);
          else if (squareData[2 - sign(mem.x)].numFood) d = 2 - sign(mem.x);
        }
        
        if (d && squareData[d].numAnts < 100) { // MaxSquareAnts
          return d;
        }
      }
      
      // Default return to base with food
      if (!mem.x) {
        return 11 + sign(mem.y);
      } else if (!mem.y) {
        return 10 + sign(mem.x);
      } else if (abs(mem.x) < abs(mem.y)) {
        return 10 + sign(mem.x);
      } else {
        return 11 + sign(mem.y);
      }
    } else {
      // Exploration behavior when no food
      
      // Look for food in adjacent squares
      for (i = 1; i < 5; i++) {
        var newX = mem.x + (i === 1 ? 1 : i === 3 ? -1 : 0);
        var newY = mem.y + (i === 2 ? -1 : i === 4 ? 1 : 0);
        if ((newX || newY) && squareData[i].numFood && mem.s < 2 && squareData[i].numAnts < 100) {
          return i;
        }
      }
      
      // Close to base movement
      if (abs(mem.x) <= 3 && abs(mem.y) <= 3 && mem.s < 2) {
        if (abs(mem.x) > abs(mem.y)) {
          return 2 - sign(mem.x);
        } else {
          return 3 - sign(mem.y);
        }
      }
      
      // Complex directional movement based on position quadrant
      if (!mem.x) {
        if (squareData[2 + sign(mem.y)].numAnts) {
          return 3 - sign(mem.y);
        } else {
          return 2 + sign(mem.y);
        }
      } else if (!mem.y) {
        if (squareData[3 - sign(mem.x)].numAnts) {
          return 2 - sign(mem.x);
        } else {
          return 3 - sign(mem.x);
        }
      } else if (mem.x > 0) {
        if (mem.y > 0) {
          if (mem.x > mem.y) {
            return mem.s === 1 ? (getRandomDirection(2) ? 2 : 1) : 2;
          } else {
            return mem.s === 1 ? 3 : (2 + getRandomDirection(2));
          }
        } else {
          if (mem.x > -mem.y) {
            return mem.s === 1 ? 2 : (1 + getRandomDirection(2));
          } else {
            return mem.s === 1 ? (1 + getRandomDirection(2)) : 1;
          }
        }
      } else {
        if (mem.y > 0) {
          if (-mem.x > mem.y) {
            return mem.s === 1 ? 4 : (3 + getRandomDirection(2));
          } else {
            return mem.s === 1 ? (3 + getRandomDirection(2)) : 3;
          }
        } else {
          if (-mem.x > -mem.y) {
            return mem.s === 1 ? (getRandomDirection(2) ? 4 : 1) : 4;
          } else {
            return mem.s === 1 ? 1 : (getRandomDirection(2) ? 4 : 1);
          }
        }
      }
    }
  }
  
  // Main execution
  var result = formAntLogic(squareData, mem);
  var direction = result & 7;
  
  // Update position if moving
  if (direction && squareData[direction] && squareData[direction].numAnts < 100) {
    mem.x += (direction === 1 ? 1 : direction === 3 ? -1 : 0);
    mem.y += (direction === 2 ? -1 : direction === 4 ? 1 : 0);
  } else if (direction) {
    mem.s = 12; // Can't move, increase state
  }
  
  return result;
}