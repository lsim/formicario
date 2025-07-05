import type { BattleArgs } from '@/Battle.ts';

export type SquareStatus = {
  index: number;
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
  args: BattleArgs;
  teams: TeamStatus[];
  // OPTIMIZE: Can we send square deltas somehow? Most squares won't change from turn to turn
  // squares: SquareStatus[];
  deltaSquares: SquareStatus[];
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
