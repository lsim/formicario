/*
 * Inkal - JavaScript translation from C implementation
 * by Steffen Dyhr-Nielsen (NOONTZ)
 * 
 * A complex ant system with many specialized roles and sophisticated navigation.
 * Uses navigation counters and role-based state machines for coordinated behavior.
 */
function Inkal(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        A: 0,    // X position / counter
        B: 0,    // Y position / counter  
        C: 0,    // Data storage / target X
        D: 0,    // Data storage / target Y
        E: 0,    // Extra data storage
        T: 0     // Type and navigation combined
      },
      name: 'Inkal',
      color: '#00ff55', // Green
    };
  }

  // Extract type and navigation from T field
  const memory = antInfo.brains[0];
  
  // Initialize A,B,C,D with random data if uninitialized (like C engine does)
  if (memory.A === 0 && memory.B === 0 && memory.C === 0 && memory.D === 0 && memory.T === 0) {
    const randomBytes = antInfo.random;
    memory.A = ((randomBytes) & 0xFF) - 128;        // Signed byte (-128 to 127)
    memory.B = ((randomBytes >> 8) & 0xFF) - 128;   // Signed byte  
    memory.C = ((randomBytes >> 16) & 0xFF) - 128;  // Signed byte
    memory.D = ((randomBytes >> 24) & 0xFF) - 128;  // Signed byte
  }
  
  const navi = (memory.T & 0xe0) >> 5;
  const type = memory.T & 0x1f;

  // Helper functions and constants
  const W = 60;        // Delta bases
  const W1 = 90;       // Wave size
  const W1H = 4;       // First wave frequency
  const indre_1 = 3, indre_2 = -1;
  const ydre_1 = 11, ydre_2 = 3;

  // Role constants (enum from C)
  const baby = 0, barn = 1, unge = 2, afsted = 3, afstedbid = 4, afstedbase = 5;
  const sulten = 6, inkalen = 7, hjemad = 8, hjemadmad = 9, hjemadbid = 10;
  const mad = 11, spiral = 12, kvadrant = 13, basecamp = 14, drone = 15;
  const vagt = 16, suppe = 17, stafet = 18, afstedbidfarvel = 19, dronepuppe = 20;
  const kok = 21, afstedbid_3_4 = 22, afstedbid_2_2 = 23, afstedbid_1_1 = 24;
  const afstedbid_4_1 = 25, afstedbid_3_3 = 26, afstedbid_2_3 = 27;
  const afstedbid_1_2 = 28, afstedbid_4_4 = 29;

  // Helper functions
  function abs(a) { return a >= 0 ? a : -a; }
  function ft(a) { return a >= 0 ? 1 : -1; }
  function ft2(a) { return a === 0 ? -1 : 1; }
  
  function Qt(x, y) {
    if ((2 * ft(x) + ft(y) === 3) && (x !== 0)) return 1;
    if (2 * ft(x) + ft(y) === 1) return 2;
    if ((2 * ft(x) + ft(y) === -3) || (y === 0)) return 3;
    return 4;
  }

  function setType(newType) {
    memory.T = (memory.T & 0xe0) + newType;
  }

  // Current position relative to home
  const xp = memory.A;
  const yp = memory.B;
  
  // Target coordinates
  let xt = 0, yt = 0;
  
  // Calculate deltas
  const xd = xp - xt;
  const yd = yp - yt;

  let d = 0;  // Direction to move
  const felt = squareData;

  // Early exit for certain types
  if (type === mad || type === inkalen || type === kvadrant) {
    return 0;
  }

  // ENEMY DETECTION (VAGT/GUARD)
  for (let a = 1; a <= 4; a++) {
    if (felt[a].team >= 1) {
      setType(vagt);
      memory.E = 0;
      switch (a) {
        case 1: memory.A++; break;
        case 2: memory.B--; break;
        case 3: memory.A--; break;
        case 4: memory.B++; break;
      }
      return a;
    }
  }

  // GUARD BEHAVIOR
  if (type === vagt) {
    for (let a = 0; a <= 4; a++) {
      if (felt[a].numFood > 0 && felt[a].numAnts === 0) {
        setType(sulten);
        switch (a) {
          case 1: memory.A++; break;
          case 2: memory.B--; break;
          case 3: memory.A--; break;
          case 4: memory.B++; break;
        }
        return a;
      }
    }
    return 0;
  }

  // DRONE PUPA
  if (type === dronepuppe) {
    if (felt[0].numAnts < 40) {
      setType(vagt);
      return 0;
    } else {
      let X = 0;
      for (let a = 1; a < felt[0].numAnts; a++) {
        if ((antInfo.brains[a].T & 0x1f) === drone) X = 1;
      }
      if (X === 0) {
        memory.T = (memory.T & 0xe0) + drone;
      } else {
        setType(barn);
      }
    }
  }

  // DRONE
  if (type === drone) {
    if (felt[0].numAnts >= 40 && felt[0].numFood >= 50) return 16;
    return 0;
  }

  // COOK (KOK)
  if (type === kok) {
    memory.E++;
    if (felt[0].numFood === 1) {
      setType(hjemadbid);
      memory.C = 0;
      memory.D = 0;
      memory.E = 0;
      memory.T = (memory.T & 0x1f) + (1 << 5);
    } else if (felt[0].numFood === 0) {
      setType(hjemad);
      memory.C = 0;
      memory.D = 0;
      memory.E = 0;
      memory.T = (memory.T & 0x1f) + (1 << 5);
    } else if (memory.E === 125) {
      setType(hjemadmad);
      memory.C = xp;
      memory.D = yp;
      memory.E = felt[0].numFood;
      memory.T = (memory.T & 0x1f) + (1 << 5);
    } else {
      return 0;
    }
  }

  // SOUP (SUPPE)
  if (type === suppe) {
    if (felt[0].base === 1) {
      switch (Qt(memory.C, memory.D)) {
        case 1: return 1;
        case 2: return 2;
        case 3: return 3;
        case 4: return 4;
      }
    } else {
      memory.B++;
      if (memory.B >= 100) {
        memory.A++;
        memory.B = 0;
      }
      
      if (memory.A > 2) {
        let X = 0;
        for (let a = 1; a < felt[0].numAnts; a++) {
          if ((antInfo.brains[a].T & 0x1f) === kvadrant) X++;
        }
        
        if (((memory.T & 0xe0) >> 5) !== 0) X++;
        
        if (X === 0) {
          switch (Qt(antInfo.brains[0].C, antInfo.brains[0].D)) {
            case 1: memory.C = W; memory.D = W; break;
            case 2: memory.C = W; memory.D = -W; break;
            case 3: memory.C = -W; memory.D = -W; break;
            case 4: memory.C = -W; memory.D = W; break;
          }
          memory.B = 0;
          memory.A = 0;
          memory.E = 0;
          memory.T = (memory.T & 0xe0) + kvadrant;
          return 0;
        } else {
          switch (Qt(memory.C, memory.D)) {
            case 1: setType(barn); memory.A = 0; memory.B = 0; return 3;
            case 2: setType(barn); memory.A = 0; memory.B = 0; return 4;
            case 3: setType(barn); memory.A = 0; memory.B = 0; return 1;
            case 4: setType(barn); memory.A = 0; memory.B = 0; return 2;
          }
        }
      }
    }
  }

  // SPIRAL SEARCH
  if (type === spiral) {
    const Cs = memory.C & 0x3f;
    const Ds = memory.D & 0x3f;

    // Look for food first
    for (let a = 1; a <= 4; a++) {
      if (felt[a].numFood > 0 && felt[a].numAnts === 0) {
        setType(sulten);
        switch (a) {
          case 1: memory.A++; break;
          case 2: memory.B--; break;
          case 3: memory.A--; break;
          case 4: memory.B++; break;
        }
        return a;
      }
    }

    if (type !== sulten && type !== hjemad) {
      if (Cs < Ds) {
        memory.C = (memory.C & 0xc0) + Cs + 1;
        d = (memory.E % 4) + 1;
      } else if (navi === 1) {
        memory.D = (memory.D & 0xc0) + Ds + 2;
        memory.C = memory.C & 0xc0;
        memory.T = memory.T & 0x1f;
        memory.E++;
        d = (memory.E % 4) + 1;
      } else {
        memory.D = (memory.D & 0xc0) + Ds + 1;
        memory.C = memory.C & 0xc0;
        memory.T = (memory.T & 0x1f) + (1 << 5);
        memory.E++;
        d = (memory.E % 4) + 1;
      }
    }

    if (Ds === 60 && type === spiral) {
      setType(hjemad);
      memory.E = 0;
      memory.C = 0;
      memory.D = 0;
      memory.T = (memory.T & 0x1f) + (1 << 5);
    }

    if (abs(xp) > 125 || abs(yp) > 125) {
      setType(vagt);
      if (felt[0].numAnts === 1) return 0;
    }
  }

  // BABY
  if (type === baby) {
    let X = 0;
    setType(barn);

    for (let a = 1; a < felt[0].numAnts; a++) {
      const antType = antInfo.brains[a].T & 0x1f;
      if (antType === drone || antType === inkalen) {
        X++;
        break;
      }
    }

    if (X === 0) {
      memory.A = -30;
      memory.B = -10;
      memory.C = 1 << 7;
      memory.D = -1;
      memory.E = 0;
      memory.T = inkalen;
      return 0;
    }
  }

  // HUNGRY (SULTEN)
  if (type === sulten) {
    setType(hjemadmad);
    memory.C = xp;
    memory.D = yp;
    memory.E = felt[0].numFood;
    memory.T = (memory.T & 0x1f) + (1 << 5);
  }

  // Simple navigation for movement types
  const movementTypes = [hjemad, hjemadmad, hjemadbid, afsted, afstedbid, afstedbase, 
                        afstedbidfarvel, afstedbid_3_4, afstedbid_2_2, afstedbid_1_1, 
                        afstedbid_4_1, afstedbid_3_3, afstedbid_2_3, afstedbid_1_2, afstedbid_4_4];

  if (movementTypes.includes(type)) {
    // Set targets based on type
    if (type === afsted) {
      xt = memory.C;
      yt = memory.D;
    }

    // Look for adjacent food first
    for (let a = 1; a <= 4; a++) {
      if (felt[a].numFood > 0 && felt[a].numAnts === 0) {
        setType(sulten);
        switch (a) {
          case 1: memory.A++; break;
          case 2: memory.B--; break;
          case 3: memory.A--; break;
          case 4: memory.B++; break;
        }
        return a;
      }
    }

    // Navigate toward target
    const currentXd = xp - xt;
    const currentYd = yp - yt;

    let direction;
    if ([hjemadmad, hjemadbid, afstedbase].includes(type)) {
      // Carrying food
      direction = 8;
    } else {
      direction = 0;
    }

    if (currentXd === 0) {
      d = currentYd < 0 ? 4 + direction : 2 + direction;
    } else if (currentYd === 0) {
      d = currentXd < 0 ? 1 + direction : 3 + direction;
    } else if (abs(currentXd) >= abs(currentYd)) {
      d = currentXd < 0 ? 1 + direction : 3 + direction;
    } else {
      d = currentYd < 0 ? 4 + direction : 2 + direction;
    }

    // Update navigation counter
    if (navi < 8) {
      memory.T = memory.T + (1 << 5);
    }
  }

  // Update position based on movement
  switch (d) {
    case 0: break;
    case 1: case 9: memory.A++; break;
    case 2: case 10: memory.B--; break;
    case 3: case 11: memory.A--; break;
    case 4: case 12: memory.B++; break;
    case 16: break; // Build base
  }

  return d;
}