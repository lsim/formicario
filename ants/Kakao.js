function Kakao(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        px: 0,
        py: 0,
        mx: 0,
        my: 0,
        state: 0,
        id: 0,
        pos: 0
      },
      name: 'Kakao',
      color: '#C46B00' // Brown color from C implementation
    };
  }

  // Helper functions
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const STOP = 0, EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;
  const CARRY = 8, BUILDBASE = 16;

  // State constants
  const stINIT = 0, stFOOD = 1, stWALLINIT = 2, stWALLCALI = 3, stWALL = 4;
  const stLURK = 5, stPIONEER = 6, stSIGNALATTACK = 7, stATTACK = 8;

  // Configuration constants
  const WALL_Y = 0, WALL_X = 0;
  const BASE_DIST = 96;
  const SIGNAL_ATTACK_TRESHOLD = 23;
  const ATTACK_GO_EAST = 15;
  const SLINGER_TRESH = 1000;
  const SPIRAL_SPEED = 200;
  const SPIRAL_SPEED2 = (128 * 128) / SPIRAL_SPEED;

  // Direction offset arrays
  const RX = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0];
  const RY = [0, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];

  const myBrain = antInfo.brains[0];

  function random(m) {
    m.random = m.random * 4637 + 342;
    return abs(m.random & 0xffffffff);
  }

  function goTo(m, dstx, dsty) {
    const dx = m.px - dstx, dy = m.py - dsty;
    if (!dx && !dy) return STOP;
    if (abs(dx) > abs(dy))
      return dx > 0 ? WEST : EAST;
    else
      return dy > 0 ? SOUTH : NORTH;
  }

  function goTo2(m, dstx, dsty) {
    const dx = m.px - dstx, dy = m.py - dsty;
    if (!dx && !dy) return STOP;
    if (abs(dx) > abs(dy) && dy || !dx) {
      return dy > 0 ? SOUTH : NORTH;
    } else {
      return dx > 0 ? WEST : EAST;
    }
  }

  function goHome(m) {
    return goTo2(m, 0, 0);
  }

  function goToFollowingWall(m, dstx, dsty) {
    if (m.px === dstx && m.py === dsty) return STOP;
    if (abs(dstx) > abs(dsty)) { // Horizontal wall
      if (m.px !== dstx)
        return m.px > dstx ? WEST : EAST;
      else
        return m.py > dsty ? SOUTH : NORTH;
    } else {
      if (m.py !== dsty)
        return m.py > dsty ? SOUTH : NORTH;
      else
        return m.px > dstx ? WEST : EAST;
    }
  }

  function goOutSlinger(m) {
    if ((m.id << 24) > random(m)) {
      if (m.px > 0) return EAST;
      if (m.px < 0) return WEST;
      return (random(m) & 2) ? EAST : WEST;
    } else {
      if (m.py > 0) return NORTH;
      if (m.py < 0) return SOUTH;
      return (random(m) & 2) ? NORTH : SOUTH;
    }
  }

  function goOutSpir(m) {
    if (m.id & 16) {
      if (m.px > 0) {
        if (m.py > 0) { // NE
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED2 * abs(m.px));
          return a ? EAST : SOUTH;
        } else { // SE
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED * abs(m.px));
          return a ? WEST : SOUTH;
        }
      } else {
        if (m.py > 0) { // NW
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED * abs(m.px));
          return a ? EAST : NORTH;
        } else { // SW
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED2 * abs(m.px));
          return a ? WEST : NORTH;
        }
      }
    } else {
      if (m.px > 0) {
        if (m.py > 0) { // NE
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED * abs(m.px));
          return a ? WEST : NORTH;
        } else { // SE
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED2 * abs(m.px));
          return a ? EAST : NORTH;
        }
      } else {
        if (m.py > 0) { // NW
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED2 * abs(m.px));
          return a ? WEST : SOUTH;
        } else { // SW
          const a = ((random(m) & 255) * abs(m.py) > SPIRAL_SPEED * abs(m.px));
          return a ? EAST : SOUTH;
        }
      }
    }
  }

  function goOutSpir2(m) {
    const ax = abs(m.px), ay = abs(m.py);
    if (ax + ay < SLINGER_TRESH) return goOutSlinger(m);
    else return goOutSpir(m);
  }

  function goOut(m) {
    let dx = m.px, dy = m.py;
    const ax = abs(m.px), ay = abs(m.py);

    if (m.id & 32 && ax + ay >= 20) {
      return goOutSlinger(m);
    } else {
      const r = random(m);
      dx += (r & 255) - 128;
      dy += (r >> 24) & 255; // Mask to byte range like C version
    }
    if (abs(dx) > abs(dy))
      return dx > 0 ? EAST : WEST;
    else
      return dy > 0 ? NORTH : SOUTH;
  }

  function initWall(m) {
    m.state = stWALLINIT;
    m.mx = m.my = m.pos = 0;
  }

  function initLurk(m) {
    m.state = stLURK;
    m.pos = 2000; // Lurk time
  }

  // Main state machine
  let dir = STOP;

  switch (myBrain.state) {
    case stINIT: {
      myBrain.px = myBrain.py = 0;
      myBrain.id = myBrain.random;
      myBrain.state = stFOOD;

      if (squareData[0].numAnts > SIGNAL_ATTACK_TRESHOLD) {
        myBrain.state = stSIGNALATTACK;
        myBrain.pos = 0;
        dir = EAST;
      }
    } // fall-through
    case stFOOD: {
      if (squareData[0].numFood >= squareData[0].numAnts) { // Food here
        myBrain.state = stFOOD;
        if (!(myBrain.mx || myBrain.my)) {
          myBrain.mx = myBrain.px;
          myBrain.my = myBrain.py;
          myBrain.pos = squareData[0].numFood - squareData[0].numAnts; // TTL
        } else if (squareData[0].numFood === 1 && myBrain.mx === myBrain.px && myBrain.my === myBrain.py) {
          initWall(myBrain);
        }
        dir = goHome(myBrain) | CARRY;
      } else { // No food here
        if (myBrain.mx || myBrain.my) {
          dir = goToFollowingWall(myBrain, myBrain.mx, myBrain.my);
          if (dir === STOP) { // Food ran out
            myBrain.mx = myBrain.my = 0; // Forget food position
            dir = goOut(myBrain);
            if (random(myBrain) & 4) initWall(myBrain);
          } else {
            // Tell others about food
            if (myBrain.pos >= 2) {
              for (let i = 1; i < squareData[0].numAnts; i += 2) {
                if (antInfo.brains[i].state === stFOOD && !(antInfo.brains[i].mx || antInfo.brains[i].my)) {
                  antInfo.brains[i].mx = myBrain.mx;
                  antInfo.brains[i].my = myBrain.my;
                  antInfo.brains[i].pos = myBrain.pos = myBrain.pos - 1; // TTL
                }
              }
            }
          }
        } else {
          // Look for food in adjacent squares
          for (let r = 1; r <= 4; r++) {
            if (squareData[r].numFood > squareData[r].numAnts) {
              dir = r; // Found food
              break;
            }
          }
          if (!dir) {
            // Use proper exploration pattern based on distance from base
            const ax = abs(myBrain.px), ay = abs(myBrain.py);
            if (ax + ay < SLINGER_TRESH) {
              dir = goOutSlinger(myBrain);
            } else {
              dir = goOutSpir(myBrain);
            }
          }
        }
      }
      break;
    }

    case stWALLINIT: {
      dir = goHome(myBrain);
      if (dir) {
        dir |= CARRY;
        break;
      } else {
        myBrain.state = stWALLCALI;
      }
    } // fall-through

    case stWALLCALI: {
      // Simplified wall calibration logic
      if (myBrain.id & 1) { // Horizontal wall
        if (myBrain.py !== WALL_Y) {
          dir = myBrain.py > WALL_Y ? SOUTH : NORTH;
          break;
        }
        myBrain.state = stWALL;
        myBrain.pos = myBrain.px;
      } else { // Vertical wall
        if (myBrain.px !== WALL_X) {
          dir = myBrain.px > WALL_X ? WEST : EAST;
          break;
        }
        myBrain.state = stWALL;
        myBrain.pos = myBrain.py;
      }
      break;
    }

    case stWALL: {
      // Simplified wall logic - just maintain position and look for food
      if (squareData[0].numFood) {
        if (myBrain.id & 1) { // Horizontal wall
          if (myBrain.px > 0) dir = WEST | CARRY;
          else if (myBrain.px < 0) dir = EAST | CARRY;
        } else { // Vertical wall
          if (myBrain.py > 0) dir = SOUTH | CARRY;
          else if (myBrain.py < 0) dir = NORTH | CARRY;
        }
      } else {
        // Look for food in perpendicular directions
        if (myBrain.id & 1) { // Horizontal wall
          if (squareData[NORTH].numFood > squareData[NORTH].numAnts) dir = NORTH;
          else if (squareData[SOUTH].numFood > squareData[SOUTH].numAnts) dir = SOUTH;
        } else { // Vertical wall
          if (squareData[EAST].numFood > squareData[EAST].numAnts) dir = EAST;
          else if (squareData[WEST].numFood > squareData[WEST].numAnts) dir = WEST;
        }
      }
      break;
    }

    case stLURK: {
      dir = STOP;
      if (--myBrain.pos === 0 || squareData[0].numFood >= squareData[0].numAnts) {
        myBrain.state = stFOOD;
      }
      break;
    }

    case stSIGNALATTACK: {
      if (myBrain.pos === 0) {
        if (myBrain.px > 0) dir = EAST;
        else {
          myBrain.pos = myBrain.px;
          dir = WEST;
        }
      } else {
        // Convert wall ants to attack
        for (let i = 1; i < squareData[0].numAnts; i++) {
          if (antInfo.brains[i].state === stWALL) {
            antInfo.brains[i].state = stATTACK;
            break;
          }
        }
        dir = WEST;
      }
      break;
    }

    case stATTACK: {
      myBrain.id ^= 128;
      if (myBrain.id & 128) {
        if (((myBrain.px + myBrain.py) & ATTACK_GO_EAST) === 0) dir = EAST;
        else dir = NORTH;
      } else {
        dir = STOP;
      }
      break;
    }
  }

  // Check for enemies
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i;
      if (!squareData[0].numFood && myBrain.state !== stWALL) initLurk(myBrain);
      break;
    }
  }

  // Update position
  myBrain.px += RX[dir];
  myBrain.py += RY[dir];

  return dir;
}
