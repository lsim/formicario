function Cascade(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        data: 0 // Single byte state storage like C version
      },
      name: 'Cascade',
      color: '#8080F0', // Light blue color from C implementation
    };
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

  // Flag constants
  const FLAG2 = 1;
  const FLAG3 = 2;
  const MULT1 = 4;

  const myBrain = antInfo.brains[0];
  
  // Direction setup (like C code)
  let frem = EAST;
  let tilbage = WEST;
  let hojre = NORTH;
  let venstre = SOUTH;

  function main() {
    // Base logic
    if (squareData[0].base) {
      if (squareData[0].numAnts + squareData[frem].numAnts + squareData[frem].numFood > 5 &&
          (myBrain.data & 0xE8) === 0xE8) {
        const dir = (myBrain.data & 3) + 1;
        if (dir !== frem && squareData[dir].numAnts < 7) {
          myBrain.data = 0xF7;
          return dir;
        }
      }
      myBrain.data = 0;
    }

    // Enemy detection
    if (squareData[EAST].team + squareData[WEST].team +
        squareData[NORTH].team + squareData[SOUTH].team) {
      myBrain.data = 0xF7 & ~FLAG3;
      if (squareData[EAST].team) return EAST;
      if (squareData[WEST].team) return WEST;
      if (squareData[NORTH].team) return NORTH;
      if (squareData[SOUTH].team) return SOUTH;
    }
    
    // Guard mode
    if ((myBrain.data & ~FLAG3) === (0xF7 & ~FLAG3)) return STOP;

    // Food handling
    if (squareData[0].numFood > 0) {
      if (myBrain.data & FLAG3 && squareData[0].numAnts > 1) {
        if (antInfo.brains.length > 1) {
          antInfo.brains[1].data |= FLAG3;
        }
      }

      // Look for bases
      if (squareData[hojre].base + squareData[venstre].base +
          squareData[tilbage].base + squareData[frem].base) {
        if (squareData[hojre].base) return hojre | CARRY;
        if (squareData[venstre].base) return venstre | CARRY;
        if (squareData[frem].base) return frem | CARRY;
        if (squareData[tilbage].base) return tilbage | CARRY;
      }

      // Move food toward ants
      if (squareData[tilbage].numAnts > 0) return tilbage | CARRY;
      if (squareData[hojre].numAnts > 0) return hojre | CARRY;
      if (squareData[tilbage].numFood > 0) return tilbage | CARRY;
      return hojre | CARRY;
    }

    // Movement logic when with other ants or on base
    if (squareData[0].numAnts > 1 || squareData[0].base) {
      if (squareData[venstre].numFood || (myBrain.data & FLAG3)) {
        if (squareData[0].numAnts >= 3) {
          if (antInfo.brains.length > 1) {
            antInfo.brains[1].data |= FLAG3;
          }
        }
        myBrain.data |= FLAG2;
        return venstre;
      }
      return frem;
    }

    // Signal food detection
    if (squareData[venstre].numFood) {
      myBrain.data |= FLAG3;
    }

    // Exploration logic
    if (squareData[frem].numAnts === 0 && squareData[frem].numFood === 0) {
      if (squareData[tilbage].numAnts > 0) {
        if (myBrain.data >= 3 * MULT1) {
          myBrain.data |= FLAG2;
          return venstre;
        } else {
          myBrain.data += MULT1;
        }
      } else if (myBrain.data & FLAG2) {
        if (myBrain.data > MULT1) {
          myBrain.data &= (MULT1 - 1);
          myBrain.data += MULT1;
        }
        if (squareData[tilbage].base || squareData[tilbage].numAnts) {
          myBrain.data &= ~FLAG2;
          return STOP;
        }
        return venstre;
      }
    }

    return STOP;
  }

  // Main wrapper function
  const dir = main();
  if (dir !== STOP) {
    myBrain.data &= ~FLAG3;
  }
  return dir;
}