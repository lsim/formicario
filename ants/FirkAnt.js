function FirkAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        // Normal mode fields
        xpos: 0,
        ypos: 0,
        xtarget: 0,
        ytarget: 0,
        food: 0,        // 0-15
        dir: 0,         // 0-1
        state: 0,       // 0-7
        
        // Base mode fields
        fooddistance: 0,
        patroldistance: 0,
        count1: 0,
        count2: 0,
        wait1: 0,       // 0-15
        firstbase: 0,   // 0-1
        
        // Random state
        r1: 1, r2: 1, r3: 1, r4: 1, r5: 1
      },
      name: 'FirkAnt',
      color: '#8080ff', // Blue color from C code
    };
  }

  // Constants
  const BASERANGE = 96;
  const RANGE = BASERANGE + 25;
  
  // State constants
  const UninitialisedAnt = 0;
  const SearchAndDestroyAnt = 1;
  const ReturnFoodAnt = 2;
  const GuardAnt = 3;
  const BaseAnt = 4;
  const NewBaseAnt = 5;
  const PatrolAnt = 6;
  const PreventBaseAnt = 7;
  
  const NewBaseFood = 50;  // From game constants
  const NewBaseAnts = 25;
  const MaxSquareAnts = 255;
  
  // Direction arrays
  const Xd = [0, 1, 0, -1, 0];
  const Yd = [0, 0, -1, 0, 1];

  // Helper functions (no Math references!)
  function abs(a) { return a >= 0 ? a : -a; }
  function min(a, b) { return a < b ? a : b; }
  function max(a, b) { return a > b ? a : b; }
  function dist(x1, y1, x2, y2) { return abs(x1 - x2) + abs(y1 - y2); }
  function rot(d) { return (((d & 7) % 4) + 1) | (d & 24); }
  function floor(x) { return x >= 0 ? (x | 0) : ((x | 0) === x ? x : (x | 0) - 1); }

  const myBrain = antInfo.brains[0];

  // Memory access macros as functions
  function X() { return myBrain.xpos; }
  function Y() { return myBrain.ypos; }
  function XT() { return myBrain.xtarget; }
  function YT() { return myBrain.ytarget; }
  function setX(val) { myBrain.xpos = val; }
  function setY(val) { myBrain.ypos = val; }
  function setXT(val) { myBrain.xtarget = val; }
  function setYT(val) { myBrain.ytarget = val; }
  function FD() { return myBrain.fooddistance; }
  function setFD(val) { myBrain.fooddistance = val; }
  function PD() { return myBrain.patroldistance; }
  function setPD(val) { myBrain.patroldistance = val; }
  function W() { return myBrain.wait1; }
  function setW(val) { myBrain.wait1 = val; }

  function setFood(value) {
    const tmp = value;
    myBrain.food = tmp > 15 ? 15 : (tmp < 0 ? 0 : tmp);
  }
  
  function getFood() { return myBrain.food; }

  function setCount(value) {
    myBrain.count1 = value & 255;
    myBrain.count2 = (value >> 8) & 255;
  }
  
  function getCount() { return myBrain.count1 | (myBrain.count2 << 8); }

  // Random number generator
  function firkAntRandom() {
    let r = ((myBrain.r4 << 24) | (myBrain.r3 << 16) | (myBrain.r2 << 8) | myBrain.r1) ^
            myBrain.r5 ^
            ((squareData[0].numAnts * 76531) ^ (squareData[0].numFood * 1001));
    r = (1588635695 * (r % 2) - 1117695901 * floor(r / 2)) >>> 0;
    
    // Update random state
    myBrain.r1 = r & 255;
    myBrain.r2 = (r >> 8) & 255;
    myBrain.r3 = (r >> 16) & 255;
    myBrain.r4 = (r >> 24) & 255;
    myBrain.r5 = (myBrain.r5 + 1) & 255;
    
    return r / 4294967291;
  }

  function randInt(low, high) {
    return floor(firkAntRandom() * (high - low + 1)) + low;
  }

  // Square root function (integer only)
  function firkAntSqrt(n) {
    let r, t, tmp;
    
    if (n < 65536) r = 0x100;
    else r = 0x10000;
    
    t = 0;
    while (r > 0) {
      tmp = t | (r >>= 1);
      if (tmp * tmp <= n) t = tmp;
    }
    return t;
  }

  // Base switching logic
  function firkAntSwitchBase() {
    const x = XT();
    const y = YT();
    const d = max(abs(x), abs(y));
    
    if (d > RANGE) {
      let nx = 0, ny = 0;
      if (x > 0 && x >= abs(y)) { nx = BASERANGE; ny = 0; }
      if (x < 0 && x <= -abs(y)) { nx = -BASERANGE; ny = 0; }
      if (y > 0 && y > abs(x)) { nx = 0; ny = BASERANGE; }
      if (y < 0 && y < -abs(x)) { nx = 0; ny = -BASERANGE; }
      
      setX(X() - nx);
      setY(Y() - ny);
      setXT(XT() - nx);
      setYT(YT() - ny);
    }
  }

  // Walking functions
  function firkAntWalk(x1, y1, x2, y2) {
    if (dist(x1, y1, x2, y2) === 0) return 0;
    
    if (abs(x1 - x2) > abs(y1 - y2)) {
      return x2 > x1 ? 1 : 3;
    } else {
      return y2 > y1 ? 4 : 2;
    }
  }

  function firkAntCrossWalk(x1, y1, x2, y2) {
    if (abs(x2 - x1) > abs(y2 - y1)) {
      if (y2 > y1) return 4;
      else if (y2 < y1) return 2;
      else if (x2 > x1) return 1;
      else if (x2 < x1) return 3;
      else return 0;
    } else {
      if (x2 > x1) return 1;
      else if (x2 < x1) return 3;
      else if (y2 > y1) return 4;
      else if (y2 < y1) return 2;
      else return 0;
    }
  }

  function firkAntFuzzyWalk(x1, y1, x2, y2) {
    if (randInt(-abs(x1 - x2), abs(y1 - y2)) < 0) {
      if (x2 > x1) return 1;
      else if (x1 > x2) return 3;
      else if (y2 > y1) return 4;
      else if (y1 > y2) return 2;
      else return 0;
    } else {
      if (y2 > y1) return 4;
      else if (y1 > y2) return 2;
      else if (x2 > x1) return 1;
      else if (x1 > x2) return 3;
      else return 0;
    }
  }

  // Main brain logic
  let i, maxVal, d, dir = 0, x, y, tmp, prev_state = -1;

  // State machine loop
  while (myBrain.state !== prev_state) {
    prev_state = myBrain.state;
    dir = 0;

    switch (myBrain.state) {
      case UninitialisedAnt:
        setX(0);
        setY(0);
        setXT(0);
        setYT(0);
        setFood(0);
        myBrain.dir = 0;
        maxVal = 0;
        
        for (i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state !== UninitialisedAnt) maxVal++;
        }
        
        for (i = 1; i < 5; i++) {
          if (squareData[i].numAnts > 0) maxVal++;
        }
        
        if (maxVal === 0) {
          myBrain.state = BaseAnt;
          setFD(0);
          setW(0);
          setCount(0);
          myBrain.firstbase = 1;
        }
        break;

      case SearchAndDestroyAnt:
        if (squareData[0].numFood > 0 && (X() !== 0 || Y() !== 0)) {
          maxVal = 0;
          d = dist(X(), Y(), 0, 0);
          
          for (i = 1; i < antInfo.brains.length; i++) {
            switch (antInfo.brains[i].state) {
              case ReturnFoodAnt:
                maxVal++;
                break;
              case BaseAnt:
                setXT(XT() - X());
                setYT(YT() - Y());
                setX(0);
                setY(0);
                maxVal = 200;
                i = antInfo.brains.length;
                break;
              case SearchAndDestroyAnt:
              case PatrolAnt:
              case GuardAnt:
                if (dist(antInfo.brains[i].xpos, antInfo.brains[i].ypos, 0, 0) < d) {
                  d = dist(antInfo.brains[i].xpos, antInfo.brains[i].ypos, 0, 0);
                  setXT(XT() - (X() - antInfo.brains[i].xpos));
                  setYT(YT() - (Y() - antInfo.brains[i].ypos));
                  setX(antInfo.brains[i].xpos);
                  setY(antInfo.brains[i].ypos);
                }
                break;
            }
          }
          
          if (squareData[0].numFood > maxVal) {
            setXT(X());
            setYT(Y());
            myBrain.state = ReturnFoodAnt;
            setFood(floor((squareData[0].numFood - maxVal) / 3));
            firkAntSwitchBase();
          }
        } else {
          if (X() === XT() && Y() === YT()) {
            if (X() === 0 && Y() === 0) {
              setXT(randInt(-16, 16));
              setYT(randInt(-16, 16));
              myBrain.dir = randInt(0, 1);
            } else {
              if (getFood() > 0) {
                x = randInt(XT(), floor(XT() * 1.10));
                y = randInt(YT(), floor(YT() * 1.10));
                setFood(0);
              } else if (myBrain.dir) {
                x = X() + Y();
                y = Y() - X();
              } else {
                x = X() - Y();
                y = Y() + X();
              }
              i = firkAntSqrt(X() * X() + Y() * Y());
              x = floor((x * 10 * (i + 20)) / (14 * i));
              y = floor((y * 10 * (i + 20)) / (14 * i));
              if (x > 126) x = 126;
              if (x < -126) x = -126;
              if (y > 126) y = 126;
              if (y < -126) y = -126;
              setXT(x);
              setYT(y);
              myBrain.dir = randInt(0, 1);
            }
          } else {
            dir = firkAntFuzzyWalk(X(), Y(), XT(), YT());
            if (X() !== 0 || Y() !== 0) {
              for (i = 1; i < 5; i++) {
                if (squareData[i].numFood > 0 && squareData[i].numAnts < squareData[i].numFood) {
                  if (X() + Xd[i] !== 0 && Y() + Yd[i] !== 0) {
                    dir = i;
                  }
                }
              }
            }
          }
        }
        break;

      case ReturnFoodAnt:
        // Check for closer bases
        for (i = 1; i < antInfo.brains.length; i++) {
          switch (antInfo.brains[i].state) {
            case BaseAnt:
              setXT(XT() - X());
              setYT(YT() - Y());
              setX(0);
              setY(0);
              break;
            case UninitialisedAnt:
              break;
            case PatrolAnt:
              // fall through
            default:
              if (dist(antInfo.brains[i].xpos, antInfo.brains[i].ypos, 0, 0) < dist(X(), Y(), 0, 0)) {
                setXT(XT() - (X() - antInfo.brains[i].xpos));
                setYT(YT() - (Y() - antInfo.brains[i].ypos));
                setX(antInfo.brains[i].xpos);
                setY(antInfo.brains[i].ypos);
              }
              break;
          }
        }
        
        if (squareData[0].numFood > 0 && (X() !== 0 || Y() !== 0)) {
          d = dist(XT(), YT(), 0, 0);
          maxVal = 0;
          
          for (i = 0; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === ReturnFoodAnt) {
              maxVal++;
              if (d > dist(antInfo.brains[i].xtarget, antInfo.brains[i].ytarget, 0, 0) && antInfo.brains[i].food > 1) {
                setXT(antInfo.brains[i].xtarget + (X() - antInfo.brains[i].xpos));
                setYT(antInfo.brains[i].ytarget + (Y() - antInfo.brains[i].ypos));
                d = dist(XT(), YT(), 0, 0);
                setFood(antInfo.brains[i].food - 1);
              }
            }
          }
          
          if (maxVal > squareData[0].numFood) {
            myBrain.state = SearchAndDestroyAnt;
          } else {
            dir = firkAntCrossWalk(X(), Y(), 0, 0) + 8;
            for (i = 1; i < antInfo.brains.length; i++) {
              if (((antInfo.brains[i].state === SearchAndDestroyAnt) ||
                   (antInfo.brains[i].state === PatrolAnt && antInfo.brains[i].ytarget !== 3)) &&
                  getFood() > 1) {
                antInfo.brains[i].xtarget = XT() - (X() - antInfo.brains[i].xpos);
                antInfo.brains[i].ytarget = YT() - (Y() - antInfo.brains[i].ypos);
                antInfo.brains[i].state = SearchAndDestroyAnt;
                antInfo.brains[i].food = getFood() - 1;
                setFood(getFood() - 1);
              }
            }
          }
        } else {
          myBrain.state = SearchAndDestroyAnt;
        }
        break;

      case GuardAnt:
        setCount(getCount() - 1);
        if (getCount() === 0) {
          myBrain.state = SearchAndDestroyAnt;
          setXT(X());
          setYT(Y());
        } else if (X() !== 0 || Y() !== 0) {
          for (i = 0; i < 5; i++) {
            if (squareData[i].numFood > 0) {
              if (squareData[i].numAnts < squareData[i].numFood) {
                if (X() + Xd[i] !== 0 || Y() + Yd[i] !== 0) {
                  dir = i;
                  myBrain.state = ReturnFoodAnt;
                  setXT(X() + Xd[i]);
                  setYT(Y() + Yd[i]);
                  setFood(floor(squareData[i].numFood / 3));
                }
              }
            }
          }
        } else {
          myBrain.state = SearchAndDestroyAnt;
          setXT(X());
          setYT(Y());
        }
        break;

      case BaseAnt:
        d = 0;
        for (i = 1; i < antInfo.brains.length; i++) {
          if (antInfo.brains[i].state === BaseAnt) d++;
        }
        
        if (d > 0) {
          myBrain.state = UninitialisedAnt;
          setX(0); setY(0); setXT(0); setYT(0);
          setFood(0);
          myBrain.dir = 0;
        } else {
          if ((squareData[0].base === true) || 
              (squareData[0].base === false && squareData[0].numFood < NewBaseFood)) {
            for (i = 1; i < antInfo.brains.length; i++) {
              switch (antInfo.brains[i].state) {
                case ReturnFoodAnt:
                  x = antInfo.brains[i].xtarget;
                  y = antInfo.brains[i].ytarget;
                  d = firkAntSqrt(x * x + y * y);
                  setFD(floor((FD() * 20 + d) / 21));
                  break;
                case PatrolAnt:
                  x = antInfo.brains[i].xtarget;
                  if (x > PD()) setPD(x);
                  break;
                case UninitialisedAnt:
                  antInfo.brains[i].xpos = 0;
                  antInfo.brains[i].ypos = 0;
                  maxVal = floor(126 / 3);
                  antInfo.brains[i].xtarget = ((getCount() >> 3) % maxVal) * 3 + 3;
                  antInfo.brains[i].ytarget = 0;
                  antInfo.brains[i].food = ((getCount() & 6) >> 1) + 1;
                  antInfo.brains[i].dir = getCount() & 1;
                  antInfo.brains[i].state = PatrolAnt;
                  setCount(getCount() + 1);
                  break;
              }
            }
          } else {
            for (i = 1; i < antInfo.brains.length; i++) {
              if (antInfo.brains[i].state !== PreventBaseAnt) {
                antInfo.brains[i].state = NewBaseAnt;
                antInfo.brains[i].xpos = 0;
                antInfo.brains[i].ypos = 0;
                antInfo.brains[i].xtarget = 0;
                antInfo.brains[i].ytarget = 0;
                antInfo.brains[i].food = 0;
              }
            }
          }
        }
        break;

      case NewBaseAnt:
        if (squareData[0].base === false) {
          dir = 16;
          if (squareData[0].numAnts > NewBaseAnts) {
            maxVal = 1;
            for (i = 1; i < antInfo.brains.length; i++) {
              if (antInfo.brains[i].state === NewBaseAnt) maxVal++;
            }
            if (maxVal > NewBaseAnts) {
              setXT(0); setYT(0); setFood(0); dir = 0;
              myBrain.state = UninitialisedAnt;
            }
          }
        } else {
          myBrain.state = SearchAndDestroyAnt;
        }
        break;

      case PatrolAnt:
        if (squareData[0].numFood > 0) {
          if (X() === 0 && abs(Y()) !== BASERANGE) {
            dir = firkAntWalk(X(), Y(), 0, 0) + 8;
            break;
          }
          if (Y() === 0 && abs(X()) !== BASERANGE) {
            dir = firkAntWalk(X(), Y(), 0, 0) + 8;
            break;
          }
        }
        
        if (squareData[0].numFood > 0 && (X() !== 0 || Y() !== 0)) {
          maxVal = 0;
          for (i = 1; i < antInfo.brains.length; i++) {
            if (antInfo.brains[i].state === ReturnFoodAnt) maxVal++;
          }
          
          if (squareData[0].numFood > maxVal) {
            setXT(X()); setYT(Y());
            myBrain.state = ReturnFoodAnt;
            setFood(floor((squareData[0].numFood - maxVal) / 3));
            firkAntSwitchBase();
          }
        } else {
          if (myBrain.state === PatrolAnt) {
            y = getFood();
            if (myBrain.dir) {
              x = y + 1;
              if (x > 4) x -= 4;
            } else {
              x = y - 1;
              if (x < 1) x += 4;
            }
            
            switch (YT()) {
              case 0:
                dir = firkAntWalk(X(), Y(), Xd[y] * XT(), Yd[y] * XT());
                if (dir === 0) setYT(YT() + 1);
                break;
              case 1:
                dir = firkAntWalk(X(), Y(), 
                                (Xd[y] + Xd[x]) * XT(),
                                (Yd[y] + Yd[x]) * XT());
                if (dir === 0) setYT(YT() + 1);
                break;
              case 2:
                dir = firkAntWalk(X(), Y(), Xd[x] * XT(), Yd[x] * XT());
                if (dir === 0) setYT(YT() + 1);
                break;
              case 3:
                dir = firkAntWalk(X(), Y(), 0, 0);
                if (dir === 0) setYT(YT() + 1);
                break;
              case 4:
                myBrain.state = UninitialisedAnt;
                setXT(0); setYT(0); setFood(0);
                if (X() !== 0 || Y() !== 0) {
                  myBrain.state = SearchAndDestroyAnt;
                }
                break;
            }
          }
          
          if (X() !== 0 || Y() !== 0) {
            for (i = 1; i < 5; i++) {
              if (squareData[i].numFood > 0) {
                if (squareData[i].numAnts < squareData[i].numFood) {
                  if (X() + Xd[i] !== 0 || Y() + Yd[i] !== 0) {
                    dir = i;
                  }
                }
              }
            }
          }
        }
        
        // Prevent unnecessary base
        if (squareData[0].base === false) {
          if (abs(X()) === 32 || abs(Y()) === 32) {
            for (i = 1; i < antInfo.brains.length; i++) {
              if (antInfo.brains[i].state === BaseAnt) {
                myBrain.state = PreventBaseAnt;
                dir = 0;
              }
            }
          }
        }
        break;

      case PreventBaseAnt:
        for (i = 1; i < antInfo.brains.length; i++) {
          switch (antInfo.brains[i].state) {
            case SearchAndDestroyAnt:
            case PatrolAnt:
              if (antInfo.brains[i].xpos === 0 && antInfo.brains[i].ypos === 0) {
                antInfo.brains[i].xpos = X();
                antInfo.brains[i].ypos = Y();
              }
              break;
            case ReturnFoodAnt:
              if (antInfo.brains[i].xpos === 0 && antInfo.brains[i].ypos === 0) {
                antInfo.brains[i].xtarget = XT() - X();
                antInfo.brains[i].ytarget = YT() - Y();
                antInfo.brains[i].xpos = X();
                antInfo.brains[i].ypos = Y();
              }
              break;
            case BaseAnt:
              antInfo.brains[i].state = SearchAndDestroyAnt;
              antInfo.brains[i].xpos = X();
              antInfo.brains[i].ypos = Y();
              antInfo.brains[i].xtarget = 0;
              antInfo.brains[i].ytarget = 0;
              antInfo.brains[i].dir = 0;
              antInfo.brains[i].food = 0;
              break;
            case PreventBaseAnt:
              myBrain.state = SearchAndDestroyAnt;
              i = antInfo.brains.length;
              break;
          }
        }
        break;
    }
  }

  // Ensure there's always a base ant
  if (squareData[0].base === true || (squareData[0].base === false && X() === 0 && Y() === 0)) {
    maxVal = 0;
    for (i = 0; i < antInfo.brains.length; i++) {
      if (antInfo.brains[i].state === BaseAnt) {
        maxVal++;
        i = antInfo.brains.length;
      }
    }
    if (maxVal === 0) {
      myBrain.state = BaseAnt;
      dir = 0;
      setFD(0); setW(0);
      setCount(0);
      myBrain.firstbase = 0;
      
      for (i = 1; i < 5; i++) {
        if (squareData[i].base) {
          dir = i;
          myBrain.state = UninitialisedAnt;
        }
      }
    }
  }

  // Create guards when enemies detected
  for (i = 1; i < 5; i++) {
    if (squareData[i].team > 0) {
      dir = i;
      if (myBrain.state === BaseAnt) {
        setX(0); setY(0);
      }
      myBrain.state = GuardAnt;
      setCount(1500);
    }
  }

  // Position tracking and overflow protection
  d = dist(X(), Y(), 0, 0);
  if ((squareData[dir & 7].numAnts >= MaxSquareAnts - d * 5 && d < 4) ||
      (squareData[dir & 7].numAnts >= MaxSquareAnts)) {
    return 0;
  }

  if (myBrain.state === SearchAndDestroyAnt) {
    if (abs(X() + Xd[dir & 7]) > 126 || abs(Y() + Yd[dir & 7]) > 126) {
      setXT(0); setYT(0); setFood(0);
      dir = dir & 24;
    }
  }

  // Update position
  setX(X() + Xd[dir & 7]);
  setY(Y() + Yd[dir & 7]);
  
  return dir;
}