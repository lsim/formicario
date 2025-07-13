function adamAnt(squares, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squares) {
    return {
      brainTemplate: {
        // Position tracking (relative to home base)
        x: 0,
        y: 0,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        turn: 0,
        chief: false,
        guardTurns: 0,
        antsHatched: 0,
        patternSeed: 0,
        foundFood: false,
        travelling: false,
      },
      name: 'AdamAnt',
      color: '#F00080',
      description:
        'AdamAnt mainly exists because it is an excellent name for an ant. Some day it will learn to spell out E-V-E on the board.',
    };
  }

  const {
    brains: [brain, ...otherBrains],
  } = antInfo;

  function abs(n) {
    return n < 0 ? -n : n;
  }

  function log(...args) {
    if (brain.random === 1924775755) console.log(...args);
  }

  function max(a, b) {
    return a > b ? a : b;
  }

  function min(a, b) {
    return a < b ? a : b;
  }

  function floor(n) {
    return n >= 0 ? n | 0 : (n | 0) === n ? n : (n | 0) - 1;
  }

  function ceil(n) {
    return n >= 0 ? n | 0 : (n | 0) === n ? n : (n | 0) + 1;
  }

  // function prng() {
  //   brain.antsHatched = (brain.random * 245 + 123) ^ (brain.antsHatched * 13 + 17);
  //   return abs(floor(brain.antsHatched * 4213 + 421) & 0xffffffff);
  // }

  brain.turn++;
  if (brain.chief) return 0;
  const chief = otherBrains.filter((b) => b.chief)[0];
  if (squares[0].base && !chief) {
    brain.chief = true;
    brain.turn = 0;
    brain.antsHatched = 0;
    return 0;
  }

  // function maybeSettle(maxDist) {
  //   // New base?
  //   const baseThreshold = 1000; // After n ants are born - look into making another base
  //   const antsToNewBase = 300;
  //   if (floor(chief.random + chief.turn) % 10 === 0 && chief.antsHatched > baseThreshold) {
  //     if (chief.antsHatched % baseThreshold < antsToNewBase) {
  //       brain.x = floor((maxDist * 2) / 3);
  //       brain.patternSeed = chief.antsHatched % 50; // Start small
  //       return move(explore());
  //     } else {
  //       chief.antsHatched -= baseThreshold;
  //     }
  //   }
  // }

  if (squares[0].base) {
    brain.guardTurns = 0;
    const maxDist = 95 + chief.turn / 85;
    if (!brain.patternSeed) {
      // (Re)initialize ant
      chief.antsHatched += 1;//3;
      // Early bird?
      if (chief.antsHatched < 200)
        brain.patternSeed = 5 + floor(3 * chief.antsHatched % floor(((maxDist * 4) / 5) | 0));
      // Custodian of the inner sanctum?
      else if (brain.random % 35 === 0)
        brain.patternSeed = 5 + floor(3 * chief.antsHatched % floor(((maxDist * 4) / 5) | 0));
      // Defender of the rim?
      else {
        brain.patternSeed = (((3 * chief.antsHatched % (maxDist / 5) | 0) + (maxDist * 4) / 5) | 0);
      }

      // const action = maybeSettle(maxDist);
      // if (action) return move(action);
    }
  }

  // Move codes:
  //     4
  //   3 0 1
  //     2
  function move(dir) {
    switch (dir % 8) {
      case 1:
        brain.x += 1;
        break;
      case 2:
        brain.y += 1;
        break;
      case 3:
        brain.x -= 1;
        break;
      case 4:
        brain.y -= 1;
        break;
    }
    return dir;
  }

  function dragFood(dir) {
    return move(dir + 8);
  }

  // Check neighboring squares for food/enemies
  for (let i = 1; i < 5; i++) {
    // Stomp thine enemy
    if (squares[i].team > 0) {
      brain.guardTurns = 400;
      return dragFood(i);
    }
    // Stomp thine food
    if (
      brain.guardTurns === 0 &&
      squares[0].numFood === 0 &&
      squares[i].numFood > squares[i].numAnts
    ) {
      const action = move(i); // Updates x,y
      brain.fromX = brain.x;
      brain.fromY = brain.y;
      brain.foundFood = true;
      return action;
    }
  }

  if (brain.guardTurns > 0) {
    // If we have dragged food home successfully, abort the guard duty
    brain.guardTurns--;
    return 0;
  }

  // Drag food towards base
  if (squares[0].numFood >= squares[0].numAnts) {
    // Home away from home?
    // if (brain.x === 0 && brain.y === 0) return 16;
    // If we weren't headed home, plot a course
    if (brain.toX !== 0 || brain.toY !== 0) {
        log('startDragging', brain.x, brain.y, ' -> ', 0, 0, squares[0].numFood, squares[0].numAnts, brain.random);
      return dragFood(startTowards(0, 0));
    }
    // Else continue on course
    return dragFood(stepTowards());
  }

  // Handle travelling
  if (brain.travelling) {
    if (
      brain.x === brain.toX &&
      brain.y === brain.toY
    ) {
      // We arrived - don't reset foundFood if we arrived at the base
      if (!squares[0].base) brain.foundFood = false;
      return move(explore());
    }
    else {
      // Continue on course
      return move(stepTowards());
    }
  }

  function startTowards(destX, destY) {
    log('startTowards', brain.x, brain.y, ' -> ', destX, destY, squares[0].numFood, squares[0].numAnts, brain.random);
    brain.travelling = true;
    brain.toX = destX;
    brain.toY = destY;
    brain.fromX = brain.x;
    brain.fromY = brain.y;
    return stepTowards();
  }

  function goY(dy) { return dy > 0 ? 2 : 4; }
  function goX(dx) { return dx > 0 ? 1 : 3; }

  function stepTowards() {
    // Line drawing algorithm
    // Inclination = dy / dx
    const dx = brain.toX - brain.fromX;
    const dy = brain.toY - brain.fromY;
    if (dx === 0 && dy === 0) return 0;
    if (dx === 0) return goY(dy);
    if (dy === 0) return goX(dx);
    const a = dy / dx;
    const [fromX, fromY, currentX, currentY, toX, toY] = [brain.fromX, brain.fromY, brain.x, brain.y, brain.toX, brain.toY];
    const possibleNextX = currentX + (dx > 0 ? 1 : -1);
    const nextY = fromY + a * (possibleNextX - fromX);
    const stepY = nextY - currentY;

    log('stepTowards', fromX, fromY, ' (', currentX, currentY, ')', ' -> ', toX, toY, 'a', a, possibleNextX, stepY, brain.random);
    if (abs(stepY) > 1) return goY(dy);
    return goX(dx);
  }

  function getFoodPos(b) {
    const headedHome = b.toX === 0 && b.toY === 0;
    const foodX = headedHome ? b.fromX : b.toX;
    const foodY = headedHome ? b.fromY : b.toY;
    return [foodX, foodY];
  }

  for (let i = 1; i < antInfo.brains.length; i++) {
    const other = antInfo.brains[i];
    if (other.foundFood) {
      const [foodX, foodY] = getFoodPos(other);
      return move(startTowards(foodX, foodY));
    }
  }

  // const startPositions = [
  //   [0, 3], [-3, 0], [0, -3], [3, 0],
  //   [0, 6], [-6, 0], [0, -6], [6, 0],
  //   [0, 9], [-9, 0], [0, -9], [9, 0],
  //   [0, 12], [-12, 0], [0, -12], [12, 0],
  //   [0, 15], [-15, 0], [0, -15], [15, 0],
  //   [0, 18], [-18, 0], [0, -18], [18, 0],
  //   [0, 21], [-21, 0], [0, -21], [21, 0],
  //   [0, 24], [-24, 0], [0, -24], [24, 0],
  //   [0, 27], [-27, 0], [0, -27], [27, 0],
  //   [0, 30], [-30, 0], [0, -30], [30, 0],
  //   [0, 33], [-33, 0], [0, -33], [33, 0],
  //   [0, 36], [-36, 0], [0, -36], [36, 0],
  //   [0, 39], [-39, 0], [0, -39], [39, 0],
  //   [0, 42], [-42, 0], [0, -42], [42, 0],
  //   [0, 45], [-45, 0], [0, -45], [45, 0],
  //   [0, 48], [-48, 0], [0, -48], [48, 0],
  //   [0, 51], [-51, 0], [0, -51], [51, 0],
  // ]

  function explore() {
    brain.foundFood = false;
    const baseDist = brain.patternSeed;
    const eastPoint = [baseDist, 0];
    const westPoint = [-baseDist, 0];
    const northPoint = [0, baseDist];
    const southPoint = [0, -baseDist];
    const initialPoint = [eastPoint, westPoint, northPoint, southPoint][brain.random % 4];
    let destX, destY;
    if (brain.toX === 0 && brain.toY === 0) [destX, destY] = initialPoint;
    else if (brain.x >= 0 && brain.y < 0) [destX, destY] = eastPoint;
    else if (brain.x > 0 && brain.y >= 0) [destX, destY] = northPoint;
    else if (brain.x <= 0 && brain.y > 0) [destX, destY] = westPoint;
    else if (brain.x < 0 && brain.y >= 0) [destX, destY] = southPoint;

    log('startExploring', brain.x, brain.y, ' -> ', destX, destY, squares[0].numFood, squares[0].numAnts, brain.random);
    return startTowards(floor(destX), floor(destY));
  }

  // Follow the pattern!?
  return move(explore());
}
