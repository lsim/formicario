function Panoleon(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        id: 1,
        random: 1,
        state: 0,
        px: 0,
        py: 0,
        count: 0,
        // General data
        foodx: new Array(10).fill(0),
        foody: new Array(10).fill(0),
        foodcnt: new Array(10).fill(0),
        srchx: 0,
        srchy: 0,
        srchx2: 0,
        srchy2: 0,
        bases: 0,
        basespos: 0,
        enemyx: new Array(10).fill(0),
        enemyy: new Array(10).fill(0),
        enemycnt: new Array(10).fill(0),
        // Skaffer data
        reached: 0,
        enemymet: 0
      },
      name: 'Panoleon',
      color: '#FFD700', // Gold color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const GENR_FOOD_MEM = 10;
  const SKAF_FOOD_MEM = 1;
  const ENEMY_MEM = 5;
  const PHASE1 = 100;
  const ARMY_SIZE = 25;
  const SPIRAL_SPACING = 20;
  const SPIRAL_RADIUS = 10;
  const BASE_DIST = 64;
  const BASE_TRESH = 128;

  // Direction constants
  const STOP = 0, HERE = 0, EAST = 1, SOUTH = 2, WEST = 3, NORTH = 4;

  // State constants
  const INIT = 0, GENRAL = 1, SKAFFER = 2, LURKER = 3, SOLDIER = 4;

  // Assume these constants
  const NewBaseAnts = 10;
  const NewBaseFood = 20;

  const RX = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0];
  const RY = [0, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];
  const RXX = [0, 1, 1, -1, -1];
  const RYY = [0, 1, -1, -1, 1];

  const m = antInfo.brains[0];

  function getRandom() {
    m.random = ((((m.random << 4) + (m.random >> 3)) ^ m.random) + 0x64374785) >>> 0;
    return m.random;
  }

  function goTo(x, y, dstx, dsty) {
    const dx = dstx - x;
    const dy = dsty - y;
    if (abs(dx) > abs(dy)) {
      return (dx > 0) ? EAST : WEST;
    } else {
      if (dy === 0) return STOP;
      return (dy > 0) ? NORTH : SOUTH;
    }
  }

  function goToRand(x, y, dstx, dsty) {
    if (getRandom() & 8) return goTo(x, y, dstx, dsty);

    if ((getRandom() & 4) && (x !== dstx)) {
      return (x < dstx) ? EAST : WEST;
    } else {
      if (y !== dsty) {
        return (y < dsty) ? NORTH : SOUTH;
      } else if (x !== dstx) {
        return (x < dstx) ? EAST : WEST;
      } else {
        return STOP;
      }
    }
  }

  function goToRand2(x, y, dstx, dsty) {
    if ((getRandom() & 4) && (x !== dstx)) {
      return (x < dstx) ? EAST : WEST;
    } else {
      if (y !== dsty) {
        return (y < dsty) ? NORTH : SOUTH;
      } else if (x !== dstx) {
        return (x < dstx) ? EAST : WEST;
      } else {
        return STOP;
      }
    }
  }

  function goRound(x, y, dstx, dsty) {
    const dx = dstx - x;
    const dy = dsty - y;

    if (dx > dy) {
      if (dx > -dy) return NORTH;
      else return EAST;
    } else {
      if (dx >= -dy) return WEST;
      else return SOUTH;
    }
  }

  function goRound2(x, y, dstx, dsty) {
    const dx = dstx - x;
    const dy = dsty - y;

    if (dx > dy) {
      if (dx > -dy) return NORTH;
      else return EAST;
    } else {
      if (dx >= -dy + 2) return WEST;
      else return SOUTH;
    }
  }

  function goRound10(x, y, dstx, dsty, k) {
    const dx = dstx - x;
    const dy = dsty - y;

    if (dx > dy) {
      if (dx > -dy) return NORTH;
      else return EAST;
    } else {
      if (dx >= -dy + k) return WEST;
      else return SOUTH;
    }
  }

  function makeGeneral() {
    m.state = GENRAL;
    m.srchx = m.srchy = 0;
    for (let i = 0; i < GENR_FOOD_MEM; i++) {
      m.foodcnt[i] = 0;
    }
  }

  function makeSkaffer() {
    m.state = SKAFFER;
    m.srchx = m.srchy = 0;
  }

  function makeLurker() {
    m.state = LURKER;
    m.count = 1000;
  }

  function makeSoldier(dc, dstx, dsty) {
    m.state = SOLDIER;
    m.count = 100 + dc;
    m.srchx = dstx;
    m.srchy = dsty;
    m.reached = 1;
  }

  function initCommand(g) {
    g.count++;

    if (g.srchx * SPIRAL_SPACING >= BASE_TRESH && g.bases === 0) {
      g.bases = (NewBaseAnts + NewBaseFood) * 2;
      g.basespos = (g.basespos % 4) + 1;
    }

    m.state = SKAFFER;
    skafferCommand(g);

    if (g.srchx * SPIRAL_SPACING >= BASE_TRESH && g.bases > 0) {
      m.px -= BASE_DIST * RXX[g.basespos];
      m.py -= BASE_DIST * RYY[g.basespos];
      m.srchx -= BASE_DIST * RXX[g.basespos];
      m.srchy -= BASE_DIST * RYY[g.basespos];
      g.bases--;
    }
  }

  function skafferCommand(g) {
    let dir, i, j;
    const opgivet = (m.reached < 0);
    let told = 0;

    if (m.srchx || m.srchy) return; // Don't command - wrong general

    // Skaffer -> General food reports
    for (i = 0; i < SKAF_FOOD_MEM; i++) {
      if (m.foodcnt[i] > 0) {
        for (j = 0; j < GENR_FOOD_MEM; j++) {
          if (g.foodx[j] === m.foodx[i] && g.foody[j] === m.foody[i]) {
            if (m.foodcnt[i] < g.foodcnt[j]) {
              g.foodcnt[j] = m.foodcnt[i];
            }
            break;
          }
        }
        for (j = 0; j < GENR_FOOD_MEM; j++) {
          if (g.foodcnt[j] === 0) break;
        }
        if (j < GENR_FOOD_MEM) {
          g.foodx[j] = m.foodx[i];
          g.foody[j] = m.foody[i];
          g.foodcnt[j] = m.foodcnt[i];
          told = 0;
          m.foodcnt[i] = 0;
        }
        m.foodcnt[i] = 0;
      }
    }

    // Enemy reports
    if (m.enemymet) {
      for (j = 0; j < ENEMY_MEM; j++) {
        if (g.enemycnt[j]) {
          if (g.enemyx[j] === m.enemyx && g.enemyy[j] === m.enemyy) {
            break;
          }
        }
      }
      for (j = 0; j < ENEMY_MEM; j++) {
        if (!g.enemycnt[j]) {
          g.enemyx[j] = m.enemyx;
          g.enemyy[j] = m.enemyy;
          g.enemycnt[j] = ARMY_SIZE;
          break;
        }
      }
    }

    // General -> Skaffer assignments
    for (i = 0; i < GENR_FOOD_MEM; i++) {
      if (g.foodcnt[i] > 0) {
        m.srchx = g.foodx[i];
        m.srchy = g.foody[i];
        g.foodcnt[i]--;
        m.count = (g.foodcnt[i] < 2) ? 4 : 0;
        return;
      }
    }

    if (opgivet) {
      m.srchx = g.srchx2 * SPIRAL_SPACING;
      m.srchy = g.srchy2 * SPIRAL_SPACING;
      m.count = SPIRAL_RADIUS;
      dir = goRound(g.srchx2, g.srchy2, 0, 0);
      g.srchx2 += RX[dir];
      g.srchy2 += RY[dir];

      if (g.srchx2 > abs(g.srchx)) {
        g.srchx2 = g.srchy2 = 1;

        m.srchx = g.srchx * SPIRAL_SPACING;
        m.srchy = g.srchy * SPIRAL_SPACING;
        m.count = SPIRAL_RADIUS;
        dir = goRound(g.srchx, g.srchy, 0, 0);
        g.srchx += RX[dir];
        g.srchy += RY[dir];

        if (g.srchx < -10) {
          g.srchx = g.srchy = 1;
        }
      }
    } else {
      m.srchx = g.srchx * SPIRAL_SPACING;
      m.srchy = g.srchy * SPIRAL_SPACING;

      m.count = SPIRAL_RADIUS;
      dir = goRound(g.srchx, g.srchy, 0, 0);
      g.srchx += RX[dir];
      g.srchy += RY[dir];
    }
  }

  function findGeneral() {
    for (let i = 1; i < squareData[0].numAnts; i++) {
      if (antInfo.brains[i].state === GENRAL) {
        return antInfo.brains[i];
      }
    }
    return null;
  }

  function talkWithGeneral(commandFunc) {
    const gen = findGeneral();
    if (gen) {
      commandFunc(gen);
      return true;
    }
    return false;
  }

  function checkForEnemies() {
    for (let r = EAST; r <= NORTH; r++) {
      if (squareData[r].numAnts > 0 && squareData[r].team !== 0) {
        return r;
      }
    }
    return 0;
  }

  function checkForFood() {
    for (let r = EAST; r <= NORTH; r++) {
      if (squareData[r].numFood > squareData[r].numAnts && squareData[r].numAnts === 0) {
        return r;
      }
    }
    return 0;
  }

  function genralMain() {
    let dir = STOP;
    const enemy = checkForEnemies();
    if (enemy) {
      dir = enemy;
    } else {
      dir = goTo(m.px, m.py, 0, 0);
    }
    return dir;
  }

  function skafferMain() {
    let dir = STOP;
    let i;

    const enemy = checkForEnemies();
    if (enemy) {
      makeLurker();
      return enemy;
    }

    if (squareData[HERE].numFood < squareData[HERE].numAnts) {
      const food = checkForFood();
      if (food) {
        const r = food;
        if (squareData[r].numFood > 1) {
          for (i = 0; i < SKAF_FOOD_MEM; i++) {
            if (m.foodcnt[i] === 0) {
              m.foodx[i] = m.px + RX[r];
              m.foody[i] = m.py + RY[r];
              m.foodcnt[i] = squareData[r].numFood;
              break;
            }
          }
        }
        return r;
      }

      if (m.reached === 0) {
        dir = goToRand(m.px, m.py, m.srchx, m.srchy);
      }
      if (dir === STOP) {
        m.reached = 1;
        if (m.px > m.srchx + m.count) {
          m.srchx = m.srchy = 0;
          for (i = 0; i < SKAF_FOOD_MEM; i++) {
            if (m.foodx[i] === m.srchx && m.foody[i] === m.srchy) {
              m.foodcnt[i] = 0;
            }
          }
          m.reached = 0;
        }
        dir = goRound2(m.px, m.py, m.srchx, m.srchy);
      }
    } else {
      // Food here. Bring home.
      dir = 8 + goToRand(m.px, m.py, 0, 0);
      if (dir === 8) dir = goToRand(m.px, m.py, m.srchx, m.srchy);
    }

    return dir;
  }

  function lurkerMain() {
    let dir = STOP;
    const enemy = checkForEnemies();
    if (enemy) {
      m.count += 10;
    }
    if (m.count-- === 0) {
      m.state = SKAFFER;
    }
    if ((m.count & 31) === 0) {
      dir = (m.px < 0) ? WEST : EAST;
    }
    return dir;
  }

  function soldierMain() {
    let dir = STOP;
    const enemy = checkForEnemies();
    if (enemy) {
      m.srchx = m.px;
      m.srchy = m.py;
      m.count += 10;
      return enemy;
    }

    if (m.px === 0 && m.py === 0) {
      talkWithGeneral((g) => {
        // Soldier command logic would go here
      });
    }

    if (!m.reached) {
      dir = goToRand(m.px, m.py, m.srchx, m.srchy);
    }
    if (dir === STOP) m.reached = 1;
    if (m.reached) {
      if (m.count-- === 0) {
        makeSkaffer();
      }
    }
    return dir;
  }

  // Main execution
  let dir = STOP;
  let gen = false;

  switch (m.state) {
    case INIT:
      m.random = m.id;
      gen = talkWithGeneral(initCommand);
      if (m.state === INIT) {
        makeGeneral();
      }
      break;

    case GENRAL:
      dir = genralMain();
      break;

    case SKAFFER:
      gen = talkWithGeneral(skafferCommand);
      dir = skafferMain();
      if (m.px === 0 && m.py === 0) {
        if (!gen) {
          makeGeneral();
          m.basespos = -1;
        }
        if (!squareData[HERE].base) {
          dir = STOP;
        }
      }
      break;

    case LURKER:
      dir = lurkerMain();
      break;

    case SOLDIER:
      dir = soldierMain();
      break;
  }

  m.px += RX[dir];
  m.py += RY[dir];

  if (squareData[HERE].numAnts >= NewBaseAnts && squareData[HERE].numFood >= NewBaseFood) {
    dir = 16;
  }

  return dir;
}