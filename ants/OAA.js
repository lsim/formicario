function OAA(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        randval: 1,
        reportx: 0,
        reporty: 0,
        posx: 0,
        posy: 0,
        reportQty: 0,
        stat: 0
      },
      name: 'OAA',
      color: '#888888',
    };
  }

  // Helper functions to avoid Math API
  function absv(a) {
    return a >= 0 ? a : -a;
  }

  function val(x, y) {
    return absv(x) + absv(y);
  }

  function min(a, b) {
    return a > b ? b : a;
  }

  function random(t, mem) {
    mem.randval = (((mem.randval >> 3) - (mem.randval << 13) + 1) | 0);
    return mem.randval % t;
  }

  // Constants
  const CHICKENPITCH = 150;
  const NORMALPITCH = 180;
  const COURAGEOUSPITCH = 220;
  const RADIUS = 50;
  const CONSOLIDATION = 12;
  const NOSENTINELS = 10;
  const CW = 64;
  const SOLDIER = 32;
  const CARRYING = 8;
  const RETURNEE = 16;
  const ADVENTURER = 128;
  const SOLDIER_ADVANCE_SPEED = 10;

  // Assume these constants exist
  const MaxSquareAnts = 200;
  const NewBaseFood = 20;
  const NewBaseAnts = 10;

  const mem = antInfo.brains[0];

  // Macros as functions
  function getPitch() {
    return val(mem.posx, mem.posy) < 35 ? NORMALPITCH : CHICKENPITCH;
  }

  function getAdventurerFormula() {
    return val(mem.posx, mem.posy) < 35 ? COURAGEOUSPITCH : NORMALPITCH;
  }

  function getReportFormula(felt) {
    return felt.numFood - 1;
  }

  function isAtHome() {
    return !mem.posx && !mem.posy;
  }

  function getSoldierAdvanceDirection() {
    return mem.stat & 7;
  }

  function setSoldierAdvanceDirection(d) {
    mem.stat = (mem.stat & (255 - 7)) | d;
  }

  function isBit(b) {
    return mem.stat & b;
  }

  function setBit(b) {
    mem.stat |= b;
  }

  function clrBit(b) {
    mem.stat &= (255 - b);
  }

  function _isBit(b, i) {
    return antInfo.brains[i].stat & b;
  }

  function _setBit(b, i) {
    antInfo.brains[i].stat |= b;
  }

  function _clrBit(b, i) {
    antInfo.brains[i].stat &= (255 - b);
  }

  function revert() {
    setBit(RETURNEE);
    if (isBit(CW)) {
      clrBit(CW);
    } else {
      setBit(CW);
    }
  }

  function oaaGoTo(tox, toy) {
    if (mem.posx === tox) return (mem.posy > toy) ? 2 : 4;
    if (mem.posy === toy) return (mem.posx > tox) ? 3 : 1;
    if (absv(mem.posx - tox) > absv(mem.posy - toy)) {
      return (mem.posx > tox) ? 3 : 1;
    }
    return (mem.posy > toy) ? 2 : 4;
  }

  function oaaMove() {
    let i, temp, temp2;
    temp = 0;
    temp2 = 0;

    // Find enemies
    for (i = 1; i < 5; i++) {
      if (squareData[i].team && squareData[i].numAnts > temp2) {
        temp2 = squareData[i].numAnts;
        temp = i;
      }
    }

    if (temp) { // Enemy detected
      if (!isBit(SOLDIER)) {
        if (!mem.posx && !mem.posy) {
          setSoldierAdvanceDirection(0);
        } else if (!mem.posx) {
          setSoldierAdvanceDirection(mem.posy > 0 ? 4 : 2);
        } else if (!mem.posy) {
          setSoldierAdvanceDirection(mem.posx > 0 ? 1 : 3);
        } else {
          setSoldierAdvanceDirection(
            (absv(mem.posx) >= absv(mem.posy)) ?
              (mem.posx > 0 ? 1 : 3) : (mem.posy > 0 ? 4 : 2)
          );
        }
        setBit(SOLDIER);
      }
      return temp;
    }

    // Report sharing
    if (mem.reportQty) {
      for (i = squareData[0].numAnts - 1; i; i--) {
        if (!antInfo.brains[i].reportQty) {
          antInfo.brains[i].reportx = mem.reportx;
          antInfo.brains[i].reporty = mem.reporty;
          antInfo.brains[i].reportQty = mem.reportQty - ((mem.reportQty / 2) | 0);
          mem.reportQty -= antInfo.brains[i].reportQty;
          break;
        }
      }
    }

    if (!isAtHome()) {
      // Release soldiers if not at home
      for (i = squareData[0].numAnts - 1; i; i--) {
        if (!random(4, mem)) {
          _clrBit(SOLDIER, i);
        }
      }
    } else {
      if (squareData[0].numAnts < NOSENTINELS) {
        setBit(SOLDIER);
      }
      if (isBit(SOLDIER)) {
        return 16;
      } else {
        if (!squareData[0].base) {
          if (squareData[0].numFood >= NewBaseFood - NewBaseAnts) {
            return 16;
          }
        } else {
          mem.randval += ((mem.reportx | (mem.reporty << 8)) | 0) + mem.reportQty;
          mem.stat = random(4, mem) * CW;
          if (mem.reportQty) {
            return (mem.reporty > 0) ? 4 : 2;
          } else {
            return random(2, mem) + 2;
          }
        }
      }
    }

    if (isBit(SOLDIER)) {
      if (random(1000, mem) < SOLDIER_ADVANCE_SPEED) {
        return getSoldierAdvanceDirection();
      }
      return 0;
    }

    if (isBit(CARRYING)) {
      return oaaGoTo(0, 0);
    }

    if (mem.reportQty) {
      if (mem.posx === mem.reportx && mem.posy === mem.reporty) {
        if (squareData[0].numFood) {
          mem.reportQty--;
          setBit(CARRYING);
          return oaaGoTo(0, 0);
        } else {
          mem.reportQty = 0;
        }
      } else {
        // Go towards target
        return oaaGoTo(mem.reportx, mem.reporty);
      }
    }

    // Random wanderer (farmer)
    if (squareData[0].numFood >= squareData[0].numAnts) { // Found food
      mem.reportx = mem.posx;
      mem.reporty = mem.posy;
      mem.reportQty = getReportFormula(squareData[0]);
      setBit(CARRYING);
      return oaaGoTo(0, 0);
    } else {
      // Look around for food
      for (i = 1; i < 5; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          return i;
        }
      }
    }

    if (isBit(RETURNEE) && val(mem.posx, mem.posy) < CONSOLIDATION) {
      clrBit(RETURNEE);
    }

    temp = isBit(ADVENTURER) ? getAdventurerFormula() : getPitch();

    if (isBit(CW)) {
      if (!mem.posx) return mem.posy > 0 ? 1 : 3;
      if (!mem.posy) return mem.posx > 0 ? 2 : 4;
      if (mem.posy > absv(mem.posx)) {
        return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 2 : 4) : 1;
      }
      if (mem.posx >= absv(mem.posy)) {
        return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 3 : 1) : 2;
      }
      if ((-mem.posy) > absv(mem.posx)) {
        return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 4 : 2) : 3;
      }
      return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 1 : 3) : 4;
    } else {
      if (!mem.posx) return mem.posy > 0 ? 3 : 1;
      if (!mem.posy) return mem.posx > 0 ? 4 : 2;
      if (mem.posy > absv(mem.posx)) {
        return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 2 : 4) : 3;
      }
      if (mem.posx >= absv(mem.posy)) {
        return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 3 : 1) : 4;
      }
      if ((-mem.posy) > absv(mem.posx)) {
        return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 4 : 2) : 1;
      }
      return (random(1000, mem) < temp) ? (isBit(RETURNEE) ? 1 : 3) : 2;
    }
  }

  // Main function
  let retval = oaaMove();
  
  if (squareData[retval & 7].numAnts >= MaxSquareAnts) {
    if (retval & 1) {
      retval += 2 - 2 * (retval & 2);
    } else {
      retval += 2 - (retval & 4);
    }
    clrBit(CARRYING);
  }

  mem.posx += ((retval & 7) === 1 ? 1 : 0) - ((retval & 7) === 3 ? 1 : 0);
  mem.posy += ((retval & 7) === 4 ? 1 : 0) - ((retval & 7) === 2 ? 1 : 0);

  if (mem.posx >= RADIUS) {
    mem.posx = -RADIUS;
    revert();
  } else if (mem.posx < -RADIUS) {
    mem.posx = RADIUS - 1;
    revert();
  } else if (mem.posy >= RADIUS) {
    mem.posy = -RADIUS;
    revert();
  } else if (mem.posy < -RADIUS) {
    mem.posy = RADIUS - 1;
    revert();
  }

  return retval | (isBit(CARRYING) ? 8 : 0);
}