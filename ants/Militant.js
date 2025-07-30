function Militant(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        class_state: 0,
        x: 0,
        y: 0,
        x1: 0,
        y1: 0,
        quadrant: 0,
        radius: 0,
        leg: 0,
        pos: 0,
        cycles: 0,
        octant_food: 0,
        pos0: 0,
        food: 0
      },
      name: 'Militant',
      color: '#ff0000'
    };
  }

  // Constants
  var CLASS_Militant = 0, CLASS_GpsAnt = 16, CLASS_Forager = 32, CLASS_Guard = 48;
  var CLASS_Scout = 64, CLASS_Messenger = 80, CLASS_Transporter = 96;
  var CLASS_General = 112, CLASS_Recruiter = 128;

  var NONE = 0, Init = 1, CW = 2, Guard = 3, General = 4, Create = 5;
  var Source = 6, Search = 7, Patrol = 8, Return = 9, Fetch = 10;
  var CCW = 11, Recruit = 12, Deploy = 13;

  var center = 0, east = 1, south = 2, west = 3, north = 4;
  var ne = 0, nw = 1, sw = 2, se = 3;
  var en = 4, wn = 5, ws = 6, es = 7;

  var MAX_POS = 127;
  var MAX_SUM = 196;
  var MaxSquareAnts = 100;
  var NewBaseAnts = 25;
  var NewBaseFood = 50;

  var route = [
    [north, east, south, west],  // ne
    [west, north, east, south],  // nw
    [south, west, north, east],  // sw
    [east, south, west, north]   // se
  ];

  var octants = [
    [ne, ne, en, en], // ne
    [wn, wn, nw, nw], // nw
    [sw, sw, ws, ws], // sw
    [es, es, se, se]  // se
  ];

  var returnRoute = [
    [west, south], [south, east], [east, north], [north, west],
    [west, south], [south, east], [east, north], [north, west]
  ];

  var DX = [0, 1, 0, -1, 0];
  var DY = [0, 0, -1, 0, 1];

  var mem = antInfo.brains[0];

  // Helper functions
  function abs(x) {
    return x >= 0 ? x : -x;
  }

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
    var n = 0;
    // Use the random property instead of stuffing array
    // The random property contains a large random number that we can use directly
    n += mem.random;
    for (var i = 1; i < 5; i++) {
      n += squareData[i].numFood + squareData[i].numAnts;
    }
    return n % num;
  }

  function kill(dir) {
    for (var i = 1; i < 5; i++) {
      if (squareData[i].team && squareData[i].team !== squareData[0].team) return i;
    }
    return dir;
  }

  function findFood() {
    for (var i = 1; i < 5; i++) {
      if (squareData[i].numAnts < squareData[i].numFood) return i;
    }
    return 0;
  }

  function findBase() {
    for (var i = 1; i < 5; i++) {
      if (squareData[i].base) return i;
    }
    return 0;
  }

  function hasAnt(c, s) {
    for (var i = 0; i < antInfo.brains.length; i++) {
      var brain = antInfo.brains[i];
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
    if (squareData[dir] && squareData[dir].numAnts === MaxSquareAnts && !squareData[dir].team) {
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
    var dx = x0 - mem.x;
    var dy = y0 - mem.y;
    mem.x += dx;
    mem.y += dy;
    mem.x1 += dx;
    mem.y1 += dy;
  }

  function moveTo(tx, ty) {
    var dx = tx - mem.x;
    var dy = ty - mem.y;
    var dir = 0;
    var killDir = kill(0);
    
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

  // Forager States
  function foragerInit() {
    var dx = rnd(32);
    var dy = rnd(32) - dx;
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

  function foragerCW() {
    return foragerSearchPattern(222, -128, 222);
  }

  function foragerCCW() {
    return foragerSearchPattern(222, 128, 222);
  }

  function foragerSearchPattern(cos, sin, skrue) {
    var knowledge = foragerLearn();
    
    if (abs(mem.x) > 1 || abs(mem.y) > 1) {
      // Food here?
      if (squareData[0].numFood) {
        mem.x1 = mem.x;
        mem.y1 = mem.y;
        setState(Return);
        return redispatch();
      }
      
      // Food in neighboring field?
      for (var i = 1; i < 5; i++) {
        if (squareData[i].numFood > squareData[i].numAnts) {
          return gps(kill(i));
        }
      }
    }
    
    // If target reached, go somewhere else
    if (atTarget()) { 
      setTarget(
        ((mem.x1 * cos - mem.y1 * sin) / skrue | 0) + rnd(15) - 7, 
        ((mem.y1 * cos + mem.x1 * sin) / skrue | 0) + rnd(15) - 7
      );
    } else {
      if (knowledge) {
        setState(Source);
        return redispatch();
      }
    }
    return move();
  }

  function foragerLearn() {
    if (squareData[0].numAnts === 1) return 0;
    
    for (var i = 1; i < antInfo.brains.length; i++) {
      var otherBrain = antInfo.brains[i];
      if ((otherBrain.class_state & 0xf0) === getClass() && 
          (otherBrain.class_state & 0x0f) !== Deploy) {
        setHome(otherBrain.x, otherBrain.y);
        
        // Update other ant's position
        var dx = mem.x - otherBrain.x;
        var dy = mem.y - otherBrain.y;
        otherBrain.x += dx;
        otherBrain.y += dy;
        otherBrain.x1 += dx;
        otherBrain.y1 += dy;
        
        if ((otherBrain.class_state & 0x0f) === Return || 
            (otherBrain.class_state & 0x0f) === Source) {
          mem.x1 = otherBrain.x1;
          mem.y1 = otherBrain.y1;
          if (atTarget()) return 0;
          return (mem.x1 !== 0 && mem.y1 !== 0) ? 1 : 0;
        }
      }
    }
    return 0;
  }

  function foragerTeach() {
    if (squareData[0].numAnts === 1) return;
    
    for (var i = 1; i < antInfo.brains.length; i++) {
      var otherBrain = antInfo.brains[i];
      if ((otherBrain.class_state & 0xf0) === getClass() && 
          (otherBrain.class_state & 0x0f) !== Deploy) {
        setHome(otherBrain.x, otherBrain.y);
        
        // Update other ant's position  
        var dx = mem.x - otherBrain.x;
        var dy = mem.y - otherBrain.y;
        otherBrain.x += dx;
        otherBrain.y += dy;
        otherBrain.x1 += dx;
        otherBrain.y1 += dy;
        
        if ((otherBrain.class_state & 0x0f) === Search || 
            (otherBrain.class_state & 0x0f) === Init) {
          otherBrain.x1 = mem.x1;
          otherBrain.y1 = mem.y1;
          otherBrain.class_state = (otherBrain.class_state & 0xf0) | Source;
        }
      }
    }
  }

  function foragerSource() {
    if (abs(mem.x) + abs(mem.y) > 1) {
      // Food in neighboring field?
      for (var i = 1; i < 5; i++) {
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
    
    foragerTeach();
    return move();
  }

  function foragerReturn() {
    if (atHome()) {
      var killDir = kill(0);
      if (killDir) {
        setClass(CLASS_Guard);
        setState(Guard);
        return redispatch();
      }
      if (squareData[0].numAnts === 1) return 0;
      if (squareData[0].numFood >= NewBaseFood) return 16;
    } else {
      if (squareData[0].numFood) {
        foragerTeach();
        return 8 + moveTo(0, 0);
      }
    }

    foragerTeach();
    setState(Source);
    return redispatch();
  }

  // Scout States
  function scoutInit() {
    var minDist = 0xffff;
    var minI = 0;
    
    // Look for recruiter in need of transporters
    for (var i = 0; i < antInfo.brains.length; i++) {
      var brain = antInfo.brains[i];
      if ((brain.class_state & 0xf0) === CLASS_Recruiter) {
        var d = abs(brain.x) + abs(brain.y);
        if (d < minDist) {
          minI = i;
          minDist = d;
        }
      }
    }
    
    if (minI !== 0) {
      var recruiter = antInfo.brains[minI];
      if (recruiter.food) {
        recruiter.food--;
        mem.x1 = recruiter.x;
        mem.y1 = recruiter.y;
        mem.x = 0;
        mem.y = 0;
        setClass(CLASS_Forager);
        setState(Source);
        return redispatch();
      }
    }

    // Check for general
    var generalIdx = hasAnt(CLASS_General, General);
    if (!generalIdx) {
      setClass(CLASS_General);
      setState(Init);
      return redispatch();
    }

    var general = antInfo.brains[generalIdx];
    
    // Too many cycles? Become forager
    if (general.cycles > 5) {
      mem.x = 0;
      mem.y = 0;
      mem.x1 = 0;
      mem.y1 = 0;
      setClass(CLASS_Forager);
      setState(Init);
      return redispatch();
    }
    
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
    // Enemy detection
    var enemyDir = kill(0);
    if (enemyDir) {
      setClass(CLASS_Guard);
      setState(Init);
      return redispatch();
    }

    // Home?
    if (mem.leg >= 4) {
      setState(Init);
      return redispatch();
    }

    // Found food?
    if (mem.leg !== 0 && mem.leg !== 3 && findFood() !== 0) {
      setClass(CLASS_Messenger);
      setState(Init);
      return redispatch();
    }

    // End of leg?
    if (mem.pos === mem.radius) {
      mem.leg++;
      mem.pos = 0;
      setState(Patrol);
      return redispatch();
    }

    mem.pos++;
    return route[mem.quadrant][mem.leg];
  }

  function scoutCreate() {
    setState(Init);
    return redispatch();
  }

  // Messenger States
  function messengerInit() {
    var f = findFood();
    var numFood = squareData[f] ? squareData[f].numFood : 0;
    if (numFood > 63) numFood = 63;
    numFood <<= 3;
    
    mem.octant_food = octants[mem.quadrant][mem.leg] | numFood;
    mem.pos0 = mem.pos;
    if (mem.leg === 1) {
      mem.pos = mem.pos;
    } else {
      mem.pos = mem.radius;
    }
    
    setState(Return);
    return f;
  }

  function messengerReturn() {
    var base = findBase();
    
    if (base) {
      setClass(CLASS_Recruiter);
      setState(Init);
      return redispatch();
    }
    
    if (mem.pos !== 0) {
      mem.pos--;
      return 8 + returnRoute[mem.octant_food & 0x07][0];
    } else {
      return 8 + returnRoute[mem.octant_food & 0x07][1];
    }
  }

  // Recruiter States
  function recruiterInit() {
    var iy = 0, ix = 0;
    var octant = mem.octant_food & 0x07;
    
    mem.food = (mem.octant_food & (0xFF ^0x07)) >> 4;
    
    // Calculate position based on octant
    switch (octant) {
      case en:
        iy = mem.radius - mem.pos0; break;
      case ne:
        iy = mem.radius; break;
      case nw:
        iy = mem.radius; break;
      case wn:
        iy = mem.pos0; break;
      case ws:
        iy = mem.pos0 - mem.radius; break;
      case sw:
        iy = -mem.radius; break;
      case se:
        iy = -mem.radius; break;
      case es:
        iy = -mem.pos0; break;
    }
    
    mem.y = iy;
    
    switch (octant) {
      case en:
        ix = mem.radius; break;
      case ne:
        ix = mem.pos0; break;
      case nw:
        ix = mem.pos0 - mem.radius; break;
      case wn:
        ix = -mem.radius; break;
      case ws:
        ix = -mem.radius; break;
      case sw:
        ix = -mem.pos0; break;
      case se:
        ix = mem.radius - mem.pos0; break;
      case es:
        ix = mem.radius; break;
    }
    
    mem.x = ix;
    
    setState(Recruit);
    setClass(CLASS_Recruiter);
    return 8 + findBase();
  }

  function recruiterRecruit() {
    // Source empty?
    if (mem.food === 0) {
      setClass(CLASS_Scout);
      setState(Init);
      return redispatch();
    }
    
    // Source already known?
    for (var i = 1; i < antInfo.brains.length; i++) {
      var brain = antInfo.brains[i];
      if ((brain.class_state & 0xf0) === CLASS_Recruiter && 
          brain.x === mem.x && brain.y === mem.y) {
        setClass(CLASS_Scout);
        setState(Init);
        return redispatch();
      }
    }
    
    return 0;
  }

  // General States
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

  // Guard States
  function guardInit() {
    setState(Guard);
    return redispatch();
  }

  function guardGuard() {
    return kill(0);
  }

  // Transporter States  
  function transporterFetch() {
    if (atTarget()) {
      var foodDir = findFood();
      setState(Return);
      return gps(foodDir);
    }
    
    return move();
  }

  function transporterReturn() {
    if (atHome()) {
      if (squareData[0].base) {
        setClass(CLASS_Scout);
        setState(Init);
        return redispatch();
      }
      var killDir = kill(0);
      if (killDir) {
        setClass(CLASS_Guard);
        setState(Init);
        return redispatch();
      }
      if (squareData[0].numAnts > (NewBaseAnts + 5) && squareData[0].numFood < NewBaseFood) {
        setClass(CLASS_Scout);
        setState(Init);
        return redispatch();
      }
      return 16;
    }
    
    return 8 + home();
  }

  // Main state machine
  function militant() {
    var currentClass = getClass();
    var currentState = getState();

    switch (currentState) {
      case Init:
        switch (currentClass) {
          case CLASS_Forager: return foragerInit();
          case CLASS_Scout: return scoutInit();
          case CLASS_Guard: return guardInit();
          case CLASS_General: return generalInit();
          case CLASS_Messenger: return messengerInit();
          case CLASS_Recruiter: return recruiterInit();
          default: return 0;
        }

      case Search:
        if (currentClass === CLASS_Forager) return foragerSearch();
        break;

      case CW:
        if (currentClass === CLASS_Forager) return foragerCW();
        break;

      case CCW:
        if (currentClass === CLASS_Forager) return foragerCCW();
        break;

      case Source:
        if (currentClass === CLASS_Forager) return foragerSource();
        break;

      case Return:
        if (currentClass === CLASS_Forager) return foragerReturn();
        if (currentClass === CLASS_Messenger) return messengerReturn();
        if (currentClass === CLASS_Transporter) return transporterReturn();
        break;

      case Patrol:
        if (currentClass === CLASS_Scout) return scoutPatrol();
        break;

      case Create:
        if (currentClass === CLASS_Scout) return scoutCreate();
        break;

      case Recruit:
        if (currentClass === CLASS_Recruiter) return recruiterRecruit();
        break;

      case Guard:
        if (currentClass === CLASS_Guard) return guardGuard();
        break;

      case General:
        if (currentClass === CLASS_General) return generalGeneral();
        break;

      case Fetch:
        if (currentClass === CLASS_Transporter) return transporterFetch();
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