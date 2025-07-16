function adamAnt(squares, antInfo) {
  // Return ant descriptor when called without arguments
  const ROLE_CHIEF = 1;
  const ROLE_EXPLORER = 2;
  const ROLE_CARRIER = 3;
  const ROLE_GUARD = 4;
  const ROLE_SETTLER = 5;
  const ROLE_SPELUNKER = 6;

  if (!squares) {
    return {
      brainTemplate: {
        // Position tracking (relative to home base)
        x: 0, // Chief counts turns here
        y: 0, // Chief counts ants here
        // Travelling origin
        fromX: 0,
        fromY: 0,
        // Travelling destination
        toX: 0,
        toY: 0,
        role: ROLE_EXPLORER,
        guardTurns: 0,
        patternSeed: 0,
        range: 80,
        travelling: false,
      },
      name: 'Antonov',
      color: '#fafa10',
      description:
        'Antonov is big an scary',
    };
  }

  const {
    brains: [brain, ...otherBrains],
  } = antInfo;

  function abs(n) {
    return n < 0 ? -n : n;
  }

  function log(...args) {
    if (true) console.log(...args);
  }

  const pi = 3.14159265358979323846264338327;
  const numSlices = 100
  // const radius = 100;

  const trigIterations = 4;
  function cos(x) {
    const iterNum = trigIterations;
    const mxx = -x * x;
    let cos = 1;
    let n = 0;
    let term = 1;
    for (let i = 1; i <= 2 * iterNum; i++) {
      n = n + 2;
      term = (term * mxx) / (n * (n - 1));
      cos = cos + term;
    }
    return cos;
  }

  function sin(x) {
    const iterNum = trigIterations;
    const mxx = -x * x;
    let sin = 1;
    let n = 0;
    let term = 1;
    for (let i = 1; i <= 2 * iterNum; i++) {
      n = n + 2;
      term = (term * mxx) / (n * (n + 1));
      sin = sin + term;
    }
    sin = x * sin;
    return sin;
  }

  // function prng() {
  //   brain.antsHatched = (brain.random * 245 + 123) ^ (brain.antsHatched * 13 + 17);
  //   return abs(floor(brain.antsHatched * 4213 + 421) & 0xffffffff);
  // }

  if (brain.role === ROLE_CHIEF) {
    brain.x++; // Count turns
    return 0;
  }
  const chief = otherBrains.find((b) => b.role === ROLE_CHIEF);
  if (squares[0].base && !chief) {
    brain.role = ROLE_CHIEF;
    brain.x = 0; // Count turns
    brain.y = 0; // Count ants
    brain.travelling = false;
    brain.toX = brain.toY = brain.fromX = brain.fromY = 0;
    log('New chief', brain);
    return 0;
  }

  // NOTE: New bases don't seem that advantageous when you use an expanding circular pattern

  //
  // New ant initialization
  //
  if (squares[0].base) {
    brain.guardTurns = 0;
    if (!brain.patternSeed) {
      brain.patternSeed = chief.y++; // Count new ants
      brain.role = ROLE_EXPLORER;
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
      brain.guardTurns = 800;
      brain.role = ROLE_GUARD;
      return move(i);
    }
    // Stomp thine food
    if (
      brain.role !== ROLE_SPELUNKER &&
      brain.role !== ROLE_GUARD &&
      squares[0].numFood === 0 &&
      squares[i].numFood > squares[i].numAnts
    ) {
      const action = move(i); // Updates x,y
      brain.fromX = brain.x;
      brain.fromY = brain.y;
      brain.role = ROLE_CARRIER;
      return action;
    }
  }

  if (brain.role === ROLE_GUARD || brain.role === ROLE_SPELUNKER) {
    if (brain.guardTurns === 0) {
      brain.role = ROLE_EXPLORER;
      return move(explore());
    } else {
      brain.guardTurns--;
      if (brain.role === ROLE_GUARD) return 0;
    }
  }

  const otherBrainGuarding = otherBrains.filter((b) => b.guardTurns > 0).length > 0;
  if (brain.role !== ROLE_SPELUNKER && brain.role !== ROLE_GUARD && otherBrainGuarding) {
    // Reduce the range a bit if we have reached the 'front'
    // if (brain.random % 2 === 0) brain.range += 2;
    // else brain.range -= 2;
    if (brain.range > 60) brain.range -= 2;
    return move(explore());

    // // Go spelunking
    // brain.role = ROLE_SPELUNKER;
    // brain.guardTurns = otherBrainGuarding.guardTurns;
    // brain.range = 10;
    // brain.x = 0;
    // brain.y = 0;
    // return move(explore());
  }

  // Drag food towards base
  if (squares[0].numFood >= squares[0].numAnts) {
    // If we weren't headed home, plot a course
    if (brain.toX !== 0 || brain.toY !== 0) {
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
      // We arrived at the stash and there's no food
      if (!squares[0].base && brain.role === ROLE_CARRIER) brain.role = ROLE_EXPLORER;
      return move(explore());
    }
    else {
      // Continue on course
      return move(stepTowards());
    }
  }

  function startTowards(destX, destY) {
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
    if (other.role === ROLE_CARRIER) { // Don't let new base ants be stolen back to old base
      const [foodX, foodY] = getFoodPos(other);
      brain.x = other.x;
      brain.y = other.y;
      return move(startTowards(foodX, foodY));
    }
  }

  function getRadian(seed) {
    const a = otherBrains.length > 5 ? otherBrains.length : numSlices;
    return 2 * pi / (a / (seed % a));
  }

  function explore() {

    // When given directions at base, spread evenly around the circle. When exploring from elsewhere, choose a different point on the circle.
    if (brain.x !== 0 || brain.y !== 0) {
      brain.patternSeed += (numSlices / 3) | 0;
      brain.range += 2; //(brain.x + brain.y + brain.random) % 2 === 0 ? 1 : 0;
    }
    const radian = getRadian(brain.patternSeed);
    const destX = cos(radian) * brain.range;
    const destY = sin(radian) * brain.range;

    return startTowards(destX | 0, destY | 0);
  }

  // Follow the pattern!?
  return move(explore());
}
