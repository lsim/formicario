function Humanist(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        id: 1,
        px: 0,
        py: 0,
        mx: 0,
        my: 0,
        lastdir: 0,
        state: 0,
        rnd: 1
      },
      name: 'Humanist',
      color: '#FF006A', // Pink color as specified
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const STOP = 0, HERE = 0, EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4, CARRY = 8;
  const stINIT = 0, stNORMAL = 1, stTELL = 2, stTOLD = 3, stALERT = 4, stLURK = 5;
  const HUM_SPIRLEN = 100;
  const HUM_DUMDIST = 500;

  const RX = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0];
  const RY = [0, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];

  const mem = antInfo.brains[0];

  function rnd() {
    mem.rnd = (mem.rnd * 3 + mem.id) & 0x7FFFFFFF >> 0;
    return mem.rnd;
  }

  function goTo(dx, dy) {
    const xx = abs(mem.px - dx);
    const yy = abs(mem.py - dy);

    if (mem.py === dy || (rnd() % (xx + yy)) < xx) {
      return (mem.px < dx) ? EAST : WEST;
    } else {
      return (mem.py < dy) ? NORTH : SOUTH;
    }
  }

  function goSpiral(dstx, dsty) {
    const dx = dstx - mem.px;
    const dy = dsty - mem.py;

    if (dx > dy) {
      if (dx > -dy) return NORTH;
      else return EAST;
    } else {
      if (dx >= -dy + 2) return WEST;
      else return SOUTH;
    }
  }

  function goOut() {
    const xx = abs(mem.px);
    const yy = abs(mem.py);

    if ((mem.id & 1024) ?
        ((mem.id & 1023) * xx + (rnd() % 10) < ((yy << 8) | 0)) :
        ((mem.id & 1023) * yy + (rnd() % 10) > ((xx << 8) | 0))) {
      if (mem.px > 0) return EAST;
      if (mem.px < 0) return WEST;
      return (rnd() & 2) ? EAST : WEST;
    } else {
      if (mem.py > 0) return NORTH;
      if (mem.py < 0) return SOUTH;
      return (rnd() & 2) ? NORTH : SOUTH;
    }
  }

  let dir = STOP;

  switch (mem.state) {
    case stINIT:
      mem.rnd = mem.id;
      mem.state = stNORMAL;
      break;

    case stNORMAL:
    case stTOLD:
      if (mem.mx || mem.my) {
        if (squareData[0].numFood > squareData[0].numAnts + 1) {
          dir = goTo(0, 0) | CARRY;
          mem.mx = mem.px;
          mem.my = mem.py;
        } else if (squareData[0].numFood >= squareData[0].numAnts) {
          dir = goTo(0, 0) | CARRY;
        } else {
          dir = goTo(mem.mx, mem.my);
          if (mem.px === mem.mx && mem.py === mem.my) {
            // No more food here
            if (rnd() & 1024) {
              // Semi-forget (guess)
              if (mem.id & 2048) {
                const tmp = mem.mx;
                mem.mx = (mem.my * 3 / 2) | 0;
                mem.my = -tmp;
              } else {
                const tmp = mem.my;
                mem.my = (mem.mx * 3 / 2) | 0;
                mem.mx = -tmp;
              }
            } else {
              mem.mx = mem.my = 0; // Forget food place
            }
          }
        }
      } else {
        if (squareData[0].numFood >= squareData[0].numAnts) {
          mem.mx = mem.px;
          mem.my = mem.py;
          dir = goTo(0, 0) | CARRY;

          if (mem.state !== stTOLD) mem.lastdir = HUM_SPIRLEN;
          mem.state = stTELL;
        } else {
          if (abs(mem.px) + abs(mem.py) > HUM_DUMDIST) {
            dir = rnd() % 5;
            if (dir === STOP || dir === mem.lastdir) {
              dir = ((mem.lastdir + 1) & 3) + 1;
            }
            mem.lastdir = dir;
          } else {
            dir = goOut();
          }
        }
      }
      break;

    case stTELL:
      for (let i = 1; i <= 4; i++) {
        if (squareData[i].numAnts && !squareData[i].numFood) {
          dir = i | CARRY;
        }
      }
      if (dir === STOP) {
        dir = goSpiral(mem.mx, mem.my) | CARRY;
      }
      if (--mem.lastdir <= 0) mem.state = stNORMAL;
      break;

    case stALERT:
      if (mem.px || mem.py) {
        dir = goTo(0, 0);
      } else {
        mem.state = stNORMAL;
      }
      break;

    case stLURK:
      dir = STOP;
      if (squareData[0].numFood) mem.state = stNORMAL;
      break;
  }

  // Share knowledge with other ants
  const mydist = abs(mem.mx) + abs(mem.my);
  for (let i = 1; i < squareData[0].numAnts; i += 2) {
    const otherBrain = antInfo.brains[i];
    if (otherBrain) {
      const yourdist = abs(otherBrain.mx) + abs(otherBrain.my);
      if (mydist > 0 && yourdist === 0) {
        // Tell
        otherBrain.mx = mem.mx;
        otherBrain.my = mem.my;
        if (mem.state === stTELL) {
          otherBrain.state = stTOLD;
          otherBrain.lastdir = (mem.lastdir / 2) | 0;
        }
      }
    }
  }

  if (mem.state !== stTELL) {
    // Look for food
    if (!squareData[0].numFood) {
      for (let i = 1; i <= 4; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          dir = i;
          break;
        }
      }
    }
  }

  // Check for enemies
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i;
      if (!squareData[0].numFood) {
        mem.state = stLURK;
      }
      break;
    }
  }

  // Update position
  mem.px += RX[dir];
  mem.py += RY[dir];

  return dir;
}
