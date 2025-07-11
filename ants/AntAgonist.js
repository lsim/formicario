function AntAgonist(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: 0, // Simple byte state storage like C version
      name: 'AntAgonist',
      color: '#11AAFF', // Blue color from C implementation
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const MaxSquareAnts = 100;
  const NewBaseFood = 50;
  const NewBaseAnts = 25;

  // Direction utility functions
  function left(dir) {
    return (dir + 3) % 4;
  }

  function right(dir) {
    return (dir + 1) % 4;
  }

  function reverseDir(dir) {
    return (dir + 2) % 4;
  }

  // Action functions
  function go(m) {
    return m + 1;
  }

  function goFood(m) {
    return m + 9;
  }

  // State checking macros converted to functions
  function isFoodInformer(m) {
    return (m & 192) === 192;
  }

  function makeFoodInformer(fooddir, dir, numfood) {
    return 192 | (fooddir << 5) | (dir << 3) | numfood;
  }

  function foodInformerDir(m) {
    return (m & 24) >> 3;
  }

  function foodInformerNumFood(m) {
    return m & 7;
  }

  function foodInformerFoodDir(m) {
    return (m & 32) >> 5;
  }

  function isInformer(m) {
    return (m & 240) === 32;
  }

  function makeInformer(basedir, rightsearch, leftsearch) {
    return 32 | (basedir << 2) | (rightsearch << 1) | leftsearch;
  }

  function informerHasSearchers(m) {
    return (m & 3) === 3;
  }

  function informerHasRightSearcher(m) {
    return (m & 2) === 2;
  }

  function informerHasLeftSearcher(m) {
    return (m & 1) === 1;
  }

  function informerDir(m) {
    return (m & 12) >> 2;
  }

  function informerRightSearchDir(dir) {
    return (dir + 1) % 4;
  }

  function informerLeftSearchDir(dir) {
    return dir;
  }

  function isGatherer(m) {
    return (m & 240) === 48;
  }

  function makeGatherer(basedir, count) {
    return 48 | (basedir << 2) | count;
  }

  function gatherDir(m) {
    return (m & 12) >> 2;
  }

  function gatherCount(m) {
    return m & 3;
  }

  function isGuard(m) {
    return m < 4;
  }

  function makeGuard(count) {
    return count;
  }

  function isSearcher(m) {
    return (m & 224) === 128;
  }

  function makeSearcher(dir, outside, sent, count) {
    return 128 | (dir << 3) | (outside << 2) | (sent << 1) | count;
  }

  function searchDir(m) {
    return (m & 24) >> 3;
  }

  function searchOutside(m) {
    return (m & 4) === 4;
  }

  function searchSent(m) {
    return (m & 2) === 2;
  }

  function searchCount(m) {
    return m & 1;
  }

  function searchNextMove(m) {
    return (searchCount(m) === 0) ? searchDir(m) : left(searchDir(m));
  }

  function searchAhead(m) {
    return (searchCount(m) === 0) ? left(searchDir(m)) : searchDir(m);
  }

  function makeNewLeftSearcher(infdir, sent) {
    return makeSearcher(informerLeftSearchDir(infdir), 0, sent, 0);
  }

  function makeNewRightSearcher(infdir, sent) {
    return makeSearcher(informerRightSearchDir(infdir), 0, sent, 1);
  }

  function isFoodReturner(m) {
    return (m & 192) === 64;
  }

  function makeFoodReturner(dir, count, food) {
    return 64 | (dir << 4) | (count << 3) | food;
  }

  function foodReturnerDir(m) {
    return (m & 48) >> 4;
  }

  function foodReturnerCount(m) {
    return (m & 8) >> 3;
  }

  function foodReturnerFood(m) {
    return m & 7;
  }

  function foodReturnerNextMove(m) {
    return (foodReturnerCount(m) === 0) ? 
      reverseDir(left(foodReturnerDir(m))) : 
      reverseDir(foodReturnerDir(m));
  }

  function isBaseBuilder(m) {
    return (m & 224) === 160;
  }

  function makeBaseBuilder(ready, dir, count) {
    return 160 | (ready << 4) | (dir << 2) | count;
  }

  function baseBuilderReady(m) {
    return (m & 16) >> 4;
  }

  function baseBuilderDir(m) {
    return (m & 12) >> 2;
  }

  function baseBuilderCount(m) {
    return m & 3;
  }

  function timeForBase(m) {
    return (m & 255) === 255;
  }

  // Helper functions
  function getInformer(felt, mem) {
    for (let j = 1; j < felt[0].numAnts; j++) {
      if (isInformer(mem[j]) || isFoodInformer(mem[j])) {
        return j;
      }
    }
    return 0;
  }

  function getNumberOfFoodReturners(felt, mem) {
    let number = 0;
    for (let j = 1; j < felt[0].numAnts; j++) {
      if (isFoodReturner(mem[j])) {
        number++;
      }
    }
    return number;
  }

  function getHighestFoodInformer(felt, mem) {
    let number = 0;
    for (let j = 1; j < felt[0].numAnts; j++) {
      if (isFoodInformer(mem[j])) {
        number = j;
      }
    }
    return number;
  }

  function getBuilderCount(felt, mem) {
    let builders = 0;
    for (let j = 0; j < felt[0].numAnts; j++) {
      if (isBaseBuilder(mem[j])) {
        builders++;
      }
    }
    return builders;
  }

  function getRandomBuilder(felt, mem) {
    for (let j = 0; j < felt[0].numAnts; j++) {
      if (isBaseBuilder(mem[j])) {
        return j;
      }
    }
    return 0;
  }

  function getRandomValue(felt, mem) {
    let random = 0;
    for (let j = 0; j < felt[0].numAnts; j++) {
      random += mem[j];
    }
    for (let j = 0; j <= 4; j++) {
      random += felt[j].numAnts + felt[j].numFood;
    }
    return random;
  }

  function getZeroAnts(felt, mem) {
    let number = 0;
    for (let j = 1; j < felt[0].numAnts; j++) {
      if (mem[j] === 0) {
        number++;
      }
    }
    return number;
  }

  // Main orders function (equivalent to the C orders function)
  function orders(felt, mem) {
    // Check for enemies first
    for (let i = 1; i <= 4; i++) {
      if (felt[i].team) {
        mem[0] = makeGuard(0);
        return i;
      }
    }

    // Base operations
    if (felt[0].base) {
      const dir = gatherDir(mem[0]);
      let count = 0;
      
      if (mem[0] === 0) {
        return 0;
      }
      
      if (timeForBase(mem[0])) {
        const zeroants = getZeroAnts(felt, mem);
        if (zeroants < 4) {
          mem[0] = 0;
        } else {
          const random = getRandomValue(felt, mem) % 4;
          for (let i = 1; i < felt[0].numAnts; i++) {
            if (mem[i] === 0) {
              mem[i] = 160;
            }
          }
          if (random === 3 || random === 1) {
            mem[0] = makeBaseBuilder(0, random, 1);
          } else {
            mem[0] = makeBaseBuilder(0, random, 0);
          }
          return go(random);
        }
      }
      
      if (dir === 3 || dir === 1) {
        count = 3;
      } else {
        count = 0;
      }
      mem[0] = makeGatherer(dir, count);
      return go(dir);
    }

    // Gatherer logic
    if (isGatherer(mem[0])) {
      const myDir = gatherDir(mem[0]);
      const myCount = gatherCount(mem[0]);
      
      if (felt[0].numFood) {
        const newCount = (myCount + 3) % 4;
        const builders = getBuilderCount(felt, mem);
        
        if (builders > 0) {
          const rndBuilder = getRandomBuilder(felt, mem);
          if (rndBuilder > 0) {
            const ready = baseBuilderReady(mem[rndBuilder]);
            if (ready === 0) {
              if (builders < (NewBaseFood + 3) && 
                  felt[0].numFood >= (NewBaseFood + 3) && 
                  (baseBuilderCount(mem[rndBuilder]) === 0)) {
                mem[0] = makeBaseBuilder(0, baseBuilderDir(mem[rndBuilder]), baseBuilderCount(mem[rndBuilder]));
                return 0;
              } else {
                mem[0] = makeGatherer(myDir, ((myCount + 1) % 4));
                return go(myDir);
              }
            } else {
              mem[0] = makeGatherer(myDir, ((myCount + 1) % 4));
              return go(myDir);
            }
          } else {
            return 0;
          }
        } else {
          if (felt[reverseDir(myDir) + 1].numAnts < MaxSquareAnts) {
            mem[0] = makeGatherer(myDir, newCount);
            return goFood(reverseDir(myDir));
          } else {
            mem[0] = makeGatherer(myDir, ((myCount + 1) % 4));
            return go(myDir);
          }
        }
      } else {
        const informer = getInformer(felt, mem);
        if (myCount === 3) {
          if (informer) {
            if (isInformer(mem[informer])) {
              const informerDirVal = informerDir(mem[informer]);
              if (informerHasSearchers(mem[informer])) {
                mem[0] = makeGatherer(myDir, 0);
                return go(myDir);
              } else {
                if (informerHasRightSearcher(mem[informer])) {
                  mem[informer] = makeInformer(informerDirVal, 1, 1);
                  mem[0] = makeNewLeftSearcher(informerDirVal, 0);
                  return go(left(informerDirVal));
                } else {
                  mem[informer] = makeInformer(informerDirVal, 1, informerHasLeftSearcher(mem[informer]));
                  mem[0] = makeNewRightSearcher(informerDirVal, 0);
                  return go(right(informerDirVal));
                }
              }
            } else {
              const numFood = foodInformerNumFood(mem[informer]);
              const foodDir = foodInformerFoodDir(mem[informer]);
              const infDir = foodInformerDir(mem[informer]);
              
              if (numFood > 0) {
                if (foodDir === 0) {
                  mem[informer] = makeFoodInformer(foodDir, infDir, numFood - 1);
                  mem[0] = makeNewRightSearcher(myDir, 1);
                  return go(right(myDir));
                } else {
                  mem[informer] = makeFoodInformer(foodDir, infDir, numFood - 1);
                  mem[0] = makeNewLeftSearcher(myDir, 1);
                  return go(left(myDir));
                }
              } else {
                const highest = getHighestFoodInformer(felt, mem);
                if (informer < highest) {
                  mem[informer] = makeGatherer(myDir, 3);
                  return 0;
                } else {
                  mem[informer] = makeInformer(myDir, 0, 0);
                  return 0;
                }
              }
            }
          } else {
            mem[0] = makeInformer(myDir, 0, 0);
            return 0;
          }
        } else {
          if (informer > 0) {
            mem[0] = makeGatherer(myDir, 0);
            return go(myDir);
          } else {
            const newCount = myCount + 1;
            if (felt[myDir + 1].numAnts < MaxSquareAnts) {
              mem[0] = makeGatherer(myDir, newCount);
              return go(myDir);
            } else {
              mem[0] = makeGatherer(myDir, ((myCount + 3) % 4));
              return go(reverseDir(myDir));
            }
          }
        }
      }
    }

    // Searcher logic
    if (isSearcher(mem[0])) {
      const myDir = searchDir(mem[0]);
      const myCount = searchCount(mem[0]);
      const mySent = searchSent(mem[0]);
      const myOutside = searchOutside(mem[0]);
      const myMove = searchNextMove(mem[0]);
      const ahead = searchAhead(mem[0]);
      
      if (myOutside === 1) {
        if (felt[0].numFood) {
          let foodCount = 0;
          if (mySent === 0) {
            const foodExcess = felt[0].numFood - felt[0].numAnts;
            if (foodExcess < 1 && foodExcess > 0) {
              foodCount = 1;
            } else {
              foodCount = (foodExcess / 1) | 0; // Floor division
            }
            if (foodCount > 7) foodCount = 7;
            if (foodCount < 0) foodCount = 0;
          }
          mem[0] = makeFoodReturner(myDir, myCount, foodCount);
        } else {
          mem[0] = makeSearcher(myDir, 0, mySent, myCount);
        }
        return goFood(reverseDir(ahead));
      }
      
      if (felt[0].numFood) {
        const foodret = getNumberOfFoodReturners(felt, mem);
        if (felt[0].numFood <= foodret) {
          // Do nothing
        } else {
          let foodCount = 0;
          if (mySent === 0) {
            const foodExcess = felt[0].numFood - foodret - 1;
            if (foodExcess < 1 && foodExcess > 0) {
              foodCount = 1;
            } else {
              foodCount = (foodExcess / 1) | 0; // Floor division
            }
            if (foodCount > 7) foodCount = 7;
            if (foodCount < 0) foodCount = 0;
          }
          mem[0] = makeFoodReturner(myDir, myCount, foodCount);
          const foodReturnerMove = foodReturnerNextMove(mem[0]);
          mem[0] = makeFoodReturner(myDir, ((myCount + 1) % 2), foodCount);
          return goFood(foodReturnerMove);
        }
      }
      
      if (felt[ahead + 1].numFood) {
        mem[0] = makeSearcher(myDir, 1, mySent, myCount);
        return go(ahead);
      } else {
        mem[0] = makeSearcher(myDir, 0, mySent, ((myCount + 1) % 2));
        return go(myMove);
      }
    }

    // Food returner logic
    if (isFoodReturner(mem[0])) {
      const myDir = foodReturnerDir(mem[0]);
      const myCount = foodReturnerCount(mem[0]);
      const myFood = foodReturnerFood(mem[0]);
      const informer = getInformer(felt, mem);
      const myMove = foodReturnerNextMove(mem[0]);
      
      if (informer === 0) {
        mem[0] = makeFoodReturner(myDir, ((myCount + 1) % 2), myFood);
        return goFood(myMove);
      } else {
        let baseDir = 0;
        if (isInformer(mem[informer])) {
          baseDir = informerDir(mem[informer]);
        } else {
          baseDir = foodInformerDir(mem[informer]);
        }
        
        if (myFood > 0) {
          let foodCount = myFood * 1;
          if (foodCount > 7) foodCount = 7;
          
          if (isInformer(mem[informer])) {
            mem[informer] = makeFoodInformer(myCount, baseDir, foodCount);
          } else {
            mem[0] = makeFoodInformer(myCount, baseDir, foodCount);
          }
        }
        mem[0] = makeGatherer(baseDir, (3 - 1));
        return goFood(reverseDir(baseDir));
      }
    }

    // Food informer and informer logic
    if (isFoodInformer(mem[0])) {
      return 0;
    }
    
    if (isInformer(mem[0])) {
      return 0;
    }

    // Guard logic
    if (isGuard(mem[0])) {
      if (mem[0] === 3) {
        for (let i = 1; i < felt[0].numAnts; i++) {
          mem[0] = mem[i];
          return 0;
        }
        for (let i = 1; i <= 4; i++) {
          if (felt[i].numAnts) {
            return i;
          }
        }
      } else {
        for (let i = 0; i <= 4; i++) {
          if (felt[i].numAnts) {
            mem[0]++;
          }
        }
      }
      return 0;
    }

    // Base builder logic
    if (isBaseBuilder(mem[0])) {
      const myDir = baseBuilderDir(mem[0]);
      const myReady = baseBuilderReady(mem[0]);
      const myCount = baseBuilderCount(mem[0]);
      
      if (myReady === 1) {
        if (myCount === 3) {
          const informer = getInformer(felt, mem);
          if (informer > 0) {
            mem[0] = makeBaseBuilder(1, myDir, 0);
            return goFood(myDir);
          }
          return 16; // Build base
        } else {
          mem[0] = makeBaseBuilder(1, myDir, (myCount + 1));
          return goFood(myDir);
        }
      } else {
        if (myCount === 1) {
          mem[0] = makeBaseBuilder(0, myDir, 0);
          return go(myDir);
        }
        
        if (felt[0].numFood >= (NewBaseFood + 3)) {
          const builders = getBuilderCount(felt, mem);
          if (builders < NewBaseFood + 3) {
            return 0;
          }
          mem[0] = makeBaseBuilder(1, myDir, myCount);
          for (let i = 1; i < felt[0].numAnts; i++) {
            mem[i] = makeBaseBuilder(1, myDir, myCount);
          }
          return 0;
        } else {
          return 0;
        }
      }
    }

    return 4; // Default move south
  }

  // Execute the main logic
  return orders(squareData, antInfo.brains);
}