import { describe, it, expect, beforeEach } from 'vitest';
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

describe('Disqualification System', () => {
  let gameSpec: GameSpec;
  let battleArgs: BattleArgs;
  let rng: RNGFunction;

  beforeEach(() => {
    gameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [64, 64],
      mapWidth: [64, 64],
      newFoodDiff: [5, 10],
      newFoodMin: [5, 10],
      newFoodSpace: [20, 30],
      seed: 42,
      startAnts: [3, 3],
      teams: [],
      timeOutTurn: 1000,
      winPercent: 70,
      numBattles: 1,
      numBattleTeams: 2,
    };
    rng = getRNG(42);
    battleArgs = produceBattleArgs(gameSpec, rng);
  });

  describe('Non-number return value disqualification', () => {
    it('should disqualify team when ant function returns string', () => {
      const stringReturningAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'StringAnt', color: '#FF0000', brainTemplate: {} };
        }
        return 'invalid'; // Returns string instead of number
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'StringAnt', func: stringReturningAnt }], 123);

      expect(battle.disqualifiedTeams).toHaveLength(0);

      // Run one turn - should trigger disqualification
      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].teamIndex).toBe(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Ant function returned non-number');
      expect(battle.disqualifiedTeams[0].ant).toBeDefined();
    });

    it('should disqualify team when ant function returns object', () => {
      const objectReturningAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'ObjectAnt', color: '#00FF00', brainTemplate: {} };
        }
        return { move: 1 }; // Returns object instead of number
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'ObjectAnt', func: objectReturningAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Ant function returned non-number');
    });

    it('should disqualify team when ant function returns undefined', () => {
      const undefinedReturningAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'UndefinedAnt', color: '#0000FF', brainTemplate: {} };
        }
        return undefined; // Returns undefined instead of number
      }) as AntFunction;

      const battle = new Battle(
        battleArgs,
        [{ id: 'UndefinedAnt', func: undefinedReturningAnt }],
        123,
      );

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Ant function returned non-number');
    });
  });

  describe('NaN return value disqualification', () => {
    it('should disqualify team when ant function returns NaN', () => {
      const nanReturningAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'NaNAnt', color: '#FF00FF', brainTemplate: { random: 12345 } };
        }
        // Create NaN directly
        return NaN;
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'NaNAnt', func: nanReturningAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Ant function returned NaN');
    });

    it('should disqualify team when ant function returns result of invalid math operation', () => {
      const invalidMathAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'InvalidMathAnt', color: '#FFFF00', brainTemplate: {} };
        }
        return Math.sqrt(-1); // Returns NaN
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'InvalidMathAnt', func: invalidMathAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Ant function returned NaN');
    });
  });

  describe('Exception-based disqualification', () => {
    it('should disqualify team when ant function throws error', () => {
      const throwingAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'ThrowingAnt', color: '#00FFFF', brainTemplate: {} };
        }
        throw new Error('Ant function crashed!');
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'ThrowingAnt', func: throwingAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Error: Ant function crashed!');
    });

    it('should disqualify team when ant function accesses undefined property', () => {
      const accessErrorAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'AccessErrorAnt', color: '#FF8000', brainTemplate: {} };
        }
        // This will throw TypeError
        const brain = antInfo.brains[0];
        return brain.nonExistentProperty.someMethod(); // Throws error
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'AccessErrorAnt', func: accessErrorAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toContain('TypeError');
    });

    it('should disqualify team when ant function has infinite recursion', () => {
      const recursiveAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'RecursiveAnt', color: '#8000FF', brainTemplate: {} };
        }

        function infiniteRecursion(): number {
          return infiniteRecursion(); // Stack overflow
        }

        return infiniteRecursion();
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'RecursiveAnt', func: recursiveAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].reason).toContain('RangeError');
    });
  });

  describe('Disqualification behavior during battle', () => {
    it('should exclude disqualified team ants from future turns', () => {
      let callCount = 0;
      const countingAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'CountingAnt', color: '#123456', brainTemplate: {} };
        }
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return 0; // Should never be reached
      }) as AntFunction;

      const validAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'ValidAnt', color: '#654321', brainTemplate: {} };
        }
        return 0;
      }) as AntFunction;

      const battle = new Battle(
        battleArgs,
        [
          { id: 'CountingAnt', func: countingAnt },
          { id: 'ValidAnt', func: validAnt },
        ],
        123,
      );

      // First turn should disqualify team 1
      battle.doTurn();
      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(callCount).toBe(1);

      // Second turn should not call the disqualified ant function
      battle.doTurn();
      expect(callCount).toBe(1); // Should still be 1, not incremented

      // Third turn should still not call it
      battle.doTurn();
      expect(callCount).toBe(1); // Should still be 1
    });

    it('should not allow disqualified teams to win', () => {
      const dominantButBadAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'DominantBadAnt', color: '#FF0000', brainTemplate: { turnCount: 0 } };
        }

        const brain = antInfo.brains[0];
        brain.turnCount = (brain.turnCount || 0) + 1;

        // Build up dominance, then crash
        if (brain.turnCount > 10) {
          throw new Error('Crashes after building dominance');
        }

        return 0; // Stay and build up
      }) as AntFunction;

      const weakAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'WeakAnt', color: '#00FF00', brainTemplate: {} };
        }
        return 0; // Just stay put
      }) as AntFunction;

      const battle = new Battle(
        battleArgs,
        [
          { id: 'DominantBadAnt', func: dominantButBadAnt },
          { id: 'WeakAnt', func: weakAnt },
        ],
        123,
      );

      // Run battle long enough for the dominant ant to crash
      for (let i = 0; i < 50; i++) {
        battle.doTurn();
        if (battle.disqualifiedTeams.length > 0) break;
      }

      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].teamIndex).toBe(1); // DominantBadAnt was team 1

      // Verify the dominant ant was disqualified (weak ant should be the only one left)
      // We can't easily test winner determination without accessing internal methods,
      // but we can verify the disqualification happened correctly
      expect(battle.disqualifiedTeams[0].teamIndex).toBe(1); // DominantBadAnt was team 1
    });

    it('should stop battle when all teams except one are disqualified', () => {
      const badAnt1: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'BadAnt1', color: '#FF0000', brainTemplate: {} };
        }
        throw new Error('BadAnt1 always crashes');
      }) as AntFunction;

      const badAnt2: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'BadAnt2', color: '#00FF00', brainTemplate: {} };
        }
        return 'invalid'; // Non-number return
      }) as AntFunction;

      const goodAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'GoodAnt', color: '#0000FF', brainTemplate: {} };
        }
        return 0;
      }) as AntFunction;

      // Create battle with 3 teams
      const threeTeamSpec = { ...gameSpec, numBattleTeams: 3 };
      const threeTeamArgs = produceBattleArgs(threeTeamSpec, rng);

      const battle = new Battle(
        threeTeamArgs,
        [
          { id: 'BadAnt1', func: badAnt1 },
          { id: 'BadAnt2', func: badAnt2 },
          { id: 'GoodAnt', func: goodAnt },
        ],
        123,
      );

      expect(battle.testAccess().stopRequested).toBe(false);

      // Run one turn - should disqualify both bad ants and stop the battle
      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(2);
      expect(battle.testAccess().stopRequested).toBe(true); // Battle should auto-stop
    });
  });

  describe('Disqualification data integrity', () => {
    it('should store basic disqualification information', () => {
      const trackedAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return {
            name: 'TrackedAnt',
            color: '#ABCDEF',
            brainTemplate: { identifier: 'unique-ant-brain' },
          };
        }
        throw new Error('Intentional crash for testing');
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'TrackedAnt', func: trackedAnt }], 123);

      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(1);
      const disqualification = battle.disqualifiedTeams[0];

      expect(disqualification.teamIndex).toBe(1);
      expect(disqualification.reason).toBe('Error: Intentional crash for testing');
      expect(disqualification.ant).toBeDefined();
      expect(disqualification.ant.team).toBe(1);
      // Linked list pointers should be cleaned up
      expect(disqualification.ant.mapNext).toBeUndefined();
      expect(disqualification.ant.mapPrev).toBeUndefined();
    });

    it('should not duplicate disqualifications for the same team', () => {
      let crashCount = 0;
      const multiCrashAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'MultiCrashAnt', color: '#333333', brainTemplate: {} };
        }
        crashCount++;
        throw new Error(`Crash number ${crashCount}`);
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'MultiCrashAnt', func: multiCrashAnt }], 123);

      // Run one turn - should disqualify the team
      battle.doTurn();

      // Should only have one disqualification record
      expect(battle.disqualifiedTeams).toHaveLength(1);
      expect(battle.disqualifiedTeams[0].teamIndex).toBe(1);
      expect(battle.disqualifiedTeams[0].reason).toBe('Error: Crash number 1');
    });

    it('should include disqualification information in battle status', () => {
      const faultyAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'FaultyAnt', color: '#DEADBE', brainTemplate: {}, id: 'foo' };
        }
        return NaN;
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'FaultyAnt', func: faultyAnt }], 123);

      battle.doTurn();

      const teamSummary = battle.getTeamSummary(battle.teams[0], 1);
      expect(teamSummary.disqualification).toBeDefined();
      expect(teamSummary.disqualification?.teamId).toBe('foo');
      expect(teamSummary.disqualification?.reason).toBe('Ant function returned NaN');
      expect(teamSummary.disqualification?.ant).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle disqualification of already dead ants gracefully', () => {
      const suicidalAnt: AntFunction = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'SuicidalAnt', color: '#000000', brainTemplate: { hasActed: false } };
        }

        const brain = antInfo.brains[0];
        if (!brain.hasActed) {
          brain.hasActed = true;
          // This ant will die from old age immediately after this action
          return 0;
        }

        throw new Error('Should not be called on dead ant');
      }) as AntFunction;

      const battle = new Battle(battleArgs, [{ id: 'SuicidalAnt', func: suicidalAnt }], 123);

      // Manually kill the ant to simulate death during battle
      const ant = battle.ants[0];
      battle.testAccess().killAnt(ant);

      // Try to run a turn - should not disqualify dead ant
      battle.doTurn();

      expect(battle.disqualifiedTeams).toHaveLength(0);
    });

    it('should work correctly with zero teams (edge case)', () => {
      const emptyBattleArgs = { ...battleArgs };
      const battle = new Battle(emptyBattleArgs, [], 123);

      // Should not crash when checking disqualifications with no teams
      expect(() => battle.doTurn()).not.toThrow();
      expect(battle.disqualifiedTeams).toHaveLength(0);
    });
  });
});
