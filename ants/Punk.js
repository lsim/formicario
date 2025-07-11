function Punk(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        id: 1,
        px: 0,
        py: 0,
        mx: 0,
        my: 0,
        state: 0, // 0=INIT, 1=GETFOOD, 2=RETURNFOOD, 3=WALL0, 4=WALLINIT, 5=WALL, 6=LURK, 7=SOLDIER
        data: 0,
        rnd: 0
      },
      name: 'Punk',
      color: '#FF28E6', // Pink/magenta color from C implementation
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
  const stGETFOOD = 1;
  const stRETURNFOOD = 2;
  const stWALL0 = 3;
  const stWALLINIT = 4;
  const stWALL = 5;
  const stLURK = 6;
  const stSOLDIER = 7;

  // Direction arrays
  const RX = [0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0];
  const RY = [0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0];

  const myBrain = antInfo.brains[0];

  // Helper functions
  function rnd(m) {
    m.rnd = (m.rnd * 7813) ^ (m.rnd >> 2);
    return m.rnd;
  }

  function goOut(m) {
    const xx = abs(m.px);
    const yy = abs(m.py);
    
    if ((m.id & 1024) ? 
        ((m.id & 1023) * xx <= (yy << 10)) :
        ((m.id & 1023) * yy >= (xx << 10))) {
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
    if (!m.py) return (m.px < 0) ? EAST : WEST;
    if (!m.px) return (m.py < 0) ? NORTH : SOUTH;
    if (m.px & 7) return (m.px < 0) ? EAST : WEST;
    if (m.py & 7) return (m.py < 0) ? NORTH : SOUTH;
    if ((m.px + m.py) & 8) {
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

  // Main state machine
  switch (myBrain.state) {
    case stINIT: {
      myBrain.rnd = myBrain.id;
      myBrain.state = stGETFOOD;
      // Fall through to stGETFOOD
    }
    case stGETFOOD: {
      if (squareData[0].numFood) {
        myBrain.state = stRETURNFOOD;
        if (!(myBrain.mx | myBrain.my) && squareData[0].numFood > 1) {
          myBrain.mx = myBrain.px;
          myBrain.my = myBrain.py;
          myBrain.data = squareData[0].numFood;
        } else if (myBrain.px === myBrain.mx && myBrain.py === myBrain.my && myBrain.data > 0) {
          myBrain.data--;
        }
        // Continue to stRETURNFOOD
      } else {
        if (myBrain.mx || myBrain.my) {
          // Know where food is
          if (myBrain.px === myBrain.mx && myBrain.py === myBrain.my) {
            myBrain.mx = 0;
            myBrain.my = 0;
            if (rnd(myBrain) & 8) myBrain.state = stWALL0;
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
    case stLURK: {
      dir = STOP;
      if (--myBrain.data === 0) myBrain.state = stSOLDIER;
      if (squareData[0].numFood) {
        myBrain.state = stRETURNFOOD;
        if (squareData[0].numFood > 1) {
          myBrain.mx = myBrain.px;
          myBrain.my = myBrain.py; // Note: original had bug (mx=py), keeping it
        } else {
          myBrain.mx = 0;
          myBrain.my = 0;
        }
      }
      break;
    }
    case stSOLDIER: {
      if ((++myBrain.data & 15) === 0) {
        dir = goOut(myBrain);
      }
      if (squareData[0].numFood) {
        myBrain.state = stRETURNFOOD;
        if (squareData[0].numFood > 1) {
          myBrain.mx = myBrain.px;
          myBrain.my = myBrain.py; // Note: original had bug (mx=py), keeping it
        } else {
          myBrain.mx = 0;
          myBrain.my = 0;
        }
      }
      break;
    }
    case stWALL0: {
      if (myBrain.px === 0 && myBrain.py === 0) {
        myBrain.state = stWALLINIT;
        dir = ((myBrain.id >> 1) & 3) + 1;
      } else {
        dir = goHome(myBrain);
      }
      if (myBrain.state !== stWALLINIT) break;
      // Fall through to stWALLINIT
    }
    case stWALLINIT: {
      let wall = 0;
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].state === stWALL) wall = i;
      }
      if (wall) {
        if (myBrain.px) dir = (myBrain.px > 0) ? EAST : WEST;
        else if (myBrain.py) dir = (myBrain.py > 0) ? NORTH : SOUTH;
        else dir = (myBrain.id & 3) + 1;
      } else if (myBrain.px | myBrain.py) {
        myBrain.state = stWALL;
        myBrain.mx = myBrain.px;
        myBrain.my = myBrain.py;
      } else {
        dir = goOut(myBrain);
      }
      if (myBrain.state !== stWALL) break;
      // Fall through to stWALL
    }
    case stWALL: {
      if (squareData[0].numFood) {
        dir = goHome(myBrain) | CARRY;
        
        // Switch from wall to food collector
        for (let i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === stRETURNFOOD && 
              (antInfo.brains[i].mx || antInfo.brains[i].my) && myBrain.data > 1) {
            myBrain.state = stRETURNFOOD;
            myBrain.mx = antInfo.brains[i].mx;
            myBrain.my = antInfo.brains[i].my;
            myBrain.data = antInfo.brains[i].data - 1;
            antInfo.brains[i].data = 1;
            break;
          }
        }
        break;
      }
      if (myBrain.px !== myBrain.mx || myBrain.py !== myBrain.my) {
        dir = goTo(myBrain, myBrain.mx, myBrain.my);
        break;
      }
      break;
    }
  }

  // Share food information with other ants
  if (myBrain.state !== stWALL) {
    const mydist = abs(myBrain.mx) + abs(myBrain.my);
    if (mydist > 0 && myBrain.data > 1) {
      for (let i = 1; i < antInfo.brains.length; i += 2) {
        if (antInfo.brains[i].state !== stWALL) {
          const yourdist = abs(antInfo.brains[i].mx) + abs(antInfo.brains[i].my);
          if (yourdist === 0) {
            // Tell other ant about food
            antInfo.brains[i].mx = myBrain.mx;
            antInfo.brains[i].my = myBrain.my;
            antInfo.brains[i].data = (myBrain.data / 2) | 0;
            myBrain.data -= antInfo.brains[i].data;
          }
        }
      }
    }
  }

  // Look for food in adjacent squares
  if (!squareData[0].numFood) {
    for (let i = 1; i <= 4; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        dir = i;
        break;
      }
    }
  }

  // Check for enemies
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i | CARRY;
      myBrain.state = stLURK;
      myBrain.data = 255;
      break;
    }
  }

  // Update position
  myBrain.px += RX[dir];
  myBrain.py += RY[dir];
  
  return dir;
}