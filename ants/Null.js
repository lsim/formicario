function Null(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        // Empty brain structure - Null ant has no state
      },
      name: 'Null',
      color: '#000000', // Black color for null
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

  let frem = EAST;
  let tilbage = WEST;
  let hojre = NORTH;
  let venstre = SOUTH;

  // If there's food on current square
  if (squareData[0].numFood) {
    // Look for a base to carry food to
    for (let i = 1; i <= 4; i++) {
      if (squareData[i].base) {
        return i | CARRY;
      }
    }
    
    // If ants are to the left, carry food there
    if (squareData[venstre].numAnts) {
      return venstre | CARRY;
    }
    
    // If ants or food behind, carry food there
    if (squareData[tilbage].numAnts + squareData[tilbage].numFood) {
      return tilbage | CARRY;
    }
    
    // Default: carry food left
    return venstre | CARRY;
  }

  // If crowded (ants + 3*food >= 7), move right
  if (squareData[0].numAnts + 3 * squareData[0].numFood >= 7) {
    return hojre;
  }
  
  // If on base or with other ants
  if (squareData[0].base || squareData[0].numAnts > 1) {
    if (squareData[hojre].numFood) {
      return hojre;
    } else {
      return frem;
    }
  }
  
  // If clear ahead, move right
  if (squareData[frem].numAnts === 0 && squareData[frem].numFood === 0) {
    return hojre;
  }

  // Special formation check
  if (squareData[tilbage].numAnts === 1 && 
      squareData[frem].numAnts === 1 && 
      squareData[venstre].numAnts > 1) {
    return frem;
  }

  return STOP;
}