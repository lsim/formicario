function Speedy(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        x: 0,
        y: 0,
        type: 0,
        seed: 1
      },
      name: 'Gonzales',
      color: '#ff0077',
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a < 0 ? -a : a;
  }

  function speedyRandom(seed, range) {
    let s = seed[0] = seed[0] * 5 + 1;
    s = (((s >> 4) & 0x0F) | ((s << 4) & 0xF0)) | 0;
    s = (((s >> 2) & 0x33) | ((s << 2) & 0xCC)) | 0;
    s = (((s >> 1) & 0x55) | ((s << 1) & 0xAA)) | 0;
    if (range) return (s * 0x1010101) % range;
    return s;
  }

  function gotoTarget(brain) {
    let dir = 0;
    if ((brain.x) || (brain.y)) {
      if ((brain.x) && (brain.y)) {
        dir = speedyRandom([brain.seed], (abs(brain.x) + abs(brain.y)));
      } else {
        return 0;
      }
      if (dir < abs(brain.x)) {
        if (brain.x < 0) return 1;
        return 3;
      } else {
        if (brain.y < 0) return 2;
        return 4;
      }
    }
    return 0;
  }

  function findEnemy(squares) {
    let i, result = 0, maxThreat = 0;
    for (i = 1; i < 5; ++i) {
      if (squares[i].team) {
        const threat = (squares[i].numAnts + squares[i].base * (NewBaseAnts + NewBaseFood)) * 42 + squares[i].numFood;
        if (threat > maxThreat) {
          maxThreat = threat;
          result = i;
        }
      }
    }
    return result;
  }

  function searchFood(squares, brain) {
    const oldType = brain.type;
    let i;
    brain.type = 0;

    if (squares[0].numFood > 1) {
      if ((brain.x < 0) && (squares[1].numFood)) return 1;
      if ((brain.y < 0) && (squares[2].numFood)) return 2;
      if ((brain.x > 0) && (squares[3].numFood)) return 3;
      if ((brain.y > 0) && (squares[4].numFood)) return 4;
      return gotoTarget(brain);
    }

    for (i = 1; i < 5; ++i) {
      if (squares[i].numFood) {
        if ((brain.x >= 0) && (squares[1].numFood)) return 1;
        if ((brain.y >= 0) && (squares[2].numFood)) return 2;
        if ((brain.x <= 0) && (squares[3].numFood)) return 3;
        if ((brain.y <= 0) && (squares[4].numFood)) return 4;
        return i;
      }
    }

    if (squares[0].numFood) return gotoTarget(brain);
    brain.type = oldType;
    return 0;
  }

  function zigzag(x, y) {
    if ((y <= 0) || (x < 0)) return zigzag(y, -x) + 1;
    if (y > 6 + 3 * ((x >> 1) | 0)) return 2;
    if (x > 3 * (y - 6)) return 1;
    if ((12 + 3 * x - 2 * y) % 7) return 1;
    if ((3 * y - x - 18) % 7) return 1;
    return 2;
  }

  function exploreFood(squares, brain, power, turn) {
    let move = searchFood(squares, brain);
    if (move) return move;
    return (zigzag(brain.x, brain.y) % 4) + 1;
  }

  function basicMove(squares, brain, power, turn) {
    let i, move;
    move = searchFood(squares, brain);
    if (move) return move;

    if ((power > 1) && (power < 7) && (squares[0].numAnts === 1)) return 0;

    move = (gotoTarget(brain) % 4) + 1;
    if (speedyRandom([brain.seed], 5) === 0) {
      move = (move % 4) + 1;
    } else {
      for (i = 1; (i < 5) && (squares[i].numAnts === 0); ++i);
      if (i < 5) move = (move % 4) + 1;
    }

    if (squares[move].numAnts) move = speedyRandom([brain.seed], 4) + 1;
    return move;
  }

  function clearArea(squares, brain, power, turn) {
    let i, canClear = 1, minAnts = MaxSquareAnts * 2, result = 0;

    for (i = 0; i < 5; ++i) {
      if (squares[i].numAnts > MaxSquareAnts / 3) canClear = 0;
      if (squares[i].numAnts < minAnts) {
        minAnts = squares[i].numAnts;
        result = i;
      }
    }

    if (canClear) {
      brain.type = 0;
      return 6;
    }

    for (i = 0; i < squares[0].numAnts; ++i) {
      antInfo.brains[i].type = 100;
    }
    return result;
  }

  function advancedMove(squares, brain, power, turn) {
    ++turn;
    if (turn < 5) {
      brain.type = 13;
      return turn;
    } else {
      brain.type = 79 + (turn & 3);
      return turn - 4;
    }
  }

  function runMode(squares, brain, power, turn) {
    if (squares[0].numAnts > 1) brain.type = 0;
    for (let i = 1; i < 5; ++i) {
      if (squares[i].numAnts) brain.type = 0;
    }
    return 0;
  }

  function processType(type, squares, brain, power) {
    if (type >= 100) return clearArea(squares, brain, power, type - 100);
    if (type >= 79) return advancedMove(squares, brain, power, type - 79);
    if (type >= 42) return runMode(squares, brain, power, type - 42);
    if (type >= 13) return exploreFood(squares, brain, power, type - 13);
    if (type >= 0) return basicMove(squares, brain, power, type - 0);
    return 0;
  }

  // Main ant logic
  function speedyMain(squares, brain) {
    let move, power, distance, i, enemy, numAnts = squares[0].numAnts;

    if ((enemy = squares[0].base)) {
      for (i = 0; i < numAnts; ++i) {
        if (antInfo.brains[i].x || antInfo.brains[i].y) {
          antInfo.brains[i].seed = antInfo.brains[i].x ^ antInfo.brains[i].y;
        } else {
          enemy = 0;
        }
        antInfo.brains[i].x = antInfo.brains[i].y = 0;
      }

      if ((enemy) && (numAnts >= 8)) {
        for (i = 0; i < 8; ++i) {
          antInfo.brains[i].type = 79 + i;
        }
      }
    }

    // Apply environmental influence from adjacent squares to all existing ants
    // Original C code has a bug: uses same index for brains[i] and squares[i]
    // This fixes it by applying environmental data from all squares to each ant
    for (i = 1; i < numAnts; ++i) {
      for (let squareIdx = 1; squareIdx < 5; ++squareIdx) {
        antInfo.brains[i].seed *= ((squares[squareIdx].numAnts << 1) - 1) * ((squares[squareIdx].numFood << 2) - 3);
      }
    }

    if (numAnts > 1) {
      for (i = 1; i < numAnts; ++i) {
        antInfo.brains[i].seed ^= speedyRandom([brain.seed], 256);
      }
    }

    power = (brain.x * brain.x) + (brain.y * brain.y);
    move = findEnemy(squares);

    if (move) {
      brain.type = 42;
    } else {
      do {
        move = processType(brain.type, squares, brain, power);
      } while (move === 6);
    }

    if (move) {
      if ((squares[move].team === squares[0].team) && (squares[move].numAnts > (MaxSquareAnts / 2) - 3)) {
        brain.type = 100;
        return 0;
      }

      brain.x += (move === 1) - (move === 3);
      brain.y += (move === 2) - (move === 4);
      distance = ((brain.x) * (brain.x)) + ((brain.y) * (brain.y));

      if (distance < power) return move + 8;
      return move;
    } else {
      if (power) return move;
      return 16;
    }
  }

  // Constants that would be defined in the headers
  const NewBaseAnts = 10;
  const NewBaseFood = 20;
  const MaxSquareAnts = 200;

  const myBrain = antInfo.brains[0];
  return speedyMain(squareData, myBrain);
}
