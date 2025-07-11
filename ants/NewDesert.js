function NewDesert(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        randseed: 1,
        carryingFood: 0,
        rang: 0,
        turn: 0,
        pos: { x: 0, y: 0 },
        dest: { x: 0, y: 0 },
        moveData: {
          absdx: 0,
          absdy: 0,
          returnX: 0,
          returnY: 0
        },
        // Union data based on role
        rookie: {},
        surrender: {},
        collector: { receivedReport: 0 },
        reporter: {
          report: {
            pos: { x: 0, y: 0 },
            amount: 0,
            isFood: 0
          }
        },
        soldier: {
          enemyDist: 0,
          brakeDist: 0,
          enemyMinusBrakeDist: 0,
          ownDist: 0,
          lastBattleTurn: 0
        },
        kQueen: {
          report: new Array(32).fill(null).map(() => ({
            pos: { x: 0, y: 0 },
            amount: 0,
            isFood: 0
          })),
          index: 0
        },
        htQueen: {
          hashTable: new Array(64).fill(0),
          hashTableIndex: 0
        },
        pQueen: {
          htQueen: null,
          kQueen: new Array(32).fill(null),
          kQueenCount: 0,
          reportCount: 0,
          radius: 0,
          timeToExpand: 0,
          antsBorn: 0,
          enemyReports: 0
        }
      },
      name: 'New Desert',
      color: '#DAA520', // Golden rod color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a < 0 ? -a : a;
  }

  function sign(a) {
    return a < 0 ? -1 : (a === 0 ? 0 : 1);
  }

  function min(a, b) {
    return a < b ? a : b;
  }

  function max(a, b) {
    return a < b ? b : a;
  }

  function dist(p1, p2) {
    return abs(p1.x - p2.x) + abs(p1.y - p2.y);
  }

  function baseDist(pos) {
    return abs(pos.x) + abs(pos.y);
  }

  function zeroPos(mem) {
    return !(mem.pos.x || mem.pos.y);
  }

  function destReached(mem) {
    return mem.pos.x === mem.dest.x && mem.pos.y === mem.dest.y;
  }

  function hashFunction(pos) {
    return (pos.x ^ (pos.y << 8)) & 65535;
  }

  function posEqual(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
  }

  // Constants
  const north = 4, south = 2, east = 1, west = 3;
  const INITIAL_RADIUS = 60;
  const RADIUS_STEP = 20;
  const MAX_FOOD_REPORTS = 32;
  const HASH_TABLE_SIZE = 64;
  const MAX_KNOWLEDGE_QUEEN = 32;
  const SOLDIER_BRAKE = 200;
  const SOLDIER_INVERSE_COMBAT_SPEED = 8;
  const SOLDIER_STOP = 320;
  const SOLDIER_WAIT = 1000;
  const AGGRESSIVITY = 4;
  const MINIMUM_ANTS_BORN_PR_ENEMY_REPORT = 4;
  const MaxSquareAnts = 200;
  const BaseValue = 100;
  const NewBaseFood = 20;
  const NewBaseAnts = 10;

  // Role constants
  const ROOKIE = 0;
  const SURRENDER = 1;
  const COLLECTOR = 2;
  const SOLDIER = 3;
  const REPORTER = 4;
  const KNOWLEDGE_QUEEN = 5;
  const HASH_TABLE_QUEEN = 6;
  const PRIMARY_QUEEN = 7;

  const mem = antInfo.brains[0];

  function getRand() {
    mem.randseed = mem.randseed * 1103515245 + 12345;
    return (mem.randseed >> 16) & 65535;
  }

  function getRandMax(max) {
    mem.randseed = mem.randseed * 1103515245 + 12345;
    return (((mem.randseed >> 16) * max + (((mem.randseed & 65535) * max) >> 16)) >> 16);
  }

  function morphToRookie(brain) {
    brain.rang = ROOKIE;
    brain.carryingFood = 0;
  }

  function gotoBase(mem) {
    initGotoDest(mem, 0, 0);
  }

  function gotoDest(mem) {
    if (destReached(mem)) return 0;
    if (mem.moveData.absdy * abs(mem.dest.x - mem.pos.x) <
        mem.moveData.absdx * abs(mem.dest.y - mem.pos.y)) {
      return mem.moveData.returnY;
    } else {
      return mem.moveData.returnX;
    }
  }

  function initGotoDest(mem, destX, destY) {
    mem.dest.x = destX;
    mem.dest.y = destY;
    mem.moveData.absdx = abs(mem.pos.x - destX);
    mem.moveData.absdy = abs(mem.pos.y - destY);
    mem.moveData.returnX = (mem.pos.x < destX ? east : west);
    mem.moveData.returnY = (mem.pos.y < destY ? north : south);
  }

  function assignAntToPosOnRhombe(mem, rhombeRadius, pos) {
    if (pos < rhombeRadius) {
      initGotoDest(mem, rhombeRadius - pos, pos);
      return;
    }
    pos -= rhombeRadius;
    if (pos < rhombeRadius) {
      initGotoDest(mem, -pos, rhombeRadius - pos);
      return;
    }
    pos -= rhombeRadius;
    if (pos < rhombeRadius) {
      initGotoDest(mem, pos - rhombeRadius, -pos);
      return;
    }
    pos -= rhombeRadius;
    initGotoDest(mem, pos, pos - rhombeRadius);
  }

  function enemyInSight() {
    let i, value, bestHit = 0, bestHitPos = 0;
    for (i = 1; i < 5; i++) {
      if (squareData[i].team) {
        value = squareData[i].numAnts;
        if (squareData[i].base) value += BaseValue;
        if (value > bestHit) {
          bestHit = value;
          bestHitPos = i;
        }
      }
    }
    if (bestHitPos && mem.rang !== SOLDIER) {
      mem.rang = REPORTER;
      mem.reporter.report.pos = { x: mem.pos.x, y: mem.pos.y };
      mem.reporter.report.amount = AGGRESSIVITY;
      mem.reporter.report.isFood = 0;
      gotoBase(mem);
    }
    return bestHitPos;
  }

  function getAnt(antRang) {
    for (let i = 1; i < squareData[0].numAnts; i++) {
      if (antInfo.brains[i].rang === antRang) {
        return antInfo.brains[i];
      }
    }
    return null;
  }

  function findQueenOrSurrender() {
    const queen = getAnt(PRIMARY_QUEEN);
    if (!queen) {
      mem.rang = SURRENDER;
      return null;
    }
    
    for (let i = 0; i < squareData[0].numAnts; i++) {
      if (antInfo.brains[i].rang === KNOWLEDGE_QUEEN) {
        queen.pQueen.kQueen[antInfo.brains[i].kQueen.index] = antInfo.brains[i];
      } else if (antInfo.brains[i].rang === HASH_TABLE_QUEEN) {
        queen.pQueen.htQueen = antInfo.brains[i];
      }
    }
    return queen;
  }

  function tjekForNewFoodDepot() {
    if (squareData[0].numFood >= squareData[0].numAnts) {
      mem.carryingFood = 8;
      if (mem.collector.receivedReport || squareData[0].numFood === squareData[0].numAnts) {
        gotoBase(mem);
        mem.rang = COLLECTOR;
        return collector();
      } else {
        mem.rang = REPORTER;
        mem.reporter.report.pos = { x: mem.pos.x, y: mem.pos.y };
        mem.reporter.report.amount = squareData[0].numFood - squareData[0].numAnts;
        mem.reporter.report.isFood = 1;
        gotoBase(mem);
        return reporter();
      }
    }
    return 0;
  }

  function tjekForNearFoodSurplus() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numAnts < squareData[i].numFood) {
        return i;
      }
    }
    return 0;
  }

  function commitReport() {
    const queen = findQueenOrSurrender();
    if (!queen) return 0;

    if (mem.reporter.report.isFood) {
      // Check if food report already exists
      for (let i = queen.pQueen.reportCount; i > 0; i--) {
        const report = queen.pQueen.kQueen[((i - 1) >> 5)].kQueen.report[(i - 1) & 31];
        if (posEqual(mem.reporter.report.pos, report.pos)) {
          if (!--report.amount) report.amount++;
          morphToRookie(mem);
          return rookie();
        }
      }

      // Check hash table
      const newHash = hashFunction(mem.reporter.report.pos);
      for (let i = 0; i < HASH_TABLE_SIZE; i++) {
        if (newHash === queen.pQueen.htQueen.htQueen.hashTable[i]) {
          morphToRookie(mem);
          return rookie();
        }
      }
    } else {
      queen.pQueen.enemyReports++;
    }

    // Add new report to heap
    const newDist = baseDist(mem.reporter.report.pos);
    let i = ++queen.pQueen.reportCount;
    
    while (i > 1) {
      const parentIdx = (i >> 1) - 1;
      const parentReport = queen.pQueen.kQueen[parentIdx >> 5].kQueen.report[parentIdx & 31];
      if (newDist >= baseDist(parentReport.pos)) break;
      
      const currentReport = queen.pQueen.kQueen[((i - 1) >> 5)].kQueen.report[(i - 1) & 31];
      currentReport.pos = parentReport.pos;
      currentReport.amount = parentReport.amount;
      currentReport.isFood = parentReport.isFood;
      i >>= 1;
    }
    
    const finalReport = queen.pQueen.kQueen[((i - 1) >> 5)].kQueen.report[(i - 1) & 31];
    finalReport.pos = mem.reporter.report.pos;
    finalReport.amount = mem.reporter.report.amount;
    finalReport.isFood = mem.reporter.report.isFood;

    if ((queen.pQueen.reportCount & 31) === 31) {
      mem.rang = KNOWLEDGE_QUEEN;
      mem.kQueen.index = queen.pQueen.kQueenCount;
      queen.pQueen.kQueen[queen.pQueen.kQueenCount++] = mem;
      return 0;
    } else {
      morphToRookie(mem);
      return rookie();
    }
  }

  function getAssignment() {
    const queen = findQueenOrSurrender();
    if (!queen) return 0;

    if (!mem.turn) queen.pQueen.antsBorn++;

    if (queen.pQueen.reportCount) {
      let report = queen.pQueen.kQueen[0].kQueen.report[0];
      if (--report.amount <= 0) {
        // Delete report from heap
        queen.pQueen.htQueen.htQueen.hashTableIndex++;
        queen.pQueen.htQueen.htQueen.hashTable[
          queen.pQueen.htQueen.htQueen.hashTableIndex & (HASH_TABLE_SIZE - 1)
        ] = hashFunction(report.pos);
        
        // Move last element to top and re-heapify
        const lastReport = queen.pQueen.kQueen[((queen.pQueen.reportCount - 1) >> 5)].kQueen.report[(queen.pQueen.reportCount - 1) & 31];
        queen.pQueen.reportCount--;
        
        let i = 1;
        const reportCount = queen.pQueen.reportCount;
        const dist = baseDist(lastReport.pos);
        
        while ((i << 1) <= reportCount) {
          let leftChild = i << 1;
          let rightChild = leftChild + 1;
          let smallest = i;
          
          const leftReport = queen.pQueen.kQueen[((leftChild - 1) >> 5)].kQueen.report[(leftChild - 1) & 31];
          if (leftChild <= reportCount && dist > baseDist(leftReport.pos)) {
            smallest = leftChild;
          }
          
          if (rightChild <= reportCount) {
            const rightReport = queen.pQueen.kQueen[((rightChild - 1) >> 5)].kQueen.report[(rightChild - 1) & 31];
            if (dist > baseDist(rightReport.pos)) {
              smallest = rightChild;
            }
          }
          
          if (smallest === i) break;
          
          const currentReport = queen.pQueen.kQueen[((i - 1) >> 5)].kQueen.report[(i - 1) & 31];
          const smallestReport = queen.pQueen.kQueen[((smallest - 1) >> 5)].kQueen.report[(smallest - 1) & 31];
          
          currentReport.pos = smallestReport.pos;
          currentReport.amount = smallestReport.amount;
          currentReport.isFood = smallestReport.isFood;
          
          i = smallest;
        }
        
        const finalReport = queen.pQueen.kQueen[((i - 1) >> 5)].kQueen.report[(i - 1) & 31];
        finalReport.pos = lastReport.pos;
        finalReport.amount = lastReport.amount;
        finalReport.isFood = lastReport.isFood;

        if ((queen.pQueen.reportCount & 31) === 30) {
          queen.pQueen.kQueenCount--;
          morphToRookie(queen.pQueen.kQueen[queen.pQueen.kQueenCount]);
        }
      }

      if (report.isFood) {
        mem.rang = COLLECTOR;
        initGotoDest(mem, report.pos.x, report.pos.y);
        mem.collector.receivedReport = 1;
        return collector();
      } else {
        mem.rang = SOLDIER;
        mem.soldier.lastBattleTurn = 0;
        const rnd = getRandMax(17) - 8;
        initGotoDest(mem, (report.pos.x << 6) - rnd * report.pos.y, (report.pos.y << 6) + rnd * report.pos.x);
        mem.soldier.ownDist = 0;
        mem.soldier.enemyDist = baseDist(report.pos);
        mem.soldier.brakeDist = (mem.soldier.enemyDist * SOLDIER_BRAKE) >> 8;
        mem.soldier.enemyMinusBrakeDist = mem.soldier.enemyDist - mem.soldier.brakeDist;
        return soldier();
      }
    } else {
      if (!queen.pQueen.timeToExpand) {
        if (queen.pQueen.antsBorn > MINIMUM_ANTS_BORN_PR_ENEMY_REPORT * queen.pQueen.enemyReports) {
          queen.pQueen.radius += RADIUS_STEP;
          queen.pQueen.timeToExpand = queen.pQueen.radius << 1;
        }
      }
      mem.rang = COLLECTOR;
      mem.collector.receivedReport = 0;
      assignAntToPosOnRhombe(mem, queen.pQueen.radius, getRandMax(queen.pQueen.radius << 2));
      return collector();
    }
  }

  function rookie() {
    const enemyDir = enemyInSight();
    if (enemyDir) return enemyDir;

    if (!zeroPos(mem)) {
      gotoBase(mem);
      return gotoDest(mem);
    }

    const queen = getAnt(PRIMARY_QUEEN);
    if (queen) {
      return getAssignment();
    }

    if (mem.turn) {
      mem.rang = SURRENDER;
      return 0;
    } else {
      if (squareData[0].numAnts < 4) {
        for (let i = 0; i < squareData[0].numAnts; i++) {
          antInfo.brains[i].rang = SURRENDER;
        }
        return 0;
      }

      // Initialize queens and distribute ants
      mem.rang = PRIMARY_QUEEN;
      mem.pQueen.antsBorn = 0;
      mem.pQueen.enemyReports = 0;
      mem.pQueen.kQueenCount = 1;
      mem.pQueen.reportCount = 0;
      mem.pQueen.radius = INITIAL_RADIUS;
      
      antInfo.brains[1].rang = HASH_TABLE_QUEEN;
      antInfo.brains[2].rang = KNOWLEDGE_QUEEN;
      antInfo.brains[2].kQueen.index = 0;

      for (let i = 3; i < squareData[0].numAnts; i++) {
        antInfo.brains[i].rang = COLLECTOR;
        assignAntToPosOnRhombe(antInfo.brains[i], INITIAL_RADIUS, 
          ((i * INITIAL_RADIUS) << 2) / squareData[0].numAnts | 0);
      }
      return primaryQueen();
    }
  }

  function soldier() {
    const enemyDir = enemyInSight();
    if (enemyDir) {
      mem.soldier.lastBattleTurn = mem.turn;
      return enemyDir;
    }

    if (mem.soldier.lastBattleTurn + SOLDIER_WAIT < mem.turn) {
      mem.rang = COLLECTOR;
      gotoBase(mem);
      return collector();
    }

    if (mem.soldier.lastBattleTurn || ((SOLDIER_STOP * mem.soldier.enemyDist) >> 8) < mem.soldier.ownDist) {
      return 0;
    }

    if (mem.soldier.ownDist <= mem.soldier.brakeDist) {
      mem.soldier.ownDist++;
      return gotoDest(mem);
    }

    if (mem.soldier.ownDist < mem.soldier.enemyDist) {
      if (getRandMax(SOLDIER_INVERSE_COMBAT_SPEED) <=
          1 + ((SOLDIER_INVERSE_COMBAT_SPEED - 2) * (mem.soldier.enemyDist - mem.soldier.ownDist)) /
          mem.soldier.enemyMinusBrakeDist) {
        mem.soldier.ownDist++;
        return gotoDest(mem);
      } else {
        return 0;
      }
    }

    if (getRandMax(SOLDIER_INVERSE_COMBAT_SPEED)) {
      return 0;
    } else {
      mem.soldier.ownDist++;
      return gotoDest(mem);
    }
  }

  function collector() {
    const enemyDir = enemyInSight();
    if (enemyDir) return enemyDir;

    if (destReached(mem)) {
      if (zeroPos(mem)) {
        morphToRookie(mem);
        return rookie();
      } else {
        if (mem.collector.receivedReport && (squareData[0].numFood < squareData[0].numAnts)) {
          initGotoDest(mem, 
            sign(mem.pos.x) * getRandMax(abs(mem.pos.x)),
            sign(mem.pos.y) * getRandMax(abs(mem.pos.y)));
        }
        gotoBase(mem);
      }
    }

    if (mem.carryingFood) return gotoDest(mem);
    
    const foodDepot = tjekForNewFoodDepot();
    if (foodDepot) return foodDepot;
    
    const nearFood = tjekForNearFoodSurplus();
    if (nearFood) return nearFood;
    
    return gotoDest(mem);
  }

  function reporter() {
    if (!zeroPos(mem)) {
      const enemyDir = enemyInSight();
      if (enemyDir) return enemyDir;
      return gotoDest(mem);
    }
    return commitReport();
  }

  function primaryQueen() {
    if (mem.pQueen.timeToExpand) mem.pQueen.timeToExpand--;
    return 0;
  }

  // Main ant function
  function newDAnt() {
    switch (mem.rang) {
      case ROOKIE: return rookie();
      case SURRENDER: return 0;
      case COLLECTOR: return collector();
      case SOLDIER: return soldier();
      case REPORTER: return reporter();
      case KNOWLEDGE_QUEEN: return 0;
      case HASH_TABLE_QUEEN: return 0;
      case PRIMARY_QUEEN: return primaryQueen();
      default: return 0;
    }
  }

  // Main execution
  const x = mem.pos.x;
  const y = mem.pos.y;
  let r = newDAnt();
  mem.turn++;

  if (squareData[r & 7].numAnts < MaxSquareAnts) {
    switch (r & 7) {
      case north: mem.pos.y++; break;
      case east: mem.pos.x++; break;
      case south: mem.pos.y--; break;
      case west: mem.pos.x--; break;
    }
  } else {
    return 0;
  }

  return r | mem.carryingFood;
}