function TheDoctor(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        randseed: 1,
        carryingFood: 0,
        rang: 0, // ROOKIE
        turn: 0,
        posX: 0,
        posY: 0,
        destX: 0,
        destY: 0,
        // Explorer data
        ignoreFood: 0,
        // Food Guard data
        timeToRetire: 0,
        isReported: 0,
        // Queen data
        radius: 0,
        next: 0,
        antsBorn: 0,
        enemyReportCount: 0,
        lastExpanded: 0,
        // Food Reporter data - simplified to single report
        reportPosX: 0,
        reportPosY: 0,
        reportAmount: 0,
        reportDist: 0,
        hasReport: 0
      },
      name: 'The Doctor',
      color: '#FF0000'
    };
  }

  // Constants
  var INITIAL_RADIUS = 20;
  var RADIUS_STEP = 10;
  var BASE_VALUE = 75;

  // Role constants
  var ROOKIE = 0;
  var EXPLORER = 1;
  var SOLDIER = 2;
  var COLLECTOR = 3;
  var WAR_REPORTER = 4;
  var FOOD_GUARD = 5;
  var FOOD_REPORTER = 6;
  var QUEEN = 7;

  var mem = antInfo.brains[0];

  // Helper functions
  function abs(x) {
    return x < 0 ? -x : x;
  }

  function baseDist(x, y) {
    return abs(x) + abs(y);
  }

  function gotoDest(mem) {
    if (mem.posX !== mem.destX) {
      if (mem.posX < mem.destX) return 1;
      return 3;
    } else if (mem.posY !== mem.destY) {
      if (mem.posY < mem.destY) return 4;
      return 2;
    } else return 0;
  }

  function gotoBase(mem) {
    mem.destX = 0;
    mem.destY = 0;
    return gotoDest(mem);
  }

  function destReached(mem) {
    return mem.posX === mem.destX && mem.posY === mem.destY;
  }

  function zeroPos(mem) {
    return !(mem.posX || mem.posY);
  }

  function nulstilQueen(mem) {
    mem.lastExpanded = 0;
    mem.next = 0;
    mem.antsBorn = 0;
    mem.enemyReportCount = 0;
  }

  function DocGetRand(mem) {
    mem.randseed = (mem.randseed * 1103515245 + 12345) >>> 0;
    return ((mem.randseed >>> 16) & 65535);
  }

  function DocEnemyInSight(squareData) {
    var bestHit = 0;
    var bestHitPos = 0;
    
    for (var i = 1; i < 5; i++) {
      if (squareData[i].team && squareData[i].team !== squareData[0].team) {
        var value = squareData[i].numAnts;
        if (squareData[i].base) value += BASE_VALUE;
        if (value > bestHit) {
          bestHit = value;
          bestHitPos = i;
        }
      }
    }
    return bestHitPos;
  }

  function DocGetAnt(antInfo, targetRang) {
    // Find first ant with given role among our team ants
    for (var i = 0; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].rang === targetRang) {
        return antInfo.brains[i];
      }
    }
    return null;
  }

  function morphToAndReturnRookie(squareData, antInfo, mem) {
    mem.rang = ROOKIE;
    mem.carryingFood = 0;
    return DocRookie(squareData, antInfo, mem);
  }

  function DocRookie(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) return r;
    
    if (!zeroPos(mem)) return gotoBase(mem);
    if (!squareData[0].base) return 0;
    
    var queen = DocGetAnt(antInfo, QUEEN);
    if (!queen) {
      // No queen! Become queen
      mem.rang = QUEEN;
      mem.radius = INITIAL_RADIUS;
      nulstilQueen(mem);
      return DocQueen(squareData, antInfo, mem);
    }
    
    if (!mem.turn) queen.antsBorn++;
    
    // Look for food reporter with reports
    var minDist = 0x7FFF;
    var ant = null;
    for (var i = 0; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].rang === FOOD_REPORTER && antInfo.brains[i].hasReport) {
        if (antInfo.brains[i].reportDist < minDist) {
          minDist = antInfo.brains[i].reportDist;
          ant = antInfo.brains[i];
        }
      }
    }
    
    if (ant) {
      // Get food location from reporter
      mem.rang = COLLECTOR;
      mem.destX = ant.reportPosX;
      mem.destY = ant.reportPosY;
      if (--ant.reportAmount < 1) {
        ant.hasReport = 0;
        ant.rang = ROOKIE;
        ant.carryingFood = 0;
      }
      return DocCollector(squareData, antInfo, mem);
    }
    
    // Get orders from queen - explorers sent in pairs
    var tmp = (queen.next >>> 3);
    switch (queen.next & 6) {
      case 0: // 1st quadrant
        mem.destX = tmp;
        mem.destY = queen.radius - tmp;
        break;
      case 2: // Below 1st quadrant
        mem.destX = tmp;
        mem.destY = tmp - queen.radius;
        break;
      case 4: // 3rd quadrant
        mem.destX = -(tmp + 1);
        mem.destY = (tmp + 1) - queen.radius;
        break;
      case 6: // Left of 1st quadrant
        mem.destX = -(tmp + 1);
        mem.destY = queen.radius - (tmp + 1);
        break;
    }
    
    mem.destX *= 3;
    mem.destY *= 3;
    mem.rang = EXPLORER;
    mem.ignoreFood = 0;
    
    // Update queen's status
    if (++queen.next === 6 * queen.radius) {
      if (60 * queen.enemyReportCount > queen.antsBorn) {
        if (25 * queen.enemyReportCount > queen.antsBorn) {
          if (queen.radius !== INITIAL_RADIUS) {
            queen.radius -= RADIUS_STEP;
          }
        }
      } else {
        queen.radius += RADIUS_STEP;
      }
      nulstilQueen(queen);
    }
    
    return DocExplorer(squareData, antInfo, mem);
  }

  function DocExplorer(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) {
      if (DocGetRand(mem) & 7) {
        mem.rang = SOLDIER;
      } else {
        mem.rang = WAR_REPORTER;
        mem.destX = 0;
        mem.destY = 0;
      }
      return r;
    }
    
    // Is there food on this square?
    if (squareData[0].numFood >= squareData[0].numAnts) {
      var ant = DocGetAnt(antInfo, FOOD_GUARD);
      if (!ant) {
        // Become food guard
        mem.rang = FOOD_GUARD;
        mem.isReported = 0;
        mem.timeToRetire = 3 * baseDist(mem.posX, mem.posY);
        mem.destX = mem.posX;
        mem.destY = mem.posY;
        return DocFoodGuard(squareData, antInfo, mem);
      } else if (ant.isReported) {
        // Ignore this food
        mem.ignoreFood = 2;
      } else {
        // Become food reporter
        if (squareData[0].numFood > 2) {
          mem.rang = FOOD_REPORTER;
          mem.reportPosX = mem.posX;
          mem.reportPosY = mem.posY;
          mem.reportAmount = squareData[0].numFood - 2;
          mem.reportDist = baseDist(mem.posX, mem.posY);
          mem.hasReport = 1;
          ant.isReported = 1;
        } else {
          mem.rang = COLLECTOR;
        }
        mem.carryingFood = 8;
        return gotoBase(mem);
      }
    }
    
    // Is there food nearby?
    if (--mem.ignoreFood < 0) {
      for (var i = 1; i < 5; i++) {
        if (squareData[i].numAnts < squareData[i].numFood) return i;
      }
    }
    
    if (destReached(mem)) {
      if (zeroPos(mem)) {
        return morphToAndReturnRookie(squareData, antInfo, mem);
      } else {
        return gotoBase(mem);
      }
    }
    
    return gotoDest(mem);
  }

  function DocSoldier(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) return r;
    return 0;
  }

  function DocCollector(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) {
      if (DocGetRand(mem) & 7) {
        mem.rang = SOLDIER;
      } else {
        mem.rang = WAR_REPORTER;
        mem.destX = 0;
        mem.destY = 0;
      }
      return r;
    }
    
    if (destReached(mem)) {
      if (zeroPos(mem)) {
        return morphToAndReturnRookie(squareData, antInfo, mem);
      } else {
        mem.carryingFood = 8;
        return gotoBase(mem);
      }
    }
    
    return gotoDest(mem);
  }

  function DocWarReporter(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) return r;
    
    if (zeroPos(mem)) {
      var queen = DocGetAnt(antInfo, QUEEN);
      if (queen) {
        queen.enemyReportCount++;
      }
      return morphToAndReturnRookie(squareData, antInfo, mem);
    }
    
    return gotoDest(mem);
  }

  function DocFoodGuard(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) return r;
    
    if (!mem.timeToRetire--) {
      // Allow new food reporters
      mem.isReported = 0;
      mem.timeToRetire = 3 * baseDist(mem.posX, mem.posY);
    }
    
    if (destReached(mem) && squareData[0].numFood < 2) {
      mem.rang = COLLECTOR;
      return DocCollector(squareData, antInfo, mem);
    }
    
    return gotoDest(mem);
  }

  function DocFoodReporter(squareData, antInfo, mem) {
    var r = DocEnemyInSight(squareData);
    if (r) return r;
    return gotoDest(mem);
  }

  function DocQueen(squareData, antInfo, mem) {
    mem.lastExpanded++;
    
    // Consolidate food reporters - simplified version
    var reporters = [];
    for (var i = 0; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].rang === FOOD_REPORTER && antInfo.brains[i].hasReport) {
        reporters.push(antInfo.brains[i]);
      }
    }
    
    // If we have multiple reporters, consolidate them
    if (reporters.length > 1) {
      for (var i = 1; i < reporters.length; i++) {
        reporters[i].rang = ROOKIE;
        reporters[i].carryingFood = 0;
        reporters[i].hasReport = 0;
      }
    }
    
    return 16; // Always try to build new base
  }

  // Main logic
  var r;
  
  switch (mem.rang) {
    case ROOKIE:       r = DocRookie(squareData, antInfo, mem);       break;
    case EXPLORER:     r = DocExplorer(squareData, antInfo, mem);     break;
    case SOLDIER:      r = DocSoldier(squareData, antInfo, mem);      break;
    case COLLECTOR:    r = DocCollector(squareData, antInfo, mem);    break;
    case WAR_REPORTER: r = DocWarReporter(squareData, antInfo, mem);  break;
    case FOOD_GUARD:   r = DocFoodGuard(squareData, antInfo, mem);    break;
    case FOOD_REPORTER: r = DocFoodReporter(squareData, antInfo, mem); break;
    case QUEEN:        r = DocQueen(squareData, antInfo, mem);        break;
    default:           r = 0;                                         break;
  }
  
  // Update position based on movement (following C code logic)
  if (squareData[r] && squareData[r].numAnts !== 100) { // MaxSquareAnts check
    switch (r) {
      case 4: mem.posY++; break;
      case 1: mem.posX++; break;
      case 2: mem.posY--; break;
      case 3: mem.posX--; break;
    }
  }
  
  mem.turn++;
  return r | mem.carryingFood;
}