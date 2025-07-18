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
  teams: { name: string; code: string }[];
  numBattleTeams: number;
  numBattles: number;

  startAnts: [number, number];

  seed: number;
};
