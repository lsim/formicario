/*
 Key Features of SunMyre:

  🏛️ Hierarchical Command Structure:
  - Uses a queen ant (called "Maura") that coordinates all other ants
  - Queen manages strategy, exploration parameters, and base building decisions

  🔍 Intelligent Scouting System:
  - Sends scouts to 8 specific positions around the map
  - Analyzes scout reports to decide optimal locations for new bases

  ⚔️ Multi-Phase Strategy:
  1. Early Game: Conservative exploration with increasing search radius
  2. Mid Game: Scout deployment and base expansion planning
  3. Late Game: Coordinated attacks on enemy positions

  🧠 Sophisticated Memory Management:
  - Tracks known food locations with sharing between ants
  - Maintains exploration parameters that adapt over time
  - Coordinate system for precise navigation

  🛡️ Defensive Capabilities:
  - Guard duty system that responds to enemy threats
  - Automatic reinforcement when enemies are detected

 */
function SunMyre(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        // Random state (2 values for custom RNG)
        random0: 0,
        random1: 0,

        // Position tracking
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,

        // Behavior parameters
        maxLimit: 0,
        turnsToReturn: 0,
        knownFoodX: 0,
        knownFoodY: 0,
        buildBaseAtX: 0,
        buildBaseAtY: 0,

        // State variables
        minLimit: 0,
        task: 0,
        knownFoodNum: 0,
        baseRnd: 0,
        baseStatus: 0,
        scoutCount: 0,
        direction: 0,
        currentFood: 0,
      },
      name: 'SunMyre',
      color: '#eeee22', // Sun yellow color
    };
  }

  // Constants (translated from C defines)
  const ServerOfGod = 42;
  const LimitToAdd = 8;
  const MediumLimitToAdd = 16;
  const LargeLimitToAdd = 24;
  const ValueToAdd = 1;
  const StartAttackAt = 5000;
  const AttackRate = 2;
  const MaxSquareAnts = 255;

  // Guard and combat constants
  const Const_GuardKillCount = 1;
  const Const_WarKillCount = 30;
  const Const_GuardTurns = 100;
  const Const_SearchForScout = 1200;
  const Const_SendScoutAt = 300;
  const BuildBaseTurns = 400;
  const NumStoreFoodTurns = 400;
  const GridSize = 2;

  // Task enum values
  const Tasks = {
    QueenOfCaerGwent: 1,
    GetFood: 2,
    Goto: 3,
    None: 4,
    RndGoto: 5,
    Return: 6,
    StoreFood: 7,
    ReturnWithFood: 8,
    BuildBase: 9,
    Gvydion: 10,
    MauraGuard: 11,
    Scout: 12,
    BuildNewBase: 13,
    Attack: 14,
  };

  // Helper functions (no Math API allowed)
  function abs(x) {
    return x >= 0 ? x : -x;
  }
  
  function floor(x) {
    return x >= 0 ? (x | 0) : ((x | 0) === x ? x : (x | 0) - 1);
  }

  // Custom random number generator (matches C implementation)
  function sunRandom(num, brain) {
    let battleSeed = (brain.random1 << 16) | brain.random0;
    const a = (battleSeed = battleSeed * (42 * 42 - 42 / 42 + 42) + 7);
    brain.random0 = battleSeed & 0xffff;
    brain.random1 = (battleSeed >> 16) & 0xffff;
    return ((a << 19) + (a >> 13)) % num;
  }

  const myBrain = antInfo.brains[0];

  // Initialize random if not set
  if (myBrain.random0 === 0 && myBrain.random1 === 0) {
    myBrain.random0 = myBrain.random & 0xffff;
    myBrain.random1 = (myBrain.random >> 16) & 0xffff;
  }

  // Find the queen (Maura) among ants on this square
  function findMaura() {
    for (let i = 1; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].task === ServerOfGod) {
        return antInfo.brains[i];
      }
    }
    return null;
  }

  // Pathfinding handler - moves toward target coordinates
  function gotoHandler(targetX, targetY) {
    const absX = abs(myBrain.x - targetX);
    const absY = abs(myBrain.y - targetY);

    if (absX === 0 && absY === 0) {
      return 0;
    }

    if (absX && absY) {
      // Both X and Y distance - randomly choose direction weighted by distance
      if (sunRandom(absY, myBrain) > sunRandom(absX, myBrain)) {
        // Move in Y direction
        if (myBrain.y > targetY)
          return 4; // Up
        else if (myBrain.y < targetY) return 2; // Down
      } else {
        // Move in X direction
        if (myBrain.x > targetX)
          return 3; // Left
        else if (myBrain.x < targetX) return 1; // Right
      }
    } else {
      // Only one axis has distance
      if (myBrain.x !== targetX) {
        if (myBrain.x > targetX)
          return 3; // Left
        else return 1; // Right
      } else {
        if (myBrain.y > targetY)
          return 4; // Up
        else if (myBrain.y === targetY)
          return 0; // Arrived
        else return 2; // Down
      }
    }
    return 0;
  }

  // Check if food exists on current or adjacent squares
  function existsFood() {
    // Check current square first
    if (squareData[0].numFood && squareData[0].numFood >= squareData[0].numAnts) {
      return 0;
    }

    // Check adjacent squares for uncontested food
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numFood && squareData[i].numAnts === 0) {
        return i;
      }
    }

    return -1;
  }

  // Check if enemies exist on adjacent squares
  function existsEnemy() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numAnts && squareData[i].team !== squareData[0].team) {
        // Found enemy - alert all guard ants
        for (let j = 0; j < antInfo.brains.length; j++) {
          if (antInfo.brains[j].task === Tasks.Gvydion) {
            antInfo.brains[j].turnsToReturn += Const_GuardTurns;
          }
        }
        return i;
      }
    }
    return 0;
  }

  // Check if Maura knows about available food
  function mauraKnownFood() {
    let minDist = 999;
    let index = 0;

    for (let i = 1; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].task === Tasks.StoreFood && antInfo.brains[i].knownFoodNum > 0) {
        const newMinDist = abs(antInfo.brains[i].knownFoodX) + abs(antInfo.brains[i].knownFoodY);
        if (newMinDist < minDist) {
          index = i;
          minDist = newMinDist;
        }
      }
    }

    if (minDist !== 999) {
      if (antInfo.brains[index].knownFoodNum-- > 0) {
        myBrain.knownFoodX = antInfo.brains[index].knownFoodX;
        myBrain.knownFoodY = antInfo.brains[index].knownFoodY;
        return true;
      }
    }
    return false;
  }

  // Initialize as queen (Maura)
  function iAmMaura() {
    // Reset brain state
    Object.keys(myBrain).forEach((key) => {
      if (key !== 'random' && key !== 'random0' && key !== 'random1') {
        myBrain[key] = 0;
      }
    });

    myBrain.task = ServerOfGod;
    myBrain.minLimit = 2;
    myBrain.maxLimit = 30;
    myBrain.x = 0;
    myBrain.turnsToReturn = myBrain.maxLimit;
    myBrain.direction = 0;
  }

  // Handle when ant returns home
  function iAmHome() {
    myBrain.x = myBrain.y = 0;
    myBrain.task = 0;
    myBrain.buildBaseAtX = myBrain.buildBaseAtY = 0;

    const maura = findMaura();
    if (!maura) {
      myBrain.task = Tasks.BuildBase;
      return;
    }

    // Stay home if we know about food
    if (myBrain.knownFoodNum > 0) {
      // Check if other ants already know about this food
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (
          antInfo.brains[i].task === Tasks.StoreFood &&
          antInfo.brains[i].knownFoodX === myBrain.knownFoodX &&
          antInfo.brains[i].knownFoodY === myBrain.knownFoodY
        ) {
          antInfo.brains[i].knownFoodNum--;
          getTaskFromMaura(maura);
          return;
        }
      }

      myBrain.task = Tasks.StoreFood;
      myBrain.turnsToReturn = NumStoreFoodTurns;
      return;
    }

    getTaskFromMaura(maura);
  }

  // Get task assignment from queen
  function getTaskFromMaura(maura) {
    const turnCounter = maura.x;

    myBrain.buildBaseAtX = 0;
    myBrain.buildBaseAtY = 0;

    // Send scouts after certain turn count
    if (turnCounter > Const_SendScoutAt && maura.scoutCount < 8) {
      const pos1 = 210 - 100;
      const pos2 = 190 - 100;

      switch (maura.scoutCount) {
        case 0:
          myBrain.targetX = pos1;
          myBrain.targetY = -pos2;
          break;
        case 1:
          myBrain.targetX = pos2;
          myBrain.targetY = -pos1;
          break;
        case 2:
          myBrain.targetX = pos1;
          myBrain.targetY = pos2;
          break;
        case 3:
          myBrain.targetX = pos2;
          myBrain.targetY = pos1;
          break;
        case 4:
          myBrain.targetX = -pos1;
          myBrain.targetY = pos2;
          break;
        case 5:
          myBrain.targetX = -pos2;
          myBrain.targetY = pos1;
          break;
        case 6:
          myBrain.targetX = -pos1;
          myBrain.targetY = -pos2;
          break;
        case 7:
          myBrain.targetX = -pos2;
          myBrain.targetY = -pos1;
          break;
      }

      myBrain.task = Tasks.Scout;
      myBrain.scoutCount = maura.scoutCount++;
      return;
    }

    // Assign food gathering if known food exists
    if (mauraKnownFood()) {
      myBrain.buildBaseAtX = maura.buildBaseAtX;
      myBrain.buildBaseAtY = maura.buildBaseAtY;
      myBrain.task = Tasks.GetFood;
      return;
    }

    // Attack mode after certain turn count
    if (
      turnCounter > StartAttackAt + 1000 * maura.baseRnd &&
      sunRandom(AttackRate, myBrain) === 0
    ) {
      const factor = sunRandom(4, myBrain);
      let offsetY = 110;

      if (turnCounter > 7000) offsetY += 50;

      myBrain.task = Tasks.Attack;

      switch (factor) {
        case 0:
          myBrain.targetX = 10;
          myBrain.targetY = -offsetY;
          break;
        case 1:
          myBrain.targetX = 10;
          myBrain.targetY = offsetY;
          break;
        case 2:
          myBrain.targetX = -10;
          myBrain.targetY = offsetY;
          break;
        case 3:
          myBrain.targetX = -10;
          myBrain.targetY = -offsetY;
          break;
      }
    } else {
      // Normal exploration
      myBrain.task = Tasks.Goto;
      const minLimit = maura.minLimit;
      const maxLimit = maura.maxLimit;
      const limit = maxLimit - minLimit;
      const targetSize = sunRandom(limit, myBrain) + minLimit;
      myBrain.turnsToReturn = maxLimit;

      maura.direction = maura.direction === 4 ? 1 : maura.direction + 1;

      switch (maura.direction) {
        case 1:
          myBrain.targetX = targetSize;
          myBrain.targetY = 0;
          break;
        case 2:
          myBrain.targetX = 0;
          myBrain.targetY = targetSize;
          break;
        case 3:
          myBrain.targetX = -targetSize;
          myBrain.targetY = 0;
          break;
        case 4:
          myBrain.targetX = 0;
          myBrain.targetY = -targetSize;
          break;
      }
    }
  }

  // Main servant logic (non-queen ants)
  function serveMaura() {
    let result = 1;

    // Check for enemies first
    if (myBrain.task !== ServerOfGod) {
      result = existsEnemy();
      if (result) {
        if (
          myBrain.task !== Tasks.MauraGuard &&
          myBrain.knownFoodNum > 0 &&
          squareData[0].numFood === 0
        ) {
          myBrain.turnsToReturn += Const_GuardTurns;
          myBrain.task = Tasks.Gvydion;
        }
        return result;
      }
    }

    // Look for food while exploring
    if (
      myBrain.task === Tasks.RndGoto ||
      myBrain.task === Tasks.Goto ||
      myBrain.task === Tasks.Return
    ) {
      if (myBrain.knownFoodNum === 0) {
        result = existsFood();
        if (result === 0) {
          myBrain.knownFoodNum = squareData[0].numFood - squareData[0].numAnts;
          myBrain.knownFoodX = myBrain.x;
          myBrain.knownFoodY = myBrain.y;
          myBrain.targetX = myBrain.targetY = 0;
          myBrain.task = Tasks.Return;
          return gotoHandler(0, 0) + 8;
        } else if (result !== -1) {
          return result;
        }
      }

      // Check for guard duty
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (
          antInfo.brains[i].task === Tasks.Gvydion &&
          squareData[0].numAnts <= 3 &&
          squareData[0].numFood === 0
        ) {
          myBrain.task = Tasks.Gvydion;
          for (let j = 0; j < antInfo.brains.length; j++) {
            if (antInfo.brains[j].task === Tasks.Gvydion) {
              antInfo.brains[j].turnsToReturn += Const_GuardTurns;
            }
          }
        }
      }
    }

    // Execute task-specific behavior
    switch (myBrain.task) {
      case Tasks.ReturnWithFood:
        result = gotoHandler(myBrain.buildBaseAtX, myBrain.buildBaseAtY);
        if (result === 0) {
          if (squareData[0].base) {
            if (myBrain.x || myBrain.y) {
              // Reset brain
              Object.keys(myBrain).forEach((key) => {
                if (key !== 'random' && key !== 'random0' && key !== 'random1') {
                  myBrain[key] = 0;
                }
              });
            }
            iAmHome();
            result = serveMaura();
          }
        } else {
          result += 8;
        }
        return result;

      case Tasks.Goto:
        result = gotoHandler(myBrain.targetX, myBrain.targetY);
        if (!result) {
          myBrain.task = Tasks.RndGoto;
          if (myBrain.x) {
            if (sunRandom(2, myBrain)) {
              myBrain.baseRnd = 4;
              return 2;
            } else {
              myBrain.baseRnd = 2;
              return 4;
            }
          } else {
            if (sunRandom(2, myBrain)) {
              myBrain.baseRnd = 3;
              return 1;
            } else {
              myBrain.baseRnd = 1;
              return 3;
            }
          }
        }
        return result;

      case Tasks.RndGoto:
        if (myBrain.turnsToReturn-- <= 0) {
          myBrain.task = Tasks.Return;
          return gotoHandler(0, 0);
        }
        if (myBrain.baseRnd === 0) {
          result = sunRandom(4, myBrain);
          switch (result) {
            case 0:
              result = 3;
              break;
            case 1:
              result = 4;
              break;
            case 2:
              result = 1;
              break;
            case 3:
              result = 2;
              break;
          }
        } else {
          result = myBrain.baseRnd;
        }
        return result;

      case Tasks.Return:
        if (myBrain.baseStatus === 0 && myBrain.buildBaseAtX) {
          myBrain.buildBaseAtX = myBrain.buildBaseAtY = 0;
        }
        result = gotoHandler(0, 0);
        if (!result) {
          if (squareData[0].base) {
            if (myBrain.x || myBrain.y) {
              // Reset brain
              Object.keys(myBrain).forEach((key) => {
                if (key !== 'random' && key !== 'random0' && key !== 'random1') {
                  myBrain[key] = 0;
                }
              });
            }
            iAmHome();
            result = serveMaura();
          } else {
            result = 8;
          }
        }
        return result + 8;

      case Tasks.GetFood:
        result = gotoHandler(myBrain.knownFoodX, myBrain.knownFoodY);
        if (!result) {
          if (squareData[0].numFood) {
            if (myBrain.buildBaseAtX) {
              myBrain.task = Tasks.BuildNewBase;
            } else {
              myBrain.task = Tasks.Return;
            }
            myBrain.knownFoodNum = 0;
            myBrain.baseStatus = 1;
            return gotoHandler(myBrain.buildBaseAtX, myBrain.buildBaseAtY) + 8;
          } else {
            // Food is gone - search nearby
            switch (sunRandom(4, myBrain)) {
              case 0:
              case 1:
              case 3:
                if (myBrain.y > 0) {
                  myBrain.targetX = myBrain.x;
                  myBrain.targetY = myBrain.y - sunRandom(10, myBrain);
                } else {
                  myBrain.targetX = myBrain.x;
                  myBrain.targetY = myBrain.y + sunRandom(10, myBrain);
                }
                myBrain.turnsToReturn = 3;
                myBrain.task = Tasks.Goto;
                break;
              case 2:
                myBrain.turnsToReturn = 150;
                myBrain.task = Tasks.RndGoto;
                myBrain.baseRnd = 0;
                break;
            }
          }
        }
        return result;

      case Tasks.Gvydion:
        if (myBrain.turnsToReturn-- <= 0) {
          myBrain.task = Tasks.Return;
          return gotoHandler(0, 0);
        }
        return 0;

      case Tasks.MauraGuard:
        if (myBrain.x === 0 && myBrain.y === 0) {
          return 0;
        }
        return gotoHandler(0, 0);

      case Tasks.BuildBase:
        if (squareData[0].base) {
          iAmHome();
        }
        return 16;

      case Tasks.Scout:
        result = gotoHandler(myBrain.targetX, myBrain.targetY);
        if (!result) {
          myBrain.targetX = myBrain.targetY = 0;
          result = gotoHandler(0, 0);
        }
        return result;

      case Tasks.BuildNewBase:
        result = gotoHandler(myBrain.buildBaseAtX, myBrain.buildBaseAtY);
        if (result === 0) {
          myBrain.task = Tasks.BuildBase;
          myBrain.buildBaseAtX = myBrain.buildBaseAtY = 0;
          myBrain.x = myBrain.y = 0;
        }
        return result + 8;

      case Tasks.StoreFood:
        result = gotoHandler(0, 0);
        if (myBrain.turnsToReturn-- > 0) {
          if (squareData[0].numAnts < MaxSquareAnts - 10) {
            return 0;
          }
        }
        myBrain.knownFoodNum = 0;
        myBrain.task = 0;
        return 0;

      case Tasks.Attack:
        result = gotoHandler(myBrain.targetX, myBrain.targetY);
        if (!result) {
          if (squareData[0].numAnts > 1) {
            if (abs(myBrain.x) >= 200) {
              myBrain.targetY -= GridSize;
            } else {
              myBrain.targetX += myBrain.x > 0 ? GridSize : -GridSize;
            }
            result = gotoHandler(myBrain.targetX, myBrain.targetY);
          } else {
            myBrain.task = Tasks.Gvydion;
            myBrain.turnsToReturn = sunRandom(400, myBrain) + sunRandom(400, myBrain);
          }
        }
        break;

      case Tasks.ServerOfGod:
        return 0;

      default:
        return 0;
    }

    return result;
  }

  // Main logic starts here

  // If no task assigned, either become queen or get task from queen
  if (myBrain.task === 0) {
    const maura = findMaura();
    if (!maura) {
      iAmMaura();
    } else {
      getTaskFromMaura(maura);
    }
  }

  let result;

  if (myBrain.task !== ServerOfGod) {
    result = serveMaura();
  } else {
    // Queen logic - manage parameters and coordinate others
    myBrain.x++; // Turn counter
    const turnCounter = myBrain.x;

    // Adjust exploration parameters over time
    if (turnCounter % LimitToAdd === 0 && turnCounter < 1000) {
      myBrain.maxLimit += ValueToAdd;
      myBrain.turnsToReturn = myBrain.maxLimit;
    } else if (turnCounter % MediumLimitToAdd === 0 && turnCounter > 2000 && turnCounter < 3000) {
      myBrain.maxLimit += ValueToAdd;
      myBrain.turnsToReturn = myBrain.maxLimit;
      if (myBrain.maxLimit > 250) myBrain.maxLimit = 250;
      myBrain.minLimit++;
    }

    if (turnCounter % LargeLimitToAdd === 0 && turnCounter > 3000) {
      myBrain.maxLimit += ValueToAdd;
      myBrain.turnsToReturn =
        floor(myBrain.maxLimit / 2) + sunRandom(floor(myBrain.maxLimit / 2), myBrain);
      if (myBrain.maxLimit > 250) myBrain.maxLimit = 250;
    }

    // Reset scout count at specific time
    if (turnCounter === Const_SendScoutAt * 2) {
      myBrain.scoutCount = 0;
    }

    // Process scout reports and decide on base building
    if (turnCounter === Const_SearchForScout) {
      const baseDist = 100;
      let maxVal = 2;
      let maxIndex = -1;
      const scoutCount = [0, 0, 0, 0];

      myBrain.scoutCount = 0;

      // Collect scout data
      for (let i = 1; i < antInfo.brains.length; i++) {
        if (antInfo.brains[i].task === Tasks.Scout) {
          scoutCount[floor(antInfo.brains[i].scoutCount / 2)]++;
          antInfo.brains[i].task = 0;
        }
      }

      // Find best location based on scout reports
      for (let i = 0; i < 4; i++) {
        if (scoutCount[i] > maxVal) {
          maxVal = scoutCount[i];
          maxIndex = i;
        }
      }

      myBrain.baseRnd = 1; // Building new base
      switch (maxIndex) {
        case 0:
          myBrain.buildBaseAtX = baseDist;
          myBrain.buildBaseAtY = -baseDist;
          break;
        case 1:
          myBrain.buildBaseAtX = baseDist;
          myBrain.buildBaseAtY = baseDist;
          break;
        case 2:
          myBrain.buildBaseAtX = -baseDist;
          myBrain.buildBaseAtY = baseDist;
          break;
        case 3:
          myBrain.buildBaseAtX = -baseDist;
          myBrain.buildBaseAtY = -baseDist;
          break;
        default:
          myBrain.buildBaseAtX = 0;
          myBrain.buildBaseAtY = 0;
          myBrain.baseRnd = 0;
          break;
      }
    } else if (myBrain.buildBaseAtX && turnCounter > Const_SearchForScout + BuildBaseTurns) {
      // Stop building base
      myBrain.buildBaseAtX = 0;
      myBrain.buildBaseAtY = 0;
    }

    return 0;
  }

  // Handle movement and overflow protection
  const direction = result & 7;
  switch (direction) {
    case 0:
      break;
    case 1:
      if (squareData[1].numAnts === MaxSquareAnts) {
        result = 0;
        myBrain.targetX = -(sunRandom(10, myBrain) + 3);
        myBrain.targetY = -(sunRandom(10, myBrain) + 3);
        myBrain.task = Tasks.Goto;
        myBrain.turnsToReturn = 30;
      } else {
        myBrain.x++;
      }
      break;
    case 2:
      if (squareData[2].numAnts === MaxSquareAnts) {
        result = 0;
        myBrain.targetX = sunRandom(10, myBrain) + 3;
        myBrain.targetY = -(sunRandom(10, myBrain) + 3);
        myBrain.task = Tasks.Goto;
        myBrain.turnsToReturn = 30;
      } else {
        myBrain.y++;
      }
      break;
    case 3:
      if (squareData[3].numAnts === MaxSquareAnts) {
        result = 0;
        myBrain.targetX = sunRandom(10, myBrain) + 3;
        myBrain.targetY = sunRandom(10, myBrain) + 3;
        myBrain.task = Tasks.Goto;
        myBrain.turnsToReturn = 30;
      } else {
        myBrain.x--;
      }
      break;
    case 4:
      if (squareData[4].numAnts === MaxSquareAnts) {
        result = 0;
        myBrain.targetX = -(sunRandom(10, myBrain) + 3);
        myBrain.targetY = sunRandom(10, myBrain) + 3;
        myBrain.task = Tasks.Goto;
        myBrain.turnsToReturn = 30;
      } else {
        myBrain.y--;
      }
      break;
    default:
      result = 1;
      break;
  }

  return result;
}
