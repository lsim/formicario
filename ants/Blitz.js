function Blitz(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        a: 0, // 2-bit value (0-3)
        b: 0  // 6-bit value (0-63)
      },
      name: 'Blitz',
      color: '#EEFF77', // Light yellow-green
    };
  }

  // Constants from C implementation
  const n = [47,26,45,31,50,9,10,14,6,54,20,40,5,52,22,58,21,8,12,30,63,56,61,24,48,29,23,28,15,59,36,34,38,53,3,19,0,55,39,32,2,44,99,43,62,11,37,57,1,27,41,7,49,33,18,16,46,35,13,60,25,51,4,17];
  const p = [36,48,40,34,62,12,8,51,17,5,6,45,18,58,7,28,55,63,54,35,10,16,14,26,23,60,1,49,27,25,19,3,39,53,31,57,30,46,32,38,11,50,99,43,41,2,56,0,24,52,4,61,13,33,9,37,21,47,15,29,59,22,44,20];
  const d = [0,0,1,1,0,1,0,1,0,0,0,0,1,1,1,0,1,0,1,1,1,1,1,0,0,1,0,1,0,1,1,1,0,0,0,1,0,1,0,1,0,0,42,0,1,0,1,0,1,1,0,0,1,1,0,1,0,0,0,0,1,1,1,0];

  const myBrain = antInfo.brains[0];
  let enemyDirection = 0;
  let maxEnemyStrength = 0;
  let foodDirection = 0;

  // Handle overcrowding by resetting some ant states
  if (squareData[0].numAnts > 70) {
    for (let i = 1; i < antInfo.brains.length && i < 65; i++) {
      if (antInfo.brains[i].b === 42) {
        antInfo.brains[i].b = i;
      }
    }
  }

  // Look for enemies in adjacent squares
  for (let dir = 1; dir < 5; dir++) {
    if (squareData[dir].team && squareData[dir].team !== squareData[0].team) {
      // Calculate enemy strength (ants + huge bonus for bases)
      const enemyStrength = squareData[dir].numAnts + (squareData[dir].base ? (1 << 24) : 0);
      if (enemyStrength > maxEnemyStrength) {
        maxEnemyStrength = enemyStrength;
        enemyDirection = dir;
      }
    }
  }

  // Attack enemies if found
  if (enemyDirection) {
    myBrain.b = 42; // Mark as combat state
    return enemyDirection;
  }

  // If in combat state, stay put
  if (myBrain.b === 42) {
    return 0;
  }

  // Calculate movement directions based on brain state
  const u = ((d[myBrain.b] + myBrain.a) & 3) + 1;
  const i = ((d[p[myBrain.b]] + myBrain.a + 2) & 3) + 1;

  // Look for bases and food in adjacent squares
  for (let dir = 1; dir < 5; dir++) {
    // Attack enemy bases (but not in direction i)
    if (dir !== i && squareData[dir].base && squareData[dir].team !== squareData[0].team) {
      return dir + 8; // Attack with food carry
    }
    // Note uncontested food
    if (squareData[dir].numFood && !squareData[dir].numAnts) {
      foodDirection = dir;
    }
  }

  // If on food, pick it up and go home
  if (squareData[0].numFood) {
    myBrain.b = p[myBrain.b]; // Update state
    return i + 8; // Return home with food
  }

  // Go to uncontested food if no food nearby
  if (foodDirection && 
      !squareData[0].numFood && 
      !squareData[u].numFood && 
      !squareData[i].numFood) {
    return foodDirection;
  }

  // Normal exploration
  myBrain.b = n[myBrain.b]; // Update state for next iteration
  return u;
}