function NFAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        mx: 0,
        my: 0
      },
      name: 'NFAnt',
      color: '#FF6B35', // Orange color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  function sign(a) {
    return a < 0 ? -1 : (a > 0 ? 1 : 0);
  }

  function manhattanDist(x, y) {
    return abs(x) + abs(y);
  }

  function xDirection(d) {
    return ((d === 1) ? 1 : 0) - ((d === 3) ? 1 : 0);
  }

  function yDirection(d) {
    return ((d === 2) ? 1 : 0) - ((d === 4) ? 1 : 0);
  }

  // Constants
  const BM = 27;
  const BD = 3 * BM; // 81
  const MaxSquareAnts = 200;
  const NewBaseFood = 20;

  const m = antInfo.brains[0];
  let x = m.mx;
  let y = m.my;

  function NT() {
    let i, d;

    // Reset position if at base
    if (squareData[0].base) {
      x = y = 0;
    }

    // Boundary wrapping
    if (y === 127) {
      y -= BD;
    } else if (y === -128) {
      y += BD;
    }
    if (x === 127) {
      x -= BD;
    } else if (x === -128) {
      x += BD;
    }

    // Reset if at boundary distance and on axis
    if ((manhattanDist(x, y) === BD) && !(x && y)) {
      x = y = 0;
    }

    // Coordinate sharing with other ants
    if (x && y) {
      for (i = 1; i < squareData[0].numAnts; i++) {
        if (manhattanDist(antInfo.brains[i].mx, antInfo.brains[i].my) < manhattanDist(x, y)) {
          x = antInfo.brains[i].mx;
          y = antInfo.brains[i].my;
        }
      }
      for (i = 1; i < squareData[0].numAnts; i++) {
        antInfo.brains[i].mx = x;
        antInfo.brains[i].my = y;
      }
    }

    // Enemy detection
    for (i = 1; i < 5; i++) {
      if (squareData[i].team) {
        return i;
      }
    }

    // Base building and initial movement
    if (!(x || y)) {
      if (squareData[0].numFood >= NewBaseFood && !squareData[0].base) {
        return 16;
      }
      
      for (i = 1; i < 5; i++) {
        if (squareData[i].numFood) {
          return i;
        }
      }
      
      d = 1;
      for (i = 2; i < 5; i++) {
        if (squareData[i].numAnts < squareData[d].numAnts) {
          d = i;
        }
      }
      return d;
    }

    // Food handling
    if (squareData[0].numFood) {
      if (squareData[0].numFood > 1) {
        // Go home with food
        if (!x) {
          return 11 + sign(y);
        } else if (!y) {
          return 10 + sign(x);
        } else if (abs(x) > abs(y)) {
          return 10 + sign(x);
        } else {
          return 11 + sign(y);
        }
      } else {
        // Look for adjacent food first
        d = 0;
        if (!y) {
          if (squareData[4].numFood) d = 4;
          if (squareData[2].numFood) d = 2;
          if (squareData[2 - sign(x)].numFood) d = (2 - sign(x));
        } else if (!x) {
          if (squareData[3].numFood) d = 3;
          if (squareData[1].numFood) d = 1;
          if (squareData[3 - sign(y)].numFood) d = (3 - sign(y));
        } else {
          if (squareData[3 - sign(y)].numFood) d = (3 - sign(y));
          if (squareData[2 - sign(x)].numFood) d = (2 - sign(x));
        }
        
        if (d && (squareData[d].numAnts < MaxSquareAnts)) {
          return d;
        }
        
        // Default home direction
        if (!x) {
          return 11 + sign(y);
        } else if (!y) {
          return 10 + sign(x);
        } else if (abs(x) > abs(y)) {
          return 10 + sign(x);
        } else {
          return 11 + sign(y);
        }
      }
    } else {
      // Movement logic when not carrying food
      
      // Stay put in certain conditions
      if ((((abs(x) < 3) && !y) && (squareData[2 + sign(x)].numAnts)) ||
          (((abs(y) < 3) && !x) && (squareData[3 + sign(y)].numAnts))) {
        return 0;
      }

      // Look for adjacent food
      d = 0;
      for (i = 1; i < 5; i++) {
        if (((x + xDirection(i)) || (y + yDirection(i))) && 
            squareData[i].numFood && 
            (squareData[d].numAnts < MaxSquareAnts)) {
          return i;
        }
      }

      // Complex movement pattern
      if (!x) {
        const cond1 = (y % 3) || (squareData[2 + sign(y)].numAnts);
        const cond2 = ((abs(y) % 12) - 3) && 
                     (squareData[3 + sign(y)].numAnts || 
                      squareData[3 - sign(y)].numAnts || 
                      squareData[0].numAnts > 1);
        return cond1 || cond2 ? (3 - sign(y)) : (2 + sign(y));
      } else if (!y) {
        const cond1 = (x % 3) || (squareData[3 - sign(x)].numAnts);
        const cond2 = ((abs(x) % 12) - 3) && 
                     (squareData[2 + sign(x)].numAnts || 
                      squareData[2 - sign(x)].numAnts || 
                      squareData[0].numAnts > 1);
        return cond1 || cond2 ? (2 - sign(x)) : (3 - sign(x));
      } else {
        // Complex quadrant-based movement
        if (sign(x) === 1) {
          if (sign(y) === 1) {
            if ((y - 3) * 3 < x * 2) {
              return (x % 3) ? 1 : 2;
            } else if (((x + 2 * y) % 7 === 4) && (y - 3 < x * 3)) {
              return 2;
            } else {
              return 3;
            }
          } else {
            if ((x - 3) * 3 < (-y) * 2) {
              return (y % 3) ? 4 : 1;
            } else if (((-y + 2 * x) % 7 === 4) && (x - 3 < (-y) * 3)) {
              return 1;
            } else {
              return 2;
            }
          }
        } else {
          if (sign(y) === 1) {
            if ((-x - 3) * 3 < y * 2) {
              return (y % 3) ? 2 : 3;
            } else if (((y + 2 * (-x)) % 7 === 4) && (-x - 3 < y * 3)) {
              return 3;
            } else {
              return 4;
            }
          } else {
            if ((-y - 3) * 3 < (-x) * 2) {
              return (x % 3) ? 3 : 4;
            } else if (((-x + 2 * (-y)) % 7 === 4) && (-y - 3 < (-x) * 3)) {
              return 4;
            } else {
              return 1;
            }
          }
        }
      }
    }
  }

  // Main function
  let d, t;
  t = NT();
  
  if ((d = t & 7) && squareData[d].numAnts < MaxSquareAnts) {
    x += xDirection(d);
    y += yDirection(d);
  }
  
  // Update brain state
  m.mx = x;
  m.my = y;
  
  return t;
}