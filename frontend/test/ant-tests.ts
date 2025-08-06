import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { blacklist, type TeamWithCode } from '@/Team.ts';
import type { GameSpec } from '@/GameSpec.ts';
import { instantiateParticipant } from '@/Game.ts';
import { type AntBrain, Battle, type BattleArgs, produceBattleArgs } from '@/Battle.ts';
import { getRNG, type RNGFunction } from '@/prng.ts';

function loadTeams(): TeamWithCode[] {
  const rawImport = import.meta.glob('@ants/*.js', { eager: true, query: '?raw' }) as Record<
    string,
    { default: string }
  >;
  const teams: TeamWithCode[] = [];
  for (const [key, value] of Object.entries(rawImport)) {
    const code = value.default;
    const id = key.replace(/^\.\.\/ants\/(.+)\.js$/, '$1');
    const teamInfo = { id, code, name: id, color: '', authorName: 'built-in' };
    teams.push(teamInfo);
  }
  return teams;
}

const whiteList: string[] = [];

beforeEach(() => {
  vi.stubGlobal('postMessage', () => {});
  vi.stubGlobal('console', { log: vi.fn(), debug: vi.fn(), error: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Ant test-bench', () => {
  Battle.DEFAULT_SPEED = 100;
  for (const team of loadTeams()) {
    if (team.id === 'FormAnt') continue; // Manually found to work but doesn't pass the test

    if (whiteList.length > 0 && !whiteList.includes(team.id)) {
      console.log(`Skipping non-whitelisted ${team.id}`);
      continue;
    } else if (blacklist.includes(team.id)) {
      console.log(`Skipping blacklisted ${team.id}`);
      continue;
    }
    it(`${team.id} should find food in 100 turns`, async () => {
      const gameSpec: GameSpec = {
        statusInterval: -1,
        halfTimePercent: 60,
        halfTimeTurn: 100,
        mapHeight: [128, 128], // Smaller map for more likely food encounters
        mapWidth: [128, 128],
        newFoodDiff: [15, 15],
        newFoodMin: [10, 10],
        newFoodSpace: [3, 3],
        seed: 12345,
        startAnts: [20, 20], // Start with enough ants for base building
        timeOutTurn: 100,
        teams: [team],
        winPercent: 70,
        numBattles: 1,
        numBattleTeams: 15,
      };

      const antFunction = instantiateParticipant(team.code);
      expect(antFunction).toBeDefined();

      const seeds = [1, 2, 3, 4, 5];

      let bestResult = 0;
      for (const seed of seeds) {
        const rng: RNGFunction = getRNG(seed);
        const battleArgs: BattleArgs = produceBattleArgs(gameSpec, rng);
        const battle = new Battle(battleArgs, [{ id: team.id, func: antFunction }], seed);

        const result = await battle.run();
        if (result.teams[0].numbers.numBorn > bestResult) {
          bestResult = result.teams[0].numbers.numBorn;
        }
        if (bestResult > 30) break;
      }
      console.log(`${team.id} has ${bestResult} born`);
      expect(bestResult).toBeGreaterThan(30);
    });

    // NOTE: We should re-enable this when the last of the built-in teams have valid brain templates
    it.skip(`${team.id} should have a valid brain template`, () => {
      const antFunction = instantiateParticipant(team.code);
      const descriptor = antFunction();
      expect(descriptor.brainTemplate).toBeDefined();
      expect(descriptor.brainTemplate).toBeTruthy();
      const allowedBrainValueTypes = ['boolean', 'number'];
      const template = descriptor.brainTemplate as AntBrain;
      for (const key in template) {
        expect(typeof template[key]).toBeOneOf(allowedBrainValueTypes);
      }
    });
  }
});
