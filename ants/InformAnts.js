/*
 * InformAnts - JavaScript translation from C implementation
 *
 * A sophisticated ant system with role-based behavior:
 * - BaseBuilder: Builds bases when enough food is available
 * - Informant: Coordinates other ants and tracks exploration
 * - Gatherer: Collects food from designated directions
 * - Searcher: Explores in search patterns to find food
 * - Guard: Defends against enemies (basic state)
 *
 * Uses bit-packed memory for role and state information.
 */
function InformAnts(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        memory: -1 // Single byte storing role, direction, count info via bit packing
      },
      name: 'InformAnts',
      color: '#AEFF00', // Lime green
    };
  }

  // Role bit patterns (from C #defines)
  const BASE_BUILDER = 128 + 64 + 32 + 16; // 240
  const INFORMANT = 128 + 64 + 32;         // 224
  const GATHERER = 128 + 64;               // 192
  const SEARCHER = 128;                    // 128

  // Role detection functions
  function isSearcher(m) { return (m & SEARCHER) === 128; }
  function isGatherer(m) { return (m & GATHERER) === 64; }
  function isInformant(m) { return (m & INFORMANT) === 32; }
  function isBaseBuilder(m) { return (m & BASE_BUILDER) === 16; }
  function isGuard(m) { return m < 8; }

  // Gatherer bit extraction
  function gatherDir(m) { return (m & (32 + 16)) >> 4; }
  function gatherCount(m) { return m & (1 + 2 + 4 + 8); }
  const maxGatherCount = 15;

  // Informant bit extraction
  function informantBaseDir(m) { return (m & (8 + 16)) >> 3; }
  function informantCount(m) { return m & 1; }
  function informantHasSearcher(m) { return (m & 4) === 4; }
  function informantAlreadyExplored(m) { return (m & 2) === 2; }
  const informantCountLimit = 1;
  const myBaseFoodLimit = 35;

  // Searcher bit extraction
  function searchCount(m) { return m & (1 + 2 + 4 + 8); }
  function searchDir(m) { return (m & (64 + 32)) >> 5; }
  function searchIndex(m) { return (m & 16) >> 4; }

  // Direction probabilities
  const north = 1, south = 1, east = 7, west = 7;
  const infnorth = 3, infsouth = 3;
  const goHomeLimit = 10;

  // Helper functions
  function getInformant(felt, mem) {
    let inf = 0;
    for (let j = 1; j < felt[0].numAnts; j++) {
      if (isInformant(antInfo.brains[j].memory) || isBaseBuilder(antInfo.brains[j].memory)) {
        inf = j;
      }
    }
    return inf;
  }

  function getRandom(felt, mem, mod) {
    let dir = 0;
    for (let i = 0; i <= 4; i++) {
      dir += felt[i].numAnts + felt[i].numFood;
    }
    for (let i = 0; i < felt[0].numAnts; i++) {
      dir += antInfo.brains[i].memory + antInfo.brains[0].memory;
    }
    return dir % mod;
  }

  function getLeft(dir) {
    return (dir + 3) % 4;
  }

  function getRight(dir) {
    return (dir + 1) % 4;
  }

  // Back movement pattern
  const back = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0, 0];

  // Main logic
  const felt = squareData;
  const mem = antInfo.brains[0];

  // Initialize memory with random data if uninitialized (like C engine does)
  if (mem.memory === -1) {
    mem.memory = antInfo.random & 0xFF; // Single byte random initialization
  }

  let memory = mem.memory;

  // Check for enemies first
  for (let i = 1; i <= 4; i++) {
    if (felt[i].team) {
      mem.memory = 0;
      return i;
    }
  }

  // Base behavior
  if (felt[0].base) {
    if (isGatherer(memory) && gatherCount(memory) === 0) {
      mem.memory |= 1;
      return gatherDir(memory) + 1;
    }

    const tmp = memory % 16;
    if (tmp < north) {
      mem.memory = (3 << 4) | (64 + 1);
      return gatherDir(mem.memory) + 1;
    }
    if (tmp < (north + south)) {
      mem.memory = (1 << 4) | (64 + 1);
      return gatherDir(mem.memory) + 1;
    }
    if (tmp < (north + south + east)) {
      mem.memory = (0 << 4) | (64 + 1);
      return gatherDir(mem.memory) + 1;
    }
    if (tmp < (north + south + east + west)) {
      mem.memory = (2 << 4) | (64 + 1);
      return gatherDir(mem.memory) + 1;
    }
  }

  // Informant behavior
  if (isInformant(memory)) {
    let ants = 0;
    for (let i = 0; i <= 4; i++) {
      ants += felt[i].numAnts;
    }
    if (felt[0].numFood && (memory & 4) === 0 && ants <= 1) {
      mem.memory = (((informantBaseDir(memory) + 2) % 4) << 4) | (64 + 8 + 4 + 2);
      return ((gatherDir(mem.memory) + 2) % 4) + 1 + 8;
    }
    return 0;
  }

  // Base builder behavior
  if (isBaseBuilder(memory)) {
    return 16;
  }

  // Guard behavior
  if (isGuard(memory)) {
    if (memory === 4 && felt[0].numAnts > 1) {
      mem.memory = antInfo.brains[felt[0].numAnts - 1].memory;
    } else {
      if (felt[0].numAnts > 1) {
        mem.memory = memory + 1;
      } else {
        for (let i = 1; i <= 4; i++) {
          if (felt[i].numAnts) {
            if (memory === 4) {
              return i;
            } else {
              mem.memory = memory + 1;
            }
          }
        }
      }
    }
    return 0;
  }

  // Gatherer behavior
  if (isGatherer(memory)) {
    const infid = getInformant(felt, antInfo.brains);

    if (felt[0].numFood && gatherCount(memory) > 0) {
      if (felt[((gatherDir(memory) + 2) % 4) + 1].numAnts < 255) { // MaxSquareAnts approximation
        mem.memory--;
        return ((gatherDir(memory) + 2) % 4) + 1 + 8;
      } else {
        return 0;
      }
    }

    if (gatherCount(memory) === maxGatherCount) {
      if (infid > 0) {
        const infMem = antInfo.brains[infid].memory;
        if (informantHasSearcher(infMem) || informantAlreadyExplored(infMem)) {
          const basedir = informantBaseDir(infMem);
          if (basedir === 1 || basedir === 3) {
            mem.memory = (((basedir + 2) % 4) << 4) | (64 + 1);
            return gatherDir(mem.memory) + 1;
          } else {
            const random = (getRandom(felt, antInfo.brains, 16) + infMem) % 16;
            if (random < infnorth) {
              mem.memory = (3 << 4) | (64 + 1);
              return gatherDir(mem.memory) + 1;
            }
            if (random < (infnorth + infsouth)) {
              mem.memory = (1 << 4) | (64 + 1);
              return gatherDir(mem.memory) + 1;
            }
            mem.memory = (((basedir + 2) % 4) << 4) | (64 + 1);
            return gatherDir(mem.memory) + 1;
          }
        } else {
          const count = 5;
          antInfo.brains[infid].memory = antInfo.brains[infid].memory | 4 | 1;
          mem.memory = (0 << 5) | 128 | count;
          return searchDir(mem.memory) + 1;
        }
      } else {
        const dir = (gatherDir(memory) + 2) % 4;
        mem.memory = (dir << 3) | 32;
        return 0;
      }
    } else {
      if (gatherCount(memory) === 0 && felt[0].numFood > goHomeLimit && infid) {
        const dir = (informantBaseDir(antInfo.brains[infid].memory) + 2) % 4;
        mem.memory = (dir << 4) | (64 + 14);
        return ((gatherDir(mem.memory) + 2) % 4) + 1 + 8;
      }

      if (gatherCount(memory) > 0 && felt[getLeft(gatherDir(memory)) + 1].numFood) {
        const food = getLeft(gatherDir(memory));
        mem.memory = (gatherDir(memory) << 5) | (128 + 16 + 1);
        return food + 1;
      }

      if (gatherCount(memory) > 0 && felt[getRight(gatherDir(memory)) + 1].numFood) {
        const food = getRight(gatherDir(memory));
        mem.memory = (((gatherDir(memory) + 2) % 4) << 5) | (128 + 16 + 1);
        return food + 1;
      }

      if (felt[gatherDir(memory) + 1].numAnts < 255) { // MaxSquareAnts approximation
        mem.memory++;
        return gatherDir(memory) + 1;
      } else {
        return 0;
      }
    }
  }

  // Searcher behavior
  if (isSearcher(memory)) {
    const infid = getInformant(felt, antInfo.brains);
    const myCount = searchCount(memory);
    const myDir = searchDir(memory);
    const myIndex = searchIndex(memory);

    if (infid > 0) {
      const infMem = antInfo.brains[infid].memory;

      if (myCount === 7) {
        mem.memory = (memory & (128 + 64 + 32)) | 15;
        return myDir + 1;
      }

      if (isBaseBuilder(infMem) && felt[0].numFood >= 50) { // NewBaseFood approximation
        return 0;
      }

      if (felt[0].numFood) {
        const dir = (informantBaseDir(infMem) + 2) % 4;
        mem.memory = (dir << 4) | (64 + 14);
        antInfo.brains[infid].memory &= (128 + 64 + 32 + 16 + 8 + 2);
        return ((gatherDir(mem.memory) + 2) % 4) + 1 + 8;
      } else {
        let dir, count = 0;
        if (myDir === 3 && informantCount(infMem) === 0) {
          const basedir = informantBaseDir(infMem);
          antInfo.brains[infid].memory = (infMem & (128 + 64 + 32 + 16 + 8)) | 2;
          if (basedir === 1 || basedir === 3) {
            mem.memory = (((basedir + 2) % 4) << 4) | (64 + 1);
            return gatherDir(mem.memory) + 1;
          } else {
            const random = (getRandom(felt, antInfo.brains, 16) + infMem) % 16;
            if (random < infnorth) {
              mem.memory = (3 << 4) | (64 + 1);
              return gatherDir(mem.memory) + 1;
            }
            if (random < (infnorth + infsouth)) {
              mem.memory = (1 << 4) | (64 + 1);
              return gatherDir(mem.memory) + 1;
            }
            mem.memory = (((basedir + 2) % 4) << 4) | (64 + 1);
            return gatherDir(mem.memory) + 1;
          }
        }

        if (informantCount(infMem) === 0) {
          antInfo.brains[infid].memory = (infMem & (128 + 64 + 32 + 16 + 8 + 4)) | 1;
          dir = (myDir + 1) % 4;
          count = 5;
        } else {
          antInfo.brains[infid].memory &= (128 + 64 + 32 + 16 + 8 + 4);
          dir = myDir;
          count = 2;
        }
        mem.memory = (dir << 5) | count | 128;
        return dir + 1;
      }
    } else {
      if (myIndex === 0) {
        if (myCount === 8 || myCount === 7) {
          if (felt[0].numFood) {
            mem.memory = (memory & (128 + 64 + 32)) | 7;
          } else {
            mem.memory = (memory & (128 + 64 + 32)) | 8;
          }
          return ((myDir + 2) % 4) + 1 + 8;
        }

        if (myCount > 0) {
          if (felt[0].numFood) {
            mem.memory = (memory & (128 + 64 + 32)) | 7;
            return ((myDir + 2) % 4) + 1 + 8;
          }
          mem.memory--;
          return myDir + 1;
        } else {
          mem.memory = memory | (16 + 1);
          return getLeft(myDir) + 1;
        }
      } else {
        if (felt[0].numFood) {
          if (back[myCount] === 1) {
            mem.memory &= (128 + 64 + 32);
            return getRight(myDir) + 1 + 8;
          }
          mem.memory = (memory & (128 + 64 + 32 + 16)) | (back[myCount] - 1);
          return getRight(myDir) + 1 + 8;
        }

        if (felt[((myDir + 2) % 4) + 1].numFood) {
          mem.memory = (memory & (128 + 64 + 32 + 16)) | back[myCount];
          return ((myDir + 2) % 4) + 1;
        }

        if (felt[myDir + 1].numFood) {
          mem.memory = (memory & (128 + 64 + 32 + 16)) | back[myCount];
          return myDir + 1;
        }

        if (myCount < 7) {
          mem.memory++;
          return getLeft(myDir) + 1;
        } else {
          if (myCount === 13) {
            mem.memory = (memory & (128 + 64 + 32)) | 8;
            return getRight(myDir) + 1;
          }
          mem.memory++;
          return getRight(myDir) + 1;
        }
      }
    }
  }

  return 0;
}
