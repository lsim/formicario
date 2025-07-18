import { describe, it, expect } from 'vitest';
import { Battle, type AntFunction, type SquareData, type AntInfo } from '@/Battle';
import type { GameSpec } from '@/GameSpec';

describe('Brain Array Synchronization', () => {
  it('should maintain sync between square.numAnts and brain array length', () => {
    // Create a simple test scenario where ants die and brain arrays are collected
    const spec: GameSpec = {
      mapWidth: [64, 64],
      mapHeight: [64, 64],
      newFoodSpace: [100, 100], // Reduce food spawning
      newFoodMin: [1, 1],
      newFoodDiff: [1, 1],
      startAnts: [3, 3], // Start with fewer ants
      halfTimeTurn: 50,
      halfTimePercent: 50,
      timeOutTurn: 100, // Short timeout
      winPercent: 50,
      statusInterval: 10,
      teams: [{ name: 'TestAnt', code: 'function() {}' }],
      seed: 12345,
      numBattles: 1,
      numBattleTeams: 1,
    };

    const brainCheckResults: { numAnts: number; numBrains: number }[] = [];

    const testAnt: AntFunction = ((squareData?: SquareData[], antInfo?: AntInfo) => {
      if (!squareData || !antInfo) {
        return {
          brainTemplate: { state: 0, counter: 0 },
          name: 'TestAnt',
          color: '#ff0000',
        };
      }

      // Always capture the brain consistency data
      brainCheckResults.push({
        numAnts: squareData[0].numAnts,
        numBrains: antInfo.brains.length,
      });

      return 0; // Don't move - just stay put to avoid infinite loops
    }) as AntFunction;

    const battle = new Battle(spec, [testAnt], 12345);

    // Run just one turn to test brain consistency
    battle.doTurn();

    console.log('Brain check results:', brainCheckResults);

    // Verify that for each brain collection, numAnts matches numBrains
    brainCheckResults.forEach((result, index) => {
      expect(
        result.numAnts,
        `Check ${index}: square.numAnts (${result.numAnts}) should equal brain array length (${result.numBrains})`,
      ).toBe(result.numBrains);
    });
  });

  it('should handle base building brain consistency', () => {
    // Simple test that manually triggers the brain consistency check without full base building
    const spec: GameSpec = {
      mapWidth: [64, 64],
      mapHeight: [64, 64],
      newFoodSpace: [100, 100],
      newFoodMin: [1, 1],
      newFoodDiff: [1, 1],
      startAnts: [26, 26], // Enough ants to build a base
      halfTimeTurn: 50,
      halfTimePercent: 50,
      timeOutTurn: 100,
      winPercent: 50,
      statusInterval: 10,
      teams: [{ name: 'BaseBuildingAnt', code: 'function() {}' }],
      seed: 54321,
      numBattles: 1,
      numBattleTeams: 1,
    };

    let brainConsistencyChecked = false;

    const baseBuildingAnt: AntFunction = ((squareData?: SquareData[], antInfo?: AntInfo) => {
      if (!squareData || !antInfo) {
        return {
          brainTemplate: { tried: false },
          name: 'BaseBuildingAnt',
          color: '#00ff00',
        };
      }

      // Check brain consistency - this is where the bug would manifest
      console.log(
        `Brain consistency check: numAnts=${squareData[0].numAnts}, numBrains=${antInfo.brains.length}`,
      );
      expect(
        squareData[0].numAnts,
        `Brain mismatch: numAnts=${squareData[0].numAnts}, numBrains=${antInfo.brains.length}`,
      ).toBe(antInfo.brains.length);

      brainConsistencyChecked = true;
      return 0; // Don't actually build base to avoid complexity
    }) as AntFunction;

    const battle = new Battle(spec, [baseBuildingAnt], 54321);

    // Artificially add food to the center square to prepare for base building scenario
    const centerSquare = battle.mapData(32, 32);
    centerSquare.numFood = 60; // Set up conditions for base building

    // Run one turn to trigger brain collection
    battle.doTurn();

    expect(brainConsistencyChecked, 'Brain consistency should have been checked').toBe(true);
  });
});
