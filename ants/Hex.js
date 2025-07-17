function Hex(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        px: 0,
        py: 0,
        flags: 0,
        id: 0
      },
      name: 'Hex',
      color: '#800080' // Purple color
    };
  }

  // Constants
  var STOP = 0, HERE = 0, EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;
  var CARRY = 8, BUILDBASE = 16;
  
  // Flag constants
  var flKNOWSFOOD = 128;
  var flPROTECT = 64;
  var flGOROUNDDIR = 32;
  var flONLYNEAR = 16;
  var flSOLDIER = 8;
  var flGOCLOSE = 4;
  var flRESETKEEP = flGOROUNDDIR | flGOCLOSE;
  var flBASEKEEP = flGOROUNDDIR | flGOCLOSE | flKNOWSFOOD | flPROTECT;

  var NewBaseFood = 20;
  var NewBaseAnts = 10;
  var MaxSquareAnts = 200;

  var RX = [0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0,
           1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0];
  var RY = [0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0,
           0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0];

  // Precise hexagonal direction table from original C implementation
  var DIRS = [
    {x: -64, y: 0}, 
    {x: -63, y: 1}, {x: -63, y: 3}, {x: -62, y: 4}, {x: -61, y: 5}, {x: -61, y: 7}, {x: -60, y: 8}, 
    {x: -59, y: 9}, {x: -59, y: 11}, {x: -58, y: 12}, {x: -57, y: 13}, {x: -57, y: 15}, {x: -56, y: 16}, 
    {x: -55, y: 17}, {x: -55, y: 19}, {x: -54, y: 20}, {x: -53, y: 21}, {x: -53, y: 23}, {x: -52, y: 24}, 
    {x: -51, y: 25}, {x: -51, y: 27}, {x: -50, y: 28}, {x: -49, y: 29}, {x: -49, y: 31}, {x: -48, y: 32}, 
    {x: -47, y: 33}, {x: -47, y: 35}, {x: -46, y: 36}, {x: -45, y: 37}, {x: -45, y: 39}, {x: -44, y: 40}, 
    {x: -43, y: 41}, {x: -43, y: 43}, {x: -42, y: 44}, {x: -41, y: 45}, {x: -41, y: 47}, {x: -40, y: 48}, 
    {x: -39, y: 49}, {x: -39, y: 51}, {x: -38, y: 52}, {x: -37, y: 53}, {x: -37, y: 55}, {x: -36, y: 56}, 
    {x: -35, y: 57}, {x: -35, y: 59}, {x: -34, y: 60}, {x: -33, y: 61}, {x: -33, y: 63}, {x: -32, y: 64}, 
    {x: -30, y: 64}, {x: -28, y: 64}, {x: -26, y: 64}, {x: -24, y: 64}, {x: -22, y: 64}, {x: -20, y: 64}, 
    {x: -18, y: 64}, {x: -16, y: 64}, {x: -14, y: 64}, {x: -12, y: 64}, {x: -10, y: 64}, {x: -8, y: 64}, 
    {x: -6, y: 64}, {x: -4, y: 64}, {x: -2, y: 64}, {x: 0, y: 64}, 
    {x: 2, y: 64}, {x: 4, y: 64}, 
    {x: 6, y: 64}, {x: 8, y: 64}, {x: 10, y: 64}, {x: 12, y: 64}, {x: 14, y: 64}, {x: 16, y: 64}, 
    {x: 18, y: 64}, {x: 20, y: 64}, {x: 22, y: 64}, {x: 24, y: 64}, {x: 26, y: 64}, {x: 28, y: 64}, 
    {x: 30, y: 64}, {x: 32, y: 64}, {x: 33, y: 63}, {x: 33, y: 61}, {x: 34, y: 60}, {x: 35, y: 59}, 
    {x: 35, y: 57}, {x: 36, y: 56}, {x: 37, y: 55}, {x: 37, y: 53}, {x: 38, y: 52}, {x: 39, y: 51}, 
    {x: 39, y: 49}, {x: 40, y: 48}, {x: 41, y: 47}, {x: 41, y: 45}, {x: 42, y: 44}, {x: 43, y: 43}, 
    {x: 43, y: 41}, {x: 44, y: 40}, {x: 45, y: 39}, {x: 45, y: 37}, {x: 46, y: 36}, {x: 47, y: 35}, 
    {x: 47, y: 33}, {x: 48, y: 32}, {x: 49, y: 31}, {x: 49, y: 29}, {x: 50, y: 28}, {x: 51, y: 27}, 
    {x: 51, y: 25}, {x: 52, y: 24}, {x: 53, y: 23}, {x: 53, y: 21}, {x: 54, y: 20}, {x: 55, y: 19}, 
    {x: 55, y: 17}, {x: 56, y: 16}, {x: 57, y: 15}, {x: 57, y: 13}, {x: 58, y: 12}, {x: 59, y: 11}, 
    {x: 59, y: 9}, {x: 60, y: 8}, {x: 61, y: 7}, {x: 61, y: 5}, {x: 62, y: 4}, {x: 63, y: 3}, 
    {x: 63, y: 1}, {x: 64, y: 0}, 
    {x: 63, y: -1}, {x: 63, y: -3}, {x: 62, y: -4}, {x: 61, y: -5}, 
    {x: 61, y: -7}, {x: 60, y: -8}, {x: 59, y: -9}, {x: 59, y: -11}, {x: 58, y: -12}, {x: 57, y: -13}, 
    {x: 57, y: -15}, {x: 56, y: -16}, {x: 55, y: -17}, {x: 55, y: -19}, {x: 54, y: -20}, {x: 53, y: -21}, 
    {x: 53, y: -23}, {x: 52, y: -24}, {x: 51, y: -25}, {x: 51, y: -27}, {x: 50, y: -28}, {x: 49, y: -29}, 
    {x: 49, y: -31}, {x: 48, y: -32}, {x: 47, y: -33}, {x: 47, y: -35}, {x: 46, y: -36}, {x: 45, y: -37}, 
    {x: 45, y: -39}, {x: 44, y: -40}, {x: 43, y: -41}, {x: 43, y: -43}, {x: 42, y: -44}, {x: 41, y: -45}, 
    {x: 41, y: -47}, {x: 40, y: -48}, {x: 39, y: -49}, {x: 39, y: -51}, {x: 38, y: -52}, {x: 37, y: -53}, 
    {x: 37, y: -55}, {x: 36, y: -56}, {x: 35, y: -57}, {x: 35, y: -59}, {x: 34, y: -60}, {x: 33, y: -61}, 
    {x: 33, y: -63}, {x: 32, y: -64}, {x: 30, y: -64}, {x: 28, y: -64}, {x: 26, y: -64}, {x: 24, y: -64}, 
    {x: 22, y: -64}, {x: 20, y: -64}, {x: 18, y: -64}, {x: 16, y: -64}, {x: 14, y: -64}, {x: 12, y: -64}, 
    {x: 10, y: -64}, {x: 8, y: -64}, {x: 6, y: -64}, {x: 4, y: -64}, {x: 2, y: -64}, {x: 0, y: -64}, 
    {x: -2, y: -64}, {x: -4, y: -64}, {x: -6, y: -64}, {x: -8, y: -64}, {x: -10, y: -64}, {x: -12, y: -64}, 
    {x: -14, y: -64}, {x: -16, y: -64}, {x: -18, y: -64}, {x: -20, y: -64}, {x: -22, y: -64}, {x: -24, y: -64}, 
    {x: -26, y: -64}, {x: -28, y: -64}, {x: -30, y: -64}, {x: -32, y: -64}, {x: -33, y: -63}, {x: -33, y: -61}, 
    {x: -34, y: -60}, {x: -35, y: -59}, {x: -35, y: -57}, {x: -36, y: -56}, {x: -37, y: -55}, {x: -37, y: -53}, 
    {x: -38, y: -52}, {x: -39, y: -51}, {x: -39, y: -49}, {x: -40, y: -48}, {x: -41, y: -47}, {x: -41, y: -45}, 
    {x: -42, y: -44}, {x: -43, y: -43}, {x: -43, y: -41}, {x: -44, y: -40}, {x: -45, y: -39}, {x: -45, y: -37}, 
    {x: -46, y: -36}, {x: -47, y: -35}, {x: -47, y: -33}, {x: -48, y: -32}, {x: -49, y: -31}, {x: -49, y: -29}, 
    {x: -50, y: -28}, {x: -51, y: -27}, {x: -51, y: -25}, {x: -52, y: -24}, {x: -53, y: -23}, {x: -53, y: -21}, 
    {x: -54, y: -20}, {x: -55, y: -19}, {x: -55, y: -17}, {x: -56, y: -16}, {x: -57, y: -15}, {x: -57, y: -13}, 
    {x: -58, y: -12}, {x: -59, y: -11}, {x: -59, y: -9}, {x: -60, y: -8}, {x: -61, y: -7}, {x: -61, y: -5}, 
    {x: -62, y: -4}, {x: -63, y: -3}, {x: -63, y: -1}
  ];

  var bitswap6 = [
    0, 32, 16, 48, 8, 40, 24, 56,
    4, 36, 20, 52, 12, 44, 28, 60,
    2, 34, 18, 50, 10, 42, 26, 58,
    6, 38, 22, 54, 14, 46, 30, 62,
    1, 33, 17, 49, 9, 41, 25, 57,
    5, 37, 21, 53, 13, 45, 29, 61,
    3, 35, 19, 51, 11, 43, 27, 59,
    7, 39, 23, 55, 15, 47, 31, 63
  ];

  var mem = antInfo.brains[0];

  // Initialize ant if needed
  if (!mem.flags && !mem.id) {
    mem.flags = flGOROUNDDIR; // Default search direction
    mem.id = 64; // Start with a reasonable direction
  }

  // Helper functions
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  function goHome() {
    if (!mem.px) {
      if (!mem.py) return STOP;
      return (mem.py > 0) ? SOUTH : NORTH;
    }
    if (!mem.py) return (mem.px > 0) ? WEST : EAST;

    if ((mem.px + mem.py) & 1) {
      return (mem.py > 0) ? SOUTH : NORTH;
    } else {
      return (mem.px > 0) ? WEST : EAST;
    }
  }

  function goThere(dstx, dsty) {
    var dx = abs(mem.px - dstx);
    var dy = abs(mem.py - dsty);
    var a = dx + dy;
    var aa = bitswap6[a & 63];
    
    if (mem.px === dstx) {
      if (mem.py === dsty) return STOP;
      return (mem.py < dsty) ? NORTH : SOUTH;
    }
    if (mem.py === dsty) return (mem.px < dstx) ? EAST : WEST;

    if (aa * (dx + dy) < dx * 64) {
      return (mem.px < dstx) ? EAST : WEST;
    } else {
      return (mem.py < dsty) ? NORTH : SOUTH;
    }
  }

  function goDir() {
    var dx, dy;
    
    // Ensure mem.id is in valid range [0-255]
    mem.id = mem.id & 255;
    
    if (mem.flags & flONLYNEAR) {
      dx = DIRS[mem.id].x;
      dy = DIRS[mem.id].y;
    } else {
      dx = (DIRS[mem.id].x * 3 / 2) | 0;
      dy = (DIRS[mem.id].y * 3 / 2) | 0;
    }

    if (mem.px === dx) {
      if (mem.py === dy) return STOP;
      return (mem.py > dy) ? SOUTH : NORTH;
    }
    if (mem.py === dy) {
      return (mem.px > dx) ? WEST : EAST;
    }

    return goThere(dx, dy);
  }

  function calcDir(x, y) {
    /*    48 b 96
     *     +---+
     *  a /  |  \ c
     * 0 +---+---+ 128
     *  f \  |  / d
     *     +---+
     *  208  e  176
     */
    if (y >= 0) {
      if (y < -2 * x) {
        return (-96 * y / (2 * x - y)) | 0;  //a
      } else if (y < 2 * x) {
        return (128 - 96 * y / (2 * x + y)) | 0; //c
      } else {
        return (64 + 32 * x / y) | 0; //b
      }
    } else { // y<0
      if (y > -2 * x) {
        return (128 - 96 * y / (2 * x - y)) | 0; //d
      } else if (y > 2 * x) {
        return (256 - 96 * y / (2 * x + y)) | 0; //f
      } else {
        return (192 + 32 * x / y) | 0; //e
      }
    }
  }

  function hexThink() {
    // Base logic
    if (squareData[0].base) {
      if (mem.px || mem.py) {
        mem.px = mem.py = 0;
        mem.flags &= flRESETKEEP;

        // Look for food information from other ants
        for (var i = 1; i < squareData[0].numAnts; i++) {
          if (antInfo.brains[i].flags & flKNOWSFOOD) {
            mem.id = antInfo.brains[i].id;
            break;
          }
        }
      } else {
        mem.flags &= flBASEKEEP;
      }
    }

    // Soldier/protect behavior
    if (mem.flags & (flSOLDIER | flPROTECT)) {
      if (squareData[0].numAnts >= 5) {
        mem.flags &= ~(flSOLDIER | flPROTECT);
      }
      if (mem.flags & flSOLDIER) {
        if (squareData[0].numAnts > 1) {
          if (--mem.id === 0) mem.flags &= ~flSOLDIER;
        }
        return STOP;
      } else {
        return goHome();
      }
    }

    // Food handling
    if (squareData[0].numFood) {
      if (squareData[0].numFood > squareData[0].numAnts) {
        if (!(mem.flags & flKNOWSFOOD)) {
          mem.flags |= flKNOWSFOOD;

          // Base building logic
          if (abs(mem.py) > 64) {
            if (mem.py > 0) mem.py -= 128;
            else mem.py += 128;
            mem.id += (mem.flags & flGOROUNDDIR) ? 64 : -64;
          } else if (abs(mem.px) + abs(mem.py) / 2 > 64) {
            if (mem.px > 0) mem.px -= 96;
            else mem.px += 96;
            if (mem.py > 0) mem.py -= 64;
            else mem.py += 64;
            mem.id += (mem.flags & flGOROUNDDIR) ? 64 : -64;
          }

          // Set direction
          if (mem.px || mem.py) {
            mem.id = calcDir(mem.px, mem.py);
          }
        }
      }

      var dir = goHome();
      if (dir) return dir | CARRY;
      
      // Base building
      mem.flags |= flONLYNEAR;
      if (squareData[0].numFood < NewBaseFood) {
        if (squareData[0].numAnts <= (squareData[0].numFood >> 2)) {
          return STOP;
        } else {
          return goDir();
        }
      } else {
        return STOP;
      }
    } else {
      // Share food knowledge
      if (mem.flags & flKNOWSFOOD) {
        for (var i = 1; i < squareData[0].numAnts; i++) {
          if (!(antInfo.brains[i].flags & flKNOWSFOOD)) {
            antInfo.brains[i].id = mem.id;
            antInfo.brains[i].flags &= ~flSOLDIER;
          }
        }
      }

      // Look for adjacent food
      for (var i = 1; i <= 4; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          // Not on base position?
          if (mem.px + RX[i] !== 0 || mem.py + RY[i] !== 0) {
            return i;
          }
        }
      }

      var dir = goDir();
      if (dir) return dir;
      
      // Change destination - hexagonal search pattern
      mem.flags &= ~flKNOWSFOOD;
      var delta = (mem.flags & flGOCLOSE ? 123 - 23 : 67 - 23) + 23 * squareData[0].numAnts;
      if (mem.flags & flGOROUNDDIR) {
        mem.id += delta;
      } else {
        mem.id -= delta;
      }
      mem.id = mem.id & 255; // Keep in valid range
      
      return goHome();
    }
  }

  var dir = hexThink();

  // Base building check
  if (squareData[0].numAnts > NewBaseAnts &&
      squareData[0].numFood >= NewBaseFood && 
      !squareData[0].base) {
    dir = BUILDBASE;
    mem.flags |= flPROTECT;
  }

  // Re-coordinate with other ants
  var myDist = abs(mem.px) + abs(mem.py);
  for (var i = 1; i < squareData[0].numAnts; i++) {
    var otherBrain = antInfo.brains[i];
    if (myDist < abs(otherBrain.px) + abs(otherBrain.py)) {
      otherBrain.px = mem.px;
      otherBrain.py = mem.py;
    }
  }

  // Ant congestion check
  if (squareData[dir & 7] && squareData[dir & 7].numAnts >= MaxSquareAnts) {
    dir = 5 - (dir & 7); // back up
  }

  // Enemy detection
  for (var i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i;
      mem.flags |= flSOLDIER;
      mem.id = 8; // Friend count
      break;
    }
  }

  // Update position
  mem.px += RX[dir];
  mem.py += RY[dir];
  
  return dir;
}