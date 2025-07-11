function Antsy(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        random: 1,
        class: 0,
        state: 0,
        x: 0,
        y: 0,
        x1: 0,
        y1: 0,
        // Queen-specific fields
        qx: 0,
        qy: 0,
        warriors: 0,
        pause: 0,
        radius: 0
      },
      name: 'Antsy',
      color: '#FF4500', // Orange red color
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const CLASS_Antsy = 0, CLASS_GpsAnt = 1, CLASS_Forager = 2, CLASS_Guard = 3, CLASS_Queen = 4;
  const NONE = 0, Return = 1, Source = 2, Guard = 3, Init = 4, Search = 5, 
        CW = 6, Deploy = 7, CCW = 8, Recruit = 9, Pause = 10;
  const MaxSquareAnts = 200;
  const NewBaseFood = 20;

  const DX = [0, 1, 0, -1, 0];
  const DY = [0, 0, -1, 0, 1];

  const mem = antInfo.brains[0];

  function rnd(num) {
    // Randomizer from original
    const rvals = new Uint16Array(2);
    rvals[0] = mem.random & 0xFFFF;
    rvals[1] = (mem.random >> 16) & 0xFFFF;
    
    let a = rvals[0], b = rvals[1];
    a = (a * 133) % 65521;
    b = b * 135 + 7;
    b = ((b >> 1) + ((b & 1) << 15)) | 0;
    rvals[1] = a;
    rvals[0] = b;
    
    mem.random = ((rvals[1] << 16) | rvals[0]) >>> 0;
    return ((((a ^ b) & 0xffff) * num) >> 16) | 0;
  }

  function kill(dir) {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].team) return i;
    }
    return dir;
  }

  function food() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numAnts < squareData[i].numFood) return i;
    }
    return 0;
  }

  function gps(dir) {
    if (squareData[dir].numAnts === MaxSquareAnts && !squareData[dir].team) {
      return 0;
    }
    mem.x += DX[dir];
    mem.y += DY[dir];
    return dir;
  }

  function atHome() {
    return mem.x === 0 && mem.y === 0;
  }

  function atTarget() {
    return mem.x === mem.x1 && mem.y === mem.y1;
  }

  function setTarget(tx, ty) {
    mem.x1 = tx;
    mem.y1 = ty;
  }

  function setHome(x0, y0) {
    if (abs(x0) + abs(y0) < abs(mem.x) + abs(mem.y)) {
      const dx = x0 - mem.x;
      const dy = y0 - mem.y;
      mem.x += dx;
      mem.y += dy;
      mem.x1 += dx;
      mem.y1 += dy;
    }
  }

  function moveTo(tx, ty) {
    const dx = tx - mem.x;
    const dy = ty - mem.y;
    let dir = 0;
    const killDir = kill(0);
    if (killDir) {
      mem.class = CLASS_Guard;
      mem.state = Init;
      return redispatch();
    }

    if (dx && dy) {
      if (rnd(abs(dx) + abs(dy)) >= abs(dx)) {
        dx = 0;
      } else {
        dy = 0;
      }
    }
    if (dx && !dy) dir = dx < 0 ? 3 : 1; // west : east
    if (dy && !dx) dir = dy < 0 ? 2 : 4; // south : north
    return gps(dir);
  }

  function move() {
    return moveTo(mem.x1, mem.y1);
  }

  function home() {
    return moveTo(0, 0);
  }

  function has(c) {
    for (let i = 1; i < squareData[0].numAnts; i++) {
      if (antInfo.brains[i].class === c) return i;
    }
    return 0;
  }

  function learn() {
    if (squareData[0].numAnts === 1) return 0;
    for (let i = 1; i < squareData[0].numAnts; i++) {
      const otherBrain = antInfo.brains[i];
      if (otherBrain.class === mem.class && otherBrain.state !== Deploy) {
        setHome(otherBrain.x, otherBrain.y);
        // Set home for other ant
        if (abs(mem.x) + abs(mem.y) < abs(otherBrain.x) + abs(otherBrain.y)) {
          const dx = mem.x - otherBrain.x;
          const dy = mem.y - otherBrain.y;
          otherBrain.x += dx;
          otherBrain.y += dy;
          otherBrain.x1 += dx;
          otherBrain.y1 += dy;
        }
        if (otherBrain.state === Return || otherBrain.state === Source) {
          mem.x1 = otherBrain.x1;
          mem.y1 = otherBrain.y1;
          if (atTarget()) return 0;
          return (mem.x1 !== 0 && mem.y1 !== 0) ? 1 : 0;
        }
      }
    }
    return 0;
  }

  function teach() {
    if (squareData[0].numAnts === 1) return;
    for (let i = 1; i < squareData[0].numAnts; i++) {
      const otherBrain = antInfo.brains[i];
      if (otherBrain.class === mem.class && otherBrain.state !== Deploy) {
        setHome(otherBrain.x, otherBrain.y);
        // Set home for other ant
        if (abs(mem.x) + abs(mem.y) < abs(otherBrain.x) + abs(otherBrain.y)) {
          const dx = mem.x - otherBrain.x;
          const dy = mem.y - otherBrain.y;
          otherBrain.x += dx;
          otherBrain.y += dy;
          otherBrain.x1 += dx;
          otherBrain.y1 += dy;
        }
        if (otherBrain.state === Search || otherBrain.state === Init) {
          otherBrain.x1 = mem.x1;
          otherBrain.y1 = mem.y1;
          otherBrain.state = Source;
        }
      }
    }
  }

  function search(cos, sin) {
    const skrue = 222;
    const knowledge = learn();

    if (abs(mem.x) > 1 || abs(mem.y) > 1) {
      // food here?
      if (squareData[0].numFood) {
        mem.x1 = mem.x;
        mem.y1 = mem.y;
        mem.state = Return;
        return redispatch();
      }

      // food in neighboring field?
      for (let i = 1; i < 5; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          return gps(kill(i));
        }
      }
    }

    // if target reached, go somewhere else
    if (atTarget()) {
      const newX = (((mem.x1 * cos - mem.y1 * sin) / skrue) | 0) + rnd(15) - 7;
      const newY = (((mem.y1 * cos + mem.x1 * sin) / skrue) | 0) + rnd(15) - 7;
      setTarget(newX, newY);
    } else {
      if (knowledge) {
        mem.state = Source;
        return redispatch();
      }
    }
    return move();
  }

  function redispatch() {
    return mainLogic();
  }

  // State implementations
  function queenInit() {
    if (mem.radius === 0) mem.radius = 64;
    mem.radius += 16;

    mem.qx = rnd(mem.radius);
    mem.qy = mem.radius - mem.qx;
    if (rnd(2)) mem.qx = -mem.qx;
    if (rnd(2)) mem.qy = -mem.qy;

    mem.warriors = 32;
    mem.pause = 255;

    mem.state = Pause;
    return redispatch();
  }

  function queenPause() {
    if (!mem.pause) {
      mem.state = Recruit;
      return redispatch();
    }
    mem.pause--;
    return 0;
  }

  function queenRecruit() {
    if (mem.warriors === 0) {
      mem.state = Init;
      return redispatch();
    }

    for (let i = 1; i < squareData[0].numAnts && mem.warriors > 0; i++) {
      const otherBrain = antInfo.brains[i];
      if (otherBrain.state === NONE) {
        otherBrain.state = Source;
        otherBrain.class = CLASS_Forager;
        otherBrain.x1 = mem.qx;
        otherBrain.y1 = mem.qy;
        mem.warriors--;
        break;
      }
    }
    return 0;
  }

  function foragerInit() {
    // become queen?
    if (!has(CLASS_Queen) && squareData[0].base) {
      mem.class = CLASS_Queen;
      mem.state = Init;
      return redispatch();
    }

    const dx = rnd(32);
    let dy = rnd(32) - dx;
    if (rnd(2)) dx = -dx;
    if (rnd(2)) dy = -dy;

    mem.x1 += dx;
    mem.y1 += dy;
    mem.state = Search;
    return redispatch();
  }

  function foragerSearch() {
    const knowledge = learn();

    if (abs(mem.x) > 1 && abs(mem.y) > 1) {
      // food here?
      if (squareData[0].numFood) {
        mem.x1 = mem.x;
        mem.y1 = mem.y;
        mem.state = Return;
        return redispatch();
      }

      // food in neighboring field?
      for (let i = 1; i < 5; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          return gps(kill(i));
        }
      }
    }

    // if target reached, go somewhere else
    if (mem.x === mem.x1 && mem.y === mem.y1) {
      mem.x1 += rnd(32) - 16;
      mem.y1 += rnd(32) - 16;
    } else {
      if (knowledge) {
        mem.state = Source;
        return redispatch();
      }
    }
    return move();
  }

  function foragerCW() {
    return search(222, -128);
  }

  function foragerCCW() {
    return search(222, 128);
  }

  function foragerSource() {
    // food in neighboring field?
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        mem.state = Search;
        return gps(kill(i));
      }
    }

    if (atTarget()) {
      if (squareData[0].numFood && !atHome()) {
        mem.state = Return;
        return redispatch();
      } else {
        mem.state = Init;
        return redispatch();
      }
    }

    teach();
    return move();
  }

  function foragerReturn() {
    teach();

    if (atHome()) {
      if (squareData[0].numFood >= NewBaseFood) return 16;
    } else {
      if (squareData[0].numFood) return 8 + moveTo(0, 0);
    }

    mem.state = Source;
    return redispatch();
  }

  function guardInit() {
    mem.state = Guard;
    return redispatch();
  }

  function guardGuard() {
    const k = kill(0);
    if (k) return gps(k);
    if (!rnd(400)) {
      mem.class = CLASS_Forager;
      mem.state = Init;
      return redispatch();
    }
    return 0;
  }

  function deploy() {
    if (mem.x === mem.x1 && mem.y === mem.y1) mem.state = Init;
    return move();
  }

  // Main state machine
  function mainLogic() {
    switch (mem.state) {
      case Return:
        if (mem.class === CLASS_Forager) return foragerReturn();
        break;
      case Source:
        if (mem.class === CLASS_Forager) return foragerSource();
        break;
      case Guard:
        if (mem.class === CLASS_Guard) return guardGuard();
        break;
      case Init:
        switch (mem.class) {
          case CLASS_Forager: return foragerInit();
          case CLASS_Guard: return guardInit();
          case CLASS_Queen: return queenInit();
        }
        break;
      case Search:
        if (mem.class === CLASS_Forager) return foragerSearch();
        break;
      case CW:
        if (mem.class === CLASS_Forager) return foragerCW();
        break;
      case Deploy:
        return deploy();
      case CCW:
        if (mem.class === CLASS_Forager) return foragerCCW();
        break;
      case Recruit:
        if (mem.class === CLASS_Queen) return queenRecruit();
        break;
      case Pause:
        if (mem.class === CLASS_Queen) return queenPause();
        break;
      case NONE:
        if (mem.class === CLASS_Antsy) {
          mem.class = CLASS_Forager;
          mem.state = Init;
          return redispatch();
        }
        break;
    }
    return 0;
  }

  return mainLogic();
}