function Rommel(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        rnd: 1,
        baseX: 0,
        baseY: 0,
        type: 0, // 0=unknown, 1=rommel, 2=idle, 3=searcher, 4=goingHome, 5=goTo, 6=defender
        x: 0,
        y: 0,
        data: new Array(5).fill(0),
        // Additional fields for different ant types
        delay: 0,
        direction: 0,
        xDirCount: 0,
        yDirCount: 0,
        steps: 0,
        state: 0,
        formerType: 0,
        messageA: 0,
        messageB: 0,
        messageC: 0,
        xPos: 0,
        yPos: 0,
        searchDir: 0,
        searchLength: 0,
        searcherDelay: 0,
        returnCount: 0
      },
      name: 'Rommel',
      color: '#8B4513', // Brown color for general
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Direction constants
  const here = 0;
  const left = 3;
  const right = 1;
  const up = 4;
  const down = 2;
  const dragFood = 8;
  const buildBase = 16;

  // Type constants
  const unknown = 0;
  const rommel = 1;
  const idle = 2;
  const searcher = 3;
  const goingHome = 4;
  const goTo = 5;
  const defender = 6;

  // Game constants
  const reserveNumber = 10;
  const foodGatherOverkill = 0;
  const returnCountForExpansion = 10;
  const maxSearchLength = 1500;
  const antTunnelSize = 10;
  const antOutPriority = antTunnelSize - 2;
  const NewBaseFood = 16;
  const NewBaseAnts = 12;
  const MaxSquareAnts = 200;

  const myBrain = antInfo.brains[0];

  // Sine table - avoiding Math API
  const sineTable = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 59, 62, 65, 67, 70, 73, 75, 78, 80, 82, 85, 87, 89, 91, 94, 96, 98, 100, 102, 103, 105, 107, 108, 110, 112, 113, 114, 116, 117, 118, 119, 120, 121, 122, 123, 123, 124, 125, 125, 126, 126, 126, 126, 126, 127, 126, 126, 126, 126, 126, 125, 125, 124, 123, 123, 122, 121, 120, 119, 118, 117, 116, 114, 113, 112, 110, 108, 107, 105, 103, 102, 100, 98, 96, 94, 91, 89, 87, 85, 82, 80, 78, 75, 73, 70, 67, 65, 62, 59, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 3, 0, -3, -6, -9, -12, -15, -18, -21, -24, -27, -30, -33, -36, -39, -42, -45, -48, -51, -54, -57, -59, -62, -65, -67, -70, -73, -75, -78, -80, -82, -85, -87, -89, -91, -94, -96, -98, -100, -102, -103, -105, -107, -108, -110, -112, -113, -114, -116, -117, -118, -119, -120, -121, -122, -123, -123, -124, -125, -125, -126, -126, -126, -126, -126, -127, -126, -126, -126, -126, -126, -125, -125, -124, -123, -123, -122, -121, -120, -119, -118, -117, -116, -114, -113, -112, -110, -108, -107, -105, -103, -102, -100, -98, -96, -94, -91, -89, -87, -85, -82, -80, -78, -75, -73, -70, -67, -65, -62, -59, -57, -54, -51, -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3];

  // Helper functions
  function sinus(x) {
    return sineTable[x & 255];
  }

  function cosinus(x) {
    return sinus((x + 64) & 255);
  }

  function moveAnt(dir, brain, priority) {
    if (squareData[dir].numAnts > (MaxSquareAnts - antTunnelSize + priority)) return here;
    switch (dir) {
      case left: brain.x--; break;
      case right: brain.x++; break;
      case up: brain.y--; break;
      case down: brain.y++; break;
    }
    return dir;
  }

  function collectorAction() {
    for (let i = 0; i < 5; i++) {
      if (squareData[i].numFood > 0) return i;
    }
    return 0;
  }

  function defendAction() {
    let result = 0;
    for (let i = 0; i < 5; i++) {
      if (squareData[i].team !== 0) result = i;
    }
    return result;
  }

  function findType(type) {
    for (let i = 1; i < squareData[here].numAnts; i++) {
      if (antInfo.brains[i].type === type) return i;
    }
    return 0;
  }

  function findIdle() {
    for (let i = 1; i < squareData[here].numAnts; i++) {
      if (antInfo.brains[i].type === idle) return i;
    }
    return 0;
  }

  function setNewBornType() {
    for (let i = 1; i < squareData[here].numAnts; i++) {
      if (antInfo.brains[i].type === rommel) {
        myBrain.baseX = antInfo.brains[i].x;
        myBrain.baseY = antInfo.brains[i].y;
        myBrain.x = myBrain.baseX;
        myBrain.y = myBrain.baseY;
        myBrain.type = idle;
        return;
      }
    }
    myBrain.type = rommel;
    myBrain.searchDir = 0;
    myBrain.searchLength = 50;
    myBrain.searcherDelay = 0;
    myBrain.returnCount = 0;
  }

  // Ant behavior functions
  function searcherAnt() {
    if (myBrain.delay) {
      myBrain.delay--;
      return here;
    }

    // Base construct help
    if (squareData[here].numFood >= NewBaseFood) {
      myBrain.type = unknown;
      return here;
    }

    let food = defendAction();
    if (food) {
      myBrain.type = defender;
      return moveAnt(food, myBrain, antOutPriority);
    }

    food = collectorAction();
    if (food) return moveAnt(food, myBrain, antOutPriority);

    if (myBrain.steps === 0 || (squareData[here].numFood !== 0 && findType(rommel) === 0)) {
      myBrain.type = goingHome;
      myBrain.state = 0;
      myBrain.formerType = searcher;
      if (squareData[here].numFood === 0) {
        myBrain.messageA = 0;
        myBrain.messageB = 0;
        myBrain.messageC = 0;
      } else {
        myBrain.messageA = myBrain.x;
        myBrain.messageB = myBrain.y;
        myBrain.messageC = (squareData[here].numFood >> 0) - 1 + foodGatherOverkill;
      }
      return goingHomeAnt();
    }

    myBrain.xDirCount += cosinus(myBrain.direction);
    myBrain.yDirCount += sinus(myBrain.direction);
    myBrain.steps--;

    if (abs(myBrain.xDirCount) >= 127) {
      if (myBrain.xDirCount > 0) {
        myBrain.xDirCount -= 127;
        return moveAnt(right, myBrain, antOutPriority);
      } else {
        myBrain.xDirCount += 127;
        return moveAnt(left, myBrain, antOutPriority);
      }
    }
    if (abs(myBrain.yDirCount) >= 127 && !food) {
      if (myBrain.yDirCount > 0) {
        myBrain.yDirCount -= 127;
        return moveAnt(down, myBrain, antOutPriority);
      } else {
        myBrain.yDirCount += 127;
        return moveAnt(up, myBrain, antOutPriority);
      }
    }

    return here;
  }

  function goingHomeAnt() {
    let allowDrag = 0;

    // Base construct help
    if (squareData[here].numFood >= NewBaseFood) {
      myBrain.type = unknown;
      return here;
    }

    if (squareData[here].numFood > 0 && findType(rommel) === 0) allowDrag = dragFood;

    if (myBrain.x === myBrain.baseX && myBrain.y === myBrain.baseY) {
      if (myBrain.formerType === goTo) myBrain.type = unknown;
      return here;
    }
    if (myBrain.x === myBrain.baseX) myBrain.state = 0;
    if (myBrain.y === myBrain.baseY) myBrain.state = 1;

    if (myBrain.state) {
      myBrain.state = 0;
      if (myBrain.x < myBrain.baseX) return moveAnt(right, myBrain, 0) + allowDrag;
      else return moveAnt(left, myBrain, 0) + allowDrag;
    }
    if (!myBrain.state) {
      myBrain.state = 1;
      if (myBrain.y < myBrain.baseY) return moveAnt(down, myBrain, 0) + allowDrag;
      else return moveAnt(up, myBrain, 0) + allowDrag;
    }
    return here;
  }

  function goToAnt() {
    // Base construct help
    if (squareData[here].numFood >= NewBaseFood) {
      myBrain.type = unknown;
      return here;
    }

    let food = defendAction();
    if (food) {
      myBrain.type = defender;
      return moveAnt(food, myBrain, antOutPriority);
    }

    if (myBrain.x === myBrain.xPos && myBrain.y === myBrain.yPos) {
      if (squareData[here].numFood > 0) {
        myBrain.type = goingHome;
        myBrain.formerType = goTo;
        return goingHomeAnt();
      } else {
        myBrain.type = searcher;
        myBrain.direction = myBrain.rnd & 0xff;
        myBrain.xDirCount = 0;
        myBrain.yDirCount = 0;
        myBrain.steps = 20;
        myBrain.delay = 0;
        return searcherAnt();
      }
    }
    if (myBrain.x === myBrain.xPos) myBrain.state = 0;
    if (myBrain.y === myBrain.yPos) myBrain.state = 1;

    if (myBrain.state) {
      myBrain.state = 0;
      if (myBrain.x < myBrain.xPos) return moveAnt(right, myBrain, antOutPriority) + dragFood;
      else return moveAnt(left, myBrain, antOutPriority);
    }
    if (!myBrain.state) {
      myBrain.state = 1;
      if (myBrain.y < myBrain.yPos) return moveAnt(down, myBrain, antOutPriority) + dragFood;
      else return moveAnt(up, myBrain, antOutPriority);
    }
    return here;
  }

  function defenderAnt() {
    return defendAction();
  }

  function rommelAnt() {
    let reserveAnts = 1;

    // Make goingHome empty handed ants idle
    for (let i = 1; i < squareData[here].numAnts; i++) {
      const ant = antInfo.brains[i];
      if (ant.type === goingHome &&
          !(ant.formerType === searcher && ant.messageC > 0)) {
        ant.type = idle;
        myBrain.returnCount++;
      }
    }

    if (myBrain.returnCount > myBrain.searchLength * myBrain.searchLength / 200) {
      myBrain.returnCount = 0;
      myBrain.searchLength++;
      if (myBrain.searchLength > maxSearchLength)
        myBrain.searchLength--;
    }

    let antCount = 0;
    // Find an ant with a food message
    for (let i = 1; i < squareData[here].numAnts; i++) {
      const ant = antInfo.brains[i];
      if (ant.type === goingHome && ant.formerType === searcher) {
        antCount++;
        for (let j = 0; j < 1 && ant.messageC; j++) {
          const idleAnt = findType(idle);
          if (idleAnt) {
            const freeAnt = antInfo.brains[idleAnt];
            freeAnt.type = goTo;
            freeAnt.state = 0;
            freeAnt.xPos = ant.messageA;
            freeAnt.yPos = ant.messageB;
            ant.messageC--;
          } else {
            break;
          }
        }
        if (antCount > MaxSquareAnts - 20)
          ant.type = idle;
      }
    }

    if (squareData[here].numFood >= NewBaseFood)
      reserveAnts = NewBaseAnts;
    else
      reserveAnts = 1;

    // Send out the remaining ants to search for food
    for (let i = reserveAnts; i < squareData[here].numAnts; i++) {
      const ant = antInfo.brains[i];
      if (ant.type === idle) {
        ant.type = searcher;
        ant.steps = myBrain.searchLength;
        ant.delay = myBrain.searcherDelay;
        ant.xDirCount = 0;
        ant.yDirCount = 0;
        ant.direction = myBrain.searchDir;
        myBrain.searcherDelay++;
        if (myBrain.searcherDelay === 1) {
          myBrain.searcherDelay = 0;
          myBrain.searchDir += 1;
          myBrain.searchDir &= 0xff;
        }
      }
    }

    return buildBase;
  }

  // Main logic
  if (myBrain.type === unknown) setNewBornType();

  switch (myBrain.type) {
    case rommel: return rommelAnt();
    case searcher: return searcherAnt();
    case goingHome: return goingHomeAnt();
    case goTo: return goToAnt();
    case defender: return defenderAnt();
  }

  return here;
}