function Triumfant(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        state: 0,
        oct: 0,
        leg: 0,
        pos: 0,
        bit1: 0,
        rad: 0,
        bit2: 0,
        X: 0,
        Y: 0
      },
      name: 'Triumfant',
      color: '#90e090',
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  function sign(a) {
    return a < 0 ? -1 : 1;
  }

  function max(a, b) {
    return a > b ? a : b;
  }

  function min(a, b) {
    return a < b ? a : b;
  }

  function rnd(num) {
    let n = 0;
    const lastAnt = antInfo.brains[squareData[0].numAnts - 1];
    n += lastAnt.state + lastAnt.X + (lastAnt.Y << 8);
    for (let i = 1; i < 5; i++) {
      n += squareData[i].numFood + squareData[i].numAnts;
    }
    return n % num;
  }

  // Constants
  const none = 0, east = 1, south = 2, west = 3, north = 4;
  const ne = 0, nw = 1, sw = 2, se = 3;
  const en = 4, wn = 5, ws = 6, es = 7;
  const cw = 0, fwd = 1, ccw = 2, rev = 3;

  // States
  const Queen = 0, Build = 1, Return1 = 2, Fetch1 = 3, Search2 = 4, Return2 = 5, Fetch2 = 6, XXX = 7;
  const Init = 8, Guard = 9, Search1 = 10, Engineer = 11;

  const route = [
    [north, east, south, west],
    [north, west, south, east],
    [south, west, north, east],
    [south, east, north, west],
    [east, north, west, south],
    [west, north, east, south],
    [west, south, east, north],
    [east, south, west, north]
  ];

  const octants = [
    [ne, ne, en, en],
    [nw, nw, wn, wn],
    [sw, sw, ws, ws],
    [se, se, es, es],
    [en, en, ne, ne],
    [wn, wn, nw, nw],
    [ws, ws, sw, sw],
    [es, es, se, se]
  ];

  const returnRoute = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [south, west],
    [south, east],
    [north, east],
    [north, west]
  ];

  const DX = [0, 1, 0, -1, 0];
  const DY = [0, 0, -1, 0, 1];

  // Coordinate system constants
  const npos = 0x00, ppos = 0x01, nrad = 0x10, prad = 0x11;

  const octantXY = [
    [ppos, prad],
    [npos, prad],
    [npos, nrad],
    [ppos, nrad],
    [prad, ppos],
    [nrad, ppos],
    [nrad, npos],
    [prad, npos]
  ];

  const myBrain = antInfo.brains[0];

  function getState(brain) {
    if (brain.state < 7) return brain.state;
    return 8 + brain.bit2;
  }

  function setState(brain, state) {
    if (state < 7) {
      brain.state = state;
    } else {
      brain.state = 7;
      brain.bit2 = state - 8;
    }
  }

  function getNum(brain) {
    return (brain.leg << 3) + (brain.bit1 << 2) + brain.bit2;
  }

  function setNum(brain, num) {
    brain.leg = num >> 3;
    brain.bit1 = num >> 2;
    brain.bit2 = num;
  }

  function coorXY(m, r, p) {
    return ((m & 0x10) ? ((m & 0x01 ? 1 : -1) * r) : ((m & 0x01 ? 1 : -1) * p));
  }

  function coorX(o, r, p) {
    return coorXY(octantXY[o][0], r, p);
  }

  function coorY(o, r, p) {
    return coorXY(octantXY[o][1], r, p);
  }

  function getXY(oct, leg, rad, pos) {
    const o = octants[oct][leg];
    if (leg === 2) pos = rad - pos;
    
    return {
      x: coorX(o, rad, pos),
      y: coorY(o, rad, pos)
    };
  }

  function getOR(x, y) {
    let oct = 0;
    if (abs(x) > abs(y)) oct += 4;
    if (y < 0) oct += 2;
    if (sign(x) !== sign(y)) oct += 1;
    
    return {
      oct: oct,
      rad: (abs(x) > abs(y)) ? abs(x) : abs(y),
      pos: (oct < en) ? abs(x) : abs(y)
    };
  }

  function findAnt(state) {
    for (let i = 0; i < squareData[0].numAnts; i++) {
      if (getState(antInfo.brains[i]) === state) {
        return antInfo.brains[i];
      }
    }
    return null;
  }

  function findFood() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) {
        return i;
      }
    }
    return 0;
  }

  function findEnemy() {
    for (let i = 1; i < 5; i++) {
      if (squareData[i].team) {
        return i;
      }
    }
    return 0;
  }

  function triumfantBuild() {
    if (myBrain.X > 0) { myBrain.X--; return 8 + west; }
    if (myBrain.X < 0) { myBrain.X++; return 8 + east; }
    if (myBrain.Y > 0) { myBrain.Y--; return 8 + south; }
    if (myBrain.Y < 0) { myBrain.Y++; return 8 + north; }
    return 16;
  }

  function triumfantReturn1() {
    const q = findAnt(Queen);
    
    if (q) {
      if (!myBrain.pos) {
        if (getNum(myBrain)) {
          myBrain.pos = getNum(myBrain) * 2;
          setNum(myBrain, 0);
          return 0;
        } else {
          setState(myBrain, Init);
          return triumfant();
        }
      } else {
        for (let i = 1; i < squareData[0].numAnts; i++) {
          const brain = antInfo.brains[i];
          if (getState(brain) === Return1 && 
              brain.rad === myBrain.rad && 
              brain.oct === myBrain.oct && 
              getNum(brain) <= getNum(myBrain)) {
            setState(myBrain, Init);
            return triumfant();
          }
        }
        return 0;
      }
    } else {
      if (myBrain.pos === 127) {
        myBrain.pos = 0;
        return 8 + west;
      } else if (myBrain.pos) {
        myBrain.pos--;
        return 8 + returnRoute[myBrain.oct][0];
      }
      if (squareData[west].base) {
        myBrain.pos = 127;
        return 8 + north;
      } else {
        return 8 + returnRoute[myBrain.oct][1];
      }
    }
  }

  function triumfantFetch1() {
    if (myBrain.rad === 0) {
      setState(myBrain, Init);
      return triumfant();
    }
    
    if (myBrain.leg === 1 || myBrain.leg === 2) {
      const f = findFood();
      if (f) {
        let xy = getXY(myBrain.oct, myBrain.leg, myBrain.rad * 3, myBrain.pos);
        xy.x += DX[f];
        xy.y += DY[f];
        
        if (myBrain.bit1) {
          const B2 = {
            x: sign(xy.x) * 96,
            y: sign(xy.y) * 96
          };
          
          myBrain.X = 1 - B2.x + xy.x;
          myBrain.Y = 1 - B2.y + xy.y;
          setState(myBrain, Build);
        } else {
          const or = getOR(xy.x, xy.y);
          setState(myBrain, Return1);
          myBrain.oct = or.oct;
          myBrain.rad = ((or.rad + 1) / 3) | 0;
          myBrain.pos = or.pos;
          setNum(myBrain, 0);
        }
        return f;
      }
    }
    
    if (myBrain.leg === 2 && myBrain.pos === 0) {
      const xy = getXY(myBrain.oct, myBrain.leg, myBrain.rad * 3, myBrain.pos);
      const cwVal = !((myBrain.oct & 1) ^ ((myBrain.oct >> 2) & 1));
      if (cwVal) {
        myBrain.oct = route[myBrain.oct][myBrain.leg];
        myBrain.leg = 2 - cwVal * 2;
        myBrain.X = xy.x;
        myBrain.Y = xy.y;
        setState(myBrain, Search2);
        return triumfant();
      }
    }
    
    myBrain.pos++;
    if (myBrain.pos > 3 * myBrain.rad) {
      if (myBrain.leg === 3) {
        setState(myBrain, Init);
        return west;
      }
      myBrain.leg++;
      myBrain.pos = 1;
    }
    return route[myBrain.oct][myBrain.leg];
  }

  function triumfantSearch1() {
    if (myBrain.leg === 0) {
      for (let i = 1; i < squareData[0].numAnts; i++) {
        const r = antInfo.brains[i];
        if (getState(r) === Return1 && getNum(r)) {
          setState(myBrain, Fetch1);
          myBrain.rad = r.rad;
          myBrain.oct = r.oct;
          if (!myBrain.bit1) setNum(myBrain, 1);
          if (myBrain.pos & 1) setNum(r, getNum(r) - 1);
          return triumfant();
        }
      }
    } else if (myBrain.leg === 1 || myBrain.leg === 2) {
      const f = findFood();
      if (f) {
        let xy = getXY(myBrain.oct, myBrain.leg, myBrain.rad * 3, myBrain.pos);
        xy.x += DX[f];
        xy.y += DY[f];
        const or = getOR(xy.x, xy.y);
        setState(myBrain, Return1);
        myBrain.oct = or.oct;
        myBrain.rad = ((or.rad + 1) / 3) | 0;
        myBrain.pos = or.pos;
        setNum(myBrain, ((squareData[f].numFood - 1 - squareData[f].numAnts) / 2) | 0);
        return f;
      }
    }
    
    myBrain.pos++;
    if (myBrain.pos > 3 * myBrain.rad) {
      if (myBrain.leg === 3) {
        setState(myBrain, Init);
        return west;
      }
      myBrain.leg++;
      myBrain.pos = 1;
    }
    
    return route[myBrain.oct][myBrain.leg];
  }

  function triumfantSearch2() {
    let dir;
    
    const f = findFood();
    if (f) {
      myBrain.X += DX[f];
      myBrain.Y += DY[f];
      const or = getOR(myBrain.X, myBrain.Y);
      setState(myBrain, Return1);
      myBrain.oct = or.oct;
      myBrain.rad = ((or.rad + 1) / 3) | 0;
      myBrain.pos = or.pos;
      setNum(myBrain, ((squareData[f].numFood - 1 - squareData[f].numAnts) / 2) | 0);
      return f;
    }
    
    if (myBrain.X === 0 && (myBrain.Y - 1) % 3) {
      if (myBrain.Y > 0) {
        dir = north;
      } else {
        dir = south;
      }
    } else if (myBrain.Y === 0 && (myBrain.X + 1) % 3) {
      if (myBrain.X > 0) {
        dir = east;
      } else {
        dir = west;
      }
    } else {
      dir = myBrain.oct;
      if (abs(myBrain.X) === abs(myBrain.Y)) {
        dir = (dir + myBrain.leg) % 4 + 1;
        myBrain.oct = dir;
      } else if (squareData[dir].numAnts > 1) {
        const a = (dir + 2) % 4 + 1;
        const b = dir % 4 + 1;
        if (squareData[dir].numAnts > squareData[a].numAnts) dir = a;
        if (squareData[dir].numAnts > squareData[b].numAnts) dir = b;
      }
    }
    
    myBrain.X += DX[dir];
    myBrain.Y += DY[dir];
    
    if (abs(myBrain.X) === 127 || abs(myBrain.Y) === 127) {
      setState(myBrain, Guard);
      return triumfant();
    }
    
    return dir;
  }

  function triumfantEngineer() {
    if (myBrain.pos === 0) {
      myBrain.pos = 100;
      myBrain.oct += 1;
      myBrain.oct %= 4;
    }
    return 0;
  }

  function triumfantInit() {
    const q = findAnt(Queen);
    if (!q && squareData[south].base) {
      setState(myBrain, Queen);
      myBrain.rad = 1;
      myBrain.oct = 0;
      myBrain.pos = 0;
      setNum(myBrain, 0);
      return 0;
    } else if (!q) {
      setState(myBrain, Guard);
      return triumfant();
    }
    
    if (squareData[0].numFood) {
      return 8 + south;
    }
    
    if (!findAnt(Fetch1)) {
      setState(myBrain, Fetch1);
      myBrain.rad = 0;
      return 0;
    }
    
    let e = null;
    let r = null;
    myBrain.bit1 = 0;
    const food = [0, 0, 0, 0];
    
    for (let i = 1; i < squareData[0].numAnts; i++) {
      const j = antInfo.brains[i];
      if (getState(j) === Return1) {
        if (!j.pos && getNum(j)) {
          j.pos = getNum(j) * 2;
          setNum(j, 0);
        }
        if (j.pos) {
          food[j.oct & 3] += j.pos;
          if (!r || j.rad < r.rad) {
            r = j;
          }
        }
      } else if (getState(j) === Engineer) {
        e = j;
      }
    }
    
    if (r) {
      setState(myBrain, Fetch1);
      myBrain.rad = r.rad;
      myBrain.oct = r.oct;
      myBrain.leg = 0;
      myBrain.pos = 0;
      setNum(myBrain, 1);
      
      if (e) {
        if (e.pos > 0 && (r.oct & 3) === (e.oct & 3)) {
          myBrain.bit1 = 1;
          e.pos--;
        }
      } else if (getNum(q) >= 2) {
        myBrain.pos = 0;
        myBrain.oct = -1;
        setState(myBrain, Engineer);
        return triumfant();
      }
      
      r.pos--;
      
      if (getNum(q) < 2 && !q.pos) {
        q.rad = 1;
        q.oct = (getNum(q) & 1) ? 4 : 0;
      }
    } else {
      setState(myBrain, Search1);
      myBrain.rad = q.rad;
      myBrain.oct = q.oct;
      myBrain.pos = 0;
      myBrain.leg = 0;
      
      if (e && e.pos > 0 && (myBrain.oct & 3) === (e.oct & 3)) {
        myBrain.bit1 = 1;
      }
      
      q.pos = 0;
      if (getNum(q) & 1) {
        if (q.oct === 7) {
          q.rad++;
          q.oct = 4;
        } else {
          q.oct++;
        }
      } else {
        if (q.oct === 3) {
          q.rad++;
          q.oct = 0;
        } else {
          q.oct++;
        }
      }
      if (q.rad > 42) {
        setNum(q, getNum(q) + 1);
        q.oct = (getNum(q) & 1) ? 4 : 0;
        q.rad = 1;
      }
    }
    
    return east;
  }

  function triumfantQueen() {
    return 0;
  }

  function triumfantGuard() {
    if (findFood()) return 0;
    myBrain.pos++;
    myBrain.rad += squareData[0].numAnts - 1;
    if (squareData[0].numFood || squareData[0].numAnts > 1 || !myBrain.pos) {
      return (myBrain.rad & 3) + 1;
    }
    return 0;
  }

  function triumfant() {
    // Kill enemies first
    const kill = findEnemy();
    if (kill) {
      setState(myBrain, Guard);
      return kill;
    }
    
    if (squareData[0].base) {
      if (squareData[0].numAnts === 1) {
        return 0;
      }
      setState(myBrain, Init);
      return north;
    }
    
    const state = getState(myBrain);
    switch (state) {
      case Queen: return triumfantQueen();
      case Search1: return triumfantSearch1();
      case Return1: return triumfantReturn1();
      case Fetch1: return triumfantFetch1();
      case Search2: return triumfantSearch2();
      case Init: return triumfantInit();
      case Guard: return triumfantGuard();
      case Build: return triumfantBuild();
      case Engineer: return triumfantEngineer();
      default: return 0;
    }
  }

  return triumfant();
}