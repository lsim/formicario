import type { ITeam } from '@/Team.ts';

export interface IGameSpec {
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
}
