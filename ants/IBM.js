function IBM(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        data: 0,
        mata: 0,
        px: 0,
        py: 0,
        mx: 0,
        my: 0
      },
      name: 'IBM',
      color: '#6699FF' // Blue color from C implementation
    };
  }

  // Helper functions
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const STOP = 0, EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;
  const CARRY = 8, BUILDBASE = 16;

  // Direction offset arrays
  const RX = [0, 1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0,
              1, 0, -1, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0];
  const RY = [0, 0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0,
              0, -1, 0, 1, 0, 0, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0];

  // Macros converted to functions
  function MOD_X(m, dx) {
    return (m.px > dx) ? WEST : EAST;
  }

  function MOD_Y(m, dy) {
    return (m.py > dy) ? SOUTH : NORTH;
  }

  const myBrain = antInfo.brains[0];

  function think(sqr, m) {
    // Reset position and data when on base
    if (sqr[0].base) {
      m.px = m.py = m.data = m.mata = 0;
    }

    // Check for enemies first
    for (let r = 1; r <= 4; r++) {
      if (sqr[r].team) return r;
    }

    // Share food location with other ants
    if (sqr[0].numAnts > 1 && (m.mx || m.my)) {
      for (let i = 1; i < sqr[0].numAnts; i++) {
        if (!(antInfo.brains[i].mx || antInfo.brains[i].my)) {
          antInfo.brains[i].mx = m.mx;
          antInfo.brains[i].my = m.my;
        }
      }
    }

    // Handle food on current square
    if (sqr[0].numFood) {
      // Remember food location if multiple food items
      if (sqr[0].numFood > 1) {
        m.mx = m.px;
        m.my = m.py;
      }
      // Return to base with food
      if (m.px) return MOD_X(m, 0) | CARRY;
      if (m.py) return MOD_Y(m, 0) | CARRY;
    }

    // Go to known food location
    if (m.mx || m.my) {
      if (m.px !== m.mx) return MOD_X(m, m.mx);
      if (m.py !== m.my) return MOD_Y(m, m.my);
      // Reached food location, clear it
      m.mx = m.my = 0;
    }

    // Look for food in adjacent squares
    for (let r = 1; r <= 4; r++) {
      if (sqr[r].numFood > sqr[r].numAnts) return r;
    }

    // Random movement with timing
    if (m.data === 0) {
      m.data = ++m.mata;
      m.random = m.random * 4237 + 54;

      // Additional randomization from C code
      const oldrnd = m.random;
      m.random = (m.random >> 5) + (m.random << 3);
      if (((oldrnd ^ m.random) & 3) === 0) m.random--;
    } else {
      m.data--;
    }

    return (m.random & 3) + 1;
  }

  // Main logic
  const dir = think(squareData, myBrain);

  // Update position
  myBrain.px += RX[dir];
  myBrain.py += RY[dir];

  return dir;
}
