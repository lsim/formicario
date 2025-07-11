function Skak(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        mx: 0,
        my: 0,
        px: 0,
        py: 0,
        state: 0, // 0=stINIT, 1=stTRANSP, 2=stFOOD, 3=stWALL0, 4=stWALL, 5=stLURK, 6=stSOLDIER, 7=stQUEEN
        id: 0,
        pos: 0
      },
      name: 'Skak',
      color: '#9932CC', // Dark orchid color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Direction constants
  const STOP = 0;
  const HERE = 0;
  const EAST = 1;
  const SOUTH = 2;
  const WEST = 3;
  const NORTH = 4;
  const CARRY = 8;
  const BUILDBASE = 16;

  // State constants
  const stINIT = 0;
  const stTRANSP = 1;
  const stFOOD = 2;
  const stWALL0 = 3;
  const stWALL = 4;
  const stLURK = 5;
  const stSOLDIER = 6;
  const stQUEEN = 7;

  // Constants
  const STIPLET_BITS = 3;
  const STIPLET = (1 << STIPLET_BITS) - 1;
  const FALSE = 0;
  const TRUE = 1;

  // Direction arrays
  const RX = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0];
  const RY = [0, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];

  // ID field constants
  const idX = 32;
  const idY = 64;
  const idMISC = 128;
  const flKNOWSFOOD = 128;

  const myBrain = antInfo.brains[0];

  // Helper functions
  function ID_POS() { return myBrain.id & 15; }
  function ID_X() { return myBrain.id & idX; }
  function ID_Y() { return myBrain.id & idY; }
  function ID_MISC() { return myBrain.id & idMISC; }
  function KNOWS_FOOD() { return myBrain.state & flKNOWSFOOD; }

  function goBackFollowingWall() {
    if ((myBrain.px & 63) === 0) {
      if ((myBrain.py & 63) === 0) { // På gitterhjørne
        if ((ID_MISC() && myBrain.py) || !myBrain.px)
          return (myBrain.py > 0) ? SOUTH : NORTH;
        else
          return (myBrain.px > 0) ? WEST : EAST;
      }
      return (myBrain.py > 0) ? SOUTH : NORTH;
    } else if ((myBrain.py & 63) === 0) {
      return (myBrain.px > 0) ? WEST : EAST;
    } else {
      const dx = ((myBrain.px - 32) & 63) - 32;
      const dy = ((myBrain.py - 32) & 63) - 32;
      if (abs(dx) < abs(dy))
        return (dx > 0) ? WEST : EAST;
      else
        return (dy > 0) ? SOUTH : NORTH;
    }
  }

  function goToFollowingWall(dstx, dsty) {
    const dx = myBrain.px - dstx;
    const dy = myBrain.py - dsty;
    if (!dx)
      return (dy > 0) ? SOUTH : NORTH;
    if (!dy)
      return (dx > 0) ? WEST : EAST;

    if ((myBrain.px & 63) === 0) {
      if ((myBrain.py & 63) === 0) { // På gitterhjørne
        if ((ID_MISC() && (myBrain.py !== dsty)) || (myBrain.px === dstx))
          return (myBrain.py > dsty) ? SOUTH : NORTH;
        else
          return (myBrain.px > dstx) ? WEST : EAST;
      }
      return (myBrain.py > dsty) ? SOUTH : NORTH;
    } else if ((myBrain.py & 63) === 0) {
      return (myBrain.px > dstx) ? WEST : EAST;
    } else {
      if (abs(dx) > abs(dy))
        return (dx > 0) ? WEST : EAST;
      else
        return (dy > 0) ? SOUTH : NORTH;
    }
  }

  function myOutwards() {
    if (ID_MISC())
      return ID_X() ? EAST : WEST;
    else
      return ID_Y() ? NORTH : SOUTH;
  }

  function myInwards() {
    return goBackFollowingWall();
  }

  function goOutFollowingWall() {
    if ((myBrain.px & 63) === 0) {
      if ((myBrain.py & 63) === 0) { // På gitterhjørne
        return myOutwards();
      }
      return (myBrain.py < 0) ? SOUTH : NORTH;
    } else if ((myBrain.py & 63) === 0) {
      return (myBrain.px < 0) ? WEST : EAST;
    } else {
      if (abs(myBrain.px) > abs(myBrain.py))
        return (myBrain.px < 0) ? WEST : EAST;
      else
        return (myBrain.py < 0) ? SOUTH : NORTH;
    }
  }

  function goOutSlinger() {
    // Use mx as random seed
    myBrain.mx = myBrain.mx * 4637 + 342;
    if (myBrain.mx > (myBrain.id << 24)) {
      myBrain.mx = myBrain.mx * 4637 + 342;
      if (myBrain.px > 0) return EAST;
      if (myBrain.px < 0) return WEST;
      return (myBrain.mx > 0) ? EAST : WEST;
    } else {
      myBrain.mx = myBrain.mx * 4637 + 342;
      if (myBrain.py > 0) return NORTH;
      if (myBrain.py < 0) return SOUTH;
      return (myBrain.mx > 0) ? NORTH : SOUTH;
    }
  }

  let dir = STOP;
  let i;
  let mcase = -1;

  switch (myBrain.state & ~(128 | 64)) {
    case stINIT: {
      let queen = 0;
      myBrain.id = myBrain.mx;
      myBrain.px = myBrain.py = 0;

      for (i = 1; i < squareData[0].numAnts; i++) {
        if (antInfo.brains[i].state === stQUEEN) {
          queen = i; 
          break;
        }
      }
      if (!queen) {
        if (squareData[0].numAnts > 1) {
          myBrain.state = stQUEEN;
          myBrain.id = 0; // quCOUNT
          break; // switch
        }
      }

      if (queen) {
        antInfo.brains[queen].id++;
        if (antInfo.brains[queen].id > 5 && (antInfo.brains[queen].id & 2)) {
          myBrain.state = stWALL0;
          // goto initdone
        } else {
          myBrain.state = stFOOD;
          myBrain.pos = antInfo.brains[queen].id >> 2;
        }
      } else {
        myBrain.state = stFOOD;
        myBrain.pos = 0;
      }
      // initdone: fall through if not stFOOD
      if (myBrain.state !== stFOOD) break;
    }
    case stFOOD: {
      if (squareData[0].numFood) { // Mad!
        if (squareData[0].numFood > 1 && !(KNOWS_FOOD())) {
          myBrain.state |= flKNOWSFOOD;
          myBrain.mx = myBrain.px; 
          myBrain.my = myBrain.py;
          myBrain.pos = squareData[0].numFood - 1;
        }
        dir = goBackFollowingWall() | CARRY;
      } else { // Ik' mad
        // Se omkring for mad:
        let found = false;
        for (i = 1; i <= 4; i++) {
          if (squareData[i].numFood > squareData[i].numAnts) {
            dir = i;
            found = true;
            break;
          }
        }

        if (!found && KNOWS_FOOD()) { // Gå til mad
          if (myBrain.px === myBrain.mx && myBrain.py === myBrain.my) { // Hvad - ikke mere mad!?
            myBrain.state &= ~flKNOWSFOOD;
          } else {
            // Fortæl videre:
            for (i = 1; i < squareData[0].numAnts && myBrain.pos > 1; i++) {
              if (antInfo.brains[i].state === stFOOD) { // Kender ikke mad
                antInfo.brains[i].state |= flKNOWSFOOD;
                antInfo.brains[i].mx = myBrain.mx; 
                antInfo.brains[i].my = myBrain.my;
                myBrain.pos -= (antInfo.brains[i].pos = myBrain.pos >> 1); // Del maden
                i++;
              }
            }

            dir = goToFollowingWall(myBrain.mx, myBrain.my);
            found = true;
          }
        }

        if (!found) {
          // Ellers afsøg:
          if (myBrain.pos > 2) {
            const ax = abs(myBrain.px), ay = abs(myBrain.py);
            if (myBrain.py === 0 && ax < 3 * myBrain.pos) {
              if (myBrain.px === 0) myBrain.pos++;
              dir = ID_X() ? EAST : WEST;
            } else {
              if (ay < 3 * myBrain.pos && myBrain.px)
                dir = ID_Y() ? NORTH : SOUTH;
              else
                if (myBrain.px)
                  dir = (myBrain.px < 0) ? EAST : WEST;
                else
                  dir = (myBrain.py < 0) ? NORTH : SOUTH;
            }
          } else {
            dir = goOutSlinger();
          }
        }
      }
      break;
    }
    case stWALL0: { // Ikke placeret mur-myre
      let found = FALSE;
      if ((myBrain.px | myBrain.py) && ((myBrain.px & STIPLET) === 0 && (myBrain.py & STIPLET) === 0)) {
        for (i = 1; i < squareData[0].numAnts; i++) {
          if (antInfo.brains[i].state === stWALL && antInfo.brains[i].pos) {
            found = TRUE; 
            break;
          }
        }
      } else {
        found = TRUE;
      }
      if (found) { // Gå videre
        const pp = (myBrain.px | myBrain.py);
        if ((pp & 63) === 0 && (pp !== 0)) {
          myBrain.id += (myBrain.id << 4) + (myBrain.id >> 4);
          // Byg ikke mur indad:
          if (ID_X() ? (myBrain.px < 0) : (myBrain.px > 0)) myBrain.id ^= idX;
          if (ID_Y() ? (myBrain.py < 0) : (myBrain.py > 0)) myBrain.id ^= idY;
        }
        dir = myOutwards();
      } else { // Her er min plads!
        myBrain.state = stWALL;
        myBrain.pos = (myBrain.px >> STIPLET_BITS) << 8 | ((myBrain.py >> STIPLET_BITS) & 0xFF);
        dir = STOP;
      }
      if (myBrain.state !== stWALL) break;
    }
    case stWALL: { // Mur-myre på plads
      let wx, wy;
      mcase = 0;

      // Flyt mad?
      if (squareData[0].numFood) {
        mcase = 1;
        dir = myInwards() | CARRY;
        break;
      }

      // Se omkring for mad:
      let found = false;
      for (i = 1; i <= 4; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          dir = i;
          found = true;
          break;
        }
      }

      if (!found) {
        // Ude af plads?
        if (myBrain.px !== (wx = (((myBrain.pos >> (8 - STIPLET_BITS)) & ~STIPLET) << 16) >> 16)) {
          mcase = 2;
          dir = (myBrain.px > wx) ? WEST : EAST;
        } else if (myBrain.py !== (wy = ((myBrain.pos << 8) >> (8 - STIPLET_BITS)))) {
          mcase = 3;
          dir = (myBrain.py > wy) ? SOUTH : NORTH;
        } else {
          dir = STOP;
        }

        // Find ny plads? (TEST)
        for (i = 1; i < squareData[0].numAnts; i++) {
          if (antInfo.brains[i].state === stWALL && antInfo.brains[i].pos === myBrain.pos) {
            myBrain.state = stWALL0; 
            break;
          }
        }
      }
      break;
    }
    case stLURK: {
      dir = STOP;
      if (!squareData[0].numFood) {
        // Se omkring for mad:
        for (i = 1; i <= 4; i++) {
          if (squareData[i].numFood > squareData[i].numAnts) {
            dir = i; 
            break;
          }
        }
      }
      if (--myBrain.pos === 0) myBrain.state = stSOLDIER;
      break;
    }
    case stSOLDIER: {
      if (abs(myBrain.px) < 64 && abs(myBrain.py) < 64) {
        dir = goOutSlinger();
      } else if (((++myBrain.pos) & 15) === 0) {
        dir = goOutSlinger();
      } else {
        dir = STOP;
      }
      break;
    }
    case stQUEEN: {
      dir = STOP;
      break;
    }
  }

  // Enemies?
  for (i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i;
      if (myBrain.state !== stWALL) {
        myBrain.state = stLURK;
        myBrain.pos = abs(myBrain.px) + abs(myBrain.py);
      }
      break;
    }
  }

  myBrain.px += RX[dir];
  myBrain.py += RY[dir];

  return dir;
}