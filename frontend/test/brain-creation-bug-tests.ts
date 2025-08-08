import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  Battle,
  type AntFunction,
  type SquareData,
  type AntInfo,
  type BattleArgs,
  produceBattleArgs,
} from '@/Battle.ts';
import type { GameSpec } from '@/GameSpec.ts';
import { getRNG, type RNGFunction } from '@/prng.ts';

describe('Brain Data Consistency During Ant Creation', () => {
  beforeEach(() => {
    vi.stubGlobal('console', { log: vi.fn(), debug: vi.fn(), error: vi.fn() });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('should provide all defined brains when new ants are created at bases', () => {
    // This test would have caught the original bug where undefined brains were passed to ant functions
    let undefinedBrainDetected = false;
    let brainTestCount = 0;
    let maxBrainsObserved = 0;

    const foodBringingAnt: AntFunction = ((squareData?: SquareData[], antInfo?: AntInfo) => {
      // Return ant descriptor when called without arguments
      if (!squareData || !antInfo) {
        return {
          brainTemplate: {
            initialized: true,
            position: { x: 0, y: 0 },
            task: 'explore',
          },
          name: 'BrainTester',
          color: '#00FF00',
        };
      }

      brainTestCount++;
      const brainCount = antInfo.brains.length;
      maxBrainsObserved = Math.max(maxBrainsObserved, brainCount);

      // This is the critical test that would have caught the bug:
      // Validate that ALL brains in the array are defined and properly initialized
      for (let i = 0; i < antInfo.brains.length; i++) {
        if (!antInfo.brains[i]) {
          undefinedBrainDetected = true;
          console.error(
            `CRITICAL BUG: Brain at index ${i} is undefined! (out of ${antInfo.brains.length} total brains)`,
          );
          // In the original bug, this would have failed because newly created ants
          // were included in getAntsOnSquare() but not yet ready to have their brains accessed
          break;
        }

        if (typeof antInfo.brains[i] !== 'object') {
          undefinedBrainDetected = true;
          console.error(
            `CRITICAL BUG: Brain at index ${i} is not an object:`,
            typeof antInfo.brains[i],
          );
          break;
        }

        // Verify brain has expected structure
        if (!antInfo.brains[i].hasOwnProperty('initialized')) {
          undefinedBrainDetected = true;
          console.error(`CRITICAL BUG: Brain at index ${i} missing initialized property`);
          break;
        }
      }

      const myBrain = antInfo.brains[0];

      // Simple but effective strategy to trigger ant creation:
      // 1. Explore randomly until food is found
      // 2. Bring food back to base (creating new ants)
      // 3. Repeat

      if (squareData[0].numFood > 0) {
        // Found food - bring it home (always move up)
        myBrain.task = 'returning';
        return 8 + 4; // 8 = carry food flag, 4 = up/north
      } else {
        // No food here - go down to find food
        myBrain.task = 'explore';
        return 2; // 2 = down/south
      }
    }) as AntFunction;

    const gameSpec: GameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [64, 64], // Smaller map for more likely food encounters
      mapWidth: [64, 64],
      newFoodDiff: [3, 6],
      newFoodMin: [3, 6],
      newFoodSpace: [4, 8], // More frequent food placement
      seed: 42,
      startAnts: [4, 4],
      teams: [],
      timeOutTurn: 1000,
      winPercent: 70,
      numBattles: 1,
      numBattleTeams: 1,
    };

    const rng: RNGFunction = getRNG(42);
    const battleArgs: BattleArgs = produceBattleArgs(gameSpec, rng);
    const battle = new Battle(battleArgs, [{ id: 'TestAnt', func: foodBringingAnt }], 123, 0);

    // Place food one square down from the base for deterministic testing
    const baseX = Math.floor(battle.testAccess().mapWidth / 2);
    const baseY = Math.floor(battle.testAccess().mapHeight / 2);
    const foodX = baseX;
    const foodY = (baseY + 1) % battle.testAccess().mapHeight; // One square down from base

    const foodSquare = battle['mapData'](foodX, foodY);
    foodSquare.numFood = 10; // Plenty of food for multiple ant creation cycles
    battle.numFood += 10;

    // Run the battle long enough for ants to find food and bring it back
    // This should trigger the creation of new ants at the base
    for (let turn = 0; turn < 50; turn++) {
      // Increased turns
      battle.doTurn();
    }

    // Verify the test actually ran meaningful scenarios
    expect(brainTestCount).toBeGreaterThan(20); // Should have tested many ant actions
    expect(maxBrainsObserved).toBeGreaterThan(4); // Should have observed more ants than we started with (indicating ant creation)

    // The critical assertion that would have caught the original bug:
    expect(undefinedBrainDetected).toBe(false);
  });

  it('should maintain brain array consistency when multiple ants occupy the same base square', () => {
    // This test specifically targets the scenario where the bug occurred:
    // Multiple ants on a base square, some newly created

    let baseSquareWithMultipleAntsObserved = false;
    let brainArrayInconsistencyDetected = false;

    const coordinnatingAnt: AntFunction = ((squareData?: SquareData[], antInfo?: AntInfo) => {
      if (!squareData || !antInfo) {
        return {
          brainTemplate: {
            id: Math.random(),
            creationTime: Date.now(),
            actionsPerformed: 0,
          },
          name: 'CoordinatingAnt',
          color: '#FF0000',
        };
      }

      const myBrain = antInfo.brains[0];
      myBrain.actionsPerformed = (myBrain.actionsPerformed || 0) + 1;

      // If we're on a base square with multiple ants, this is our target scenario
      if (squareData[0].base && antInfo.brains.length > 1) {
        baseSquareWithMultipleAntsObserved = true;

        // Verify brain array consistency
        const brainCount = antInfo.brains.length;
        const antCount = squareData[0].numAnts;

        console.log(`Base square: ${brainCount} brains, ${antCount} ants reported`);

        // In the original bug, this could fail because:
        // - getAntsOnSquare() would return ALL ants (including newly created ones)
        // - But some of those ants shouldn't have been acting yet
        // - Leading to brain array length mismatch or undefined brains

        for (let i = 0; i < brainCount; i++) {
          if (!antInfo.brains[i] || typeof antInfo.brains[i] !== 'object') {
            brainArrayInconsistencyDetected = true;
            console.error(`Brain inconsistency: brain[${i}] is invalid:`, antInfo.brains[i]);
          }
        }

        // Try to access and modify all brains (this would crash with the original bug)
        for (let i = 0; i < antInfo.brains.length; i++) {
          try {
            // These operations would fail with undefined brains
            antInfo.brains[i].actionsPerformed = (antInfo.brains[i].actionsPerformed || 0) + 1;
            antInfo.brains[i].lastCoordination = Date.now();
          } catch (error) {
            brainArrayInconsistencyDetected = true;
            console.error(`Failed to access brain[${i}]:`, error);
          }
        }
      }

      // Strategy designed to get multiple ants on the base square:
      // Aggressively bring food back to create many new ants
      if (squareData[0].numFood > 0 && !squareData[0].base) {
        // Found food - bring it home immediately
        const homeDirections = [1, 2, 3, 4];
        return 8 + homeDirections[Math.floor(Math.random() * homeDirections.length)];
      } else if (squareData[0].base) {
        // At base - either stay to coordinate or go explore
        if (Math.random() < 0.3) {
          return 0; // Stay at base (increases chance of multiple ants on base)
        } else {
          return Math.floor(Math.random() * 4) + 1; // Go explore
        }
      } else {
        // Explore for food
        return Math.floor(Math.random() * 4) + 1;
      }
    }) as AntFunction;

    const gameSpec: GameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [128, 128],
      mapWidth: [128, 128],
      newFoodDiff: [5, 10],
      newFoodMin: [5, 10],
      newFoodSpace: [6, 12],
      seed: 123,
      startAnts: [3, 3],
      teams: [],
      timeOutTurn: 1000,
      winPercent: 70,
      numBattles: 1,
      numBattleTeams: 1,
    };

    const rng2: RNGFunction = getRNG(123);
    const battleArgs2: BattleArgs = produceBattleArgs(gameSpec, rng2);
    const battle = new Battle(battleArgs2, [{ id: 'TestAnt', func: coordinnatingAnt }], 123, 0);

    // Run battle to trigger the target scenario
    for (let turn = 0; turn < 25; turn++) {
      battle.doTurn();
    }

    // Verify we successfully created the test scenario
    expect(baseSquareWithMultipleAntsObserved).toBe(true);

    // The key assertion - brain arrays should always be consistent
    expect(brainArrayInconsistencyDetected).toBe(false);
  });
});
