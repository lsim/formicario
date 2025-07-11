function Militant(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        class_state: 0, // Combined class and state
        x: 0,
        y: 0,
        x1: 0, // Target coordinates
        y1: 0,
        quadrant: 0,
        radius: 0,
        leg: 0,
        pos: 0,
        cycles: 0,
        octant_food: 0,
        pos0: 0,
        food: 0,
        stuffing: [0, 0, 0, 0] // For random generation
      },
      name: 'Militant',
      color: '#ff0000',
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const CLASS_Militant = 0, CLASS_GpsAnt = 16, CLASS_Forager = 32, CLASS_Guard = 48;
  const CLASS_Scout = 64, CLASS_Messenger = 80, CLASS_Transporter = 96;
  const CLASS_General = 112, CLASS_Recruiter = 128;

  const NONE = 0, Init = 1, CW = 2, Guard = 3, General = 4, Create = 5;
  const Source = 6, Search = 7, Patrol = 8, Return = 9, Fetch = 10;
  const CCW = 11, Recruit = 12, Deploy = 13;

  const center = 0, east = 1, south = 2, west = 3, north = 4;
  const ne = 0, nw = 1, sw = 2, se = 3;
  const en = 4, wn = 5, ws = 6, es = 7;

  const MAX_POS = 127;
  const MAX_SUM = 196;
  const MaxSquareAnts = 200;
  const NewBaseAnts = 10;
  const NewBaseFood = 20;
  const spread = 96;

  const route = [
    [north, east, south, west],  // ne
    [west, north, east, south],  // nw
    [south, west, north, east],  // sw
    [east, south, west, north]   // se
  ];

  const octants = [
    [ne, ne, en, en], // ne
    [wn, wn, nw, nw], // nw
    [sw, sw, ws, ws], // sw
    [es, es, se, se]  // se
  ];

  const returnRoute = [
    [west, south], [south, east], [east, north], [north, west],
    [west, south], [south, east], [east, north], [north, west]
  ];

  const DX = [0, 1, 0, -1, 0];
  const DY = [0, 0, -1, 0, 1];

  const mem = antInfo.brains[0];

  function getClass() {
    return mem.class_state & 0xf0;
  }

  function getState() {
    return mem.class_state & 0x0f;
  }

  function setClass(c) {
    mem.class_state = c | (mem.class_state & 0x0f);
  }

  function setState(s) {
    mem.class_state = (mem.class_state & 0xf0) | s;
  }

  function rnd(num) {
    let n = 0;
    n += mem.stuffing[0] + (mem.stuffing[1] << 8) + mem.stuffing[2] + (mem.stuffing[3] << 8);
    for (let i = 1; i < 5; i++) {
      n += squareData[i].numFood + squareData[i].numAnts;
    }
    return n % num;
  }

  function kill(dir) {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].team) return i;
    }
    return dir;
  }

  function findFood() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numAnts < squareData[i].numFood) return i;
    }
    return 0;
  }

  function findBase() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].base) return i;
    }
    return 0;
  }

  function hasAnt(c, s) {
    for (let i = 1; i < squareData[0].numAnts; i++) {
      const brain = antInfo.brains[i];
      if ((brain.class_state & 0xf0) === c && (brain.class_state & 0x0f) === s) {
        return i;
      }
    }
    return 0;
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

  function gps(dir) {
    if (squareData[dir].numAnts === MaxSquareAnts && !squareData[dir].team) {
      return 0;
    }

    mem.x += DX[dir];
    mem.y += DY[dir];

    if (abs(mem.x) + abs(mem.y) === MAX_SUM || abs(mem.x) === MAX_POS || abs(mem.y) === MAX_POS) {
      posOverflow();
    }
    return dir;
  }

  function posOverflow() {
    if (mem.x === MAX_POS) {
      setHome(32, mem.y);
    } else if (mem.x === -MAX_POS) {
      setHome(-32, mem.y);
    } else if (mem.y === MAX_POS) {
      setHome(mem.x, 32);
    } else if (mem.y === -MAX_POS) {
      setHome(mem.x, -32);
    }
  }

  function setHome(x0, y0) {
    if (abs(x0) + abs(y0) < abs(mem.x) + abs(mem.y)) {
      forceHome(x0, y0);
    }
  }

  function forceHome(x0, y0) {
    const dx = x0 - mem.x;
    const dy = y0 - mem.y;
    mem.x += dx;
    mem.y += dy;
    mem.x1 += dx;
    mem.y1 += dy;
  }

  function moveTo(tx, ty) {
    const dx = tx - mem.x;
    const dy = ty - mem.y;
    let dir = 0;
    const killDir = kill(0);
    if (killDir) {
      setClass(CLASS_Guard);
      setState(Init);
      return redispatch();
    }

    if (dx && dy) {
      if (rnd(abs(dx) + abs(dy)) >= abs(dx)) {
        dx = 0;
      } else {
        dy = 0;
      }
    }
    if (dx && !dy) dir = dx < 0 ? west : east;
    if (dy && !dx) dir = dy < 0 ? south : north;
    return gps(dir);
  }

  function home() {
    return moveTo(0, 0);
  }

  function move() {
    return moveTo(mem.x1, mem.y1);
  }

  function redispatch() {
    return militant();
  }

  // State implementations
  function scoutInit() {
    const generalIndex = hasAnt(CLASS_General, General);
    if (!generalIndex) {
      setClass(CLASS_General);
      setState(Init);
      return redispatch();
    }

    const general = antInfo.brains[generalIndex];
    mem.quadrant = general.quadrant;
    mem.radius = general.radius;
    mem.leg = 0;
    mem.pos = 0;

    // Update general
    general.quadrant++;
    if (general.quadrant === 4) {
      general.quadrant = 0;
      general.radius += 3;
      if (general.radius > 127) {
        general.cycles++;
        general.radius = 3;
      }
    }

    setState(Patrol);
    return redispatch();
  }

  function scoutPatrol() {
    // Check for enemies
    const enemyDir = kill(0);
    if (enemyDir) {
      setClass(CLASS_Guard);
      setState(Init);
      return redispatch();
    }

    // Check if we're home
    if (mem.leg >= 4) {
      setState(Init);
      return redispatch();
    }

    // Check for food
    if (mem.leg !== 0 && mem.leg !== 3 && findFood() !== 0) {
      setClass(CLASS_Messenger);
      setState(Init);
      return redispatch();
    }

    // Check if we're at end of leg
    if (mem.pos === mem.radius) {
      mem.leg++;
      mem.pos = 0;
      setState(Patrol);
      return redispatch();
    }

    // Move along
    mem.pos++;
    return route[mem.quadrant][mem.leg];
  }

  function foragerInit() {
    let dx = rnd(32);
    let dy = rnd(32) - dx;
    if (rnd(2)) dx = -dx;
    if (rnd(2)) dy = -dy;

    mem.x1 += dx;
    mem.y1 += dy;

    setState(Search);
    return redispatch();
  }

  function foragerSearch() {
    if (!rnd(3)) {
      setState(CW);
    } else {
      setState(CCW);
    }
    return redispatch();
  }

  function foragerSource() {
    if ((abs(mem.x) + abs(mem.y)) > 1) {
      // Check for food in neighboring fields
      for (let i = 1; i < 5; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          setState(Search);
          return gps(kill(i));
        }
      }
    }

    if (atTarget()) {
      if (squareData[0].numFood && !atHome()) {
        setState(Return);
        return redispatch();
      } else {
        setState(Init);
        return redispatch();
      }
    }

    return move();
  }

  function foragerReturn() {
    if (atHome()) {
      const killDir = kill(0);
      if (killDir) {
        setClass(CLASS_Guard);
        setState(Guard);
        return redispatch();
      }
      if (squareData[0].numAnts === 1) return 0;
      if (squareData[0].numFood >= NewBaseFood) return 16;
    } else {
      if (squareData[0].numFood) {
        return 8 + moveTo(0, 0);
      }
    }

    setState(Source);
    return redispatch();
  }

  function guardInit() {
    setState(Guard);
    return redispatch();
  }

  function guardGuard() {
    return kill(0);
  }

  function generalInit() {
    mem.quadrant = 0;
    mem.radius = 3;
    mem.cycles = 0;
    setState(General);
    return redispatch();
  }

  function generalGeneral() {
    return 0;
  }

  // Main state machine
  function militant() {
    const currentClass = getClass();
    const currentState = getState();

    switch (currentState) {
      case Init:
        switch (currentClass) {
          case CLASS_Scout: return scoutInit();
          case CLASS_Forager: return foragerInit();
          case CLASS_Guard: return guardInit();
          case CLASS_General: return generalInit();
          default: return 0;
        }

      case Patrol:
        if (currentClass === CLASS_Scout) return scoutPatrol();
        break;

      case Search:
        if (currentClass === CLASS_Forager) return foragerSearch();
        break;

      case Source:
        if (currentClass === CLASS_Forager) return foragerSource();
        break;

      case Return:
        if (currentClass === CLASS_Forager) return foragerReturn();
        break;

      case Guard:
        if (currentClass === CLASS_Guard) return guardGuard();
        break;

      case General:
        if (currentClass === CLASS_General) return generalGeneral();
        break;

      case Create:
        if (currentClass === CLASS_Scout) {
          setState(Init);
          return redispatch();
        }
        break;

      case NONE:
        if (currentClass === 0) {
          setClass(CLASS_Scout);
          setState(Create);
          return redispatch();
        }
        break;

      default:
        return 0;
    }

    return 0;
  }

  return militant();
}