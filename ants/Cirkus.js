function Cirkus(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        id: 1,
        mx: 0,
        my: 0,
        px: 0,
        py: 0,
        state: 0, // 0=INIT, 1=IDLE, 2=QUEEN, 3=SEARCH, 4=KNOWNSFOOD, 5=GETFOOD, 6=CIRCLE, 7=LURK
        data: 0,
      },
      name: 'Cirkus',
      color: '#ff5d00', // Orange color from C implementation
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Direction constants
  const STOP = 0;
  const HERE = 0;
  const EAST = 1;
  const SOUTH = 2;
  const WEST = 3;
  const NORTH = 4;
  const CARRY = 8;
  const BUILDBASE = 16;

  // State constants
  const stINIT = 0;
  const stIDLE = 1;
  const stQUEEN = 2;
  const stSEARCH = 3;
  const stKNOWNSFOOD = 4;
  const stGETFOOD = 5;
  const stCIRCLE = 6;
  const stLURK = 7;

  // Flag constants
  const FLAG1 = 16;
  const FLAG2 = 32;
  const FLAG3 = 64;
  const FLAG4 = 128;

  const MaxSquareAnts = 100;

  // Direction arrays (extended like C code)
  const RX = [
    0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0,
    0, 0,
  ];
  const RY = [
    0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0,
    0, 0,
  ];
  const TURN = [0, 2, 3, 4, 1, 6, 7, 8, 5, 10, 11, 12, 9, 14, 15, 16, 13];
  const TURN180 = [0, 3, 4, 1, 2, 7, 8, 5, 6, 11, 12, 9, 10, 15, 16, 13, 14];

  // Bitswap lookup table
  const bitswap6 = [
    0, 32, 16, 48, 8, 40, 24, 56, 4, 36, 20, 52, 12, 44, 28, 60, 2, 34, 18, 50, 10, 42, 26, 58, 6,
    38, 22, 54, 14, 46, 30, 62, 1, 33, 17, 49, 9, 41, 25, 57, 5, 37, 21, 53, 13, 45, 29, 61, 3, 35,
    19, 51, 11, 43, 27, 59, 7, 39, 23, 55, 15, 47, 31, 63,
  ];

  const myBrain = antInfo.brains[0];

  // Initialize first two shorts (id, mx) with random data if uninitialized
  // This matches C engine behavior where first 4 bytes get random values
  if (myBrain.id === 1 && myBrain.mx === 0 && myBrain.my === 0 && myBrain.state === 0) {
    const randomBytes = antInfo.random;
    myBrain.id = (randomBytes & 0xFFFF);           // First short (16 bits)
    myBrain.mx = ((randomBytes >> 16) & 0xFFFF);   // Second short (16 bits)
  }

  // Helper functions
  function goOut(m) {
    const a = abs(m.px) + abs(m.py) + m.id;
    if (bitswap6[a & 63] < (m.data & 63)) {
      return m.px > 0 ? EAST : m.px === 0 ? (m.id & FLAG1 ? EAST : WEST) : WEST;
    } else {
      return m.py > 0 ? NORTH : m.py === 0 ? (m.id & FLAG2 ? NORTH : SOUTH) : SOUTH;
    }
  }

  function goHome(m) {
    if (!m.px) {
      if (!m.py) return STOP;
      return m.py > 0 ? SOUTH : NORTH;
    }
    if (!m.py) {
      return m.px > 0 ? WEST : EAST;
    }

    const a = abs(m.px) + abs(m.py) + m.id;
    if (bitswap6[a & 63] < (m.data & 63)) {
      return m.px < 0 ? EAST : WEST;
    } else {
      return m.py < 0 ? NORTH : SOUTH;
    }
  }

  function goTo(m, dstx, dsty) {
    if (m.px === dstx) {
      if (m.py === dsty) return STOP;
      return m.py > dsty ? SOUTH : NORTH;
    }
    if (m.py === dsty) {
      return m.px > dstx ? WEST : EAST;
    }

    const a = abs(m.px) + abs(m.py) + m.id;
    if (bitswap6[a & 63] < (m.data & 63)) {
      return m.px < dstx ? EAST : WEST;
    } else {
      return m.py < dsty ? NORTH : SOUTH;
    }
  }

  function cirkusThink() {
    let dir;

    switch (myBrain.state) {
      case stINIT: {
        // Initialize
        myBrain.px = 0;
        myBrain.py = 0;

        // Look for existing queen
        let queen_no = 0;
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === stQUEEN) {
            queen_no = i;
            break;
          }
        }

        if (queen_no === 0) {
          // Become queen
          myBrain.state = stQUEEN;
          myBrain.data = myBrain.mx;
          myBrain.mx = 150;
        } else {
          // Become searcher
          const q = antInfo.brains[queen_no];
          myBrain.state = stSEARCH;
          myBrain.data = q.data;
          q.data += 71;

          if (myBrain.my < 1000) {
            myBrain.my = 40 + ((q.my / 15) | 0) - (myBrain.id & 15);
          } else {
            myBrain.my = (40 + ((q.my / 15) | 0) - (myBrain.id & 15)) % 150;
          }
        }
        return cirkusThink(); // Recursive call for new state
      }

      case stIDLE: {
        dir = goHome(myBrain);
        if (!dir) {
          myBrain.state = stINIT;
          return cirkusThink();
        }
        return dir;
      }

      case stQUEEN: {
        myBrain.my++; // Time counter
        return STOP;
      }

      case stSEARCH: {
        if (squareData[0].numFood) {
          myBrain.state = stGETFOOD;
          myBrain.mx = myBrain.px;
          myBrain.my = myBrain.py;
          return cirkusThink();
        }

        // Look for food in adjacent squares
        for (let i = 1; i <= 4; i++) {
          if (squareData[i].numFood > squareData[i].numAnts) {
            myBrain.state = stGETFOOD;
            myBrain.mx = myBrain.px + RX[i];
            myBrain.my = myBrain.py + RY[i];
            return i | CARRY;
          }
        }

        // Check if we've reached search limit
        if (myBrain.px * myBrain.px + myBrain.py * myBrain.py > myBrain.my * myBrain.my) {
          myBrain.state = stCIRCLE;
        }
        return goOut(myBrain);
      }

      case stGETFOOD: {
        if (squareData[0].numFood) {
          return goHome(myBrain) | CARRY;
        }
        dir = goTo(myBrain, myBrain.mx, myBrain.my);
        if (!dir) {
          myBrain.state = stIDLE;
          return cirkusThink();
        }
        return dir;
      }

      case stCIRCLE: {
        const a = myBrain.px * myBrain.px + myBrain.py * myBrain.py;
        const r = myBrain.my * myBrain.my;

        // Look for other ants getting food
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === stGETFOOD) {
            myBrain.state = stGETFOOD;
            myBrain.mx = antInfo.brains[i].mx;
            myBrain.my = antInfo.brains[i].my;
            return cirkusThink();
          }
        }

        if (squareData[0].numFood) {
          myBrain.state = stGETFOOD;
          myBrain.mx = myBrain.px;
          myBrain.my = myBrain.py;
          return cirkusThink();
        }

        // Look for food in adjacent squares
        for (let i = 1; i <= 4; i++) {
          if (squareData[i].numFood > squareData[i].numAnts) {
            myBrain.state = stGETFOOD;
            myBrain.mx = myBrain.px + RX[i];
            myBrain.my = myBrain.py + RY[i];
            return i | CARRY;
          }
        }

        // Circle movement
        if (a < r) {
          if (myBrain.px > 0) {
            return myBrain.py > 0 ? EAST : SOUTH;
          } else {
            return myBrain.py > 0 ? NORTH : WEST;
          }
        } else {
          if (myBrain.px > 0) {
            return myBrain.py > 0 ? SOUTH : WEST;
          } else {
            return myBrain.py > 0 ? EAST : NORTH;
          }
        }
      }

      case stLURK: {
        return STOP;
      }

      default:
        return STOP;
    }
  }

  // Main function
  function cirkusMain() {
    // Synchronize position with closer ant
    const mydist = abs(myBrain.px) + abs(myBrain.py);
    for (let i = 1; i < antInfo.brains.length; i++) {
      const yourdist = abs(antInfo.brains[i].px) + abs(antInfo.brains[i].py);
      if (mydist > yourdist) {
        myBrain.px = antInfo.brains[i].px;
        myBrain.py = antInfo.brains[i].py;
      }
    }

    // Check for enemies
    for (let i = 1; i <= 4; i++) {
      if (squareData[i].team !== 0) {
        myBrain.state = stLURK;
        return i;
      }
    }

    let dir = cirkusThink();

    // Avoid overcrowded squares
    const initialCheckDir = (dir & 7);
    if (initialCheckDir > 0 && initialCheckDir <= 4 && squareData[initialCheckDir].numAnts > (MaxSquareAnts * 3) / 4) {
      if (dir & CARRY) {
        const checkDir = (dir & 7);
        if (checkDir > 0 && checkDir <= 4 && squareData[checkDir].base && squareData[checkDir].numAnts < MaxSquareAnts) {
          // Allow movement to base
        } else {
          dir = TURN180[dir];
          const checkDir2 = (dir & 7);
          if (checkDir2 > 0 && checkDir2 <= 4 && squareData[checkDir2].numAnts > (MaxSquareAnts * 3) / 4) {
            dir = STOP;
          }
        }
      } else {
        dir = TURN[dir];
        const checkDir1 = (dir & 7);
        if (checkDir1 > 0 && checkDir1 <= 4 && squareData[checkDir1].numAnts > (MaxSquareAnts * 3) / 4) {
          dir = TURN180[dir];
          const checkDir2 = (dir & 7);
          if (checkDir2 > 0 && checkDir2 <= 4 && squareData[checkDir2].numAnts > (MaxSquareAnts * 3) / 4) {
            dir = STOP;
          }
        }
      }
    }

    // Update position
    myBrain.px += RX[dir];
    myBrain.py += RY[dir];

    return dir;
  }

  return cirkusMain();
}
