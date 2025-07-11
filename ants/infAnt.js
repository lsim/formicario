/*
 * infAnt v1.0 (JavaScript translation)
 * Original C implementation by Lars Ole Simonsen (2002)
 * Translated to JavaScript for MyreKrig TypeScript implementation
 *
 * A sophisticated ant with multiple roles:
 * - QUEEN: Manages base, decides when to expand with new bases
 * - EXPLORER: Searches for food within a radius
 * - CARRIER: Transports food back to base
 * - GUARD: Defends against enemy ants
 * - SETTLER: Establishes new bases at designated locations
 *
 * @param {SquareData[]} squareData: Array of squares [center, right, down, left, up]
 * @param {AntInfo} antInfo: Contains brains array for ants on this square
 * @returns {number | object} Action to take or ant descriptor
 */
function infAnt(squareData, antInfo) {
  // When invoked with no arguments, return ant descriptor
  if (!squareData) {
    return {
      brainTemplate: {
        // Job types: 0=UNINITIALIZED, 1=QUEEN, 2=EXPLORER, 3=CARRIER, 4=GUARD, 5=SETTLER
        job: 0,
        // Direction and movement state
        dir: 0, // Current direction (0-3)
        lastDir: 0, // Last direction moved
        side: 0, // Side step pattern
        baseDir: 0, // Direction for base building
        // Position tracking (relative to home base)
        locx: 0,
        locy: 0,
        // Food/target location
        foodx: 0,
        foody: 0,
        // Search radius
        radius: 0,
      },
      name: 'infAnt',
      color: '#9c7bac',
    };
  }

  // Constants from C implementation
  const SETTLERS_PR_BASE = 250; // Settlers per base
  const ANTS_BEFORE_BASE = 800; // Ants before base expansion
  const PROD_SPEED_FOR_BASE = 1.0; // Production speed threshold
  const SEARCH_RADIUS = 250; // Initial search radius
  const START_QUEEN_SETTLE = 1; // Start queen can settle
  const SETTLE_QUEEN_SETTLE = 1; // Spawned queens can settle
  const BASE_FORMATION = 2; // Base formation pattern
  const BASE_DISTANCE = 110; // Distance between bases
  const INC_RADIUS_INTERVAL = 300; // Radius increase interval
  const RADIUS_INC = 17; // Radius increment
  const GUARD_TIME = 1000; // Guard duration
  const PERCENTAGE_SIDESTEP = 15; // Sidestep probability

  // Job constants
  const UNINITIALIZED = 0,
    QUEEN = 1,
    EXPLORER = 2,
    CARRIER = 3,
    GUARD = 4,
    SETTLER = 5;

  // Helper function to generate random numbers
  function getRand(brain) {
    brain.random = ((brain.random * 245 + 123) >>> 0) & 127;
    return (brain.random * 4213 + 421) & 255;
  }

  // Helper function to move toward target coordinates
  function gotoTarget(targetX, targetY, brain) {
    const deltaX = targetX - brain.locx;
    const deltaY = targetY - brain.locy;
    let action = 0;

    // Carriers and settlers can pick up food while moving
    const canCarryFood = brain.job === CARRIER || brain.job === SETTLER;
    const carryOffset = canCarryFood ? 8 : 0;

    if (deltaY === 0) {
      action = deltaX < 0 ? 3 : 1; // left : right
    } else if (deltaX === 0) {
      action = deltaY < 0 ? 4 : 2; // up : down
    } else if (brain.lastDir++ % 2) {
      action = deltaY < 0 ? 4 : 2; // up : down
    } else {
      action = deltaX < 0 ? 3 : 1; // left : right
    }

    // Update position based on movement
    updatePosition(action, brain);
    return action + carryOffset;
  }

  // Helper function to update ant position after movement
  function updatePosition(action, brain) {
    const direction = action % 8;
    if (direction !== 0) {
      switch (direction) {
        case 1:
          brain.locx += 1;
          break; // right
        case 2:
          brain.locy += 1;
          break; // down
        case 3:
          brain.locx -= 1;
          break; // left
        case 4:
          brain.locy -= 1;
          break; // up
      }
    }
    return action;
  }

  // Main ant logic
  const sqr = squareData;
  const mem = antInfo.brains[0];
  let queen = null;

  // Initialize uninitialized ants
  if (mem.job === UNINITIALIZED) {
    mem.locx = mem.foodx = 0;
    mem.locy = mem.foody = 0;

    // Determine if this ant should be queen
    if (sqr[0].numAnts > 1) {
      queen = antInfo.brains[1];
      if (queen.job !== QUEEN) {
        queen.job = QUEEN;
        queen.side = START_QUEEN_SETTLE;
        queen.foodx = 1;
        queen.foody = queen.lastDir = 0;
        queen.dir = queen.random % 4;
        queen.radius = SEARCH_RADIUS;
      }
    } else {
      queen = mem;
      queen.side = START_QUEEN_SETTLE;
      queen.job = QUEEN;
      queen.foodx = 1;
      queen.foody = queen.lastDir = 0;
      queen.dir = queen.random % 4;
      queen.radius = SEARCH_RADIUS;
    }

    // Increase search radius periodically
    if (queen.foodx++ % INC_RADIUS_INTERVAL === 0) {
      queen.radius += RADIUS_INC;
    }

    // Check if new base should be established
    if (
      queen &&
      queen.side &&
      queen.foodx % ANTS_BEFORE_BASE === 0 &&
      queen.foody / queen.foodx < PROD_SPEED_FOR_BASE
    ) {
      // Put queen in base-building mode
      queen.lastDir = 1;
      queen.dir = (queen.dir + BASE_FORMATION) % 4;
      queen.foodx = queen.foody = 1;

      mem.job = SETTLER;
      mem.baseDir = queen.dir;

      // Set base location based on direction
      switch (queen.dir) {
        case 0:
          mem.foodx = queen.locx = BASE_DISTANCE;
          mem.foody = queen.locy = 0;
          break;
        case 1:
          mem.foodx = queen.locx = 0;
          mem.foody = queen.locy = -BASE_DISTANCE;
          break;
        case 2:
          mem.foodx = queen.locx = -BASE_DISTANCE;
          mem.foody = queen.locy = 0;
          break;
        case 3:
          mem.foodx = queen.locx = 0;
          mem.foody = queen.locy = BASE_DISTANCE;
          break;
      }
      return updatePosition(queen.dir + 1, mem);
    } else if (queen && queen.side && queen.lastDir && queen.foodx <= SETTLERS_PR_BASE) {
      // Send more settlers to the new base
      mem.job = SETTLER;
      mem.baseDir = queen.dir;
      mem.foodx = queen.locx;
      mem.foody = queen.locy;

      if (queen.foodx === SETTLERS_PR_BASE) {
        // Take queen out of base-building mode
        queen.lastDir = 0;
        queen.foodx = queen.foody = 1;
      } else {
        queen.foodx++;
      }
      return updatePosition(queen.dir + 1, mem);
    }

    // Default job assignment
    if (!sqr[0].base && sqr[0].numAnts < 25) {
      // NewBaseAnts = 25
      mem.job = SETTLER;
    } else {
      mem.job = EXPLORER;
      mem.radius = queen.radius;
    }
  }

  // Check for enemies and attack them
  for (let i = 1; i < 5; i++) {
    if (sqr[i].team > 0) {
      mem.job = GUARD;
      mem.foodx = GUARD_TIME;
      return updatePosition(i, mem);
    }
  }

  // If guard time is up, become carrier
  if (mem.job === GUARD && mem.foodx === 0) {
    mem.job = CARRIER;
    mem.foody = 0;
  }

  // Execute job-specific behavior
  switch (mem.job) {
    case EXPLORER:
      // Reset home base if we enter another base
      if (sqr[0].base || (sqr[0].numAnts > 1 && antInfo.brains[1].job === QUEEN)) {
        mem.foodx -= mem.locx;
        mem.foody -= mem.locy;
        mem.locx = mem.locy = 0;
      }

      // Look for food on current square
      if (abs(mem.locx) + abs(mem.locy) > 1) {
        if (sqr[0].numFood >= sqr[0].numAnts) {
          mem.job = CARRIER;
          mem.foodx = mem.locx;
          mem.foody = mem.locy;
          return updatePosition((mem.dir + 9) % 8, mem);
        } else {
          // Look for food in adjacent squares
          for (let dir = 1; dir < 5; dir++) {
            if (sqr[dir].numFood > sqr[dir].numAnts) {
              return updatePosition(dir, mem);
            }
          }
        }
      }

      // Ask other ants for food locations
      for (let i = 1; i < sqr[0].numAnts && i < antInfo.brains.length; i++) {
        const otherAnt = antInfo.brains[i];
        if (mem.radius < otherAnt.radius) {
          mem.radius = otherAnt.radius;
        }

        if (
          !mem.foodx &&
          !mem.foody &&
          otherAnt.job !== GUARD &&
          otherAnt.job !== QUEEN &&
          abs(otherAnt.foodx) + abs(otherAnt.foody) > 1 &&
          (otherAnt.foodx !== 0 || otherAnt.foody !== 0)
        ) {
          mem.foodx = otherAnt.foodx;
          mem.foody = otherAnt.foody;
          break;
        }
      }

      // Special behavior at base distance
      if (abs(mem.locx) + abs(mem.locy) === BASE_DISTANCE) {
        if (sqr[0].base) {
          mem.locx = mem.locy = 0;
          mem.job = EXPLORER;
          const exploreDir = 1 + ((mem.dir + 2) & 3);
          return updatePosition(exploreDir, mem);
        }
      }

      // Move toward known food location
      if (mem.foodx !== 0 || mem.foody !== 0) {
        if (mem.foodx !== mem.locx || mem.foody !== mem.locy) {
          return gotoTarget(mem.foodx, mem.foody, mem);
        } else {
          mem.foodx = mem.foody = 0;
        }
      }

      // Turn around if too far from home
      if (abs(mem.locx) + abs(mem.locy) >= mem.radius) {
        mem.dir = (mem.dir + 2) % 4;
        mem.side = (mem.side + 1) % 4;
        return gotoTarget(0, 0, mem);
      } else {
        // Search pattern with sidestep
        if (getRand(mem) % 101 <= PERCENTAGE_SIDESTEP * mem.side) {
          const sideDir = 1 + ((mem.dir + (mem.side ? 1 : 3)) & 3);
          return updatePosition(sideDir, mem);
        } else {
          return updatePosition(1 + mem.dir, mem);
        }
      }

    case CARRIER:
      if (sqr[0].base) {
        // Arrived at base - become explorer
        if (antInfo.brains.length > 1) {
          queen = antInfo.brains[1];
          mem.radius = queen.radius;
        }
        mem.foodx -= mem.locx;
        mem.foody -= mem.locy;
        mem.locx = mem.locy = 0;
        mem.job = EXPLORER;
        const exploreDir = 1 + ((mem.dir + 2) & 3);
        return updatePosition(exploreDir, mem);
      } else if (mem.locx === 0 && mem.locy === 0) {
        mem.job = SETTLER;
        mem.foodx = mem.foody = 0;
        return 0;
      } else {
        return gotoTarget(0, 0, mem);
      }

    case GUARD:
      mem.foodx--;
      return 0;

    case SETTLER:
      // Check if we've reached the settlement location
      if (mem.foodx === mem.locx && mem.foody === mem.locy) {
        mem.foodx = mem.foody = mem.locx = mem.locy = 0;

        if (sqr[0].base) {
          mem.job = EXPLORER;
          const exploreDir = 1 + ((mem.dir + 2) & 3);
          return updatePosition(exploreDir, mem);
        } else {
          // Establish new base
          if (sqr[0].numAnts === 1) {
            mem.job = QUEEN;
            mem.foodx = 1;
            mem.side = SETTLE_QUEEN_SETTLE;
            mem.foody = mem.lastDir = 0;
            mem.radius = SEARCH_RADIUS;
            mem.dir = (mem.baseDir + 1) % 4;
            return 16; // Build base
          } else if (antInfo.brains.length > 1 && antInfo.brains[1].job !== QUEEN) {
            const newQueen = antInfo.brains[1];
            newQueen.job = QUEEN;
            newQueen.side = SETTLE_QUEEN_SETTLE;
            newQueen.foodx = 1;
            newQueen.foody = newQueen.lastDir = 0;
            newQueen.radius = SEARCH_RADIUS;
            newQueen.dir = (newQueen.baseDir + 1) % 4;
          }

          if (sqr[0].numAnts <= 25) {
            // NewBaseAnts
            return 0;
          } else {
            mem.job = EXPLORER;
            const exploreDir = 1 + ((mem.dir + 2) & 3);
            return updatePosition(exploreDir, mem);
          }
        }
      } else {
        return gotoTarget(mem.foodx, mem.foody, mem);
      }

    case QUEEN:
      mem.foody++;
      return 16; // Build base
  }

  return 0;

  function abs(a) {
    return a > 0 ? a : -a;
  }
}
