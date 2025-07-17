function A5(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        rnd: 1,
        xpos: 0,
        ypos: 0,
        xmad: 0,
        ymad: 0,
        antal: 0,
        lastbar: 0,
        type: 0
      },
      name: 'A5',
      color: '#8B4513', // Brown color (saddle brown)
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Macro equivalent: ((abs(x-a))>(abs(y-b)) ? ((x)>(a) ? (3):(1)) : ((y)>(b) ? (2):(4)))
  function foo(x, y, a, b) {
    if (abs(x - a) > abs(y - b)) {
      return (x > a) ? 3 : 1;
    } else {
      return (y > b) ? 2 : 4;
    }
  }

  const myBrain = antInfo.brains[0];
  let bar = 0;

  // Short variable names from C code (keeping original logic)
  const x = myBrain.xpos;
  const y = myBrain.ypos;
  let xm = myBrain.xmad;
  let ym = myBrain.ymad;

  if (myBrain.type !== 1) {
    // Update random number
    myBrain.rnd = myBrain.rnd * 25 + 123;

    if (myBrain.rnd % 5 === 1) {
      myBrain.rnd = myBrain.rnd * 25 + 123;
      bar = myBrain.rnd % 5 + 8;
    } else {
      bar = myBrain.lastbar;
    }

    // Check grid position logic
    if (((abs(x) + (1 === bar || 3 === bar)) % 2) &&
        ((abs(y) + (4 === bar || 2 === bar)) % 2)) {
      bar = myBrain.lastbar;
    }

    // Look for food-rich squares
    for (let i = 1; i <= 4; i++) {
      if (squareData[i].numFood > (squareData[i].numAnts + 5)) {
        bar = i;
        myBrain.antal = squareData[i].numFood;
        myBrain.xmad = x;
        myBrain.ymad = y;
        xm = myBrain.xmad;
        ym = myBrain.ymad;
      }
    }

    // Reset target if reached and no food
    if (x === xm && y === ym && !squareData[0].numFood) {
      myBrain.xmad = 0;
      myBrain.ymad = 0;
      myBrain.antal = 0;
      xm = 0;
      ym = 0;
    }

    // Move toward target if we have one and no food here
    if (!squareData[0].numFood && (xm || ym)) {
      bar = foo(x, y, xm, ym);
    }

    // Return to base with food
    if (squareData[0].numFood) {
      bar = foo(x, y, 0, 0) + 8;
    }

    // Share information between ants
    for (let i = 1; i < antInfo.brains.length; i++) {
      if (!xm && !ym) {
        // Take target from other ant
        if (antInfo.brains[i].antal) {
          myBrain.xmad = antInfo.brains[i].xmad;
          myBrain.ymad = antInfo.brains[i].ymad;
          xm = myBrain.xmad;
          ym = myBrain.ymad;
          antInfo.brains[i].antal--;
        }
      } else {
        // Give target to other ant
        if (!antInfo.brains[i].xmad && !antInfo.brains[i].ymad && myBrain.antal) {
          antInfo.brains[i].xmad = xm;
          antInfo.brains[i].ymad = ym;
          myBrain.antal--;
        }
      }
    }

    // Reset if too many ants
    if (squareData[0].numAnts > 15) {
      myBrain.antal = 0;
    }
  }

  // Check for enemy teams
  for (let i = 1; i <= 4; i++) {
    if (squareData[i].team > 0) {
      bar = i;
      myBrain.type = 1;
    }
  }

  // Update position based on movement
  if (bar % 8 === 1) {
    myBrain.xpos++;
  } else if (bar % 8 === 2) {
    myBrain.ypos--;
  } else if (bar % 8 === 3) {
    myBrain.xpos--;
  } else if (bar % 8 === 4) {
    myBrain.ypos++;
  }

  myBrain.lastbar = bar;
  return bar;
}
