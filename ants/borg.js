function borg(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        random: 1,
        klasse: 0,
        active: 0,
        queen: {
          foodx: new Array(20).fill(0),
          foody: new Array(20).fill(0),
          foodnumber: new Array(20).fill(0),
          datas: 0,
          turn: 0
        },
        worker: {
          xpos: 0,
          ypos: 0,
          xdest: 0,
          ydest: 0,
          foodx: 0,
          foody: 0,
          foodnumber: 0,
          danger: 0,
          status: 0,
          workturns: 0,
          retning: 0,
          turnchance: 0
        }
      },
      name: 'The Borg',
      color: '#666666', // Dark gray color fitting for Borg
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  function rnd(n) {
    const myBrain = antInfo.brains[0];
    myBrain.random = ((myBrain.random ^ 77) * 16811) >>> 0;
    const a = ((myBrain.random << 16) + (myBrain.random >> 16)) >>> 0;
    myBrain.random = a;
    return n ? a % n : 0;
  }

  // Constants
  const QUEEN = 1;
  const NANNY = 2;
  const SLAVE = 3;
  const SQUAD = 4;
  const GUARD = 5;
  const SCOUT = 6;

  const FOODSIZE = 20;
  const NANNYSIZE = 5;
  const QDANGER = 100;
  const QDANGERMAX = 500;
  const SLAVEMIN = 40;
  const SERVICETIME1 = 180;
  const SERVICETIME2 = 350;

  const QIDLE = 122;
  const QGETFOOD = 123;
  const QNOFOODFOUND = 124;
  const QGOINGHOME = 125;
  const QSEEKING = 126;
  const QFOUNDFOOD = 127;
  const QHAVEFOOD = 128;

  const mem = antInfo.brains[0];
  const queenmem = mem.queen;
  const workmem = mem.worker;

  function qMax(a, b) {
    return a < b ? b : a;
  }

  function qMin(a, b) {
    return a > b ? b : a;
  }

  function borgGoto(x, y) {
    const dir = [0, 0];
    dir[0] = (workmem.xpos < x ? 1 : 0) + (workmem.xpos > x ? 3 : 0);
    dir[1] = (workmem.ypos < y ? 2 : 0) + (workmem.ypos > y ? 4 : 0);

    if (workmem.xpos === x) {
      return dir[1];
    } else if (workmem.ypos === y) {
      return dir[0];
    } else if (abs(workmem.xpos - x) > abs(workmem.ypos - y)) {
      return dir[0];
    } else {
      return dir[1];
    }
  }

  function borgGotoDiag(x, y) {
    const dir = [0, 0];
    dir[0] = (workmem.xpos < x ? 1 : 0) + (workmem.xpos > x ? 3 : 0);
    dir[1] = (workmem.ypos < y ? 2 : 0) + (workmem.ypos > y ? 4 : 0);

    if (workmem.xpos === x) {
      return dir[1];
    } else if (workmem.ypos === y) {
      return dir[0];
    } else if (((abs(workmem.xpos - x) & 1) ^ (abs(workmem.ypos - y) & 1)) | 0) {
      return dir[0];
    } else {
      return dir[1];
    }
  }

  function insertFood(qmemory, smemory) {
    const qmem = qmemory.queen;
    const smem = smemory.worker;
    let i, k, datas = qmem.datas;

    i = 0;
    while (i < datas) { // Check for duplicate
      if (qmem.foodx[i] === smem.foodx && qmem.foody[i] === smem.foody) {
        qmem.foodnumber[i] = qMin(qmem.foodnumber[i], smem.foodnumber);
        i = -1;
        break;
      }
      i++;
    }

    if (datas < FOODSIZE && i !== -1) {
      qmem.foodx[datas] = smem.foodx;
      qmem.foody[datas] = smem.foody;
      qmem.foodnumber[datas] = smem.foodnumber;

      i = datas; // Sort - closest food first
      while (i > 0 && (abs(qmem.foodx[i]) + abs(qmem.foody[i])) <
                     (abs(qmem.foodx[i-1]) + abs(qmem.foody[i-1]))) {
        k = qmem.foodx[i]; qmem.foodx[i] = qmem.foodx[i-1]; qmem.foodx[i-1] = k;
        k = qmem.foody[i]; qmem.foody[i] = qmem.foody[i-1]; qmem.foody[i-1] = k;
        k = qmem.foodnumber[i]; qmem.foodnumber[i] = qmem.foodnumber[i-1]; qmem.foodnumber[i-1] = k;
        i--;
      }
      qmem.datas++;
    }
  }

  function queenFunc() {
    let t, i, x, y;
    let firstfood = 0;

    queenmem.turn++;
    if (queenmem.turn === 100) {
      for (t = 1; t < NANNYSIZE; t++) {
        if (antInfo.brains[t]) antInfo.brains[t].klasse = NANNY;
      }
    }

    // Command the troops!
    for (t = 1; t < squareData[0].numAnts; t++) {
      // Get reports about food
      if (antInfo.brains[t].klasse !== NANNY) {
        if (antInfo.brains[t].klasse === SCOUT &&
            antInfo.brains[t].worker.status === QFOUNDFOOD &&
            antInfo.brains[t].worker.foodnumber) {
          insertFood(mem, antInfo.brains[t]);
        }

        if (queenmem.foodnumber[0]) {
          firstfood = 1;
          antInfo.brains[t].klasse = SLAVE;

          antInfo.brains[t].worker.status = QGETFOOD;
          antInfo.brains[t].worker.xdest = queenmem.foodx[0];
          antInfo.brains[t].worker.ydest = queenmem.foody[0];
          queenmem.foodnumber[0]--;

          if (queenmem.foodnumber[0] === 0) {
            for (i = 0; i < queenmem.datas - 1; i++) {
              queenmem.foodx[i] = queenmem.foodx[i + 1];
              queenmem.foody[i] = queenmem.foody[i + 1];
              queenmem.foodnumber[i] = queenmem.foodnumber[i + 1];
            }
            queenmem.datas--;
          }
        } else if (t < squareData[0].numAnts - (7 * (firstfood ? 0 : 1))) {
          antInfo.brains[t].klasse = SCOUT;
          antInfo.brains[t].worker.status = QSEEKING;

          if (queenmem.turn < 500) {
            antInfo.brains[t].worker.workturns = 70;
            antInfo.brains[t].worker.turnchance = 5;
            do {
              x = rnd(35);
              y = rnd(35);
            } while (abs(x) + abs(y) < 35);
          } else if (queenmem.turn < 1000) {
            antInfo.brains[t].worker.workturns = 100;
            antInfo.brains[t].worker.turnchance = 7;
            do {
              x = rnd(45);
              y = rnd(45);
            } while (abs(x) + abs(y) < 42);
          } else if (queenmem.turn < 1800) {
            antInfo.brains[t].worker.workturns = 70;
            antInfo.brains[t].worker.turnchance = 9;
            do {
              x = rnd(45);
              y = rnd(45);
            } while (abs(x) + abs(y) < 42);
          } else {
            antInfo.brains[t].worker.workturns = SERVICETIME2;
            antInfo.brains[t].worker.turnchance = 15;
            do {
              x = rnd(60);
              y = rnd(60);
            } while (abs(x) + abs(y) < 42);
          }
          antInfo.brains[t].worker.xdest = x * (rnd(2) ? -1 : 1);
          antInfo.brains[t].worker.ydest = y * (rnd(2) ? -1 : 1);
        }
      }
    }
    return 0;
  }

  function slaveFunc() {
    let retval = 0;

    switch (workmem.status) {
      case QIDLE:
        return 0;

      case QGETFOOD:
        if (workmem.xdest === workmem.xpos && workmem.ydest === workmem.ypos) {
          if (squareData[0].numFood) { // Am I disappointed?
            workmem.status = QGOINGHOME;
          } else {
            mem.klasse = SCOUT; // Split and seek
            workmem.turnchance = 7;
            workmem.workturns = ((SERVICETIME2 / 2) | 0);
            workmem.status = QSEEKING;
            return scoutFunc();
          }
          workmem.xdest = workmem.ydest = 0;
        }
        retval = borgGotoDiag(workmem.xdest, workmem.ydest);
        workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
        workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
        return retval + 8 * (workmem.status === QGOINGHOME ? 1 : 0);

      case QGOINGHOME:
      case QNOFOODFOUND:
        if (!workmem.xpos && !workmem.ypos && squareData[0].base === 0) {
          return 16;
        }
        retval = borgGoto(workmem.xdest, workmem.ydest);
        workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
        workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
        return retval + 8 * (workmem.status === QGOINGHOME ? 1 : 0);

      default:
        workmem.status = QNOFOODFOUND;
        retval = borgGoto(0, 0);
        workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
        workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
        return retval;
    }
  }

  function squadFunc() {
    let retval = workmem.retning;
    workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
    workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);

    if (workmem.xpos === 0 && workmem.ypos === 0) {
      mem.active = 424242;
      mem.klasse = SLAVE;
      workmem.status = QIDLE;
    }
    return retval;
  }

  function scoutFunc() {
    let retval, t, c;

    if (workmem.workturns === 0) {
      if (workmem.status !== QFOUNDFOOD) {
        workmem.status = QGOINGHOME;
      }
      workmem.workturns = 1;
    }

    if (workmem.status !== QFOUNDFOOD && workmem.status !== QHAVEFOOD) {
      retval = 0;
      // Is there food in a neighboring field?
      for (t = 1; t <= 4; t++) {
        if (squareData[t].numFood > squareData[t].numAnts) {
          retval = t;
        }
      }
      if (retval) {
        workmem.status = QFOUNDFOOD;

        workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
        workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);

        workmem.foodx = workmem.xpos;
        workmem.foody = workmem.ypos;
        workmem.foodnumber = squareData[retval].numFood - 1 - squareData[retval].numAnts + 5;
        workmem.xdest = workmem.ydest = 0;
        return retval;
      }
    }

    if (workmem.foodnumber < 2 && workmem.status === QFOUNDFOOD) {
      workmem.foodx = workmem.foody = workmem.foodnumber = 0;
      workmem.status = QHAVEFOOD;
    }

    if (workmem.status === QGOINGHOME || workmem.status === QFOUNDFOOD || workmem.status === QHAVEFOOD) {
      if (workmem.xpos || workmem.ypos) {
        retval = borgGoto(workmem.xdest, workmem.ydest);
        workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
        workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
        return retval + 8 * (workmem.status === QFOUNDFOOD ? 1 : 0);
      } else if (workmem.status === QFOUNDFOOD) {
        // Do queen updates
        for (c = 1; c < squareData[0].numAnts; c++) {
          if (antInfo.brains[c].klasse === QUEEN) { // Find queen
            insertFood(antInfo.brains[c], mem);
            break;
          }
        }
        mem.klasse = SLAVE;
        workmem.status = QIDLE;
        return 0;
      }
      mem.active = 424242;
      mem.klasse = SLAVE;
      workmem.status = QIDLE;
      return 0;
    }

    if (workmem.status !== QSEEKING) {
      workmem.status = QGOINGHOME;
      return 1;
    }

    // Do what queen wants us to do
    if (workmem.xdest || workmem.ydest) {
      if (workmem.xdest !== workmem.xpos && workmem.ydest !== workmem.ypos) {
        retval = borgGoto(workmem.xdest, workmem.ydest);
        workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
        workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
        return retval;
      } else {
        workmem.xdest = workmem.ydest = 0;
      }
    }

    // Seeking
    workmem.workturns--;

    // Walk about
    if (!workmem.retning) workmem.retning = rnd(4) + 1;
    if (!rnd(workmem.turnchance)) {
      workmem.retning = (((workmem.retning + rnd(3) - 2) % 4) | 0) + 1;
    }

    retval = workmem.retning;
    workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
    workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
    return retval;
  }

  // Main function
  let retval = 0;
  let num, t;

  // Guard logic
  if (mem.klasse === GUARD && mem.active === 424242) {
    num = 0;
    for (t = 1; t <= 4; t++) {
      if (squareData[t].team !== squareData[0].team && squareData[t].numAnts > num) {
        retval = t;
        num = squareData[t].numAnts;
      }
    }
    return retval + 8;
  }

  if (mem.klasse === QUEEN && mem.active === 424242) {
    return queenFunc();
  }

  // Born
  if (mem.klasse < 1 || mem.klasse > 6 || mem.active !== 424242) {
    let result = 0;
    mem.active = 424242;

    // Is there a queen?
    for (t = 1; t < squareData[0].numAnts; t++) {
      if (antInfo.brains[t].klasse === QUEEN) {
        result = 1;
        break;
      }
    }

    // Assume command
    if (!result) {
      for (t = 1; t < squareData[0].numAnts; t++) {
        antInfo.brains[t].klasse = SCOUT;
        antInfo.brains[t].active = 424242;
        antInfo.brains[t].worker.status = QSEEKING;
        antInfo.brains[t].worker.workturns = 90;
        antInfo.brains[t].worker.turnchance = 7;
        antInfo.brains[t].worker.xdest = (15 + rnd(10)) * (rnd(2) ? -1 : 1);
        antInfo.brains[t].worker.ydest = (15 + rnd(10)) * (rnd(2) ? -1 : 1);
      }
      mem.klasse = QUEEN;
      for (t = 0; t < FOODSIZE; t++) {
        queenmem.foodx[t] = queenmem.foody[t] = queenmem.foodnumber[t] = 0;
      }
      queenmem.datas = 0;
      return 0;
    } else {
      mem.klasse = SLAVE;
      workmem.status = QIDLE;
    }
    workmem.danger = 0;
  }

  // Is there an enemy in a neighboring field?
  num = 0;
  for (t = 1; t <= 4; t++) {
    if (squareData[t].team && squareData[t].numAnts > num) {
      retval = t;
      num = squareData[t].numAnts;
    }
  }
  if (num) {
    workmem.danger += QDANGER;
    workmem.danger = qMax(workmem.danger, ((QDANGERMAX / 2) | 0));
    if (workmem.danger > QDANGERMAX) workmem.danger = QDANGERMAX;
    workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
    workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
    return retval + 8;
  }

  if (mem.klasse === NANNY) {
    if (workmem.xpos || workmem.ypos) {
      retval = borgGoto(0, 0);
      workmem.xpos += (retval === 1 ? 1 : 0) - (retval === 3 ? 1 : 0);
      workmem.ypos += (retval === 2 ? 1 : 0) - (retval === 4 ? 1 : 0);
      return retval;
    }
    return 0;
  }

  // In combat
  if (workmem.danger) {
    if (abs(workmem.xpos) + abs(workmem.ypos) > 60) {
      workmem.danger--;
    } else {
      workmem.danger -= 5;
    }
    if (squareData[0].numAnts === 1 && squareData[0].numFood) {
      workmem.danger = 0;
    }
    return 0;
  }

  switch (mem.klasse) {
    case SLAVE:
      return slaveFunc();
    case SQUAD:
      return squadFunc();
    case SCOUT:
      return scoutFunc();
    default:
      break;
  }

  mem.active = 424242;
  mem.klasse = SLAVE;
  workmem.status = QGOINGHOME;
  return slaveFunc();
}
