function adamAnt(squares, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squares) {
    return {
      brainTemplate: {
        // Position tracking (relative to home base)
        x: 0,
        y: 0,
        foodX: 0,
        foodY: 0,
        turn: 0,
        chief: false,
        guardTurns: 0,
        otherRandom: 1, // Chief uses this for assigning ids to new ants
        patternSeed: 0, // Chief uses this for baseDist
        foundFood: false,
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
  //   brain.otherRandom = (brain.random * 245 + 123) ^ (brain.otherRandom * 13 + 17);
  //   return abs(floor(brain.otherRandom * 4213 + 421) & 0xffffffff);
  // }

  brain.turn++;
  if (brain.chief) return 0;
  const chief = otherBrains.filter((b) => b.chief)[0];
  if (squares[0].base && !chief) {
    brain.chief = true;
    brain.turn = 0;
    brain.otherRandom = 0;
    return 0;
  }

  // function maybeSettle(maxDist) {
  //   // New base?
  //   const baseThreshold = 1000; // After n ants are born - look into making another base
  //   const antsToNewBase = 300;
  //   if (floor(chief.random + chief.turn) % 10 === 0 && chief.otherRandom > baseThreshold) {
  //     if (chief.otherRandom % baseThreshold < antsToNewBase) {
  //       brain.x = floor((maxDist * 2) / 3);
  //       brain.patternSeed = chief.otherRandom % 50; // Start small
  //       return move(explore());
  //     } else {
  //       chief.otherRandom -= baseThreshold;
  //     }
  //   }
  // }

  if (squares[0].base) {
    brain.guardTurns = 0;
    const maxDist = 95 + chief.turn / 85;
    if (!brain.patternSeed) {
      // (Re)initialize ant
      chief.otherRandom += 3;
      // Early bird?
      if (chief.otherRandom < 400)
        brain.patternSeed = floor(chief.otherRandom % floor(((maxDist * 4) / 5) | 0));
      // Custodian of the inner sanctum?
      else if (brain.random % 35 === 0)
        brain.patternSeed = floor(chief.otherRandom % floor(((maxDist * 4) / 5) | 0));
      // Defender of the rim?
      else {
        brain.patternSeed = ((chief.otherRandom % (maxDist / 5) | 0) + (maxDist * 4) / 5) | 0;
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
      brain.foodX = brain.x;
      brain.foodY = brain.y;
      brain.foundFood = true;
      // brain.guardTurns = 0; // Run with the food!
      return action;
    }
  }

  if (brain.guardTurns > 0) {
    // If we have dragged food home successfully, abort the guard duty
    brain.guardTurns--;
    return 0;
  }

  // Drag food towards base
  if (squares[0].numFood > 0) {
    // Home away from home?
    if (brain.x === 0 && brain.y === 0) return 16;
    // Found stash closer to home?
    if (squares[0].numFood > squares[0].numAnts) {
      brain.foodX = brain.x;
      brain.foodY = brain.y;
      brain.foundFood = true;
    }
    return dragFood(stepTowards(0, 0));
  }

  // Are we at the stash? (there was no food)
  if (
    brain.foodX !== 0 &&
    brain.foodY !== 0 &&
    brain.x === brain.foodX &&
    brain.y === brain.foodY
  ) {
    brain.foundFood = false;
    return move(explore());
  }

  // function stepTowards_old(x, y) {
  //   const dx = x - brain.x;
  //   const dy = y - brain.y;
  //   if (dx === 0 && dy === 0) return 0;
  //   if (abs(dx) > abs(dy)) {
  //     return dx > 0 ? 1 : 3;
  //   } else {
  //     return dy > 0 ? 2 : 4;
  //   }
  // }

  function stepTowards(destX, destY) {
    if (brain.x === destX && brain.y === destY) return 0;
    const dx = abs(brain.x - destX);
    const dy = abs(brain.y - destY);
    if (dy > dx) {
      return brain.y > destY ? 4 : 2;
    } else if (dx > dy) {
      return brain.x > destX ? 3 : 1;
    } else {
      if (brain.turn % 2 === 0) return brain.y > destY ? 4 : 2;
      else return brain.x > destX ? 3 : 1;
    }
  }
  // Do we have a destination? Then go there
  if (
    (brain.foodX !== 0 || brain.foodY !== 0) &&
    (brain.foodX !== brain.x || brain.foodY !== brain.y)
  ) {
    return move(stepTowards(brain.foodX, brain.foodY));
  }

  const othersWhoKnowFood = otherBrains.filter((b) => b.foundFood);
  if (othersWhoKnowFood.length > 0) {
    const other = othersWhoKnowFood[0];
    brain.foodX = other.foodX;
    brain.foodY = other.foodY;
    brain.x = other.x;
    brain.y = other.y;
    return move(stepTowards(brain.foodX, brain.foodY));
  }

  // function formRank() {
  //   // Step 90 degrees relative to base direction
  //   if (abs(brain.x) > abs(brain.y)) return brain.y > 0 ? 2 : 4;
  //   else if (abs(brain.x) < abs(brain.y)) return brain.x > 0 ? 3 : 1;
  // }

  // const othersGuarding = otherBrains.filter((b) => b.guardTurns > 0);
  // if (othersGuarding.length > 0) {
  //   brain.guardTurns = 300;
  //   return move(formRank());
  // }

  function explore() {
    brain.foundFood = false;
    const baseDist = brain.patternSeed;
    const eastPoint = [baseDist, 0];
    const westPoint = [-baseDist, 0];
    const northPoint = [0, baseDist];
    const southPoint = [0, -baseDist];
    const initialPoint = [eastPoint, westPoint, northPoint, southPoint][brain.random % 4];
    let destX, destY;
    if (brain.foodX === 0 && brain.foodY === 0) [destX, destY] = initialPoint;
    else if (brain.x >= 0 && brain.y < 0) [destX, destY] = eastPoint;
    else if (brain.x > 0 && brain.y >= 0) [destX, destY] = northPoint;
    else if (brain.x <= 0 && brain.y > 0) [destX, destY] = westPoint;
    else if (brain.x < 0 && brain.y >= 0) [destX, destY] = southPoint;
    brain.foodX = floor(destX);
    brain.foodY = floor(destY);

    return stepTowards(destX, destY);
  }

  // Follow the pattern!?
  return move(explore());
}
