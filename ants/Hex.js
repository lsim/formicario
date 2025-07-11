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
      color: '#800080', // Purple color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const STOP = 0, HERE = 0, EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;
  const CARRY = 8, BUILDBASE = 16;
  
  // Flag constants
  const flKNOWSFOOD = 128;
  const flPROTECT = 64;
  const flGOROUNDDIR = 32;
  const flONLYNEAR = 16;
  const flSOLDIER = 8;
  const flGOCLOSE = 4;
  const flRESETKEEP = flGOROUNDDIR | flGOCLOSE;
  const flBASEKEEP = flGOROUNDDIR | flGOCLOSE | flKNOWSFOOD | flPROTECT;

  const NewBaseFood = 20;
  const NewBaseAnts = 10;
  const MaxSquareAnts = 200;

  const RX = [0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0,
             1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0];
  const RY = [0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0,
             0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0];

  // Hexagonal direction table (simplified version)
  const DIRS = [];
  for (let i = 0; i < 256; i++) {
    const angle = (i * 2 * 3.14159) / 256;
    const radius = 64;
    DIRS[i] = {
      x: (radius * Math.cos(angle) | 0),
      y: (radius * Math.sin(angle) | 0)
    };
  }

  const bitswap6 = [
    0, 32, 16, 48, 8, 40, 24, 56,
    4, 36, 20, 52, 12, 44, 28, 60,
    2, 34, 18, 50, 10, 42, 26, 58,
    6, 38, 22, 54, 14, 46, 30, 62,
    1, 33, 17, 49, 9, 41, 25, 57,
    5, 37, 21, 53, 13, 45, 29, 61,
    3, 35, 19, 51, 11, 43, 27, 59,
    7, 39, 23, 55, 15, 47, 31, 63
  ];

  const mem = antInfo.brains[0];

  function goHome() {
    if (!mem.px) {
      if (!mem.py) return STOP;
      return (mem.py > 0) ? SOUTH : NORTH;
    }
    if (!mem.py) return (mem.px > 0) ? WEST : EAST;

    if (((mem.px + mem.py) & 1) | 0) {
      return (mem.py > 0) ? SOUTH : NORTH;
    } else {
      return (mem.px > 0) ? WEST : EAST;
    }
  }

  function goThere(dstx, dsty) {
    const dx = abs(mem.px - dstx);
    const dy = abs(mem.py - dsty);
    const a = dx + dy;
    const aa = bitswap6[(a & 63) | 0];
    
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
    let dx, dy;
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
    if (y >= 0) {
      if (y < -2 * x) {
        return (-96 * y / (2 * x - y)) | 0;
      } else if (y < 2 * x) {
        return (128 - 96 * y / (2 * x + y)) | 0;
      } else {
        return (64 + 32 * x / y) | 0;
      }
    } else {
      if (y > -2 * x) {
        return (128 - 96 * y / (2 * x - y)) | 0;
      } else if (y > 2 * x) {
        return (256 - 96 * y / (2 * x + y)) | 0;
      } else {
        return (192 + 32 * x / y) | 0;
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
        for (let i = 1; i < squareData[0].numAnts; i++) {
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

      const dir = goHome();
      if (dir) return dir | CARRY;
      
      // Base building
      mem.flags |= flONLYNEAR;
      if (squareData[0].numFood < NewBaseFood) {
        if (squareData[0].numAnts <= ((squareData[0].numFood >> 2) | 0)) {
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
        for (let i = 1; i < squareData[0].numAnts; i++) {
          if (!(antInfo.brains[i].flags & flKNOWSFOOD)) {
            antInfo.brains[i].id = mem.id;
            antInfo.brains[i].flags &= ~flSOLDIER;
          }
        }
      }

      // Look for adjacent food
      for (let i = 1; i <= 4; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          // Not on base position?
          if (mem.px + RX[i] !== 0 || mem.py + RY[i] !== 0) {
            return i;
          }
        }
      }

      const dir = goDir();
      if (dir) return dir;
      
      // Change destination
      mem.flags &= ~flKNOWSFOOD;
      const delta = (mem.flags & flGOCLOSE ? 123 - 23 : 67 - 23) + 23 * squareData[0].numAnts;
      if (mem.flags & flGOROUNDDIR) {
        mem.id += delta;
      } else {
        mem.id -= delta;
      }
      return goHome();
    }
  }

  let dir = hexThink();

  // Base building check
  if (squareData[0].numAnts > NewBaseAnts &&
      squareData[0].numFood >= NewBaseFood && 
      !squareData[0].base) {
    dir = BUILDBASE;
    mem.flags |= flPROTECT;
  }

  // Re-coordinate with other ants
  const myDist = abs(mem.px) + abs(mem.py);
  for (let i = 1; i < squareData[0].numAnts; i++) {
    const otherBrain = antInfo.brains[i];
    if (myDist < abs(otherBrain.px) + abs(otherBrain.py)) {
      otherBrain.px = mem.px;
      otherBrain.py = mem.py;
    }
  }

  // Ant congestion check
  if (squareData[dir & 7].numAnts >= MaxSquareAnts) {
    dir = 5 - (dir & 7); // back up
  }

  // Enemy detection
  for (let i = 1; i <= 4; i++) {
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