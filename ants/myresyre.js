function myresyre(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        rdm: 1,
        xpos: 0,
        ypos: 0,
        xtar: 0,
        ytar: 0,
        turn: 0,
        foodx: new Array(6).fill(0),
        foody: new Array(6).fill(0),
        foodn: new Array(6).fill(0),
        c: 0,
        e: 0,
        f: 0,
        g: 0,
        h: 0,
        type: 0
      },
      name: 'Myresyre',
      color: '#11FFFF',
    };
  }

  // Helper functions to avoid Math API
  function abv(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const S = 200;
  const T = 40;

  const m = antInfo.brains[0];
  let xp = m.xpos;
  let yp = m.ypos;
  let xt = m.xtar;
  let yt = m.ytar;

  let a, b, d = 0;
  let madx = 0, bufx = 0, mady = 0, bufy = 0;
  let madn = 0, bufn = 0;

  m.turn++;

  if (m.turn === 1) m.type = 11;

  // Base logic
  if (squareData[0].base === 1) {
    m.type = 11;
    
    if (m.foodn[0] > 0) {
      yt = m.foody[0];
      xt = m.foodx[0];
      m.type = 2;
    } else if (squareData[0].numAnts > 1) {
      for (b = 1; b <= squareData[0].numAnts - 1; b++) {
        if (m.foodn[0] < antInfo.brains[b].foodn[0]) {
          for (a = 0; a <= 5; a++) {
            m.foodx[a] = antInfo.brains[b].foodx[a];
            m.foody[a] = antInfo.brains[b].foody[a];
            m.foodn[a] = antInfo.brains[b].foodn[a];
            
            if (m.foodn[0] > 0) {
              yt = m.foody[0];
              xt = m.foodx[0];
              m.type = 2;
            }
          }
        }
      }
    }
  }

  // Enemy detection
  for (d = 1; d <= 4; d++) {
    if (squareData[d].team >= 1) {
      m.type = 6;
      return d;
    }
  }
  if (m.type === 6) return 0;

  // Spread out
  if (m.type === 11) {
    yt = yp + (m.rdm % S) - ((S / 2) | 0);
    xt = xp + (m.rdm % (S + 3)) - ((S / 2) | 0) + 1;
    m.type = 1;
  }

  if ((m.type === 12) && (yp !== 0) && (xp !== 0)) {
    yt = yp + (((yp / abv(yp)) | 0) * (m.rdm % T + 20));
    xt = xp + (((xp / abv(xp)) | 0) * (m.rdm % (T + 3) + 20));
    m.type = 1;
  }

  // Check for food - friends
  if ((squareData[0].numAnts === 2) && ((m.type === 10) || (antInfo.brains[1].type === 10))) {
    if ((m.type === 10) && (antInfo.brains[1].foodn[0] > 0)) {
      for (a = 0; a <= 5; a++) {
        m.foodx[a] = antInfo.brains[1].foodx[a];
        m.foody[a] = antInfo.brains[1].foody[a];
        m.foodn[a] = antInfo.brains[1].foodn[a];
        m.type = 2;
      }
    } else if ((antInfo.brains[1].type === 10) && (m.foodn[0] > 0)) {
      for (a = 0; a <= 5; a++) {
        antInfo.brains[a].foodx[a] = m.foodx[a];
        antInfo.brains[a].foody[a] = m.foody[a];
        antInfo.brains[a].foodn[a] = m.foodn[a];
        antInfo.brains[1].type = 2;
      }
    }
    if (m.type === 10) m.type = 0;
    if (antInfo.brains[1].type === 10) m.type = 0;
  }

  // Check for food - fields
  for (a = 1; a <= 4; a++) {
    if (squareData[a].numFood > squareData[a].numAnts) {
      madn = squareData[a].numFood - squareData[a].numAnts;
      madx = xp;
      mady = yp;
      switch (a) {
        case 1: madx++; break;
        case 2: mady--; break;
        case 3: madx--; break;
        case 4: mady++; break;
      }
    }
  }

  // Food priority management
  b = 0;
  for (a = 0; a <= 5; a++) {
    if ((m.foodx[a] === madx) && (m.foody[a] === mady)) {
      m.foodn[a] = madn;
      b = 1;
    }
  }
  
  if (b === 0) {
    for (a = 0; a <= 5; a++) {
      if (madn > m.foodn[a]) {
        bufn = m.foodn[a];
        bufx = m.foodx[a];
        bufy = m.foody[a];
        m.foodn[a] = madn;
        m.foodx[a] = madx;
        m.foody[a] = mady;
        madn = bufn;
        madx = bufx;
        mady = bufy;
      }
    }
  }
  
  if (b === 1) {
    for (a = 0; a <= 4; a++) {
      if (m.foodn[a] < m.foodn[a + 1]) {
        bufx = m.foodx[a + 1];
        bufy = m.foody[a + 1];
        bufn = m.foodn[a + 1];
        m.foodn[a + 1] = m.foodn[a];
        m.foodx[a + 1] = m.foodx[a];
        m.foody[a + 1] = m.foody[a];
        m.foodn[a] = bufn;
        m.foodx[a] = bufx;
        m.foody[a] = bufy;
      }
    }
  }

  // What do I do now?
  let xd = xp - xt;
  let yd = yp - yt;

  // Is there anyone??
  if ((m.type === 0) && (m.c === 0)) {
    for (a = 1; a <= 4; a++) {
      if (squareData[a].numAnts === 1) {
        m.type = 12;
        d = a;
      }
    }
  }

  if ((xd === 0) && (yd === 0) && (m.type === 1)) m.type = 0;

  if ((xd === 0) && (yd === 0) && (m.type === 2)) {
    if (squareData[0].numFood < squareData[0].numAnts) {
      m.type = (m.rdm % 2) + 11;
      m.foodn[0] = 0;
      
      if (m.foodn[0] > 0) {
        m.type = 2;
        xt = m.foodx[0];
        yt = m.foody[0];
      }
    } else {
      m.type = 3;
      xt = 0;
      yt = 0;
    }
  }

  if ((squareData[0].base === 1) && (m.type === 3)) {
    if (m.foodn[0] > 0) {
      m.type = 2;
      xt = m.foodx[0];
      yt = m.foody[0];
    } else {
      m.type = 0;
    }
  }

  if (((m.type === 0) || (m.type === 1)) && (m.foodn[0] > 0)) {
    m.type = 2;
    xt = m.foodx[0];
    yt = m.foody[0];
  }

  xd = xp - xt;
  yd = yp - yt;

  // Food searching - spiral pattern
  if (m.type === 0) {
    if (m.e < m.f) {
      m.e++;
      d = ((m.g % 4) + 1);
    } else if (m.h === 1) {
      m.f = m.f + 2;
      m.e = 0;
      m.h = 0;
      m.g++;
      d = ((m.g % 4) + 1);
    } else {
      m.f++;
      m.e = 0;
      m.h = 1;
      m.g++;
      d = ((m.g % 4) + 1);
    }
  }

  // Target seeking
  if ((m.type === 1) || (m.type === 2) || (m.type === 3)) {
    if ((m.type === 3) || (m.type === 4)) {
      a = 3 + 8;
      b = 2 + 8;
      if (xd < 0) a = 1 + 8;
      if (yd < 0) b = 4 + 8;
    } else {
      a = 3;
      b = 2;
      if (xd < 0) a = 1;
      if (yd < 0) b = 4;
    }
    
    if (xd === 0) {
      d = b;
    } else if (yd === 0) {
      d = a;
    } else if (abv((xd / yd) | 0) >= 1) {
      if (m.c <= abv((xd / yd) | 0)) {
        d = a;
      } else {
        m.c = 0;
        d = b;
      }
    } else if (m.c <= abv((yd / xd) | 0)) {
      d = b;
    } else {
      m.c = 0;
      d = a;
    }
    
    m.c++;
  }

  // Update position
  switch (d) {
    case 1: m.xpos++; break;
    case 2: m.ypos--; break;
    case 3: m.xpos--; break;
    case 4: m.ypos++; break;
    case 9: m.xpos++; break;
    case 10: m.ypos--; break;
    case 11: m.xpos--; break;
    case 12: m.ypos++; break;
  }

  // Update target coordinates
  m.xtar = xt;
  m.ytar = yt;

  return d;
}