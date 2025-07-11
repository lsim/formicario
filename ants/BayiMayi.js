function BayiMayi(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        x: 0,
        y: 0,
        repXCoord: 0, // repx.repco - report x coordinate
        repYCoord: 0, // repy.repco - report y coordinate
        repXLS: 0,    // repx.ls - life stage/level
        repYLS: 0,    // repy.ls - life stage/level
        stat: 0,      // status flags and hierarchy level
      },
      name: 'BayiMayi',
      color: '#FF8000', // Orange color
    };
  }

  // Constants (from C #defines)
  const NS = 6;       // Number of scouts
  const BD = 120;     // Base distance
  const REHIRE = 40;  // Rehire threshold
  const CF = 8;       // Carrying food flag
  const GI = 16;      // General intelligence flag
  const RECGI = 32;   // Recruiting GI flag
  const CW = 64;      // Clockwise flag
  
  // C macro translations
  function absv(a) { return a >= 0 ? a : -a; }
  function val(x, y) { return absv(x) + absv(y); }
  function xd(d) { return (d === 1 ? 1 : 0) - (d === 3 ? 1 : 0); }
  function yd(d) { return (d === 4 ? 1 : 0) - (d === 2 ? 1 : 0); }
  
  // Math helper functions
  function floor(x) { return x >= 0 ? (x | 0) : ((x | 0) === x ? x : (x | 0) - 1); }
  
  const myBrain = antInfo.brains[0];
  
  // Hierarchy level (bits 0-2 of stat)
  function hr() { return myBrain.stat & 7; }
  function _hr(i) { return antInfo.brains[i].stat & 7; }
  
  // Flag operations
  function IB(b) { return myBrain.stat & b; }
  function SB(b) { myBrain.stat |= b; }
  function CB(b) { myBrain.stat &= (~b); }
  function _IB(b, i) { return antInfo.brains[i].stat & b; }
  function _SB(b, i) { antInfo.brains[i].stat |= b; }
  function _CB(b, i) { antInfo.brains[i].stat &= (~b); }

  // Random number generator (B1r equivalent)
  function B1r(seed, i) {
    const rs = [120,240,165,224,51,190,206,248,21,164,111,235,142,63,56,245,110,47,243,134,32,242,185,123,177,71,36,232,121,83,94,233,202,53,201,209,57,6,227,74,128,99,101,79,87,15,197,97,68,228,98,145,25,34,192,143,108,170,44,138,86,119,114,64,92,72,140,210,81,95,166,131,62,182,146,208,179,19,183,249,37,205,115,150,184,117,172,136,214,129,13,231,252,27,178,70,186,222,88,61,149,48,213,82,107,122,29,188,60,106,7,116,181,69,153,4,225,76,80,66,246,234,78,133,198,215,139,3,135,90,171,18,9,38,1,250,160,158,189,141,124,200,251,2,244,23,212,96,39,17,16,230,253,132,237,127,223,148,65,194,204,193,33,46,187,241,31,255,54,24,220,137,147,236,100,40,151,58,157,12,126,159,207,155,41,93,163,109,218,105,75,5,174,103,216,254,35,161,77,42,67,175,118,229,144,152,49,154,11,180,52,104,247,169,112,130,85,0,50,168,43,22,196,167,28,125,203,162,156,10,238,199,14,239,219,217,20,30,55,89,59,221,84,45,226,102,195,26,113,211,73,191,91,173,8,176];
    
    if (i <= 0) return 0;
    myBrain.random = rs[myBrain.random & 255];
    return myBrain.random % i;
  }

  // Navigation function (B1go_to equivalent)
  function B1go_to(tox, toy) {
    const seed = (-myBrain.x + myBrain.y * 2 - myBrain.repXLS * 4 + myBrain.repYLS * 8 - myBrain.stat) & 255;
    myBrain.random = seed;
    
    if (B1r(seed, val(myBrain.x - tox, myBrain.y - toy)) >= absv(myBrain.x - tox)) {
      return myBrain.y > toy ? 2 : 4;
    }
    return myBrain.x > tox ? 3 : 1;
  }

  // Main ant logic (B1m equivalent)
  function B1m() {
    let i, temp;
    let xt, yt;
    let seed = (-myBrain.x + myBrain.y * 2 - myBrain.repXLS * 4 + myBrain.repYLS * 8 - myBrain.stat) & 255;
    myBrain.random = seed;

    // Check for enemies in adjacent squares
    for (i = 0; i < 5; i++) {
      if (squareData[i].team && squareData[i].numAnts) {
        SB(GI | RECGI);
        return i;
      }
      seed += ((squareData[i].numAnts << i) + (squareData[i].numFood << i) * 3);
    }

    // Coordinate with other ants if not on base
    if (!squareData[0].base && (temp = val(myBrain.x, myBrain.y))) {
      for (i = antInfo.brains.length - 1; i > 0; i--) {
        if (val(antInfo.brains[i].x, antInfo.brains[i].y) > temp) {
          if (_hr(i)) {
            antInfo.brains[i].repXCoord += (myBrain.x - antInfo.brains[i].x);
            antInfo.brains[i].repYCoord += (myBrain.y - antInfo.brains[i].y);
          } else {
            if (!hr()) {
              antInfo.brains[i].repXLS = myBrain.repXLS;
            } else {
              antInfo.brains[i].repXLS = val(myBrain.x, myBrain.y);
            }
          }
          antInfo.brains[i].x = myBrain.x;
          antInfo.brains[i].y = myBrain.y;
          
          // Toggle CW flag
          if (_IB(CW, i)) _CB(CW, i);
          else _SB(CW, i);
        }
      }

      // Handle GI recruitment
      if (!IB(GI)) {
        for (i = antInfo.brains.length - 1; i > 0; i--) {
          if (_IB(GI, i)) {
            if (_IB(RECGI, i)) {
              if (!IB(RECGI) && B1r(seed, 50) >= REHIRE) _CB(RECGI, i);
              SB(RECGI);
            } else if (IB(CF) || !B1r(seed, 25)) {
              _CB(GI | RECGI, i);
            }
          }
        }
      }
    }

    // Hierarchy management
    if (hr() > 1) {
      for (i = antInfo.brains.length - 1; i > 0; i--) {
        if (!_hr(i) && !_IB(GI, i)) {
          myBrain.stat--;
          antInfo.brains[i].stat = (antInfo.brains[i].stat & (~7)) | hr();
          antInfo.brains[i].repXCoord = myBrain.repXCoord;
          antInfo.brains[i].repYCoord = myBrain.repYCoord;
          break;
        }
      }
    }

    // Reset position if on base
    if (squareData[0].base) {
      myBrain.x = myBrain.y = 0;
    }

    // Home rule - at base coordinates
    if (!(myBrain.x % BD) && !(myBrain.y % BD)) {
      if (hr()) {
        myBrain.repXCoord -= myBrain.x;
        myBrain.repYCoord -= myBrain.y;
        if (!myBrain.repXCoord && !myBrain.repYCoord) {
          myBrain.stat &= ~7;
        }
      }
      myBrain.x = myBrain.y = 0;
      
      if (squareData[0].numAnts < NS && !B1r(seed, 4)) SB(GI);
      if (IB(GI)) return 16; // Build base
      
      myBrain.stat = B1r(seed, 4) * CW | (myBrain.stat & 7);
      
      if (squareData[0].numFood >= 50 - 25) return 16; // NewBaseFood - NewBaseAnts
      if (hr()) return B1go_to(myBrain.repXCoord, myBrain.repYCoord);
      
      myBrain.repXLS = 0;
      return B1r(seed, 4) + 1;
    }

    // GI behavior
    if (IB(GI)) {
      if (!hr()) myBrain.repYLS++;
      if (B1r(seed, 25)) return 0;
      else {
        CB(GI);
        SB(RECGI);
      }
    }

    // Recruiting behavior
    if (IB(RECGI) && !IB(GI) && squareData[0].numAnts < 2) {
      temp = 0;
      for (i = 1; i < 5; i++) {
        if (squareData[i].numAnts) {
          temp = 1;
          break;
        }
      }
      if (!temp) {
        SB(GI);
        CB(RECGI);
        return 0;
      } else {
        return B1go_to(myBrain.x * 2, myBrain.y * 2);
      }
    }

    // At target location
    if (hr() && myBrain.x === myBrain.repXCoord && myBrain.y === myBrain.repYCoord) {
      if (squareData[0].numFood >= squareData[0].numAnts) {
        if (!B1r(seed, 1 << (hr() - 1))) myBrain.stat--;
        SB(CF);
        return B1go_to(0, 0);
      } else {
        myBrain.stat &= (~7);
        myBrain.repXLS = val(myBrain.x, myBrain.y);
      }
    }

    // Look for food
    for (i = 1; i < 5; i++) {
      temp = squareData[i].numFood - squareData[i].numAnts;
      if (temp > 0 && 
          !(myBrain.x === -xd(i) && myBrain.y === -yd(i)) &&
          (!hr() || myBrain.x + xd(i) !== myBrain.repXCoord || myBrain.y + yd(i) !== myBrain.repYCoord)) {
        myBrain.stat &= (~7);
        myBrain.repXCoord = myBrain.x + xd(i);
        myBrain.repYCoord = myBrain.y + yd(i);
        
        do {
          myBrain.stat++;
          temp = temp >> 1;
        } while (temp && (myBrain.stat & 7) < 7);
        
        if (!IB(CF)) return i;
      }
    }

    // Return home if carrying food
    if (IB(CF)) return B1go_to(0, 0);
    
    // Move towards target if hierarchical
    if (hr()) return B1go_to(myBrain.repXCoord, myBrain.repYCoord);

    // Exploration behavior
    if (myBrain.repXLS < 127) {
      const pitch = !B1r(seed, floor((myBrain.repXLS / 19) | 0) + 2);
      if (pitch) myBrain.repXLS++;
    } else {
      myBrain.repXLS = BD - 5;
    }

    xt = IB(CW) ? (myBrain.y > 0 ? 1 : -1) : (myBrain.y < 0 ? 1 : -1);
    yt = IB(CW) ? (myBrain.x < 0 ? 1 : -1) : (myBrain.x > 0 ? 1 : -1);

    return (absv(myBrain.repXLS * myBrain.repXLS - (myBrain.x + xt) * (myBrain.x + xt) - myBrain.y * myBrain.y) <
            absv(myBrain.repXLS * myBrain.repXLS - myBrain.x * myBrain.x - (myBrain.y + yt) * (myBrain.y + yt)))
            ? 2 - xt : 3 + yt;
  }

  // Main wrapper function (B1w equivalent)
  let dir, retval;
  retval = B1m();
  
  if ((dir = retval & 7)) {
    // Check if target square is full
    if (squareData[dir].numAnts >= 255) { // MaxSquareAnts equivalent
      CB(CF);
      retval = 0;
      for (dir = 4; dir > 0; dir--) {
        if (squareData[dir].numAnts < 255) {
          retval = dir;
          break;
        }
      }
    }
    // Update position
    myBrain.x += xd(dir);
    myBrain.y += yd(dir);
  }

  return retval | (IB(CF) ? 8 : 0); // Add carry food flag
}