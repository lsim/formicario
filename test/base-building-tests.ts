import { describe, it, expect } from 'vitest';
import { Battle, type AntFunction, type SquareData, type AntInfo } from '@/Battle';
import type { GameSpec } from '@/GameSpec';

describe('Base Building Brain Management', () => {
  it('should maintain consistent brain arrays during base building', () => {
    let errorCount = 0;
    let baseBuildingDetected = false;

    const baseBuildingAnt: AntFunction = ((squareData?: SquareData[], antInfo?: AntInfo) => {
      if (!squareData || !antInfo) {
        return {
          brainTemplate: {
            initialized: true,
            gatherMode: true,
          },
          name: 'BaseBuildingAnt',
          color: '#00FF00',
        };
      }

      console.log(
        `Ant function called! Square: ants=${squareData[0].numAnts}, food=${squareData[0].numFood}, base=${squareData[0].base}`,
      );

      // Check for undefined brains that would cause errors
      if (!antInfo.brains[0]) {
        errorCount++;
        console.error(
          `ERROR: Undefined brain[0] detected! Square has ${squareData[0].numAnts} ants, base: ${squareData[0].base}`,
        );
        return 0;
      }

      // Force base building on first ant call to test the mechanism
      if (!baseBuildingDetected) {
        baseBuildingDetected = true;
        console.log(
          `FORCING base building with ${squareData[0].numAnts} ants and ${squareData[0].numFood} food`,
        );
        return 16; // Build base - this should trigger the brain consistency issue
      } else {
        // Otherwise just stay put
        console.log(
          `Not building base: base=${squareData[0].base}, ants=${squareData[0].numAnts}, food=${squareData[0].numFood}`,
        );
        return 0;
      }
    }) as AntFunction;

    const gameSpec: GameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [64, 64],
      mapWidth: [64, 64],
      newFoodDiff: [5, 10],
      newFoodMin: [5, 10],
      newFoodSpace: [5, 10],
      seed: 42,
      startAnts: [25, 25], // Start with enough ants for base building
      teams: [],
      timeOutTurn: 200,
      winPercent: 70,
      numBattles: 1,
    };

    const battle = new Battle(gameSpec, [baseBuildingAnt], 123);

    // Add food to enable base building
    const baseX = Math.floor(battle.args.mapWidth / 2);
    const baseY = Math.floor(battle.args.mapHeight / 2);
    const baseSquare = battle['mapData'](baseX, baseY);
    baseSquare.numFood = 60; // Enough food for base building
    battle.numFood += 60;

    // Run battle until base building occurs
    for (let turn = 0; turn < 5; turn++) {
      battle.doTurn();

      // Stop if we detected base building
      if (baseBuildingDetected) {
        break;
      }
    }

    // Verify the test scenario occurred
    expect(baseBuildingDetected).toBe(true); // Should have attempted base building
    expect(errorCount).toBe(0); // Should have no undefined brain errors
  });

  it('should handle ant creation at new bases correctly', () => {
    let brainErrorCount = 0;

    const newBaseTestAnt: AntFunction = ((squareData?: SquareData[], antInfo?: AntInfo) => {
      if (!squareData || !antInfo) {
        return {
          brainTemplate: { role: 'worker' },
          name: 'NewBaseTestAnt',
          color: '#FF0000',
        };
      }

      // Validate brain consistency
      if (!antInfo.brains[0]) {
        brainErrorCount++;
        console.error(
          `Brain error on square with ${squareData[0].numAnts} ants, base: ${squareData[0].base}`,
        );
        return 0;
      }

      // Detect if we're on a newly created base
      if (squareData[0].base && squareData[0].numAnts > 30) {
        console.log(`On new base with ${squareData[0].numAnts} ants`);
      }

      // Simple behavior: bring food to base if found
      if (squareData[0].numFood > 0 && !squareData[0].base) {
        return 8 + 4; // Carry food up toward base
      } else if (squareData[0].base) {
        return 2; // Go down from base to find food
      } else {
        return 0; // Stay put
      }
    }) as AntFunction;

    const gameSpec: GameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [64, 64],
      mapWidth: [64, 64],
      newFoodDiff: [3, 6],
      newFoodMin: [3, 6],
      newFoodSpace: [4, 8],
      seed: 123,
      startAnts: [20, 20],
      teams: [],
      timeOutTurn: 100,
      winPercent: 70,
      numBattles: 1,
    };

    const battle = new Battle(gameSpec, [newBaseTestAnt], 123);

    // Set up conditions for base building and ant creation
    const baseX = Math.floor(battle.args.mapWidth / 2);
    const baseY = Math.floor(battle.args.mapHeight / 2);

    // Place food one square down from base to trigger ant movement and creation
    const foodY = (baseY + 1) % battle.args.mapHeight;
    const foodSquare = battle['mapData'](baseX, foodY);
    foodSquare.numFood = 20; // Enough food for multiple ant creation cycles
    battle.numFood += 20;

    // Also set up base building scenario
    const baseSquare = battle['mapData'](baseX, baseY);
    baseSquare.numFood += 50; // Add food for base building

    // Run battle to trigger base building and ant creation
    for (let turn = 0; turn < 30; turn++) {
      battle.doTurn();
    }

    // The test passes if no brain errors occurred
    expect(brainErrorCount).toBe(0);
  });
});
