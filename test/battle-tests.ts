import { describe, expect, it } from 'vitest';

import type { GameSpec } from '@/GameSpec';
import { BattleArgs } from '@/Battle';
import { getRNG } from '@/prng.ts';

describe('Battle tests', () => {
  describe('battle args', () => {
    it('should produce valid battle args', () => {
      const game: GameSpec = {
        halfTimePercent: 10,
        halfTimeTurn: 10,
        mapHeight: [10, 10],
        mapWidth: [150, 150],
        newFoodDiff: [10, 10],
        newFoodMin: [10, 10],
        newFoodSpace: [10, 10],
        seed: 10,
        rng: getRNG(10),
        startAnts: [10, 10],
        teams: [],
        timeOutTurn: 20,
        winPercent: 10,
      };
      const battleArgs = BattleArgs.fromGameSpec(game);
      expect(battleArgs).toBeTruthy();
      expect(battleArgs.halfTimePercent).toBe(10);
      expect(battleArgs.halfTimeTurn).toBe(10);
      expect(battleArgs.mapHeight).toBe(64);
      expect(battleArgs.mapWidth).toBe(128);
      expect(battleArgs.newFoodDiff).toBe(10);
      expect(battleArgs.newFoodMin).toBe(10);
      expect(battleArgs.newFoodSpace).toBe(10);
      expect(battleArgs.timeOutTurn).toBe(20);
      expect(battleArgs.winPercent).toBe(10);
      expect(battleArgs.startAnts).toBe(10);
    });
  });
});
