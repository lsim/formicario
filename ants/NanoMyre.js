function NanoMyre(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        mx: 0,
        my: 0,
        px: 0,
        py: 0,
        rnd: 1,
        state: 0,
        data: 0
      },
      name: 'NanoMyre',
      color: '#8040FF',
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const STOP = 0, HERE = 0;
  const EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;
  const MAXDIR = NORTH;
  const CARRY = 8;
  const BUILDBASE = 16;

  // States
  const stINIT = 0;
  const stEXPLORE = 1;
  const stCIRKUS_OUT = 2;
  const stCIRKUS = 3;
  const stGRIDLOCK = 4;
  const stKNOWSFOOD = 5;
  const stLURK = 6;

  const RX = [0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0,
              1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0];
  const RY = [0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0,
              0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0];

  const m = antInfo.brains[0];

  function random() {
    m.rnd = m.rnd * 4637 + 342;
    return m.rnd;
  }

  function goRandom() {
    const dir = ((random() >> 5) & 3) + 1;
    return dir;
  }

  function goHome() {
    return m.px ? (m.px > 0 ? WEST : EAST) :
           m.py ? (m.py > 0 ? SOUTH : NORTH) : STOP;
  }

  function goHomeGridwise() {
    if ((m.px | m.py) & 15) { // Not on grid point?
      return (m.px & 15) ? (m.px > 0 ? WEST : EAST) :
             (m.py > 0 ? SOUTH : NORTH);
    }
    // On grid point:
    if (!m.px) return m.py ? (m.py > 0 ? SOUTH : NORTH) : STOP;
    if (!m.py) return (m.px > 0 ? WEST : EAST);
    return (random() & 8) ?
           (m.px > 0 ? WEST : EAST) : (m.py > 0 ? SOUTH : NORTH);
  }

  function goOut() {
    const r = random();
    const d = abs(m.px) + abs(m.py);
    if (d > 128) {
      return STOP;
    } else {
      const d1 = (r & 7) - 4;
      const d2 = ((r >> 3) & 7) - 4;
      if (m.px > d1) {
        if (m.py > d2) {
          return (m.px * r > (m.py << 15)) ? EAST : NORTH;
        } else {
          return (m.px * r > -(m.py << 15)) ? EAST : SOUTH;
        }
      } else {
        if (m.py > d2) {
          return (-m.px * r > (m.py << 15)) ? WEST : NORTH;
        } else {
          return (-m.px * r > -(m.py << 15)) ? WEST : SOUTH;
        }
      }
    }
  }

  function goOut2() {
    if (m.data >= 4) {
      m.data -= 4;
    } else {
      let dir;
      let newdata = (random() + m.px + m.py) & 0x3F;
      if (((m.data ^ newdata) & 3) === 2) { // Opposite dir
        newdata++; // Turn a bit!
      }

      dir = (m.data & 3) + 1;
      if (m.px * RX[dir] < 0 || m.py * RY[dir] < 0) {
        newdata -= 8 * 4;
      }
      m.data = newdata;

      m.rnd = (m.rnd << 8) | ((m.rnd >> 8) & 0xFF); // Make more random
    }
    return (m.data & 3) + 1;
  }

  function goTo(x, y) {
    return m.px !== x ? (m.px > x ? WEST : EAST) :
           m.py !== y ? (m.py > y ? SOUTH : NORTH) : STOP;
  }

  function gridCommand(g, ant) {
    let dir = g.state & 0xE0;

    if (g.mx | g.my) { // Tell explorer about food
      ant.state = stKNOWSFOOD;
      ant.mx = g.mx;
      ant.my = g.my;
      if ((random() & 3) === 0) { // Forget about food
        g.mx = g.my = 0;
      }
    } else {
      ant.state = stEXPLORE | dir;
      dir += (1 << 5);
      if (dir > (4 << 5)) dir = 0;
      g.state = stGRIDLOCK | dir;
    }
  }

  function findGridAnt() {
    for (let i = 1; i < squareData[0].numAnts; i++) {
      if ((antInfo.brains[i].state & 0x1F) === stGRIDLOCK) {
        return i;
      }
    }
    return 0;
  }

  function think() {
    let i;

    // Defense:
    for (i = 1; i <= 4; i++) {
      if (squareData[i].team) {
        m.state = stLURK;
        m.data = 0;
        return i;
      }
    }

    switch (m.state & 0x1F) {
      case stINIT: {
        m.rnd = m.mx;
        m.px = m.py = 0;
        m.mx = m.my = 0;
        if (1 || (random() & 16)) {
          m.state = stEXPLORE;
          // goto st_explore
          return stExploreLogic();
        } else {
          const r = squareData[0].numAnts * 2 +
                   (squareData[1].numAnts + squareData[2].numAnts +
                    squareData[3].numAnts + squareData[4].numAnts);
          m.state = stCIRKUS_OUT;
          m.data = 5 + (random() % (r + 10));
          // goto st_cirkus
          return stCirkusLogic();
        }
      }

      case stEXPLORE: {
        return stExploreLogic();
      }

      case stCIRKUS_OUT: {
        if (squareData[0].numFood) {
          if (squareData[0].numFood > 1) {
            m.state = stKNOWSFOOD;
            m.mx = m.px;
            m.my = m.py;
          }
          return goHomeGridwise() | CARRY;
        }
        for (i = 1; i <= 4; i++) {
          if (squareData[i].numFood > squareData[i].numAnts) {
            return i;
          }
        }

        const a = m.px * m.px + m.py * m.py;
        const r = (m.data * m.data) << 2;

        if (a > r) m.state = stCIRKUS;
        return goOut();
      }

      case stCIRKUS: {
        return stCirkusLogic();
      }

      case stGRIDLOCK: {
        for (i = 1; i < squareData[0].numAnts; i++) {
          if (antInfo.brains[i].state === stEXPLORE) {
            gridCommand(m, antInfo.brains[i]);
          }
        }
        return STOP;
      }

      case stKNOWSFOOD: {
        for (i = 1; i < squareData[0].numAnts; i++) {
          const st = antInfo.brains[i].state & 0x1F;
          if (st === stGRIDLOCK) {
            if (squareData[0].numFood && (random() & 8)) { // Tell grid
              antInfo.brains[i].mx = m.mx;
              antInfo.brains[i].my = m.my;
            }
          } else if (st === stEXPLORE || st === stCIRKUS || st === stCIRKUS_OUT) {
            if (random() & 8) { // Tell explorer
              antInfo.brains[i].state = stKNOWSFOOD;
              antInfo.brains[i].mx = m.mx;
              antInfo.brains[i].my = m.my;
            }
          }
        }

        if (squareData[0].numFood) {
          if (squareData[0].numFood > 1) {
            m.mx = m.px;
            m.my = m.py;
          }
          return goHomeGridwise() | CARRY;
        }
        for (i = 1; i <= 4; i++) {
          if (squareData[i].numFood > squareData[i].numAnts) {
            return i;
          }
        }

        i = goTo(m.mx, m.my);
        if (i) {
          return i;
        } else {
          m.state = stEXPLORE;
          m.mx = m.my = 0;
          return stExploreLogic();
        }
      }

      case stLURK: {
        m.data++;
        return STOP;
      }

      default: {
        return SOUTH;
      }
    }

    return STOP;
  }

  function stExploreLogic() {
    if (squareData[0].numFood) {
      if (squareData[0].numFood > 1) {
        m.state = stKNOWSFOOD;
        m.mx = m.px;
        m.my = m.py;
      }
      return goHomeGridwise() | CARRY;
    }
    for (let i = 1; i <= 4; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        return i;
      }
    }

    if (((m.px | m.py) & 15) === 0) {
      const gridant = findGridAnt();
      if (gridant) {
        gridCommand(antInfo.brains[gridant], m);
      } else if (random() & 4) {
        const dir = ((m.px + m.py) >> 4) & 3;
        m.state = stGRIDLOCK | (dir << 5);
        return STOP;
      } else {
        m.state = stEXPLORE | (HERE << 5);
      }
    }

    const dir = (m.state >> 5); // NSEW or HERE
    if (dir) {
      return dir; // On road
    } else {
      return goOut2(); // Explore
    }
  }

  function stCirkusLogic() {
    if (squareData[0].numFood) {
      if (squareData[0].numFood > 1) {
        m.state = stKNOWSFOOD;
        m.mx = m.px;
        m.my = m.py;
      }
      return goHomeGridwise() | CARRY;
    }
    for (let i = 1; i <= 4; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        return i;
      }
    }

    const a = m.px * m.px + m.py * m.py;
    const r = (m.data * m.data) << 2;
    if (m.py === 0) {
      if (m.px > 0 && (m.px & 1)) {
        m.data += random() & 7;
      }
    } else { // m.py != 0
      if (squareData[0].numAnts > 1) {
        m.data += random() & 31;
      }
    }

    if (a < r) {
      if (m.px > 0) {
        return (m.py > 0) ? EAST : SOUTH;
      } else {
        return (m.py > 0) ? NORTH : WEST;
      }
    } else {
      if (m.px > 0) {
        return (m.py > 0) ? SOUTH : WEST;
      } else {
        return (m.py > 0) ? EAST : NORTH;
      }
    }
  }

  // Main execution
  const dir = think();
  m.px += RX[dir];
  m.py += RY[dir]; // Update coordinates
  return dir;
}