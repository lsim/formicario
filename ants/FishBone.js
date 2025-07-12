function FishBone(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        brain: 0 // Single byte that encodes multiple bit fields
      },
      name: 'FishBone',
      color: '#DDDDDD', // Light gray color from C implementation
    };
  }

  // Helper functions to avoid Math API
  function min(a, b) {
    return a < b ? a : b;
  }

  // Constants
  const FOUND_FOOD_AMOUNT = 3;
  const POSITION_WAR = 3;
  const DEFENCE_SHIFT = 3;
  const MaxSquareAnts = 100;

  const myBrain = antInfo.brains[0];

  // Bit field access functions (simulating C union/bitfields)
  // Walker state (when signpost bit is 0)
  function getSignpost(brain) { return brain & 1; }
  function setSignpost(brain, val) { return (brain & ~1) | (val ? 1 : 0); }

  function getDir(brain) { return (brain >> 1) & 3; }
  function setDir(brain, val) { return (brain & ~6) | ((val & 3) << 1); }

  function getPos(brain) { return (brain >> 3) & 3; }
  function setPos(brain, val) { return (brain & ~24) | ((val & 3) << 3); }

  function getFound(brain) { return (brain >> 5) & 1; }
  function setFound(brain, val) { return (brain & ~32) | ((val ? 1 : 0) << 5); }

  // Signpost state (when signpost bit is 1)
  function getOrient(brain) { return (brain >> 1) & 1; }
  function setOrient(brain, val) { return (brain & ~2) | ((val ? 1 : 0) << 1); }

  function getFoodLeft(brain) { return (brain >> 2) & 3; }
  function setFoodLeft(brain, val) { return (brain & ~12) | ((val & 3) << 2); }

  function getFoodRight(brain) { return (brain >> 4) & 3; }
  function setFoodRight(brain, val) { return (brain & ~48) | ((val & 3) << 4); }

  function fish() {
    let d = 0, n = 0;

    // Look for enemies
    for (let i = 1; i < 5; i++) {
      if (squareData[i].team && squareData[i].numAnts > n) {
        n = squareData[i].numAnts;
        d = i;
      }
    }

    if (d) {
      myBrain.brain = 0;
      myBrain.brain = setPos(myBrain.brain, POSITION_WAR);
      return d;
    }

    // Base logic
    if (squareData[0].base) {
      if (squareData[0].numAnts === 1) return 0;

      if (antInfo.brains.length > 1 && (antInfo.brains[1].brain & ~1)) {
        antInfo.brains[1].brain = myBrain.brain & 1;
      }

      myBrain.brain = 0;
      d = min(min(squareData[0].numAnts, squareData[2].numAnts), squareData[4].numAnts) >> DEFENCE_SHIFT;

      if (squareData[1].numAnts < squareData[3].numAnts) {
        if (squareData[1].numAnts < d) {
          myBrain.brain = setPos(myBrain.brain, POSITION_WAR);
          return 1;
        }
      } else {
        if (squareData[3].numAnts < d) {
          myBrain.brain = setPos(myBrain.brain, POSITION_WAR);
          return 3;
        }
      }

      if (antInfo.brains.length > 1) {
        antInfo.brains[1].brain = (antInfo.brains[1].brain + 1) & 1;
        myBrain.brain = setDir(myBrain.brain, (antInfo.brains[1].brain << 1) + 1);
      }
      myBrain.brain = setPos(myBrain.brain, 1);
      return ((getDir(myBrain.brain) + 2) & 3) + 1;
    }

    // If this ant is a signpost, stay put
    if (getSignpost(myBrain.brain)) return 0;

    // War position logic
    if (getPos(myBrain.brain) === POSITION_WAR) {
      if (getFound(myBrain.brain)) {
        if (squareData[0].numAnts > 1 && antInfo.brains.length > 1 && getSignpost(antInfo.brains[1].brain)) {
          if (!getFoodLeft(antInfo.brains[1].brain)) {
            antInfo.brains[1].brain = setFoodLeft(antInfo.brains[1].brain, 1);
          }
          if (!getFoodRight(antInfo.brains[1].brain)) {
            antInfo.brains[1].brain = setFoodRight(antInfo.brains[1].brain, 1);
          }
        }
        return getDir(myBrain.brain) + 9;
      }
      return 0;
    }

    // Signpost creation logic
    if ((getDir(myBrain.brain) & 1) && !getPos(myBrain.brain)) {
      if (squareData[0].numAnts > 1) {
        if (antInfo.brains.length > 1 && !getSignpost(antInfo.brains[1].brain)) {
          antInfo.brains[1].brain = setSignpost(antInfo.brains[1].brain, 1);
          antInfo.brains[1].brain = setOrient(antInfo.brains[1].brain, getDir(myBrain.brain) >> 1);
          antInfo.brains[1].brain = setFoodRight(antInfo.brains[1].brain, 1);
          antInfo.brains[1].brain = setFoodLeft(antInfo.brains[1].brain, 1);
        }
      } else {
        myBrain.brain = setSignpost(myBrain.brain, 1);
        myBrain.brain = setOrient(myBrain.brain, getDir(myBrain.brain) >> 1);
        myBrain.brain = setFoodRight(myBrain.brain, 1);
        myBrain.brain = setFoodLeft(myBrain.brain, 1);
        return 0;
      }
    }

    // Signpost interaction logic
    if (squareData[0].numAnts > 1 && antInfo.brains.length > 1 && getSignpost(antInfo.brains[1].brain)) {
      if (getDir(myBrain.brain) === ((!getOrient(antInfo.brains[1].brain)) << 1) + 1) {
        myBrain.brain = setPos(myBrain.brain, POSITION_WAR);
        myBrain.brain = setFound(myBrain.brain, 1);
        return 9 + getDir(myBrain.brain);
      }

      myBrain.brain = setPos(myBrain.brain, 0);
      if (getFound(myBrain.brain)) {
        switch (getDir(myBrain.brain)) {
          case 0:
            antInfo.brains[1].brain = setFoodLeft(antInfo.brains[1].brain, FOUND_FOOD_AMOUNT);
            break;
          case 2:
            antInfo.brains[1].brain = setFoodRight(antInfo.brains[1].brain, FOUND_FOOD_AMOUNT);
            break;
        }
      }

      myBrain.brain = 0;
      myBrain.brain = setDir(myBrain.brain, (getOrient(antInfo.brains[1].brain) << 1) + 1);

      if (squareData[0].numFood) return getDir(myBrain.brain) + 9;
      if (squareData[1].numFood > squareData[1].numAnts) {
        myBrain.brain = setDir(myBrain.brain, 2);
        return 1;
      }
      if (squareData[3].numFood > squareData[3].numAnts) {
        myBrain.brain = setDir(myBrain.brain, 0);
        return 3;
      }

      if (getFoodLeft(antInfo.brains[1].brain) || getFoodRight(antInfo.brains[1].brain)) {
        if (getFoodLeft(antInfo.brains[1].brain) > getFoodRight(antInfo.brains[1].brain)) {
          antInfo.brains[1].brain = setFoodLeft(antInfo.brains[1].brain, getFoodLeft(antInfo.brains[1].brain) - 1);
          myBrain.brain = setDir(myBrain.brain, 0);
        } else {
          antInfo.brains[1].brain = setFoodRight(antInfo.brains[1].brain, getFoodRight(antInfo.brains[1].brain) - 1);
          myBrain.brain = setDir(myBrain.brain, 2);
        }
      }
      return ((getDir(myBrain.brain) + 2) & 3) + 1;
    } else {
      myBrain.brain = setFound(myBrain.brain, 0);
      if (squareData[0].numFood) {
        myBrain.brain = setFound(myBrain.brain, 1);
        if (getDir(myBrain.brain) & 1) return getDir(myBrain.brain) + 9;

        switch (getPos(myBrain.brain)) {
          case 1: return 10;
          case 2: return 12;
        }
        return getDir(myBrain.brain) + 9;
      } else {
        if (!(getDir(myBrain.brain) & 1)) {
          if (squareData[2].numFood > squareData[2].numAnts) return 2;
          if (squareData[4].numFood > squareData[4].numAnts) return 4;
        }
        return ((getDir(myBrain.brain) + 2) & 3) + 1;
      }
    }
  }

  // Main fishbone function
  let retval = fish();
  let d = retval & 7;

  if ((getPos(myBrain.brain) === POSITION_WAR) && !getSignpost(myBrain.brain)) {
    return d;
  }

  if (d) {
    if (squareData[d].numAnts >= MaxSquareAnts) {
      retval = d = ((d + 1) & 3) + 1;
      const temp = getDir(myBrain.brain);
      myBrain.brain = 0;
      myBrain.brain = setDir(myBrain.brain, temp);
    }

    switch (d) {
      case 2:
        myBrain.brain = setPos(myBrain.brain, (getPos(myBrain.brain) + 2) % 3);
        break;
      case 4:
        myBrain.brain = setPos(myBrain.brain, (getPos(myBrain.brain) + 1) % 3);
        break;
    }
  }

  return retval;
}
