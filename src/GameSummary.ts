import type { BattleArgs } from '@/Battle.ts';

export type BattleStatus = {
  // TODO: Can we send deltas or do we need the full square table?
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
