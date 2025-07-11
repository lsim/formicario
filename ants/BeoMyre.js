function BeoMyre(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        id: 1,
        px: 0,
        py: 0,
        mx: 0,
        my: 0,
        state: 0, // 0=INIT, 1=GETFOOD, 2=RETURNFOOD, 3=LURK
        data: 0,
        rnd: 0
      },
      name: 'BeoMyre',
      color: '#228B22', // Forest green color
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

  // State constants
  const stINIT = 0;
  const stGETFOOD = 1;
  const stRETURNFOOD = 2;
  const stLURK = 3;

  // Direction offsets (extended array like C code)
  const RX = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0];
  const RY = [0, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1];

  const myBrain = antInfo.brains[0];
  let dir = STOP;

  // Helper functions
  function goround(m) {
    let xx, yy;
    xx = -m.py + ((m.rnd *= 37) / 2) | 0 + (((m.id << 24 >> 24)) / 8) | 0; // Simulate signed char casting
    yy = m.px + ((((m.id / 8) | 0) << 24 >> 24) / 8) | 0 + (m.py / 4) | 0; // Simulate signed char casting
    
    if (abs(xx) > abs(yy)) {
      if (xx > 0) return EAST;
      else return WEST;
    } else {
      if (yy > 0) return NORTH;
      else return SOUTH;
    }
  }

  function gohome(m) {
    if (abs(m.px) > abs(m.py)) {
      if (m.px > 0) return WEST;
      else return EAST;
    } else {
      if (m.py > 0) return SOUTH;
      else return NORTH;
    }
  }

  function gotom(m) {
    let xx, yy;
    xx = m.px - m.mx + ((m.rnd += 67) / 64) | 0;
    yy = m.py - m.my;
    
    if (abs(xx) > abs(yy)) {
      if (m.px > m.mx) return WEST;
      else return EAST;
    } else {
      if (m.py > m.my) return SOUTH;
      else return NORTH;
    }
  }

  // Main logic
  let retest = true;
  while (retest) {
    retest = false;
    
    switch (myBrain.state) {
      case stINIT: {
        myBrain.state = stGETFOOD;
        myBrain.rnd = myBrain.id;
        retest = true; // fallthrough
        break;
      }
      
      case stGETFOOD: {
        // Look for food here
        if (squareData[0].numFood) {
          if (squareData[0].numFood > 1) {
            myBrain.mx = myBrain.px;
            myBrain.my = myBrain.py;
          }
          myBrain.state = stRETURNFOOD;
          retest = true;
          break;
        }
        
        // No food here...
        if (myBrain.mx || myBrain.my) {
          if (myBrain.px === myBrain.mx && myBrain.py === myBrain.my) {
            myBrain.mx = 0;
            myBrain.my = 0; // No food here after all
            dir = ((myBrain.rnd + myBrain.id) & 3) + 1;
          }
          dir = gotom(myBrain);
          
          // Share information with other ants
          for (let i = 1; i < antInfo.brains.length; i += 2) {
            const mp = antInfo.brains[i];
            if (mp.state === stGETFOOD && !(mp.mx || mp.my)) {
              mp.mx = myBrain.mx;
              mp.my = myBrain.my;
            }
          }
        } else {
          // Look for food in adjacent squares
          for (let i = 1; i <= 4; i++) {
            if (squareData[i].numFood > squareData[i].numAnts) {
              myBrain.mx = myBrain.px;
              myBrain.my = myBrain.py;
              dir = i;
              myBrain.state = stRETURNFOOD;
              break;
            }
          }
          if (myBrain.state !== stRETURNFOOD) {
            dir = goround(myBrain);
          }
        }
        break;
      }
      
      case stRETURNFOOD: {
        if (!squareData[0].numFood) {
          myBrain.state = stGETFOOD;
          retest = true;
          break;
        }
        dir = gohome(myBrain) | CARRY;

        // Share information with other ants
        for (let i = 1; i < antInfo.brains.length; i += 2) {
          const mp = antInfo.brains[i];
          if (mp.state === stGETFOOD) {
            mp.mx = myBrain.mx;
            mp.my = myBrain.my;
          }
        }
        break;
      }
      
      case stLURK: {
        dir = STOP;
        myBrain.data--;
        
        if ((myBrain.data & 7) === 0) {
          dir = goround(myBrain);
        }
        break;
      }
    }
  }

  // Check for enemies
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team !== 0) {
      dir = i;
      myBrain.state = stLURK;
      myBrain.data = 255;
      break;
    }
  }

  // Update position
  myBrain.px += RX[dir];
  myBrain.py += RY[dir];
  
  return dir;
}