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

const blacklist = ['CognizAnt'];

describe('Ant test-bench', () => {
  for (const team of loadTeams()) {
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
        newFoodDiff: [3, 6],
        newFoodMin: [3, 6],
        newFoodSpace: [4, 8],
        seed: 12345,
        startAnts: [20, 20], // Start with enough ants for base building
        timeOutTurn: 100,
        teams: [team],
        winPercent: 70,
        numBattles: 1,
      };

      const antFunction = instantiateParticipant(team.code, team.name);
      expect(antFunction).toBeDefined();

      const battle = new Battle(gameSpec, [antFunction], 12345);

      const result = await battle.run();
      expect(result.turns).toBeGreaterThanOrEqual(100);
      console.log(`${team.name} has ${result.teams[0].numBorn} born`);
      expect(result.teams[0].numBorn).toBeGreaterThan(50);
    });
  }
});
