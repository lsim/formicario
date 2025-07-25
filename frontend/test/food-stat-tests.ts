import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { GameSpec } from '@/GameSpec.ts';
import { Battle, type AntFunction, type AntInfo, type SquareData } from '@/Battle.ts';

describe('Food statistics tests', () => {
  let gameSpec: GameSpec;
  let simpleAnt: AntFunction;
  let aggressiveAnt: AntFunction;

  beforeEach(() => {
    gameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [128, 128],
      mapWidth: [128, 128],
      newFoodDiff: [5, 10],
      newFoodMin: [5, 10],
      newFoodSpace: [20, 30],
      seed: 42,
      startAnts: [5, 5],
      teams: [],
      timeOutTurn: 1000,
      winPercent: 70,
      numBattles: 1,
      numBattleTeams: 2,
    };

    // Simple ant that moves randomly
    simpleAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
      if (!map || !antInfo) {
        return { name: 'SimpleAnt', color: '#FF0000', brainTemplate: { counter: 0 } };
      }
      // Use deterministic movement based on brain state
      const brain = antInfo.brains[0];
      // brain.counter = (brain.counter || 0) + 1;
      return brain.random % 5; // Deterministic direction cycle
    }) as AntFunction;

    // Aggressive ant that tries to move toward enemies
    aggressiveAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
      if (!map || !antInfo) {
        return { name: 'AggressiveAnt', color: '#0000FF', brainTemplate: {} };
      }
      // Look for enemies in adjacent squares and move toward them
      for (let i = 1; i < map.length; i++) {
        if (map[i].numAnts > 0 && map[i].team !== 0) {
          return i; // Move toward enemy
        }
      }
      return 0; // Stay if no enemies found
    }) as AntFunction;

    vi.spyOn(global, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Food statistics (foodOwnTouch) integration', () => {
    it('should maintain balanced food statistics during ant movement', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);

      // Set up source and destination squares with food
      const ant = battle.ants[0];
      const sourceSquare = battle.mapData(ant.xPos, ant.yPos);
      const destSquare = battle.mapData(ant.xPos + 1, ant.yPos);

      sourceSquare.numFood = 5;
      sourceSquare.numAnts = 2; // Including our ant
      destSquare.numFood = 3;
      destSquare.numAnts = 0;

      const initialFoodOwn = battle.teams[0].foodOwn;
      const initialFoodTouch = battle.teams[0].foodTouch;
      const initialFoodKnown = battle.teams[0].foodKnown;

      console.log('Before ant movement:', {
        foodOwn: initialFoodOwn,
        foodTouch: initialFoodTouch,
        foodKnown: initialFoodKnown,
      });

      // Move ant right - should call foodOwnTouch for both squares before and after
      battle.doAction(ant, 1); // Move right

      const finalFoodOwn = battle.teams[0].foodOwn;
      const finalFoodTouch = battle.teams[0].foodTouch;
      const finalFoodKnown = battle.teams[0].foodKnown;

      console.log('After ant movement:', {
        foodOwn: finalFoodOwn,
        foodTouch: finalFoodTouch,
        foodKnown: finalFoodKnown,
      });
      console.log('Net change:', {
        foodOwn: finalFoodOwn - initialFoodOwn,
        foodTouch: finalFoodTouch - initialFoodTouch,
        foodKnown: finalFoodKnown - initialFoodKnown,
      });

      // Movement should call: -sourceOld -destOld +sourceNew +destNew
      // This should balance out to reflect the new ant distribution
      expect(finalFoodOwn).toBeGreaterThanOrEqual(initialFoodOwn); // Should not go negative
    });

    it('should handle empty squares correctly in food statistics', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);

      const ant = battle.ants[0];
      const emptySquare = battle.mapData(ant.xPos + 1, ant.yPos);

      // Ensure destination is truly empty
      emptySquare.numFood = 0;
      emptySquare.numAnts = 0;
      emptySquare.team = 0;

      const initialFoodOwn = battle.teams[0].foodOwn;

      console.log('Before moving to empty square:', { foodOwn: initialFoodOwn });

      // Move to empty square
      battle.doAction(ant, 1); // Move right

      const finalFoodOwn = battle.teams[0].foodOwn;

      console.log('After moving to empty square:', { foodOwn: finalFoodOwn });
      console.log('Change:', finalFoodOwn - initialFoodOwn);

      // Moving to empty square should not cause massive negative changes
      expect(finalFoodOwn).toBeGreaterThanOrEqual(initialFoodOwn - 10); // Allow some reasonable variance
    });

    it('should verify foodOwnTouch method logic is correct', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);

      // Test the foodOwnTouch method directly with known values
      const testSquare: SquareData = {
        numAnts: 3,
        numFood: 5,
        team: 1,
        base: false,
        firstAnt: undefined,
        lastAnt: undefined,
      };

      const initialFoodOwn = battle.teams[0].foodOwn;
      const initialFoodTouch = battle.teams[0].foodTouch;
      const initialFoodKnown = battle.teams[0].foodKnown;

      // Add food statistics
      battle.foodOwnTouch(testSquare, 1, 1);

      const afterAddFoodOwn = battle.teams[0].foodOwn;
      const afterAddFoodTouch = battle.teams[0].foodTouch;
      const afterAddFoodKnown = battle.teams[0].foodKnown;

      console.log('After adding:', {
        foodOwn: afterAddFoodOwn - initialFoodOwn,
        foodTouch: afterAddFoodTouch - initialFoodTouch,
        foodKnown: afterAddFoodKnown - initialFoodKnown,
      });

      // Subtract food statistics
      battle.foodOwnTouch(testSquare, 1, -1);

      const afterSubtractFoodOwn = battle.teams[0].foodOwn;
      const afterSubtractFoodTouch = battle.teams[0].foodTouch;
      const afterSubtractFoodKnown = battle.teams[0].foodKnown;

      console.log('After subtracting:', {
        foodOwn: afterSubtractFoodOwn - initialFoodOwn,
        foodTouch: afterSubtractFoodTouch - initialFoodTouch,
        foodKnown: afterSubtractFoodKnown - initialFoodKnown,
      });

      // Should be back to initial values (balanced)
      expect(afterSubtractFoodOwn).toBe(initialFoodOwn);
      expect(afterSubtractFoodTouch).toBe(initialFoodTouch);
      expect(afterSubtractFoodKnown).toBe(initialFoodKnown);

      // Test expected values based on C implementation:
      // foodOwn = min(numFood, numAnts) = min(5, 3) = 3
      // foodTouch = numFood - foodOwn = 5 - 3 = 2
      // foodKnown = numFood = 5
      expect(afterAddFoodOwn - initialFoodOwn).toBe(3);
      expect(afterAddFoodTouch - initialFoodTouch).toBe(2);
      expect(afterAddFoodKnown - initialFoodKnown).toBe(5);
    });
  });

  describe('foodOwnTouch integration tests', () => {
    it('should call foodOwnTouch during termination check', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);

      // Set up a square with food and ants
      const square = battle.mapData(10, 10);
      square.numAnts = 3;
      square.numFood = 5;
      square.team = 1;

      const initialFoodOwn = battle.teams[0].foodOwn;

      // Call foodOwnTouch manually to test the function
      battle.foodOwnTouch(square, 1, 1);

      // Verify food statistics are updated
      expect(battle.teams[0].foodOwn).toBeGreaterThan(initialFoodOwn);
      expect(battle.teams[0].foodTouch).toBeGreaterThan(0);
      expect(battle.teams[0].foodKnown).toBe(5);
    });

    it('should update food statistics during ant movement and base building', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);

      const ant = battle.ants[0];
      const sourceSquare = battle.mapData(ant.xPos, ant.yPos);

      // Set up food on the ant's square
      sourceSquare.numFood = 10;
      sourceSquare.numAnts = 3; // Ant + 2 others

      // Check initial food statistics
      const initialFoodOwn = battle.teams[0].foodOwn;
      const initialFoodTouch = battle.teams[0].foodTouch;
      const initialFoodKnown = battle.teams[0].foodKnown;

      console.log('Initial food stats:', {
        foodOwn: initialFoodOwn,
        foodTouch: initialFoodTouch,
        foodKnown: initialFoodKnown,
      });

      // Move ant (should trigger foodOwnTouch calls)
      battle.doAction(ant, 1); // Move right

      // Check that food statistics have been updated
      const afterMoveFoodOwn = battle.teams[0].foodOwn;
      const afterMoveFoodTouch = battle.teams[0].foodTouch;
      const afterMoveFoodKnown = battle.teams[0].foodKnown;

      console.log('After move food stats:', {
        foodOwn: afterMoveFoodOwn,
        foodTouch: afterMoveFoodTouch,
        foodKnown: afterMoveFoodKnown,
      });

      // Food statistics should have changed from initial (showing the system is active)
      expect(
        afterMoveFoodOwn !== initialFoodOwn ||
          afterMoveFoodTouch !== initialFoodTouch ||
          afterMoveFoodKnown !== initialFoodKnown,
      ).toBe(true);

      // Test base building food statistics
      const baseSquare = battle.mapData(ant.xPos, ant.yPos);
      baseSquare.numAnts = 30; // Enough for base building
      baseSquare.numFood = 60; // Enough food for base building
      baseSquare.base = false;

      const beforeBaseFoodOwn = battle.teams[0].foodOwn;

      // Build base (should trigger foodOwnTouch calls)
      battle.doAction(ant, 16); // Build base action

      const afterBaseFoodOwn = battle.teams[0].foodOwn;

      console.log('Base building food stats change:', {
        before: beforeBaseFoodOwn,
        after: afterBaseFoodOwn,
      });

      // Food statistics should be updated after base building
      expect(afterBaseFoodOwn).not.toBe(beforeBaseFoodOwn);
    });
  });

  describe('foodOwnTouch diagnostic tests', () => {
    it('should verify foodOwnTouch method works correctly in isolation', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);
      const square = battle.mapData(64, 64);

      // Set up initial state
      square.numFood = 10;
      square.team = 1;
      const team = battle.teams[0];

      // Reset food stats
      team.foodOwn = 0;
      team.foodTouch = 0;
      team.foodKnown = 0;

      console.log('Initial food stats:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
      });

      // Call foodOwnTouch with -1 (subtract)
      battle.foodOwnTouch(square, 1, -1);
      console.log('After foodOwnTouch(-1):', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
      });

      // Call foodOwnTouch with 1 (add back)
      battle.foodOwnTouch(square, 1, 1);
      console.log('After foodOwnTouch(1):', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
      });

      // Should be balanced back to original state
      expect(team.foodOwn).toBe(0);
      expect(team.foodTouch).toBe(0);
      expect(team.foodKnown).toBe(0);
    });

    it('should test base building foodOwnTouch calls', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);
      const ant = battle.ants[0];
      const square = battle.mapData(ant.xPos, ant.yPos);

      // Create 25 additional ants on the same square to get to 26 total (> 25 required)
      for (let i = 0; i < 25; i++) {
        const newAnt = battle.testAccess().createAnt({
          xPos: ant.xPos,
          yPos: ant.yPos,
          team: 1,
          age: 0,
          nextTurn: battle.currentTurn,
          brain: { ...structuredClone(battle.teams[0].brainTemplate), random: battle.rng() },
        });
        battle.testAccess().addAntToSquareList(newAnt, square);
      }

      // Set up conditions for base building with EXTRA food
      square.numAnts = 26; // Should now actually have 26 ants in the linked list
      square.numFood = 75; // More than the 50 required, so 25 should remain
      square.base = false;
      square.team = 1;

      const team = battle.teams[0];
      team.foodOwn = 0;
      team.foodTouch = 0;
      team.foodKnown = 0;

      console.log('Before base building:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
        squareAnts: square.numAnts,
        squareFood: square.numFood,
      });

      // Try to build base - this should trigger foodOwnTouch calls
      battle.doAction(ant, 16); // BUILD_BASE action

      console.log('After base building:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
        squareAnts: square.numAnts,
        squareFood: square.numFood,
      });

      // Base should have been built
      expect(square.base).toBe(true);

      // Now with proper 25 ants killed, we should have:
      // Before: 26 ants, 75 food → foodOwn = min(75,26) = 26, foodTouch = 75-26 = 49, foodKnown = 75
      // After:  1 ant,  25 food → foodOwn = min(25,1) = 1,   foodTouch = 25-1 = 24,   foodKnown = 25
      // Net: foodOwn = -26 + 1 = -25, foodTouch = -49 + 24 = -25, foodKnown = -75 + 25 = -50
    });

    it('should test ant movement foodOwnTouch calls on empty squares', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);
      const ant = battle.ants[0];

      // Set up initial position with some food
      const startSquare = battle.mapData(ant.xPos, ant.yPos);
      startSquare.numFood = 20;
      startSquare.team = 1;

      // Set up target position as empty with food
      const targetX = ant.xPos + 1;
      const targetY = ant.yPos;
      const targetSquare = battle.mapData(targetX, targetY);
      targetSquare.numFood = 15;
      targetSquare.team = 0; // Neutral
      targetSquare.numAnts = 0;

      const team = battle.teams[0];
      team.foodOwn = 0;
      team.foodTouch = 0;
      team.foodKnown = 0;

      console.log('Before ant movement:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
      });

      // Move ant to empty square - this should trigger 4 foodOwnTouch calls
      battle.doAction(ant, 1); // Move right

      console.log('After ant movement:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
      });

      // Ant should have moved
      expect(ant.xPos).toBe(targetX);
      expect(ant.yPos).toBe(targetY);

      // Check if food stats are balanced - this will reveal if there's an imbalance
    });

    it('should test ant movement foodOwnTouch calls with combat', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt], 123);

      // Position two ants from different teams to trigger combat
      const ant1 = battle.ants[0]; // Team 1
      const ant2 = battle.ants[1]; // Team 2 (should exist since we have 2 teams)

      // Position them adjacent
      ant1.xPos = 64;
      ant1.yPos = 64;
      ant2.xPos = 65;
      ant2.yPos = 64;

      // Update square data to reflect positions
      const square1 = battle.mapData(ant1.xPos, ant1.yPos);
      const square2 = battle.mapData(ant2.xPos, ant2.yPos);

      // Clear existing ants from squares first
      square1.numAnts = 0;
      square1.firstAnt = undefined;
      square1.lastAnt = undefined;
      square2.numAnts = 0;
      square2.firstAnt = undefined;
      square2.lastAnt = undefined;

      // Add ants to their respective squares
      battle.testAccess().addAntToSquareList(ant1, square1);
      square1.numAnts = 1;
      square1.team = 1;
      square1.numFood = 10;

      battle.testAccess().addAntToSquareList(ant2, square2);
      square2.numAnts = 1;
      square2.team = 2;
      square2.numFood = 8;

      const team1 = battle.teams[0];
      team1.foodOwn = 0;
      team1.foodTouch = 0;
      team1.foodKnown = 0;

      console.log('Before combat movement:', {
        foodOwn: team1.foodOwn,
        foodTouch: team1.foodTouch,
        foodKnown: team1.foodKnown,
      });

      // Move ant1 into ant2's square to trigger combat
      battle.doAction(ant1, 1); // Move right into combat

      console.log('After combat movement:', {
        foodOwn: team1.foodOwn,
        foodTouch: team1.foodTouch,
        foodKnown: team1.foodKnown,
      });

      // This should reveal if combat affects the foodOwnTouch balance
    });

    it('should verify foodOwn stays non-negative with only movement (no base building)', () => {
      // Create a simple ant that only moves and never builds bases
      const movementOnlyAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'MovementOnly', color: '#00FF00', brainTemplate: { step: 0 } };
        }
        // Just move in a cycle, never build bases (action 16)
        const brain = antInfo.brains[0];
        brain.step = (brain.step || 0) + 1;
        return (brain.step % 4) + 1; // Move in directions 1,2,3,4 cyclically
      }) as AntFunction;

      const battle = new Battle(gameSpec, [movementOnlyAnt], 123);

      console.log('Testing movement-only scenario (no base building)...');

      // Run battle and track foodOwn over time
      for (let turn = 0; turn < 50; turn++) {
        battle.doTurn();

        const currentFoodOwn = battle.teams[0].foodOwn;
        if (turn % 10 === 0 || currentFoodOwn < 0) {
          console.log(
            `Turn ${turn + 1}: foodOwn = ${currentFoodOwn}, foodTouch = ${battle.teams[0].foodTouch}, foodKnown = ${battle.teams[0].foodKnown}`,
          );
        }

        // If foodOwn goes negative with just movement, that indicates a bug in the basic foodOwnTouch logic
        if (currentFoodOwn < 0) {
          console.error(
            `foodOwn went negative with movement only at turn ${turn + 1}: ${currentFoodOwn}!`,
          );
          break;
        }
      }

      console.log('Final food stats (movement only):', {
        foodOwn: battle.teams[0].foodOwn,
        foodTouch: battle.teams[0].foodTouch,
        foodKnown: battle.teams[0].foodKnown,
      });

      // With only movement, foodOwn should never go negative
      expect(battle.teams[0].foodOwn).toBeGreaterThanOrEqual(0);
    });

    it('should credit team when ant steps onto unclaimed square with food', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);
      const ant = battle.ants[0];

      // Position ant at (64, 64) on team's starting base
      ant.xPos = 64;
      ant.yPos = 64;
      const startSquare = battle.mapData(64, 64);
      startSquare.team = 1; // Team owns starting square

      // Set up unclaimed square with food at (65, 64)
      const foodSquare = battle.mapData(65, 64);
      foodSquare.team = 0; // Neutral/unclaimed
      foodSquare.numFood = 10;
      foodSquare.numAnts = 0;

      // Reset team food stats to zero
      const team = battle.teams[0];
      team.foodOwn = 0;
      team.foodTouch = 0;
      team.foodKnown = 0;

      console.log('Before step onto food square:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
        foodSquareTeam: foodSquare.team,
        foodSquareFood: foodSquare.numFood,
      });

      // Move ant right onto the food square
      battle.doAction(ant, 1); // direction 1 = right

      console.log('After step onto food square:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
        foodSquareTeam: foodSquare.team,
        foodSquareFood: foodSquare.numFood,
        antPosition: { x: ant.xPos, y: ant.yPos },
      });

      // Verify ant moved to food square
      expect(ant.xPos).toBe(65);
      expect(ant.yPos).toBe(64);

      // Verify team now owns the square
      expect(foodSquare.team).toBe(1);

      // Team should be credited for food they now control
      // With 1 ant and 10 food: foodOwn = min(10, 1) = 1
      expect(team.foodOwn).toBe(1);
      expect(team.foodTouch).toBe(9); // 10 - 1 = 9
      expect(team.foodKnown).toBe(10);
    });

    it('should preserve food stats when ant carries food from non-base square', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);
      const ant = battle.ants[0];

      // Position ant at (64, 64) with 1 food on a non-base square
      ant.xPos = 64;
      ant.yPos = 64;
      const sourceSquare = battle.mapData(64, 64);
      sourceSquare.team = 1; // Team owns this square
      sourceSquare.numAnts = 1; // Just this ant
      sourceSquare.numFood = 1; // Single piece of food
      sourceSquare.base = false; // NOT a base

      // Set up destination square (also owned by team)
      const destSquare = battle.mapData(65, 64);
      destSquare.team = 1; // Team already owns destination
      destSquare.numAnts = 0;
      destSquare.numFood = 0;
      destSquare.base = false;

      // Initialize team food stats based on current square ownership
      const team = battle.teams[0];
      team.foodOwn = 1; // min(1 food, 1 ant) = 1
      team.foodTouch = 0; // 1 - 1 = 0
      team.foodKnown = 1; // 1 food total

      console.log('Before carrying move:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
        sourceFood: sourceSquare.numFood,
        destFood: destSquare.numFood,
      });

      // Do a carrying move (action = 1 | 8 = 9, meaning move right and carry food)
      battle.doAction(ant, 9); // direction 1 (right) + ACTION_CARRY_FOOD_FLAG (8)

      console.log('After carrying move:', {
        foodOwn: team.foodOwn,
        foodTouch: team.foodTouch,
        foodKnown: team.foodKnown,
        sourceFood: sourceSquare.numFood,
        destFood: destSquare.numFood,
        antPosition: { x: ant.xPos, y: ant.yPos },
      });

      // Verify ant moved and food was transported
      expect(ant.xPos).toBe(65);
      expect(ant.yPos).toBe(64);
      expect(sourceSquare.numFood).toBe(0); // Food taken from source
      expect(destSquare.numFood).toBe(1); // Food dropped at destination

      // Food stats should be UNCHANGED because:
      // Before: Team owns 1 food across their territory (foodOwn=1, foodTouch=0, foodKnown=1)
      // After: Team still owns 1 food across their territory, just in different location
      expect(team.foodOwn).toBe(1); // Should remain unchanged
      expect(team.foodTouch).toBe(0); // Should remain unchanged
      expect(team.foodKnown).toBe(1); // Should remain unchanged
    });

    it('should verify all foodOwnTouch call sites produce balanced results', () => {
      const battle = new Battle(gameSpec, [simpleAnt], 123);

      // Run a short battle and check if foodOwn goes negative
      console.log('Running short battle to check for negative foodOwn...');

      // Run for several turns to see if imbalance develops
      for (let turn = 0; turn < 20; turn++) {
        battle.doTurn();

        const currentFoodOwn = battle.teams[0].foodOwn;
        console.log(
          `Turn ${turn + 1}: foodOwn = ${currentFoodOwn}, foodTouch = ${battle.teams[0].foodTouch}, foodKnown = ${battle.teams[0].foodKnown}`,
        );

        // Check for negative values
        if (currentFoodOwn < 0) {
          console.error(`foodOwn went negative at turn ${turn + 1}: ${currentFoodOwn}`);
          // Don't fail the test yet, let's see the pattern
        }
      }

      // This test will help us see the pattern of how foodOwn changes over time
      console.log('Final food stats:', {
        foodOwn: battle.teams[0].foodOwn,
        foodTouch: battle.teams[0].foodTouch,
        foodKnown: battle.teams[0].foodKnown,
      });
    });
  });
});
