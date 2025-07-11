function TheDoctor(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        role: 0, // 0=ROOKIE, 1=EXPLORER, 2=SOLDIER, 3=COLLECTOR, 4=QUEEN
        posX: 0,
        posY: 0,
        destX: 0,
        destY: 0,
        radius: 20,
        turn: 0,
        antsBorn: 0,
        enemyReports: 0,
      },
      name: 'TheDoctor',
      color: '#00FF00', // Green color from the C implementation
    };
  }

  const ROOKIE = 0;
  const EXPLORER = 1;
  const SOLDIER = 2;
  const COLLECTOR = 3;
  const QUEEN = 4;

  const myBrain = antInfo.brains[0];
  myBrain.turn++;

  // C-style helper functions (equivalent to C macros)
  function min(x, y) {
    return x < y ? x : y;
  }

  function max(x, y) {
    return x > y ? x : y;
  }

  function abs(x) {
    return x < 0 ? -x : x;
  }

  function baseDist(posX, posY) {
    return abs(posX) + abs(posY);
  }

  // Custom random number generator (avoiding Math.floor and Math.random)
  function docGetRand(brain) {
    // Equivalent to DocGetRand from C code
    brain.random = (brain.random * 1103515245 + 12345) >>> 0;
    return (brain.random >> 16) & 0xFFFF;
  }

  function randomInt(brain, range) {
    // Integer division equivalent to Math.floor(Math.random() * range)
    return docGetRand(brain) % range;
  }

  // Helper function to find enemies and their priority
  function findBestEnemy() {
    let bestValue = 0;
    let bestDirection = 0;
    const BaseValue = 75; // From original C code

    for (let i = 1; i < 5; i++) {
      if (squareData[i].team > 0) {
        let value = squareData[i].numAnts;
        if (squareData[i].base) value += BaseValue;
        if (value > bestValue) {
          bestValue = value;
          bestDirection = i;
        }
      }
    }
    return bestDirection;
  }

  // Helper function to find best food source
  function findBestFood() {
    let bestFood = 0;
    let bestDirection = 0;
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numFood > bestFood) {
        bestFood = squareData[i].numFood;
        bestDirection = i;
      }
    }
    return bestDirection;
  }

  // Update position tracking (simplified movement tracking)
  function updatePosition(direction) {
    switch (direction) {
      case 1:
        myBrain.posX++;
        break; // right
      case 2:
        myBrain.posY++;
        break; // down
      case 3:
        myBrain.posX--;
        break; // left
      case 4:
        myBrain.posY--;
        break; // up
    }
  }

  // Main role-based behavior
  switch (myBrain.role) {
    case ROOKIE:
      // Defend base if enemies present
      const enemyDir = findBestEnemy();
      if (enemyDir > 0) return enemyDir;

      // If not on base, try to return
      if (!squareData[0].base) return 0;

      // Check if there's a queen on base
      let hasQueen = false;
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].role === QUEEN) {
          hasQueen = true;
          break;
        }
      }

      // Become queen if none exists
      if (!hasQueen) {
        myBrain.role = QUEEN;
        myBrain.radius = 20;
        myBrain.antsBorn = 0;
        myBrain.enemyReports = 0;
        return 16; // Try to build base
      }

      // Look for food assignments or become explorer
      const foodDir = findBestFood();
      if (foodDir > 0) {
        myBrain.role = COLLECTOR;
        return foodDir | 8; // Move and carry food
      }

      // Become explorer
      myBrain.role = EXPLORER;
      myBrain.destX = randomInt(myBrain, myBrain.radius) - (myBrain.radius >> 1);
      myBrain.destY = randomInt(myBrain, myBrain.radius) - (myBrain.radius >> 1);
      return randomInt(myBrain, 4) + 1;

    case EXPLORER:
      // Fight if enemies found
      const exploreEnemyDir = findBestEnemy();
      if (exploreEnemyDir > 0) {
        myBrain.role = SOLDIER;
        myBrain.enemyReports++;
        return exploreEnemyDir;
      }

      // Collect food if found
      if (squareData[0].numFood > 0) {
        myBrain.role = COLLECTOR;
        myBrain.destX = 0; // Return to base
        myBrain.destY = 0;
        return 0 | 8; // Stay and carry food
      }

      // Check adjacent food
      const exploreFoodDir = findBestFood();
      if (exploreFoodDir > 0) {
        myBrain.role = COLLECTOR;
        return exploreFoodDir | 8;
      }

      // Continue exploring randomly
      return randomInt(myBrain, 4) + 1;

    case SOLDIER:
      // Attack enemies
      const soldierEnemyDir = findBestEnemy();
      if (soldierEnemyDir > 0) return soldierEnemyDir;

      // No enemies, return to base and become rookie
      myBrain.role = ROOKIE;
      return 0;

    case COLLECTOR:
      // Fight if necessary
      const collectorEnemyDir = findBestEnemy();
      if (collectorEnemyDir > 0) {
        myBrain.role = SOLDIER;
        return collectorEnemyDir;
      }

      // If at food source, collect and return to base
      if (squareData[0].numFood > 0) {
        myBrain.destX = 0;
        myBrain.destY = 0;
        return 0 | 8; // Stay and carry food
      }

      // Move toward food or base
      const collectorFoodDir = findBestFood();
      if (collectorFoodDir > 0) {
        return collectorFoodDir | 8;
      }

      // Return to base
      myBrain.role = ROOKIE;
      return 0;

    case QUEEN:
      // Queen stays on base and tries to build
      myBrain.antsBorn++;

      // Adjust strategy based on war reports
      if (myBrain.turn % 100 === 0) {
        if (myBrain.enemyReports > (myBrain.antsBorn >> 2)) { // Division by 4 using bit shift
          myBrain.radius = max(10, myBrain.radius - 5); // Contract
        } else {
          myBrain.radius = min(50, myBrain.radius + 5); // Expand
        }
        myBrain.enemyReports = 0;
      }

      return 16; // Always try to build base

    default:
      myBrain.role = ROOKIE;
      return 0;
  }
}
