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
  squareOwn: number;
  foodOwn: number;
  foodTouch: number;
  foodKnown: number;
  timeUsed: number;
};

export type BattleInfo = {
  args: BattleArgs;
  teams: TeamStatus[];
};

export type BattleStatus = BattleInfo & {
  seed: number;
  deltaSquares: SquareStatus[];
  turns: number;
  turnsPerSecond: number;
};

export type BattleSummary = BattleInfo & {
  startTime: number;
  winner: string;
  turns: number;
  duration: number;
  squares: SquareStatus[];
  seed: number;
};

export type GameSummary = {
  seed: number;
  battles: BattleSummary[];
};
