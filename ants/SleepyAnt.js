function SleepyAnt(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        random: 1,
        X: 0,
        Y: 0,
        Dist: 0,
        TargetX: 0,
        TargetY: 0,
        Misc: 0,
        Direction: 0,
        Task: 0
      },
      name: 'SleepyAnt',
      color: '#666699', // From C implementation
    };
  }

  // Helper functions to avoid Math API
  function abs(a) {
    return a >= 0 ? a : -a;
  }

  // Constants
  const Min_Dist_Add = 30;
  const Start_Dist = 20;
  const StartAttack = 10;
  const MaxRadius = 300;
  const Attack_Rate = 5;
  const MaxSquareAnts = 200;

  // Task constants
  const Task_NewAnt = 0;
  const Task_GoOut = 20;
  const Task_GoHome = 21;
  const Task_GetFood = 22;
  const Task_HomeFoundFood = 40;
  const Task_HomeWithFood = 41;
  const Task_TellOtherAboutFood = 42;
  const Task_Guard = 43;
  const Task_Direct_Attack = 44;
  const Task_RealDirect_Attack = 45;
  const Task_Attack = 46;

  const myBrain = antInfo.brains[0];

  // Helper functions
  function sleepyRandom(num) {
    const BattleSeed = myBrain.random = (myBrain.random * (42 * 42 - (42 / 42) | 0 + 42) + 7) >>> 0;
    const a = BattleSeed;
    
    if (num === 0) return 0;
    return (((a << 19) + (a >> 13)) | 0) % num;
  }

  function setTaskGoOut() {
    myBrain.Task = Task_GoOut;
    myBrain.Misc = 0;
    switch ((myBrain.Direction & 3) + 1) {
      case 1:
        myBrain.TargetX = myBrain.Dist;
        myBrain.TargetY = -sleepyRandom(myBrain.Dist) - sleepyRandom((myBrain.Dist / 2) | 0);
        break;
      case 2:
        myBrain.TargetX = sleepyRandom(myBrain.Dist) + sleepyRandom((myBrain.Dist / 2) | 0);
        myBrain.TargetY = myBrain.Dist;
        break;
      case 3:
        myBrain.TargetX = -myBrain.Dist;
        myBrain.TargetY = sleepyRandom(myBrain.Dist) + sleepyRandom((myBrain.Dist / 2) | 0);
        break;
      case 4:
        myBrain.TargetX = -sleepyRandom(myBrain.Dist) - sleepyRandom((myBrain.Dist / 2) | 0);
        myBrain.TargetY = -myBrain.Dist;
        break;
    }
  }

  function sleepGetTask() {
    let i, Dist, TmpDist, CurrentPos = 0;
    let WarIndex = -1;

    if (myBrain.Task === Task_NewAnt) {
      myBrain.Dist = Start_Dist;
      myBrain.Direction = sleepyRandom(4);
      myBrain.X = myBrain.Y = 0;
    }
    myBrain.Dist = myBrain.Dist > MaxRadius ? MaxRadius : myBrain.Dist;

    Dist = 9999; // Distance to food

    // First find out if anyone knows where there is food
    for (i = 1; i !== squareData[0].numAnts; i++) {
      if (antInfo.brains[i].Task === Task_TellOtherAboutFood && antInfo.brains[i].Misc > 0) {
        TmpDist = abs(antInfo.brains[i].X) + abs(antInfo.brains[i].Y);
        if (TmpDist < Dist) {
          Dist = TmpDist;
          CurrentPos = i;
        }
      } else if (WarIndex === -1 && antInfo.brains[i].Task === Task_RealDirect_Attack) {
        WarIndex = i;
      }
    }

    if (CurrentPos) {
      myBrain.Task = Task_GetFood;
      antInfo.brains[CurrentPos].Misc--;
      myBrain.TargetX = antInfo.brains[CurrentPos].TargetX;
      myBrain.TargetY = antInfo.brains[CurrentPos].TargetY;
      return;
    }

    // Do we want to start a war?
    if (WarIndex >= 0 && sleepyRandom(Attack_Rate) === 0) {
      myBrain.TargetX = antInfo.brains[WarIndex].TargetX;
      myBrain.TargetY = antInfo.brains[WarIndex].TargetY;
      myBrain.Misc = antInfo.brains[WarIndex].Misc;
      myBrain.Task = Task_Attack;
    } else {
      let Dist = (myBrain.Dist / 3) | 0;
      setTaskGoOut();

      if (Dist < Min_Dist_Add) Dist = Min_Dist_Add;
      myBrain.Dist += Dist;
    }
  }

  function sleepGotoHandlerSearch(X, Y) {
    let Result = 0;
    const AbsX = abs(myBrain.X - X);
    const AbsY = abs(myBrain.Y - Y);

    if (AbsX === 0 && AbsY === 0) return 0;

    if (AbsX && AbsY) {
      if ((sleepyRandom(AbsY) / 2) | 0 > sleepyRandom(AbsX)) {
        if (myBrain.Y > Y) Result = 4;
        else if (myBrain.Y < Y) Result = 2;
      } else {
        if (myBrain.X > X) Result = 3;
        else if (myBrain.X < X) Result = 1;
      }
    } else {
      if (myBrain.X !== X) {
        if (myBrain.X > X) Result = 3;
        else Result = 1;
      } else {
        if (myBrain.Y > Y) Result = 4;
        else if (myBrain.Y === Y) Result = 0;
        else Result = 2;
      }
    }
    return Result;
  }

  function sleepGotoHandlerDirect(X, Y) {
    let Result = 0;
    const AbsX = abs(myBrain.X - X);
    const AbsY = abs(myBrain.Y - Y);

    if (AbsX === 0 && AbsY === 0) return 0;

    if (AbsX && AbsY) {
      if (sleepyRandom(AbsY) > sleepyRandom(AbsX)) {
        if (myBrain.Y > Y) Result = 4;
        else if (myBrain.Y < Y) Result = 2;
      } else {
        if (myBrain.X > X) Result = 3;
        else if (myBrain.X < X) Result = 1;
      }
    } else {
      if (myBrain.X !== X) {
        if (myBrain.X > X) Result = 3;
        else Result = 1;
      } else {
        if (myBrain.Y > Y) Result = 4;
        else if (myBrain.Y === Y) Result = 0;
        else Result = 2;
      }
    }
    return Result;
  }

  function sleepGotoHandlerLines() {
    let Result = 0;

    if (abs(myBrain.X) > abs(myBrain.Y)) {
      if (myBrain.X > 0) Result = 3;
      else Result = 1;
    } else {
      if (myBrain.Y > 0) Result = 4;
      else if (myBrain.Y < 0) Result = 2;
      else Result = 0;
    }
    return Result;
  }

  function sleepExistsFood() {
    let i, FoodCount = 0;

    if (myBrain.X === 0 && myBrain.Y === 0) return -1;

    if (squareData[0].numFood) {
      // Standing on the food. Find out if others are doing the same thing
      for (i = 1; i !== squareData[0].numAnts; i++) {
        if (antInfo.brains[i].Task === Task_HomeFoundFood || antInfo.brains[i].Task === Task_HomeWithFood) {
          FoodCount++;
        }
      }
      if (FoodCount >= squareData[0].numAnts) return -1;
      else return 0;
    }

    for (i = 1; i !== 5; i++) {
      if (squareData[i].numFood > squareData[i].numAnts) return i;
    }

    return -1;
  }

  function sleepExistsEnemy() {
    for (let i = 1; i !== 5; i++) {
      if (squareData[i].numAnts) {
        if (squareData[i].team !== squareData[0].team) return i;
      }
    }
    return 0;
  }

  function sleepIAmHome() {
    let i;

    if (myBrain.Task === Task_HomeFoundFood) {
      // Find out if someone else already has found this food
      for (i = 1; i !== squareData[0].numAnts; i++) {
        if (antInfo.brains[i].TargetX === myBrain.TargetX && antInfo.brains[i].TargetY === myBrain.TargetY) {
          sleepGetTask();
          return;
        }
      }
      myBrain.Task = Task_TellOtherAboutFood;
    } else {
      sleepGetTask();
    }
  }

  function sleepPerformTask() {
    let i, Result, Dist;

    if (myBrain.Task !== Task_HomeFoundFood) {
      Result = sleepExistsEnemy();
      if (Result > 0) {
        if (myBrain.Task === Task_Guard) {
          if (++myBrain.Misc === StartAttack) {
            myBrain.Task = Task_Direct_Attack;
            myBrain.TargetX = myBrain.X;
            myBrain.TargetY = myBrain.Y;
            if (abs(myBrain.X) > abs(myBrain.Y)) {
              if (myBrain.X > 0) myBrain.Misc = 1;
              else myBrain.Misc = 3;
            } else if (myBrain.Y > 0) {
              myBrain.Misc = 2;
            } else {
              myBrain.Misc = 4;
            }
          }
        } else {
          myBrain.Task = Task_Guard;
          myBrain.Misc = 0;
        }
        return Result;
      }
    }

    if (myBrain.Task >= Task_GoOut && myBrain.Task < Task_GetFood) {
      // Search for food
      Result = sleepExistsFood();
      if (Result === 0) {
        // Standing on some food
        myBrain.Task = Task_HomeFoundFood;
        myBrain.TargetX = myBrain.X;
        myBrain.TargetY = myBrain.Y;
        myBrain.Misc = squareData[0].numFood;
        Result = sleepPerformTask();
        return Result;
      } else if (Result > 0) {
        return Result;
      }
    }

    switch (myBrain.Task) {
      case Task_GoOut:
        Result = sleepGotoHandlerSearch(myBrain.TargetX, myBrain.TargetY);
        if (Result === 0) {
          if (myBrain.Dist === Start_Dist) {
            myBrain.Task = Task_GoHome;
          } else {
            myBrain.Task = Task_GoHome;
            break;
          }
          Result = sleepPerformTask();
        }
        break;

      case Task_GoHome:
        Result = sleepGotoHandlerSearch(0, 0);
        if (Result === 0) {
          sleepGetTask();
          Result = sleepPerformTask();
        }
        break;

      case Task_HomeWithFood:
        Result = sleepGotoHandlerLines() + 8;
        if (Result === 8) {
          sleepIAmHome();
          Result = sleepPerformTask();
        }
        break;

      case Task_HomeFoundFood:
        for (i = 1; i !== squareData[0].numAnts; i++) {
          if (antInfo.brains[i].Task >= Task_GoOut && antInfo.brains[i].Task < Task_GetFood) {
            // Tell it where there is food
            antInfo.brains[i].Task = Task_GetFood;
            antInfo.brains[i].TargetX = myBrain.TargetX;
            antInfo.brains[i].TargetY = myBrain.TargetY;
            if (--myBrain.Misc <= 0) {
              setTaskGoOut();
              Result = sleepPerformTask();
              return Result;
            }
          }
        }

        Result = sleepGotoHandlerLines() + 8;
        if (Result === 8) {
          sleepIAmHome();
          Result = sleepPerformTask();
        }
        break;

      case Task_TellOtherAboutFood:
        if (myBrain.Misc > 0) {
          Result = 0;
        } else if (myBrain.Misc === 0) {
          myBrain.Misc = -2;
          Result = 0;
        } else if (myBrain.Misc-- < -100) {
          sleepGetTask();
          myBrain.Misc = 0;
          Result = sleepPerformTask();
        } else {
          Result = 0;
        }
        break;

      case Task_GetFood:
        Result = sleepGotoHandlerDirect(myBrain.TargetX, myBrain.TargetY);
        if (Result === 0) {
          if (squareData[0].numFood > 0) {
            myBrain.Task = Task_HomeWithFood;
            Result = sleepPerformTask();
          } else {
            setTaskGoOut();
            Result = sleepPerformTask();
          }
        }
        break;

      case Task_Guard:
        Dist = abs(myBrain.X) + abs(myBrain.Y); // Just a temp var
        Result = 0;

        for (i = 1; i !== squareData[0].numAnts; i++) {
          if (antInfo.brains[i].Dist > Dist) {
            myBrain.Dist = -myBrain.Dist;
            myBrain.Task = Task_GoOut;
            Result = sleepPerformTask();
            break;
          }
        }
        break;

      case Task_Direct_Attack:
        Result = sleepGotoHandlerDirect(0, 0);
        if (Result === 0) {
          for (i = 0; i !== squareData[0].numAnts; i++) {
            if (antInfo.brains[i].Task === Task_RealDirect_Attack) {
              setTaskGoOut();
              Result = sleepPerformTask();
              return Result;
            }
          }
          myBrain.Task = Task_RealDirect_Attack;
        }
        break;

      case Task_RealDirect_Attack:
        Result = 0;
        break;

      case Task_Attack:
        Result = sleepGotoHandlerDirect(myBrain.TargetX, myBrain.TargetY);
        if (Result) return Result;

        // We made it. Let's start the attack
        const Gridx = 1;
        const Gridy = 2;

        if (squareData[0].numAnts > 1) {
          // Move further
          switch (myBrain.Misc) {
            case 0:
              myBrain.TargetX += Gridx;
              myBrain.TargetY -= Gridy;
              break;
            case 1:
              myBrain.TargetX += Gridx;
              myBrain.TargetY -= Gridy;
              break;
            case 2:
              myBrain.TargetX -= Gridx;
              myBrain.TargetY += Gridy;
              break;
            case 3:
              myBrain.TargetX -= Gridx;
              myBrain.TargetY -= Gridy;
              break;
            default:
              Result = 1;
              break;
          }
          Result = sleepGotoHandlerDirect(myBrain.TargetX, myBrain.TargetY);
        } else {
          Result = 0;
        }
        break;

      default:
        Result = 0;
    }
    return Result;
  }

  // Main function
  if (myBrain.Task === Task_NewAnt) {
    sleepGetTask();
  }

  let Result = sleepPerformTask();
  let Weight = 20;

  if (myBrain.Task === Task_GoHome) {
    Weight += 10;
  } else if (myBrain.Task === Task_HomeWithFood || myBrain.Task === Task_HomeFoundFood) {
    Weight -= 10;
  } else if (myBrain.Task === Task_GoOut || myBrain.Task === Task_GetFood) {
    Weight -= 20;
  }

  switch (Result & 7) {
    case 0:
      break;
    case 1:
      if (squareData[1].numAnts >= MaxSquareAnts - Weight) {
        Result = 0;
      } else {
        myBrain.X++;
      }
      break;
    case 2:
      if (squareData[2].numAnts >= MaxSquareAnts - Weight) {
        Result = 0;
      } else {
        myBrain.Y++;
      }
      break;
    case 3:
      if (squareData[3].numAnts >= MaxSquareAnts - Weight) {
        Result = 0;
      } else {
        myBrain.X--;
      }
      break;
    case 4:
      if (squareData[4].numAnts >= MaxSquareAnts - Weight) {
        Result = 0;
      } else {
        myBrain.Y--;
      }
      break;
    default:
      break;
  }

  return Result;
}