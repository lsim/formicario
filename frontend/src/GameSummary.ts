import type { AntData, BattleArgs, SquareData } from '@/Battle.ts';

export type SquareStatus = {
  index: number;
  numAnts: number;
  base: boolean;
  team: number;
  numFood: number;
};

export type TeamDisqualification = {
  reason: string;
  ant: Partial<AntData>;
  turn: number;
  teamId: string;
  square: Partial<SquareData>;
};

export type TeamStatus = {
  id: string;
  color: string;
  disqualification?: TeamDisqualification;
  codeHash: string;
  numbers: {
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
};

export type BattleInfo = {
  gameId: number;
  battleId: number;
  args: BattleArgs;
  teams: TeamStatus[];
  isRanked: boolean;
};

export type BattleStatus = BattleInfo & {
  seed: number;
  deltaSquares: SquareStatus[];
  turns: number;
  turnsPerSecond: number;
};

export type TerminationReason =
  | 'timeout'
  | 'half-time-domination'
  | 'domination'
  | 'disqualification'
  | 'error'
  | 'user-abort'
  | 'not-terminated'
  | 'solo-battle-ended';

export type BattleSummary = BattleInfo & {
  startTime: number;
  // The id of the winning team
  winner: string;
  turns: number;
  duration: number;
  squares: SquareStatus[];
  seed: number;
  terminationReason: TerminationReason;
};

export type GameSummary = {
  gameId: number;
  seed: number;
  battles: BattleSummary[];
};
