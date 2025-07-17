function BlackHole(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {}, // Empty brain - this ant is truly brainless
      name: 'BlackHole',
      color: '#000000' // Black color
    };
  }

  // Constants from C code
  const N = 25; // NewBaseAnts constant

  // Direction constants
  const EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;
  const CARRY = 8, BUILDBASE = 16;

  // Faithful translation of the original C logic:
  // I (!x[3].B)for(i=4;i;i--)I(x[i].Team)R i;
  // If there's no base to the west, check for enemies (Team != 0)
  if (!squareData[3].base) {
    for (let i = 4; i >= 1; i--) {
      if (squareData[i].team) {
        return i;
      }
    }
  }

  // I (x[1].B&&x[1].A<N) R 9;
  // If there's a base to the east with < 25 ants, carry food east
  if (squareData[1].base && squareData[1].numAnts < N) {
    return CARRY + EAST; // 9
  }

  // I (x[2].B)R 10;
  // If there's a base to the south, carry food south
  if (squareData[2].base) {
    return CARRY + SOUTH; // 10
  }

  // I (x[3].B){I (x[3].A<N||x->A>1)R 11;else R 0;}
  // If there's a base to the west
  if (squareData[3].base) {
    if (squareData[3].numAnts < N || squareData[0].numAnts > 1) {
      return CARRY + WEST; // 11
    } else {
      return 0; // Stay put
    }
  }

  // I (x[4].B)R 12;
  // If there's a base to the north, carry food north
  if (squareData[4].base) {
    return CARRY + NORTH; // 12
  }

  // I (x->F>=x->A)R 9;
  // If current square has food >= ants, carry food east
  if (squareData[0].numFood >= squareData[0].numAnts) {
    return CARRY + EAST; // 9
  }

  // I (!x->B) {for (i=4;i;i--)I (x[i].F>x[i].A) R i;R 3;}
  // If not on a base, look for food in adjacent squares
  if (!squareData[0].base) {
    for (let i = 4; i >= 1; i--) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        return i;
      }
    }
    return WEST; // Default move west
  }

  // I (!x[1].A&&x->A>N)R 3;
  // If no ants to the east and current square has > 25 ants, move west
  if (!squareData[1].numAnts && squareData[0].numAnts > N) {
    return WEST;
  }

  // Base building check - add this for modern ant war requirements
  if (squareData[0].numAnts > 10 && squareData[0].numFood >= 20 && !squareData[0].base) {
    return BUILDBASE;
  }

  // R 0; - Default: stay put
  return 0;
}
