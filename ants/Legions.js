function Legions(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        x: 0,
        y: 0,
        z: 0,
        w: 0,
        v: 0
      },
      name: 'Legions',
      color: '#393EF0' // Blue color from C implementation
    };
  }

  // Helper functions
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  const myBrain = antInfo.brains[0];

  // Helper functions from C code
  function lfc(felt) {
    if (felt[0].numFood) return 0;
    if (felt[1].numFood && felt[1].numAnts <= felt[1].numFood) return 1;
    if (felt[2].numFood && felt[2].numAnts <= felt[2].numFood) return 2;
    if (felt[3].numFood && felt[3].numAnts <= felt[3].numFood) return 3;
    if (felt[4].numFood && felt[4].numAnts <= felt[4].numFood) return 4;
    return 5;
  }

  function lwc(felt) {
    if (felt[1].team) return 1;
    if (felt[2].team) return 2;
    if (felt[3].team) return 3;
    if (felt[4].team) return 4;
    return 0;
  }

  function lnpt(mem, direction) {
    switch (direction) {
      case 1: mem.x++; break;
      case 2: mem.y--; break;
      case 3: mem.x--; break;
      case 4: mem.y++; break;
    }
    return direction;
  }

  function lds1(mem) {
    if (mem.v < 1) {
      mem.v = 4;
    }
    if (mem.z > mem.w) {
      mem.v--;
      mem.w = mem.w + 20;
      mem.z = 1;
    }
    if (mem.v === 0) mem.v = 4;
    mem.z++;
    return mem.v;
  }

  function lds2(mem) {
    if (mem.v < 10) {
      mem.v = 10;
    }
    if (mem.z > mem.w) {
      mem.v++;
      mem.w = mem.w + 17;
      mem.z = 1;
    }
    if (mem.v > 13) {
      mem.z++;
      mem.v = 9;
      return 0;
    }
    mem.z++;
    return mem.v - 9;
  }

  function lgtnp(mem) {
    if (mem.x < mem.z) return 1;
    if (mem.x > mem.z) return 3;
    if (mem.y < mem.w) return 4;
    if (mem.y > mem.w) return 2;
  }

  function lgtnipo(mem) {
    if (mem.z > 0 && mem.w > 0) {
      if (mem.y < mem.w) return 4;
      if (mem.x < mem.z) return 1;
    }
    if (mem.z > 0 && mem.w < 0) {
      if (mem.x < mem.z) return 1;
      if (mem.y > mem.w) return 2;
    }
    if (mem.z < 0 && mem.w > 0) {
      if (mem.x > mem.z) return 3;
      if (mem.y < mem.w) return 4;
    }
    if (mem.z < 0 && mem.w < 0) {
      if (mem.y > mem.w) return 2;
      if (mem.x > mem.z) return 3;
    }
  }

  function lgtb(mem) {
    if (abs(mem.x) > abs(mem.y)) {
      if (mem.x < 0) return 1;
      else return 3;
    }
    if (mem.y < 0) return 4;
    else return 2;
  }

  function lsu(mem) {
    const d = abs(mem.z) % 3;
    if (mem.y >= 0 && mem.x >= 0) {
      if (d === 0) return 4;
      else if (d === 1) return 1;
      else {
        if (mem.w === 0) {
          mem.w = 1;
          return 4;
        } else {
          mem.w = 0;
          return 1;
        }
      }
    } else if (mem.y < 1 && mem.x >= 0) {
      if (d === 0) return 2;
      else if (d === 1) return 1;
      else {
        if (mem.w === 0) {
          mem.w = 1;
          return 1;
        } else {
          mem.w = 0;
          return 2;
        }
      }
    } else if (mem.y >= 0 && mem.x <= 1) {
      if (d === 0) return 3;
      else if (d === 1) return 4;
      else {
        if (mem.w === 0) {
          mem.w = 1;
          return 3;
        } else {
          mem.w = 0;
          return 4;
        }
      }
    } else if (mem.y <= 1 && mem.x <= 1) {
      if (d === 0) return 2;
      else if (d === 1) return 3;
      else {
        if (mem.w === 0) {
          mem.w = 1;
          return 2;
        } else {
          mem.w = 0;
          return 3;
        }
      }
    }
  }

  // Main logic - condensed version of the complex state machine
  let a;

  // Handle base logic
  if (squareData[0].base === 1) {
    if (myBrain.v !== 255) {
      // Look for scout ant (v=255) to coordinate with
      for (a = 1; a < squareData[0].numAnts; a++) {
        if (antInfo.brains[a].v === 255) {
          if (myBrain.v === 5 || myBrain.v === 14) {
            antInfo.brains[a].x = myBrain.z;
            antInfo.brains[a].y = myBrain.w;
            if (myBrain.v === 14) antInfo.brains[a].z = 6;
            if (myBrain.v === 5) antInfo.brains[a].z = 15;
          } else if (myBrain.v === 0 && (antInfo.brains[a].x !== 0 || antInfo.brains[a].y !== 0)) {
            myBrain.z = antInfo.brains[a].x;
            myBrain.w = antInfo.brains[a].y;
            myBrain.x = myBrain.y = 0;
            myBrain.v = antInfo.brains[a].z;
          }
          a = 1024; // Break
        }
      }
      
      if (a !== 1025) {
        // Initialize as scout
        myBrain.x = myBrain.y = myBrain.z = myBrain.w = 0;
        myBrain.v = 255;
        
        // Set up other ants with exploration patterns
        for (a = 1; a < squareData[0].numAnts; a++) {
          antInfo.brains[a].v = 30;
          antInfo.brains[a].x = antInfo.brains[a].y = 0;
          
          // Set exploration targets based on ant index
          const factor = (a + 2) * 3;
          if ((a & 3) === 0) {
            antInfo.brains[a].z = antInfo.brains[a].w = factor;
          } else if ((a & 3) === 1) {
            antInfo.brains[a].z = antInfo.brains[a].w = -factor;
          } else if ((a & 3) === 2) {
            antInfo.brains[a].w = factor;
            antInfo.brains[a].z = -factor;
          } else {
            antInfo.brains[a].w = -factor;
            antInfo.brains[a].z = factor;
          }
        }
        return 16; // Build base
      }
    }
  }

  // Position bounds checking
  if (myBrain.x > 111 || myBrain.x < -111) myBrain.x = 0;
  if (myBrain.y > 111 || myBrain.y < -111) myBrain.y = 0;

  // Check for enemies
  a = lwc(squareData);
  if (a !== 0) {
    myBrain.w = 12;
    myBrain.z = 0;
    myBrain.v = 17;
    return lnpt(myBrain, a);
  }

  // Explorer ant (v=30)
  if (myBrain.v === 30) {
    a = lfc(squareData);
    if (a !== 5) {
      if (myBrain.z % 6 === 0) myBrain.v = 1;
      else myBrain.v = 10;
    } else {
      if (myBrain.y !== myBrain.w || myBrain.x !== myBrain.z) {
        return lnpt(myBrain, lgtnipo(myBrain));
      }
      // Reached exploration target, switch to patrol
      myBrain.z = 0;
      if (myBrain.x < 0 && myBrain.y < 0) myBrain.w = 3;
      else if (myBrain.x < 0 && myBrain.y > 0) myBrain.w = 4;
      else if (myBrain.x > 0 && myBrain.y < 0) myBrain.w = 2;
      else myBrain.w = 1;
      myBrain.v = 31;
    }
  }

  // Food collection logic
  if (squareData[0].numFood > 0 && squareData[0].numAnts <= squareData[0].numFood && (myBrain.x !== 0 || myBrain.y !== 0)) {
    myBrain.z = myBrain.x;
    myBrain.w = myBrain.y;
    if (squareData[0].numFood === 1) myBrain.z = myBrain.w = 0;
    
    // Set state based on current state
    if (myBrain.v < 9) {
      myBrain.v = 5;
      // Coordinate with other ants
      for (a = 1; a < squareData[0].numAnts; a++) {
        if ((antInfo.brains[a].v < 5) || ((antInfo.brains[a].v < 14 && antInfo.brains[a].v > 9))) {
          antInfo.brains[a].x = myBrain.x;
          antInfo.brains[a].y = myBrain.y;
          antInfo.brains[a].z = myBrain.z;
          antInfo.brains[a].w = myBrain.w;
          antInfo.brains[a].v = 15;
        }
      }
    } else {
      myBrain.v = 14;
      // Coordinate with other ants
      for (a = 1; a < squareData[0].numAnts; a++) {
        if (antInfo.brains[a].v < 14 && antInfo.brains[a].v > 9) {
          antInfo.brains[a].x = myBrain.x;
          antInfo.brains[a].y = myBrain.y;
          antInfo.brains[a].z = myBrain.z;
          antInfo.brains[a].w = myBrain.w;
          antInfo.brains[a].v = 6;
        }
      }
    }
    return lnpt(myBrain, lgtb(myBrain)) + 8;
  }

  // Look for adjacent food
  a = lfc(squareData);
  if (a !== 5 && a !== 0) return lnpt(myBrain, a);

  // Build base if enough food
  if (squareData[0].numFood > 49) return 16;

  // Default movement patterns based on state
  if (myBrain.v < 9) {
    return lnpt(myBrain, lds1(myBrain));
  } else {
    return lnpt(myBrain, lds2(myBrain));
  }
}