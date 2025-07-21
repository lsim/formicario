function Tirsdag(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        id: 0, // Will be set to random in stINIT
        px: 0,
        py: 0,
        mx: 0,
        my: 0,
        state: 0, // 0=stINIT, 1=stWAIT, 2=stGETFOOD, 3=stRETURNFOOD, 4=stLURK
        rnd: 0
      },
      name: 'Tirsdag',
      color: '#4B0082', // Indigo color
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

  // State constants
  const stINIT = 0;
  const stWAIT = 1;
  const stGETFOOD = 2;
  const stRETURNFOOD = 3;
  const stLURK = 4;

  // Direction arrays
  const RX = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0];
  const RY = [0, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];

  const myBrain = antInfo.brains[0];

  // Helper functions
  function rnd(m) {
    m.rnd = ((m.rnd * 7813) ^ (m.rnd >> 2)) & 0xFF; // Truncate to unsigned char (8 bits)
    return m.rnd;
  }

  function goOut(m) {
    const xx = abs(m.px);
    const yy = abs(m.py);

    if (
      (m.id & (2048 | 4096)) ?
        (m.id & 1024) ?
          ((m.id & 1023) * xx < (yy << 6)) :
          ((m.id & 1023) * yy > (xx << 6))
        :
        (m.id & 1024) ?
          ((m.id & 1023) * xx < (yy << 10)) :
          ((m.id & 1023) * yy > (xx << 10))
    ) {
      if (m.px > 0) return EAST;
      if (m.px < 0) return WEST;
      return (rnd(m) & 2) ? EAST : WEST;
    } else {
      if (m.py > 0) return NORTH;
      if (m.py < 0) return SOUTH;
      return (rnd(m) & 2) ? NORTH : SOUTH;
    }
  }

  function goRound(m) {
    const xx = abs(m.px);
    const yy = abs(m.py);

    if (xx < 2 * yy) {
      if (m.py > 0) return EAST;
      else return WEST;
    } else {
      if (m.px > 0) return SOUTH;
      else return NORTH;
    }
  }

  function goHome(m) {
    const xx = abs(m.px);
    const yy = abs(m.py);

    if (m.py === 0 || (rnd(m) % (xx + yy)) < xx) {
      return (m.px < 0) ? EAST : WEST;
    } else {
      return (m.py < 0) ? NORTH : SOUTH;
    }
  }

  function goTo(m, dx, dy) {
    const xx = abs(m.px - dx);
    const yy = abs(m.py - dy);

    if (m.py === dy || (rnd(m) % (xx + yy)) < xx) {
      return (m.px < dx) ? EAST : WEST;
    } else {
      return (m.py < dy) ? NORTH : SOUTH;
    }
  }

  let dir = STOP;
  let i;

  switch (myBrain.state) {
    case stINIT: {
      myBrain.id = antInfo.random;
      myBrain.rnd = myBrain.id & 0xFF; // Initialize rnd from id like C version
      myBrain.state = (myBrain.id & (1024 | 512)) ? stGETFOOD : stWAIT;
      // Continue to next case - deliberate fallthrough
      if (myBrain.state === stGETFOOD) {
        // Fall through to stGETFOOD
      } else {
        break; // Go to stWAIT
      }
    }
    case stGETFOOD: {
      if (squareData[0].numFood) {
        myBrain.state = stRETURNFOOD;
        myBrain.mx = myBrain.px;
        myBrain.my = myBrain.py;
        // Fall through to stRETURNFOOD
        dir = goHome(myBrain) | CARRY;
        break;
      } else {
        if (myBrain.mx || myBrain.my) { // Know where food is
          if (myBrain.px === myBrain.mx && myBrain.py === myBrain.my) {
            myBrain.mx = myBrain.my = 0;
          } else {
            dir = goTo(myBrain, myBrain.mx, myBrain.my);
          }
        } else {
          dir = goOut(myBrain);
        }
        break;
      }
    }
    case stRETURNFOOD: {
      if (!squareData[0].numFood) {
        myBrain.state = stGETFOOD;
      } else {
        dir = goHome(myBrain) | CARRY;
      }
      break;
    }
    case stWAIT: {
      if (squareData[0].numFood) {
        myBrain.state = stRETURNFOOD;
        myBrain.mx = myBrain.px;
        myBrain.my = myBrain.py;
      } else {
        if (myBrain.mx || myBrain.my) { // Know where food is
          myBrain.state = stGETFOOD;
          if (myBrain.px === myBrain.mx && myBrain.py === myBrain.my) {
            myBrain.mx = myBrain.my = 0;
          } else {
            dir = goTo(myBrain, myBrain.mx, myBrain.my);
          }
        } else {
          dir = STOP;
        }
      }
      break;
    }
    case stLURK: {
      dir = STOP;
      // Bo-ring!
      break;
    }
    default:
      break;
  }

  // Share food location information with other ants
  const mydist = abs(myBrain.mx) + abs(myBrain.my);
  for (i = 1; i < antInfo.brains.length; i += 2) {
    const otherAnt = antInfo.brains[i];
    const yourdist = abs(otherAnt.mx) + abs(otherAnt.my);
    if (mydist > 0 && yourdist === 0) { // closer?
      // Tell:
      otherAnt.mx = myBrain.mx;
      otherAnt.my = myBrain.my;
    }
  }

  // Look for food in adjacent squares
  if (!squareData[0].numFood) {
    for (i = 1; i <= 4; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        dir = i;
        break;
      }
    }
  }

  // Check for enemies
  for (i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i | CARRY;
      myBrain.state = stLURK;
      break;
    }
  }

  // Update position
  myBrain.px += RX[dir];
  myBrain.py += RY[dir];

  return dir;
}
