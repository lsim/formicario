import type { RNGFunction } from '@/prng.ts';

export type GameSpec = {
  statusInterval: number;
  mapWidth: [number, number];
  mapHeight: [number, number];
  newFoodSpace: [number, number];
  newFoodMin: [number, number];
  newFoodDiff: [number, number];
  halfTimeTurn: number;
  halfTimePercent: number;
  timeOutTurn: number;
  winPercent: number;
  teams: string[];

  startAnts: [number, number];

  seed: number;
  rng: RNGFunction;
};
