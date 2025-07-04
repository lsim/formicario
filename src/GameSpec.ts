import type { ITeam } from '@/Team.ts';
import type { RNGFunction } from '@/prng.ts';

export type GameSpec = {
  mapWidth: [number, number];
  mapHeight: [number, number];
  newFoodSpace: [number, number];
  newFoodMin: [number, number];
  newFoodDiff: [number, number];
  halfTimeTurn: number;
  halfTimePercent: number;
  timeOutTurn: number;
  winPercent: number;
  teams: ITeam[];

  startAnts: [number, number];

  seed: number;
  rng: RNGFunction;
};
