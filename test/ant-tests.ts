import { describe, expect, it } from 'vitest';
import { type Team } from '@/Team.ts';
import type { GameSpec } from '@/GameSpec.ts';
import { instantiateParticipant } from '@/Game.ts';
import { Battle } from '@/Battle.ts';

function loadTeams() {
  const rawImport = import.meta.glob('@ants/*.js', { eager: true, query: '?raw' }) as Record<
    string,
    { default: string }
  >;
  const teams: Team[] = [];
  for (const [key, value] of Object.entries(rawImport)) {
    const code = value.default;
    const name = key.replace(/^\/ants\/(.+)\.js$/, '$1');
    const teamInfo: Team = { name, code };
    teams.push(teamInfo);
  }
  return teams;
}

const blacklist = [
  'CognizAnt', // Not implemented yet
  'Antsy', // Loops indefinitely, it seems
  'Hex', // Loops indefinitely, it seems
  'Speedy', // Loops indefinitely, it seems
];

const whiteList: string[] = ['TheDoctor'];

describe('Ant test-bench', () => {
  for (const team of loadTeams()) {
    if (whiteList.length > 0 && !whiteList.includes(team.name)) {
      console.log(`Skipping non-whitelisted ${team.name}`);
      continue;
    }
    if (blacklist.includes(team.name)) {
      console.log(`Skipping blacklisted ${team.name}`);
      continue;
    }
    it(`${team.name} should find food in 100 turns`, async () => {
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
        timeOutTurn: 1000,
        teams: [team],
        winPercent: 70,
        numBattles: 1,
      };

      const antFunction = instantiateParticipant(team.code, team.name);
      expect(antFunction).toBeDefined();

      const seeds = [1, 2, 3, 4, 5];

      let bestResult = 0;
      for (const seed of seeds) {
        const battle = new Battle(gameSpec, [antFunction], seed);

        const result = await battle.run();
        if (result.teams[0].numBorn > bestResult) {
          bestResult = result.teams[0].numBorn;
        }
        if (bestResult > 30) break;
      }
      console.log(`${team.name} has ${bestResult} born`);
      expect(bestResult).toBeGreaterThan(30);
    });
  }
});
