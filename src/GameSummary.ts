import type { BattleArgs } from '@/Battle.ts';

export type SquareStatus = {
  numAnts: number;
  base: boolean;
  team: number;
  numFood: number;
};

export type TeamStatus = {
  name: string;
  color: string;
  numBorn: number;
  numAnts: number;
  numBases: number;
  basesBuilt: number;
  kill: number;
  killed: number;
  dieAge: number;
};

export type BattleStatus = {
  teams: TeamStatus[];
  // OPTIMIZE: Can we send square deltas somehow? Most squares won't change from turn to turn
  squares: SquareStatus[];
};

export type BattleSummary = {
  startTime: number;
  winner: string;
  teams: string[];
  turns: number;
  args: BattleArgs;
};

export type GameSummary = {
  seed: number;
  battles: BattleSummary[];
};
