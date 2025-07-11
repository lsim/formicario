function LightCore3(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        // Queen mode
        xrange: 0,
        yrange: 0,
        
        // Worker mode
        xdest: 0,
        ydest: 0,
        xpos: 0,
        ypos: 0,
        
        // Shared
        route: 0,
        num: 0,
        status: 0
      },
      name: 'LightCore3',
      color: '#00FF80', // Light green color
    };
  }

  // Constants
  const LCFoodLimit = 3;
  const LCInitRange = 20;
  const LCMarginPercent = 50;
  const LCMarginExtra = 20;
  const LCRangeAdapt = 10;
  const LCDanger = 200;
  const LCDangerStepInterval = 20;
  const LCDangerStepFactor = 102;
  const LCSafety = 10;
  const LCMaxAnts = 245; // MaxSquareAnts - 10
  const MaxSquareAnts = 255;
  
  // Status constants
  const LC_Status_Base = 0;
  const LC_Status_Searching = 1;
  const LC_Status_FoundNothing = 2;
  const LC_Status_FoundFood = 3;
  const LC_Status_RememberFood = 4;
  const LC_Status_Queen = 5;

  // Helper functions (no Math references!)
  function abs(a) { return a >= 0 ? a : -a; }
  function val(x, y) { return abs(x) + abs(y); }
  function xdir(d) { return (d === 1 ? 1 : 0) - (d === 3 ? 1 : 0); }
  function ydir(d) { return (d === 2 ? 1 : 0) - (d === 4 ? 1 : 0); }
  function floor(x) { return x >= 0 ? (x | 0) : ((x | 0) === x ? x : (x | 0) - 1); }

  const myBrain = antInfo.brains[0];

  // Food looking function
  function LC3FoodLook() {
    // Look for food in adjacent squares
    if (squareData[1].numFood + squareData[2].numFood + squareData[3].numFood + squareData[4].numFood) {
      for (let f = 1; f <= 4; f++) {
        if (squareData[f].numFood > squareData[f].numAnts) {
          myBrain.xdest = myBrain.xpos + xdir(f);
          myBrain.ydest = myBrain.ypos + ydir(f);
          break;
        }
      }
    }
    
    // Check current square for food
    if (squareData[0].numFood > squareData[0].numAnts) {
      myBrain.xdest = myBrain.xpos;
      myBrain.ydest = myBrain.ypos;
      myBrain.num = squareData[0].numFood - squareData[0].numAnts;
      myBrain.status = LC_Status_FoundFood;
    }
  }

  // Enemy looking function
  function LC3EnemyLook() {
    // Attack enemies!
    if (squareData[1].team + squareData[2].team + squareData[3].team + squareData[4].team) {
      for (let f = 1; f <= 4; f++) {
        if (squareData[f].team) {
          myBrain.xdest = myBrain.xpos + xdir(f);
          myBrain.ydest = myBrain.ypos + ydir(f);
          myBrain.status = LC_Status_Searching;
          myBrain.num = LCDanger;
          break;
        }
      }
    }
  }

  // Pathfinding to destination
  function LC3FindWayOut() {
    const x = myBrain.xpos;
    const y = myBrain.ypos;
    const tox = myBrain.xdest;
    const toy = myBrain.ydest;
    
    if (x === tox) return y < toy ? 2 : 4;
    if (y === toy) return x < tox ? 1 : 3;
    
    if (x * toy > y * tox) {
      // To the left
      return x < tox ? (y < toy ? 2 : 1) : (y < toy ? 3 : 4);
    } else {
      // To the right
      return x < tox ? (y < toy ? 1 : 4) : (y < toy ? 2 : 3);
    }
  }

  // Pathfinding back to base
  function LC3FindWayBack() {
    const x = myBrain.xpos;
    const y = myBrain.ypos;
    const fromx = myBrain.xdest;
    const fromy = myBrain.ydest;
    
    if (x === 0) return y < 0 ? 2 : 4;
    if (y === 0) return x < 0 ? 1 : 3;
    
    if (x * fromy < y * fromx) {
      // To the left
      return x < 0 ? (y < 0 ? 2 : 1) : (y < 0 ? 3 : 4);
    } else {
      // To the right
      return x < 0 ? (y < 0 ? 1 : 4) : (y < 0 ? 2 : 3);
    }
  }

  // Queen behavior - coordinates other ants
  function LC3Queen() {
    let m, fm, fn, bfm, fval, mfval, x, y;
    
    // Trigonometric tables for direction calculation
    const costab = [-0x8000, 0x0000, 0x5a82, 0x7642, 0x7d8a, 0x7f62, 0x7fd9, 0x7ff6, 0x7ffe, 0x7fff];
    const sintab = [0x0000, 0x8000, 0x5a82, 0x30fc, 0x18f9, 0x0c8c, 0x0648, 0x0324, 0x0192, 0x00c9];

    // Collect information from workers
    for (m = 1; m < antInfo.brains.length; m++) {
      x = antInfo.brains[m].xdest;
      y = antInfo.brains[m].ydest;
      
      switch (antInfo.brains[m].status) {
        case LC_Status_Searching:
        case LC_Status_Base:
        case LC_Status_RememberFood:
          break;
          
        case LC_Status_FoundFood:
          if (antInfo.brains[m].num >= LCFoodLimit) {
            // Do we already know about this food?
            for (fm = 1; fm < antInfo.brains.length; fm++) {
              if (antInfo.brains[fm].status === LC_Status_RememberFood) {
                if (antInfo.brains[fm].xdest === x && antInfo.brains[fm].ydest === y) {
                  antInfo.brains[m].status = LC_Status_Base;
                  break;
                }
              }
            }
          }
          
          if (antInfo.brains[m].status === LC_Status_FoundFood) {
            antInfo.brains[m].status = LC_Status_RememberFood;
          }
          break;
          
        default:
          antInfo.brains[m].status = LC_Status_Base;
          // Adapt search range based on ant positions
          const ax = abs(x);
          const ay = abs(y);
          if (ax + ay > 0) {
            myBrain.xrange += ((ax * (ax * 100 - myBrain.xrange) / (ax + ay) * LCRangeAdapt / 100) | 0);
            myBrain.yrange += ((ay * (ay * 100 - myBrain.yrange) / (ax + ay) * LCRangeAdapt / 100) | 0);
          }
          break;
      }
    }

    // Give orders to workers
    for (m = 1; m < antInfo.brains.length; m++) {
      if (antInfo.brains[m].status === LC_Status_Base) {
        // Worker is available for orders
        
        // Find the nearest food
        x = 1000000;
        y = 1000000;
        fn = 0;
        fval = val(x, y);
        bfm = 0;
        
        for (fm = 1; fm < antInfo.brains.length; fm++) {
          if (antInfo.brains[fm].status === LC_Status_RememberFood && antInfo.brains[fm].num > 0) {
            mfval = val(antInfo.brains[fm].xdest, antInfo.brains[fm].ydest);
            if (mfval < fval) {
              x = antInfo.brains[fm].xdest;
              y = antInfo.brains[fm].ydest;
              fn = antInfo.brains[fm].num;
              fval = mfval;
              bfm = fm;
            }
          }
        }
        
        if (fn === 0) {
          // No known food, find a direction to send the ant
          let routetemp = myBrain.route;
          let bit;
          x = 0x8000;
          y = 0x0064;
          
          // Use trigonometric tables to calculate direction
          for (bit = 0; bit < 10; bit++) {
            if (routetemp & 1) {
              const nx = floor(x * costab[bit] / 0x8000) - floor(y * sintab[bit] / 0x8000);
              const ny = floor(y * costab[bit] / 0x8000) + floor(x * sintab[bit] / 0x8000);
              x = nx;
              y = ny;
            }
            routetemp = (routetemp >> 1) | 0;
          }
          
          x = floor(x * (floor(myBrain.xrange * (100 + LCMarginPercent) / 10000) + LCMarginExtra) / 0x8000);
          y = floor(y * (floor(myBrain.yrange * (100 + LCMarginPercent) / 10000) + LCMarginExtra) / 0x8000);
          myBrain.route++;
        } else {
          // Send ant to collect known food
          x = antInfo.brains[bfm].xdest;
          y = antInfo.brains[bfm].ydest;
          antInfo.brains[bfm].num--;
        }
        
        // Give the ant its orders
        antInfo.brains[m].xdest = x;
        antInfo.brains[m].ydest = y;
        antInfo.brains[m].status = LC_Status_Searching;
        antInfo.brains[m].num = 0;
      }
    }

    return 16; // Try to build base
  }

  // Main logic function
  function LC3Main() {
    let m;
    
    switch (myBrain.status) {
      case LC_Status_Base:
        // I'm at the base. Check if there's a queen.
        for (m = 1; m < antInfo.brains.length; m++) {
          if (antInfo.brains[m].status === LC_Status_Queen) {
            return 0;
          }
        }
        // I should be queen!
        myBrain.status = LC_Status_Queen;
        myBrain.xrange = LCInitRange;
        myBrain.yrange = LCInitRange;
        return LC3Queen();

      case LC_Status_Searching:
        LC3FoodLook();
        LC3EnemyLook();
        
        // Have I reached my destination?
        if (myBrain.xpos === myBrain.xdest && myBrain.ypos === myBrain.ydest) {
          // Is it dangerous here?
          if (myBrain.num-- > 0) {
            if (myBrain.num % LCDangerStepInterval === 0) {
              myBrain.xdest = floor((myBrain.xdest * LCDangerStepFactor) / 100);
              myBrain.ydest = floor((myBrain.ydest * LCDangerStepFactor) / 100);
            }
            return 0;
          }
          
          // Have we reached our destination?
          if (myBrain.status === LC_Status_Searching) {
            myBrain.status = LC_Status_FoundNothing;
          }
          
          // I'm on my way back!
          return LC3FindWayBack() + 8;
        } else {
          // I'm on my way out!
          return LC3FindWayOut();
        }

      case LC_Status_FoundNothing:
        LC3EnemyLook();
        // Fall through
        
      case LC_Status_FoundFood:
        LC3FoodLook();
        
        // Am I at the base?
        if (myBrain.xpos === 0 && myBrain.ypos === 0) return 0;
        
        // I'm on my way back!
        return LC3FindWayBack() + 8;

      case LC_Status_RememberFood:
        if (myBrain.num <= 0) {
          myBrain.num--;
          if (myBrain.num < -(val(myBrain.xdest, myBrain.ydest) * 2 + LCSafety)) {
            myBrain.status = LC_Status_Base;
          }
        }
        return 0;

      case LC_Status_Queen:
        return LC3Queen();
    }
    
    return 0;
  }

  // Main function wrapper
  const retval = LC3Main();
  const dir = retval & 7;

  if (dir) {
    if (squareData[dir].numAnts >= MaxSquareAnts) {
      myBrain.status = LC_Status_Searching;
    } else {
      // Update position
      switch (dir) {
        case 1: myBrain.xpos++; break;
        case 2: myBrain.ypos++; break;
        case 3: myBrain.xpos--; break;
        case 4: myBrain.ypos--; break;
      }
    }
  }

  return retval;
}